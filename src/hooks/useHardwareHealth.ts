import { useEffect, useState } from "react";

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
const POLL_MS = 10_000;

export type HealthStatus = "online" | "warning" | "offline" | "unknown";

export interface SystemCheck {
  id: string;
  label: string;
  status: HealthStatus;
  detail?: string;
}

interface UseHardwareHealthResult {
  checks: SystemCheck[];
  overall: HealthStatus;
  hasFault: boolean;
  lastUpdated: number;
}

const initialChecks: SystemCheck[] = [
  { id: "database", label: "Database", status: "unknown" },
  { id: "grain-db", label: "Grain DB", status: "unknown" },
  { id: "models", label: "ML models", status: "unknown" },
  { id: "camera", label: "Camera", status: "unknown" },
  { id: "modbus", label: "Modbus / hardware", status: "unknown" },
];

async function probe(url: string, timeoutMs = 4000): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BACKEND_URL}${url}`, { signal: ctl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Polls the 5 system endpoints LoadingPage uses, every 10s, and reports
 * each as online / offline. Used by the Machine Console hardware strip
 * and the topbar fault banner.
 */
export function useHardwareHealth(): UseHardwareHealthResult {
  const [checks, setChecks] = useState<SystemCheck[]>(initialChecks);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const [db, grain, models, camera, modbus] = await Promise.all([
        probe("/api/raice_labz/debug/database-connection"),
        probe("/api/raice_labz/grain-info/varieties"),
        probe("/api/models/health"),
        probe("/api/camera/check"),
        probe("/api/modbus_rtu/status"),
      ]);
      if (cancelled) return;
      setChecks([
        { id: "database", label: "Database", status: db ? "online" : "offline" },
        { id: "grain-db", label: "Grain DB", status: grain ? "online" : "offline" },
        { id: "models", label: "ML models", status: models ? "online" : "offline" },
        { id: "camera", label: "Camera", status: camera ? "online" : "offline" },
        { id: "modbus", label: "Modbus / hardware", status: modbus ? "online" : "offline" },
      ]);
      setLastUpdated(Date.now());
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const offlineCount = checks.filter((c) => c.status === "offline").length;
  const overall: HealthStatus =
    offlineCount === 0
      ? checks.every((c) => c.status === "online")
        ? "online"
        : "unknown"
      : offlineCount >= 2
        ? "offline"
        : "warning";

  return { checks, overall, hasFault: offlineCount > 0, lastUpdated };
}
