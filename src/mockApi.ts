/**
 * Mock API Layer - Intercepts all fetch() calls and returns dummy data.
 * This allows the frontend to run completely standalone without a backend.
 */

// ============================================================
// DUMMY DATA
// ============================================================

const VARIETIES = ["1121", "1509", "Pusa-Basmati", "Sharbati", "Sona-Masuri", "BPT", "HMT", "Kolam", "Ponni", "Jaya", "Matta", "Gobindobhog", "IR-64", "PR-11"];
const PROCESSES = ["Raw", "Double-Boiled", "Single-Boiled", "SAP"];
const HARVEST_SEASONS = ["Kharif 2024", "Rabi 2024-25", "Kharif 2025"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "September", "October", "November", "December"];
const MACHINES = [
  "Husker", "Tray Separator - Mix", "Tray Separator - Rice O/P", "Tray Separator - Paddy O/P",
  "Whitener", "Silky", "Length Grader - Headrice O/P", "Length Grader - Broken O/P",
  "Thickness Grader - Thick Rice O/P", "Thickness Grader - Thin Rice O/P",
  "Sifter", "Color Sorter - Accepts", "Color Sorter - Rejects", "Blend & Pack", "Final Rice",
];

let modeCounter = 1;
let trialCounter: Record<string, number> = {};
let trialRunning: Record<string, boolean> = {};
let seriesCompletedMachines: Record<string, string[]> = {}; // modeId -> completed machine names
let seriesTotalMachines: Record<string, number> = {}; // modeId -> total machines count
let mockAnalysisRunning = false;
let mockAnalysisPaused = false;
let modbusConnected = true;

// ---- Stateful stores (persist across fetch calls within session) ----
let grainEntryStore: any[] | null = null; // lazy-initialized from generateAllGrainEntries()
function getGrainEntries(): any[] {
  if (!grainEntryStore) grainEntryStore = generateAllGrainEntries();
  return grainEntryStore;
}

let riceMillSettings: any = null; // lazy-initialized
function getRiceMillSettings(): any {
  if (!riceMillSettings) {
    riceMillSettings = {
      operatorName: "Demo Operator",
      location: "Bangalore, Karnataka",
      riceMillName: "RAICE Premium Rice Mill",
      region: "non-basmati",
      lines: [
        {
          id: "line_001",
          name: "Line A - Main Production",
          output: "500",
          machines: [
            { name: "Husker", machineNumber: "1", machineModel: "SBR-10", customLabel: "Pre-Husker Unit", status: "active" },
            { name: "Tray Separator - Mix", machineNumber: "1", machineModel: "TS-200", customLabel: "Mix Tray Sep", status: "active" },
            { name: "Whitener", machineNumber: "1", machineModel: "WH-400", customLabel: "Primary Whitener", status: "active" },
            { name: "Whitener", machineNumber: "2", machineModel: "WH-400", customLabel: "Secondary Whitener", status: "active" },
            { name: "Silky", machineNumber: "1", machineModel: "SK-100", customLabel: "Silky Polisher", status: "active" },
            { name: "Length Grader - Headrice O/P", machineNumber: "1", machineModel: "LG-300", customLabel: "Head Rice Grader", status: "active" },
            { name: "Color Sorter - Accepts", machineNumber: "1", machineModel: "CS-500", customLabel: "Color Sorter Unit", status: "active" },
          ],
        },
        {
          id: "line_002",
          name: "Line B - Secondary",
          output: "350",
          machines: [
            { name: "Husker", machineNumber: "1", machineModel: "SBR-8", customLabel: "Husker B", status: "active" },
            { name: "Tray Separator - Rice O/P", machineNumber: "1", machineModel: "TS-150", customLabel: "Rice Output Sep", status: "active" },
            { name: "Whitener", machineNumber: "1", machineModel: "WH-300", customLabel: "Single Whitener", status: "active" },
            { name: "Silky", machineNumber: "1", machineModel: "SK-80", customLabel: "Polisher B", status: "active" },
            { name: "Thickness Grader - Thick Rice O/P", machineNumber: "1", machineModel: "TG-200", customLabel: "Thick Grader", status: "active" },
            { name: "Sifter", machineNumber: "1", machineModel: "SF-50", customLabel: "Fine Sifter", status: "inactive" },
          ],
        },
      ],
      currentLineIndex: 0,
      lineOutput: "500",
      machines: MACHINES,
    };
  }
  return riceMillSettings;
}

function generateModeId(prefix: string): string {
  const num = String(modeCounter++).padStart(4, '0');
  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
  return `${prefix}${num}-${date}-A`;
}

function makeResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================
// ROUTE MATCHING & HANDLERS
// ============================================================

type RouteHandler = (url: URL, method: string, body?: any) => Response | null;

const routes: RouteHandler[] = [

  // ---------- SYSTEM STATUS ----------
  (url, method) => {
    if (url.pathname === '/api/status') {
      return makeResponse({
        status: mockAnalysisRunning ? "running" : "operational",
        is_processing: mockAnalysisRunning && !mockAnalysisPaused,
        camera_status: { active: mockAnalysisRunning && !mockAnalysisPaused },
        components: {
          camera: mockAnalysisRunning ? "connected" : "standby",
          processor: mockAnalysisRunning ? (mockAnalysisPaused ? "paused" : "running") : "idle",
          database: "connected",
        },
        timestamp: new Date().toISOString(),
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/stop') {
      mockAnalysisRunning = false;
      mockAnalysisPaused = false;
      return makeResponse({ status: "success", message: "Analysis stopped" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/start') {
      mockAnalysisRunning = true;
      mockAnalysisPaused = false;
      return makeResponse({ status: "success", message: "Analysis started" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/camera/check') {
      return makeResponse({ available: true, fps: 30, resolution: "1920x1080" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/config/current') {
      return makeResponse({
        status: "configured",
        config: {
          metadata: { operator: "Demo Operator", location: "Demo Mill", timestamp: new Date().toISOString() },
          processing: { pipeline: "grain_detection", model: "yolov8" },
        },
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/db/current-batch') {
      return makeResponse({
        status: "success",
        batch: { batchId: "BATCH-DEMO-001", variety: "Basmati 1121", createdAt: new Date().toISOString() },
      });
    }
    return null;
  },

  // ---------- WEBRTC (no-op for demo) ----------
  (url, method) => {
    if (url.pathname === '/api/webrtc/offer' && method === 'POST') {
      return makeResponse({ status: "error", message: "WebRTC not available in demo mode" }, 503);
    }
    return null;
  },

  // ---------- INPUT CONFIG ----------
  (url, method) => {
    if (url.pathname === '/api/input/config' && method === 'POST') {
      return makeResponse({
        status: "success",
        batch_id: "BATCH-DEMO-001",
        grain_type: "Rice",
        variety: "Basmati 1121",
        testing_option: "Standard",
      });
    }
    return null;
  },

  // ---------- REPORT GENERATION ----------
  (url, method) => {
    if (url.pathname === '/api/generate-report' && method === 'POST') {
      // Return a dummy PDF blob (minimal valid PDF)
      const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n206\n%%EOF';
      return new Response(pdfContent, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
    }
    return null;
  },

  // ---------- SETTINGS: RICE MILL (stateful) ----------
  (url, method, body) => {
    if (url.pathname === '/api/raice_labz/settings/rice-mill') {
      if (method === 'POST' && body) {
        // Persist the incoming settings
        riceMillSettings = { ...getRiceMillSettings(), ...body };
        return makeResponse({ status: "success", message: "Settings saved successfully", settings: riceMillSettings });
      }
      return makeResponse({ status: "success", settings: getRiceMillSettings() });
    }
    return null;
  },

  // ---------- SETTINGS: REGION (reads from stateful rice-mill settings) ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/settings/region') {
      return makeResponse({ status: "success", region: getRiceMillSettings().region || "non-basmati" });
    }
    return null;
  },

  // ---------- SETTINGS: SEGMENTATION CONFIG ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/settings/segmentation-config') {
      if (method === 'POST') {
        return makeResponse({ status: "success", message: "Segmentation configuration saved" });
      }
      return makeResponse({
        status: "success",
        config: {
          basmati: {
            categories: [
              { key: "head_rice", label: "Head Rice", ratio: 1.0, group: "headRice" },
              { key: "second_one", label: "Second One", ratio: 0.872, group: "headRice" },
              { key: "tibar", label: "Tibar", ratio: 0.748, group: "brokens" },
              { key: "dubar", label: "Dubar", ratio: 0.624, group: "brokens" },
              { key: "mini_dubar", label: "Mini Dubar", ratio: 0.5, group: "brokens" },
              { key: "mongra", label: "Mongra", ratio: 0.376, group: "brokens" },
              { key: "mini_mongra", label: "Mini Mongra", ratio: 0.252, group: "brokens" },
              { key: "nakku", label: "Nakku", ratio: 0.128, group: "brokens" },
            ],
            thicknessThreshold: 80,
          },
          "non-basmati": {
            categories: [
              { key: "head_rice", label: "Head Rice", ratio: 1.0, group: "headRice" },
              { key: "three_quarter_head_rice", label: "3/4 Head Rice", ratio: 0.75, group: "headRice" },
              { key: "half_brokens", label: "1/2 Brokens", ratio: 0.5, group: "brokens" },
              { key: "quarter_fine_brokens", label: "1/4 & Fine Brokens", ratio: 0.25, group: "brokens" },
              { key: "tips", label: "Tips", ratio: 0.125, group: "brokens" },
            ],
            thicknessThreshold: 80,
          },
        },
      });
    }
    return null;
  },

  // ---------- SETTINGS: WI CLASSIFICATION ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/settings/wi-classification') {
      if (method === 'POST') {
        return makeResponse({ status: "success", message: "Color index classification saved" });
      }
      return makeResponse({
        status: "success",
        config: {
          grades: [
            { label: "Super White", color: "#f0f0f0", min: 36, max: 46 },
            { label: "White", color: "#e8e8e8", min: 32, max: 36 },
            { label: "Creamy White", color: "#f5f0e0", min: 28, max: 32 },
            { label: "Light Yellow", color: "#faf0c8", min: 24, max: 28 },
            { label: "Yellow", color: "#f0e080", min: 20, max: 24 },
          ],
        },
      });
    }
    return null;
  },

  // ---------- MODBUS RTU ----------
  (url, method) => {
    if (url.pathname === '/api/modbus_rtu/status') {
      return makeResponse({
        connected: modbusConnected,
        port_open: modbusConnected,
        port: modbusConnected ? "/dev/ttyUSB0" : null,
        baudrate: 9600,
        slave_id: 1
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/modbus_rtu/connect' && method === 'POST') {
      modbusConnected = true;
      return makeResponse({ status: "success", message: "Modbus RTU connected (demo)" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/modbus_rtu/disconnect' && method === 'POST') {
      modbusConnected = false;
      return makeResponse({ status: "success", message: "Modbus RTU disconnected" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/modbus_rtu/devices/status') {
      return makeResponse({
        status: "success",
        devices: {
          Motor_1: { status: "idle", value: 0, min: 0, max: 100, name: "Main Motor" },
          Pump_1: { status: "idle", value: 0, min: 0, max: 100, name: "Water Pump" },
          Feeder_1: { status: "idle", value: 0, min: 0, max: 50, name: "Grain Feeder" },
        },
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname.match(/^\/api\/modbus_rtu\/device\/.+\/(start|stop|write)$/)) {
      return makeResponse({ status: "success", message: "Device command executed (demo)" });
    }
    return null;
  },

  // ---------- ANALYTICS ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/analytics/summary') {
      return makeResponse({
        summary: {
          total_batches: 47,
          avg_head_rice: 68.3,
          avg_broken: 12.7,
          avg_whiteness_index: 33.2,
          avg_grain_length: 7.15,
          most_analyzed_variety: { variety: "Basmati 1121" },
        },
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/analytics/recent-activities') {
      return makeResponse({
        activities: [
          { mode_id: "IND-0001-250325-A", mode_type: "Procurement", machine: "CLEAN - I", variety: "Basmati 1121", status: "accepted" },
          { mode_id: "PROD-0002-240325-A", mode_type: "Production", machine: "WHITENER 1", variety: "Sona Masoori", status: "completed" },
          { mode_id: "MR-0003-230325-A", mode_type: "Milled Rice", machine: "COLOUR SORTER", variety: "PR-11", status: "completed" },
          { mode_id: "IND-0004-220325-A", mode_type: "Procurement", machine: "SILKY 1", variety: "Basmati 1509", status: "rejected" },
          { mode_id: "PROD-0005-210325-A", mode_type: "Production", machine: "TRAY SEPARATOR", variety: "Ponni", status: "completed" },
        ],
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/analytics/grain-analysis' && method === 'POST') {
      return makeResponse({
        status: "success",
        count: 12,
        data: generateAnalyticsData(12),
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/analytics/tma-analysis' && method === 'POST') {
      return makeResponse({
        status: "success",
        count: 8,
        data: generateAnalyticsData(8),
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/analytics/filter-options') {
      return makeResponse({
        status: "success",
        options: {
          varieties: VARIETIES,
          processes: PROCESSES,
          machines: MACHINES,
          modeTypes: ["procurement", "production", "milled-rice"],
        },
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/analytics/debug') {
      return makeResponse({ status: "success", debug: { totalRecords: 47, dbSize: "12.5MB" } });
    }
    return null;
  },

  // ---------- GRAIN INFO (all entries - for GrainDatabase tree, stateful) ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/grain-info' && method === 'GET') {
      const entries = getGrainEntries();
      return makeResponse({
        status: "success",
        grain_info: entries,
        count: entries.length,
      });
    }
    return null;
  },

  // ---------- GRAIN INFO (cascading dropdowns — data-driven from grain entries) ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/grain-info/varieties') {
      const entries = getGrainEntries();
      const varieties = [...new Set(entries.map(e => e.variety))];
      return makeResponse({ status: "success", varieties });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/grain-info\/variety\/([^/]+)\/processes$/);
    if (match) {
      const variety = decodeURIComponent(match[1]);
      const entries = getGrainEntries();
      const processes = [...new Set(
        entries.filter(e => e.variety.toLowerCase() === variety.toLowerCase()).map(e => e.process)
      )];
      return makeResponse({ status: "success", processes });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/grain-info\/variety\/([^/]+)\/process\/([^/]+)\/harvest-seasons$/);
    if (match) {
      const variety = decodeURIComponent(match[1]);
      const process = decodeURIComponent(match[2]);
      const entries = getGrainEntries();
      const harvestSeasons = [...new Set(
        entries.filter(e =>
          e.variety.toLowerCase() === variety.toLowerCase() &&
          e.process.toLowerCase() === process.toLowerCase() &&
          e.harvestSeason
        ).map(e => e.harvestSeason)
      )];
      return makeResponse({ status: "success", harvestSeasons });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/grain-info\/variety\/([^/]+)\/process\/([^/]+)\/harvest-season\/([^/]+)\/months$/);
    if (match) {
      const variety = decodeURIComponent(match[1]);
      const process = decodeURIComponent(match[2]);
      const harvestSeason = decodeURIComponent(match[3]);
      const entries = getGrainEntries();
      const months = [...new Set(
        entries.filter(e =>
          e.variety.toLowerCase() === variety.toLowerCase() &&
          e.process.toLowerCase() === process.toLowerCase() &&
          (e.harvestSeason || '').toLowerCase() === harvestSeason.toLowerCase() &&
          e.month
        ).map(e => e.month)
      )];
      return makeResponse({ status: "success", months });
    }
    return null;
  },

  // ---------- GRAIN INFO (CRUD - stateful) ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/grain-info/check-exists') {
      const variety = url.searchParams.get('variety') || '';
      const process = url.searchParams.get('process') || '';
      const harvestSeason = url.searchParams.get('harvestSeason') || '';
      const category = url.searchParams.get('category') || '';
      const grainType = url.searchParams.get('grainType') || '';
      const entries = getGrainEntries();
      const exists = entries.some(e => {
        const vMatch = e.variety.toLowerCase() === variety.toLowerCase();
        const pMatch = e.process.toLowerCase() === process.toLowerCase();
        const sMatch = !harvestSeason || (e.harvestSeason || '').toLowerCase() === harvestSeason.toLowerCase();
        const cMatch = !category || (e.category || '').toLowerCase() === category.toLowerCase();
        const gMatch = !grainType || (e.grainType || '').toLowerCase() === grainType.toLowerCase();
        return vMatch && pMatch && sMatch && cMatch && gMatch;
      });
      return makeResponse({ exists });
    }
    return null;
  },

  (url, method, body) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/grain-info\/variety\/([^/]+)\/process\/([^/]+)(\/season\/([^/]+))?$/);
    if (match) {
      const variety = decodeURIComponent(match[1]);
      const process = decodeURIComponent(match[2]);
      const season = match[4] ? decodeURIComponent(match[4]) : undefined;
      const entries = getGrainEntries();

      if (method === 'DELETE') {
        // Remove matching entry from store
        const idx = entries.findIndex(e =>
          e.variety.toLowerCase() === variety.toLowerCase() &&
          e.process.toLowerCase() === process.toLowerCase() &&
          (!season || (e.harvestSeason || '').toLowerCase() === season.toLowerCase())
        );
        if (idx !== -1) entries.splice(idx, 1);
        return makeResponse({ status: "success", message: `Grain info deleted for ${variety} + ${process}` });
      }

      if (method === 'PUT' && body) {
        // Update matching entry in store
        const entry = entries.find(e =>
          e.variety.toLowerCase() === variety.toLowerCase() &&
          e.process.toLowerCase() === process.toLowerCase() &&
          (!season || (e.harvestSeason || '').toLowerCase() === season.toLowerCase())
        );
        if (entry) {
          // Merge body properties into the entry
          if (body.geoProperties) {
            entry.MorphologicalProperties = {
              length: { value: parseFloat(body.geoProperties.length) || 0, unit: "mm", description: "Average grain length" },
              breadth: { value: parseFloat(body.geoProperties.breadth) || 0, unit: "mm", description: "Average grain breadth" },
              weight: { value: parseFloat(body.geoProperties.weight) || 0, unit: "mg", description: "Thousand grain weight" },
              aspectRatio: { value: parseFloat(body.geoProperties.aspectRatio) || 0, unit: null, description: "Length to breadth ratio" },
              hardness: { value: parseFloat(body.geoProperties.hardness) || 0, unit: "N", description: "Grain hardness" },
            };
          }
          if (body.chemicalProperties) {
            entry.chemicalProperties = {
              protein: { value: parseFloat(body.chemicalProperties.protein) || 0, unit: "%", description: "Protein content" },
              carbohydrate: { value: parseFloat(body.chemicalProperties.carbohydrate) || 0, unit: "%", description: "Carbohydrate content" },
              vitamin: { value: parseFloat(body.chemicalProperties.vitamin) || 0, unit: "mg/100g", description: "Vitamin content" },
              mineral: { value: parseFloat(body.chemicalProperties.mineral) || 0, unit: "%", description: "Mineral content" },
              lipids: { value: parseFloat(body.chemicalProperties.lipids) || 0, unit: "%", description: "Lipid content" },
            };
          }
          if (body.gmadProperties) {
            entry.gmadProperties = {
              gelatinization: { value: parseFloat(body.gmadProperties.gelatinization) || 0, unit: "°C", description: "Gelatinization temperature" },
              moisture: { value: parseFloat(body.gmadProperties.moisture) || 0, unit: "%", description: "Moisture content" },
              age: { value: parseFloat(body.gmadProperties.age) || 0, unit: "months", description: "Grain age" },
              density: { value: parseFloat(body.gmadProperties.density) || 0, unit: "g/cm³", description: "Grain density" },
            };
          }
          if (body.customProperties) entry.customProperties = body.customProperties;
          if (body.category) entry.category = body.category;
          if (body.grainType) entry.grainType = body.grainType;
          entry.updatedAt = new Date().toISOString();
        }
        return makeResponse({ status: "success", message: "Grain info updated" });
      }

      // GET - find in store or return defaults
      const found = entries.find(e =>
        e.variety.toLowerCase() === variety.toLowerCase() &&
        e.process.toLowerCase() === process.toLowerCase() &&
        (!season || (e.harvestSeason || '').toLowerCase() === season.toLowerCase())
      );
      if (found) {
        return makeResponse({ status: "success", grain_info: found });
      }
      return makeResponse({ status: "error", message: "Not found" }, 404);
    }
    return null;
  },

  (url, method, body) => {
    if (url.pathname === '/api/raice_labz/grain-info' && method === 'POST' && body) {
      // Add new grain entry to the store
      const entries = getGrainEntries();
      const newEntry: any = {
        _id: `grain_entry_${String(entries.length + 1).padStart(3, '0')}_${Date.now()}`,
        grainInfoId: `GI-${String(entries.length + 1).padStart(4, '0')}`,
        variety: body.variety || "Unknown",
        process: body.process || "Unknown",
        harvestSeason: body.harvestSeason || undefined,
        month: body.month || undefined,
        category: body.category || undefined,
        grainType: body.grainType || undefined,
        MorphologicalProperties: body.geoProperties ? {
          length: { value: parseFloat(body.geoProperties.length) || 0, unit: "mm", description: "Average grain length" },
          breadth: { value: parseFloat(body.geoProperties.breadth) || 0, unit: "mm", description: "Average grain breadth" },
          weight: { value: parseFloat(body.geoProperties.weight) || 0, unit: "mg", description: "Thousand grain weight" },
          aspectRatio: { value: parseFloat(body.geoProperties.aspectRatio) || 0, unit: null, description: "Length to breadth ratio" },
          hardness: { value: parseFloat(body.geoProperties.hardness) || 0, unit: "N", description: "Grain hardness" },
        } : undefined,
        chemicalProperties: body.chemicalProperties ? {
          protein: { value: parseFloat(body.chemicalProperties.protein) || 0, unit: "%", description: "Protein content" },
          carbohydrate: { value: parseFloat(body.chemicalProperties.carbohydrate) || 0, unit: "%", description: "Carbohydrate content" },
          vitamin: { value: parseFloat(body.chemicalProperties.vitamin) || 0, unit: "mg/100g", description: "Vitamin content" },
          mineral: { value: parseFloat(body.chemicalProperties.mineral) || 0, unit: "%", description: "Mineral content" },
          lipids: { value: parseFloat(body.chemicalProperties.lipids) || 0, unit: "%", description: "Lipid content" },
        } : undefined,
        gmadProperties: body.gmadProperties ? {
          gelatinization: { value: parseFloat(body.gmadProperties.gelatinization) || 0, unit: "°C", description: "Gelatinization temperature" },
          moisture: { value: parseFloat(body.gmadProperties.moisture) || 0, unit: "%", description: "Moisture content" },
          age: { value: parseFloat(body.gmadProperties.age) || 0, unit: "months", description: "Grain age" },
          density: { value: parseFloat(body.gmadProperties.density) || 0, unit: "g/cm³", description: "Grain density" },
        } : undefined,
        customProperties: body.customProperties || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      entries.push(newEntry);
      return makeResponse({ status: "success", message: "Grain info saved successfully" });
    }
    if (url.pathname === '/api/raice_labz/grain-info' && method === 'POST') {
      return makeResponse({ status: "success", message: "Grain info saved successfully" });
    }
    return null;
  },

  // ---------- MODE CREATION ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/modes/procurement-analysis' && method === 'POST') {
      const modeId = generateModeId('IND-');
      return makeResponse({
        status: "success",
        data: createModeData(modeId, "procurement"),
      });
    }
    return null;
  },

  (url, method, body) => {
    if (url.pathname === '/api/raice_labz/modes/production-analysis' && method === 'POST') {
      const modeId = generateModeId('PROD-');
      // Track machines for this series
      const machines = body?.machines || body?.selectedMachines || [];
      seriesCompletedMachines[modeId] = [];
      seriesTotalMachines[modeId] = machines.length || 3;
      return makeResponse({
        status: "success",
        data: createModeData(modeId, "production"),
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/modes/milled-rice-analysis' && method === 'POST') {
      const modeId = generateModeId('MR-');
      return makeResponse({
        status: "success",
        data: createModeData(modeId, "milled-rice"),
      });
    }
    return null;
  },

  // ---------- MODE DETAILS ----------
  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/modes\/([^/]+)$/);
    if (match && method === 'GET') {
      const modeId = match[1];
      return makeResponse({
        status: "success",
        data: createModeData(modeId, modeId.startsWith('PROD') ? 'production' : modeId.startsWith('MR') ? 'milled-rice' : 'procurement'),
      });
    }
    return null;
  },

  // ---------- TRIAL MANAGEMENT ----------
  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/analysis\/mode\/([^/]+)\/start-trial$/);
    if (match && method === 'POST') {
      const modeId = match[1];
      if (!trialCounter[modeId]) trialCounter[modeId] = 0;
      trialCounter[modeId]++;
      trialRunning[modeId] = true;
      return makeResponse({
        status: "success",
        data: {
          trialNumber: trialCounter[modeId],
          trialId: `${modeId}-TRIAL-${trialCounter[modeId]}`,
          sessionStatus: "running",
          startedAt: new Date().toISOString(),
        },
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/analysis\/mode\/([^/]+)\/stop-trial$/);
    if (match && method === 'POST') {
      const modeId = match[1];
      trialRunning[modeId] = false;
      return makeResponse({
        status: "success",
        data: {
          trialNumber: trialCounter[modeId] || 1,
          trialId: `${modeId}-TRIAL-${trialCounter[modeId] || 1}`,
          sessionStatus: "completed",
          stoppedAt: new Date().toISOString(),
          durationSeconds: 120,
        },
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/analysis\/mode\/([^/]+)\/current-trial$/);
    if (match) {
      const modeId = match[1];
      return makeResponse({
        status: "success",
        data: {
          trialNumber: trialCounter[modeId] || 1,
          trialId: `${modeId}-TRIAL-${trialCounter[modeId] || 1}`,
          sessionStatus: trialRunning[modeId] ? "running" : "completed",
          startedAt: new Date().toISOString(),
        },
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/analysis\/mode\/([^/]+)\/trials$/);
    if (match) {
      const modeId = match[1];
      return makeResponse({
        status: "success",
        data: {
          modeId,
          trials: generateTrialData(modeId, trialCounter[modeId] || 2),
        },
      });
    }
    return null;
  },

  // ---------- GRAIN STATISTICS & DISTRIBUTION ----------
  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/grains\/mode\/([^/]+)\/statistics$/);
    if (match) {
      return makeResponse({
        status: "success",
        data: generateDimensionStats(match[1]),
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/grains\/mode\/([^/]+)\/distribution$/);
    if (match) {
      return makeResponse({
        status: "success",
        data: generateDistributionData(),
      });
    }
    return null;
  },

  // ---------- VIDEO (demo - not available) ----------
  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/sessions\/video\/([^/]+)\/exists$/);
    if (match) {
      return makeResponse({
        status: "success",
        modeId: match[1],
        trials: { "1": { exists: false }, "2": { exists: false } },
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/sessions\/video\/([^/]+)\/machines$/);
    if (match) {
      return makeResponse({ status: "success", machines: [] });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/sessions\/video\/([^/]+)$/);
    if (match) {
      return makeResponse({ status: "error", message: "Video not available in demo mode" }, 404);
    }
    return null;
  },

  // ---------- PRODUCTION SERIES (stateful) ----------
  (url, method, body) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/modes\/([^/]+)\/advance-machine$/);
    if (match && method === 'POST') {
      const modeId = match[1];
      const machineName = body?.machineName || body?.currentMachine || "Unknown";

      // Initialize tracking if not present
      if (!seriesCompletedMachines[modeId]) seriesCompletedMachines[modeId] = [];
      if (!seriesTotalMachines[modeId]) seriesTotalMachines[modeId] = 3;

      // Add to completed (avoid duplicates)
      if (!seriesCompletedMachines[modeId].includes(machineName)) {
        seriesCompletedMachines[modeId].push(machineName);
      }

      const completed = seriesCompletedMachines[modeId];
      const total = seriesTotalMachines[modeId];
      const allComplete = completed.length >= total;

      return makeResponse({
        status: "success",
        allComplete,
        data: {
          modeId,
          completedMachines: completed,
          allComplete,
          remainingCount: Math.max(0, total - completed.length),
        },
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/modes/production/completed-series') {
      return makeResponse({ status: "success", completedSeries: [], incompleteSeries: [] });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/modes\/([^/]+)\/series-status$/);
    if (match) {
      return makeResponse({
        status: "success",
        data: {
          modeId: match[1],
          isComplete: false,
          completedMachines: [],
          remainingMachines: ["CLEAN - I", "WHITENER 1", "SILKY 1"],
          totalMachines: 3,
        },
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/modes\/([^/]+)\/series-detailed-report$/);
    if (match) {
      const modeId = match[1];
      // Build machine list from completed machines, or fall back to defaults
      const completed = seriesCompletedMachines[modeId] || ["CLEAN - I", "WHITENER 1", "SILKY 1"];
      const machineNames = completed.length > 0 ? completed : ["CLEAN - I", "WHITENER 1", "SILKY 1"];

      const machines = machineNames.map((name, idx) => {
        const trials = generateTrialData(`${modeId}_M${idx}`, 2);
        const aggregated = aggregateTrialMetrics(trials);
        return {
          machineName: name,
          machineIndex: idx,
          status: "completed",
          trials,
          aggregatedMetrics: aggregated,
        };
      });

      // Build overall aggregated from all machine aggregates
      const overallAggregated = aggregateTrialMetrics(
        machines.flatMap(m => m.trials)
      );

      return makeResponse({
        status: "success",
        modeId,
        machines,
        overallAggregated,
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/modes\/([^/]+)\/quit-series$/);
    if (match && method === 'POST') {
      return makeResponse({ status: "success", message: "Series quit" });
    }
    return null;
  },

  // ---------- TMA ----------
  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/tma\/mode\/([^/]+)\/(start-trial|stop-trial)$/);
    if (match && method === 'POST') {
      return makeResponse({
        status: "success",
        data: { trialNumber: 1, sessionStatus: match[2] === 'start-trial' ? 'running' : 'completed' },
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname.startsWith('/api/tma/')) {
      return makeResponse({ status: "success", message: "TMA operation completed (demo)" });
    }
    return null;
  },

  // ---------- DATABASE VIEWER ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/database-viewer/collections') {
      return makeResponse({
        status: "success",
        collections: ["grain_analysis", "modes", "grain_info", "settings", "tma_analysis"],
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/database-viewer/grains/query' && method === 'POST') {
      return makeResponse({
        status: "success",
        count: 5,
        data: generateGrainQueryData(5),
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/database-viewer/grains/export' && method === 'POST') {
      return new Response("mode_id,variety,process,head_rice,brokens\nIND-0001,Basmati 1121,Milled,68.3,12.7", {
        status: 200,
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="export.csv"' },
      });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/raice_labz/database-viewer/tma-ids' && method === 'POST') {
      return makeResponse({ status: "success", tmaIds: ["TMA-001", "TMA-002", "TMA-003"] });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/database-viewer\/([^/]+)\/query$/);
    if (match && method === 'POST') {
      return makeResponse({
        status: "success",
        count: 3,
        data: [
          { _id: "doc1", collection: match[1], sampleField: "value1" },
          { _id: "doc2", collection: match[1], sampleField: "value2" },
          { _id: "doc3", collection: match[1], sampleField: "value3" },
        ],
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/database-viewer\/([^/]+)\/export$/);
    if (match && method === 'POST') {
      return new Response("field1,field2\nval1,val2", {
        status: 200,
        headers: { 'Content-Type': 'text/csv' },
      });
    }
    return null;
  },

  // ---------- HEALTH CHECKS (LoadingPage) ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/debug/database-connection') {
      return makeResponse({ status: "success", connection_status: "connected", message: "Database connection healthy" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/models/health') {
      return makeResponse({ status: "healthy", ready: true, models: ["grain_detector", "classifier"], message: "All models loaded" });
    }
    return null;
  },

  // ---------- MODBUS RTU (GET variants for connect/disconnect) ----------
  (url, method) => {
    if (url.pathname === '/api/modbus_rtu/connect' && method === 'GET') {
      modbusConnected = true;
      return makeResponse({ status: "success", message: "Modbus RTU connected (demo)" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/modbus_rtu/disconnect' && method === 'GET') {
      modbusConnected = false;
      return makeResponse({ status: "success", message: "Modbus RTU disconnected (demo)" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/modbus_rtu/signal-counts') {
      return makeResponse({ tx: 1247, rx_ok: 1245, rx_err: 2 });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname.match(/^\/api\/modbus_rtu\/machine\/(start|stop)$/) && method === 'POST') {
      return makeResponse({ status: "success", message: "Machine command executed (demo)" });
    }
    return null;
  },

  // ---------- ANALYSIS CONTROL (pause/resume/restart/skip) ----------
  (url, method) => {
    if (url.pathname === '/api/pause' && method === 'POST') {
      mockAnalysisPaused = true;
      return makeResponse({ status: "success", message: "Analysis paused" });
    }
    return null;
  },

  (url, method) => {
    if (url.pathname === '/api/resume' && method === 'POST') {
      mockAnalysisPaused = false;
      return makeResponse({ status: "success", message: "Analysis resumed" });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/analysis\/mode\/([^/]+)\/restart-trial$/);
    if (match && method === 'POST') {
      const modeId = match[1];
      trialRunning[modeId] = true;
      return makeResponse({
        status: "success",
        data: {
          trialNumber: trialCounter[modeId] || 1,
          trialId: `${modeId}-TRIAL-${trialCounter[modeId] || 1}`,
          sessionStatus: "running",
          restartedAt: new Date().toISOString(),
        },
      });
    }
    return null;
  },

  (url, method) => {
    const match = url.pathname.match(/^\/api\/raice_labz\/analysis\/mode\/([^/]+)\/skip-trial$/);
    if (match && method === 'POST') {
      const modeId = match[1];
      trialRunning[modeId] = false;
      return makeResponse({
        status: "success",
        data: {
          trialNumber: trialCounter[modeId] || 1,
          trialId: `${modeId}-TRIAL-${trialCounter[modeId] || 1}`,
          sessionStatus: "skipped",
          skippedAt: new Date().toISOString(),
        },
      });
    }
    return null;
  },

  // ---------- GRAIN CLASSES ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/grains/classes') {
      return makeResponse([
        "head_rice", "three_quarter_head_rice", "half_brokens",
        "quarter_fine_brokens", "tips", "second_one", "tibar",
        "dubar", "mini_dubar", "mongra", "mini_mongra", "nakku",
        "chalky", "discolored", "immature_green", "foreign_matter"
      ]);
    }
    return null;
  },

  // ---------- DATABASE VIEWER: TMA IDs (GET variant) ----------
  (url, method) => {
    if (url.pathname === '/api/raice_labz/database-viewer/tma-ids' && method === 'GET') {
      return makeResponse({ status: "success", tmaIds: ["TMA-001", "TMA-002", "TMA-003"] });
    }
    return null;
  },
];

// ============================================================
// DATA GENERATORS
// ============================================================

function createModeData(modeId: string, modeType: string) {
  return {
    modeId,
    modeType,
    variety: "Basmati 1121",
    process: "Milled",
    harvestSeason: "Kharif 2024",
    month: "January",
    riceMill: "RAICE Premium Rice Mill",
    operatorName: "Demo Operator",
    location: "Bangalore, Karnataka",
    testDate: new Date().toLocaleDateString('en-GB'),
    testTime: new Date().toLocaleTimeString('en-GB'),
    samplingMethod: "Random",
    noOfSamples: 3,
    sampleWeight: "250",
    chalkyThreshold: 20,
    segmentationConfig: {
      categories: [
        { key: "head_rice", label: "Head Rice", ratio: 1.0, group: "headRice" },
        { key: "three_quarter_head_rice", label: "3/4 Head Rice", ratio: 0.75, group: "headRice" },
        { key: "half_brokens", label: "1/2 Brokens", ratio: 0.5, group: "brokens" },
        { key: "quarter_fine_brokens", label: "1/4 & Fine Brokens", ratio: 0.25, group: "brokens" },
        { key: "tips", label: "Tips", ratio: 0.125, group: "brokens" },
      ],
    },
    createdAt: new Date().toISOString(),
    series: modeType === "production" ? "Line A - Main Production" : undefined,
    machines: modeType === "production" ? ["CLEAN - I", "WHITENER 1", "SILKY 1"] : undefined,
  };
}

function generateTrialData(modeId: string, numTrials: number) {
  const trials = [];
  for (let i = 1; i <= numTrials; i++) {
    const headRice = 4200 + Math.floor(Math.random() * 600);
    const threeFourth = 900 + Math.floor(Math.random() * 400);
    const halfBrokens = 600 + Math.floor(Math.random() * 300);
    const quarterFine = 200 + Math.floor(Math.random() * 200);
    const tips = 100 + Math.floor(Math.random() * 150);
    const chalky = 100 + Math.floor(Math.random() * 100);
    const discolored = 50 + Math.floor(Math.random() * 80);
    const immature = 20 + Math.floor(Math.random() * 40);
    const foreignTotal = 10 + Math.floor(Math.random() * 20);
    const totalGrains = headRice + threeFourth + halfBrokens + quarterFine + tips + chalky + discolored + immature + foreignTotal;

    trials.push({
      trialId: `${modeId}-TRIAL-${i}`,
      trialNumber: i,
      sessionStatus: "completed",
      GrainMetrics: {
        goodRice: {
          headRice,
          threeFourthHead: threeFourth,
          halfBrokens,
          quarterFineBrokens: quarterFine,
          tips,
          secondOne: 0,
          tibar: 0,
          dubar: 0,
          miniDubar: 0,
          mongra: 0,
          miniMongra: 0,
          nakku: 0,
        },
        rejections: {
          chalky,
          chalkyBellyCore: Math.floor(chalky * 0.6),
          yellow: Math.floor(discolored * 0.3),
          black: Math.floor(discolored * 0.1),
          immatureGreen: immature,
          peckyGrains: Math.floor(immature * 0.3),
          discolored,
          chalkyWhole: Math.floor(chalky * 0.4),
          blackTips: Math.floor(discolored * 0.05),
          burnt: 0,
          spot: Math.floor(discolored * 0.05),
          discoloration: Math.floor(discolored * 0.1),
        },
        foreignMatter: {
          total: foreignTotal,
          red: Math.floor(foreignTotal * 0.2),
          husk: Math.floor(foreignTotal * 0.15),
          paddy: Math.floor(foreignTotal * 0.1),
          chaff: Math.floor(foreignTotal * 0.1),
          straw: Math.floor(foreignTotal * 0.05),
          sticks: Math.floor(foreignTotal * 0.05),
          brownRice: Math.floor(foreignTotal * 0.15),
          stones: Math.floor(foreignTotal * 0.05),
          mud: Math.floor(foreignTotal * 0.05),
          thread: 0,
          plastic: 0,
          metals: 0,
          glass: 0,
        },
        totalGrains,
      },
    });
  }
  return trials;
}

function aggregateTrialMetrics(trials: any[]): any {
  const agg: any = {
    goodRice: { headRice: 0, threeFourthHead: 0, halfBrokens: 0, quarterFineBrokens: 0, tips: 0, secondOne: 0, tibar: 0, dubar: 0, miniDubar: 0, mongra: 0, miniMongra: 0, nakku: 0 },
    rejections: { chalky: 0, chalkyBellyCore: 0, yellow: 0, black: 0, immatureGreen: 0, peckyGrains: 0, discolored: 0, chalkyWhole: 0, blackTips: 0, burnt: 0, spot: 0, discoloration: 0 },
    foreignMatter: { total: 0, red: 0, husk: 0, paddy: 0, chaff: 0, straw: 0, sticks: 0, brownRice: 0, stones: 0, mud: 0, thread: 0, plastic: 0, metals: 0, glass: 0 },
    totalGrains: 0,
  };
  for (const t of trials) {
    const m = t.GrainMetrics;
    if (!m) continue;
    agg.totalGrains += m.totalGrains || 0;
    for (const key of Object.keys(agg.goodRice)) {
      agg.goodRice[key] += m.goodRice?.[key] || 0;
    }
    for (const key of Object.keys(agg.rejections)) {
      agg.rejections[key] += m.rejections?.[key] || 0;
    }
    for (const key of Object.keys(agg.foreignMatter)) {
      agg.foreignMatter[key] += m.foreignMatter?.[key] || 0;
    }
  }
  return agg;
}

function generateDimensionStats(modeId: string) {
  const makeDimStats = (baseMean: number, baseStd: number) => ({
    mean: +(baseMean + (Math.random() - 0.5) * 0.1).toFixed(3),
    mode: +(baseMean + (Math.random() - 0.5) * 0.05).toFixed(3),
    median: +(baseMean + (Math.random() - 0.5) * 0.05).toFixed(3),
    min: +(baseMean - baseStd * 2).toFixed(3),
    max: +(baseMean + baseStd * 2).toFixed(3),
    std: +baseStd.toFixed(3),
  });

  const makeTrialStats = (trialNum: number) => ({
    trialNumber: trialNum,
    grainCount: 6800 + Math.floor(Math.random() * 1000),
    dimensions: {
      length_mm: makeDimStats(7.2, 0.35),
      width_mm: makeDimStats(1.85, 0.12),
      aspect_ratio: makeDimStats(3.89, 0.45),
    },
    headRiceDimensions: {
      length_mm: { mean: 7.3 + Math.random() * 0.05, median: 7.32 },
      width_mm: { mean: 1.87 + Math.random() * 0.02, median: 1.88 },
      aspect_ratio: { mean: 3.91 + Math.random() * 0.03, median: 3.90 },
    },
    averageWhitenessIndex: +(31 + Math.random() * 4).toFixed(1),
  });

  return {
    modeId,
    totalGrains: 14200 + Math.floor(Math.random() * 1000),
    trialStats: { "1": makeTrialStats(1), "2": makeTrialStats(2) },
    overallStats: {
      grainCount: 14200 + Math.floor(Math.random() * 1000),
      dimensions: {
        length_mm: makeDimStats(7.22, 0.346),
        width_mm: makeDimStats(1.855, 0.12),
        aspect_ratio: makeDimStats(3.895, 0.445),
      },
      headRiceDimensions: {
        length_mm: { mean: 7.31, median: 7.325 },
        width_mm: { mean: 1.875, median: 1.885 },
        aspect_ratio: { mean: 3.915, median: 3.905 },
      },
      averageWhitenessIndex: 32.8,
    },
  };
}

function generateDistributionData() {
  return {
    lengthHistogram: [
      { bin: "6.0-6.2", count: 145 },
      { bin: "6.2-6.4", count: 285 },
      { bin: "6.4-6.6", count: 512 },
      { bin: "6.6-6.8", count: 1240 },
      { bin: "6.8-7.0", count: 2450 },
      { bin: "7.0-7.2", count: 3890 },
      { bin: "7.2-7.4", count: 3450 },
      { bin: "7.4-7.6", count: 2100 },
      { bin: "7.6-7.8", count: 890 },
      { bin: "7.8-8.0", count: 148 },
    ],
    bisGrading: [
      { grade: "Grade A", count: 4500, percentage: 30.8 },
      { grade: "Grade B", count: 5100, percentage: 34.9 },
      { grade: "Grade C", count: 3400, percentage: 23.3 },
      { grade: "Below C", count: 1610, percentage: 11.0 },
    ],
    classCounts: [
      { name: "Head Rice", count: 4550 },
      { name: "3/4 Head", count: 1150 },
      { name: "1/2 Broken", count: 825 },
      { name: "Fine Broken", count: 290 },
      { name: "Tips", count: 185 },
    ],
    uniformity: { cv: 4.78, mean: 7.225, std: 0.346, label: "Good Uniformity" },
    trialSummary: [
      { trial: 1, totalGrains: 7320, headRicePct: 61.5 },
      { trial: 2, totalGrains: 7290, headRicePct: 63.2 },
    ],
  };
}

function generateAnalyticsData(count: number) {
  const data = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i * 2);
    const headRice = +(60 + Math.random() * 15).toFixed(1);
    data.push({
      date: d.toISOString().split('T')[0],
      modeId: `IND-${String(i + 1).padStart(4, '0')}-${d.toLocaleDateString('en-GB').replace(/\//g, '')}-A`,
      modeType: ["procurement", "production", "milled-rice"][i % 3],
      machineName: MACHINES[i % MACHINES.length],
      sessionId: `session_${String(i + 1).padStart(3, '0')}`,
      sessionStatus: "completed",
      totalGrains: 5000 + Math.floor(Math.random() * 5000),
      headRice,
      threeFourthHead: +(5 + Math.random() * 8).toFixed(1),
      halfBrokens: +(3 + Math.random() * 5).toFixed(1),
      quarterFineBrokens: +(1 + Math.random() * 3).toFixed(1),
      tips: +(0.5 + Math.random() * 1.5).toFixed(1),
      secondOne: +(2 + Math.random() * 5).toFixed(1),
      tibar: +(1 + Math.random() * 4).toFixed(1),
      dubar: +(0.5 + Math.random() * 3).toFixed(1),
      miniDubar: +(0.2 + Math.random() * 1.5).toFixed(1),
      mongra: +(0.1 + Math.random() * 1).toFixed(1),
      miniMongra: +(0.1 + Math.random() * 0.8).toFixed(1),
      nakku: +(0 + Math.random() * 0.5).toFixed(1),
      goodRiceTotal: +(headRice + 10 + Math.random() * 5).toFixed(1),
      chalkyBellyCore: +(1 + Math.random() * 3).toFixed(1),
      yellow: +(0.5 + Math.random() * 2).toFixed(1),
      black: +(0.1 + Math.random() * 1).toFixed(1),
      immatureGreen: +(0.2 + Math.random() * 0.8).toFixed(1),
      peckyGrains: +(0.1 + Math.random() * 0.5).toFixed(1),
      discolored: +(0.1 + Math.random() * 0.5).toFixed(1),
      chalkyWhole: +(0.05 + Math.random() * 0.3).toFixed(1),
      blackTips: +(0 + Math.random() * 0.2).toFixed(1),
      burnt: 0,
      spot: +(0 + Math.random() * 0.1).toFixed(1),
      discoloration: +(0 + Math.random() * 0.1).toFixed(1),
      rejectionsTotal: +(3 + Math.random() * 5).toFixed(1),
      red: +(0.5 + Math.random() * 1.5).toFixed(1),
      husk: +(0.3 + Math.random() * 1).toFixed(1),
      paddy: +(0.1 + Math.random() * 0.5).toFixed(1),
      chaff: +(0.1 + Math.random() * 0.3).toFixed(1),
      straw: +(0 + Math.random() * 0.2).toFixed(1),
      sticks: +(0 + Math.random() * 0.1).toFixed(1),
      brownRice: +(0.2 + Math.random() * 0.8).toFixed(1),
      stones: +(0 + Math.random() * 0.1).toFixed(1),
      mud: +(0 + Math.random() * 0.05).toFixed(1),
      thread: 0,
      plastic: 0,
      metals: 0,
      glass: 0,
      foreignMatterTotal: +(1.5 + Math.random() * 3).toFixed(1),
    });
  }
  return data;
}

function generateGrainQueryData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    _id: `grain_${i + 1}`,
    mode_id: `IND-${String(i + 1).padStart(4, '0')}-250325-A`,
    variety: VARIETIES[i % VARIETIES.length],
    process: PROCESSES[i % PROCESSES.length],
    head_rice_pct: +(60 + Math.random() * 15).toFixed(1),
    broken_pct: +(8 + Math.random() * 10).toFixed(1),
    whiteness_index: +(28 + Math.random() * 10).toFixed(1),
    total_grains: 5000 + Math.floor(Math.random() * 5000),
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

function generateAllGrainEntries() {
  const entries: any[] = [];
  const grainDb = [
    // Basmati - Long Grain
    { variety: "1121", process: "Raw", category: "basmati", grainType: "long-grain", harvestSeason: "Kharif 2024", month: "October",
      morpho: { length: 8.35, breadth: 1.75, weight: 21.5, aspectRatio: 4.77, hardness: 42 },
      chem: { protein: 7.8, carbohydrate: 77.5, vitamin: 0.35, mineral: 1.2, lipids: 2.5 },
      gmad: { gelatinization: 68, moisture: 12.5, age: 12, density: 1.48 } },
    { variety: "1121", process: "Double-Boiled", category: "basmati", grainType: "long-grain", harvestSeason: "Kharif 2024", month: "November",
      morpho: { length: 8.40, breadth: 1.78, weight: 22.0, aspectRatio: 4.72, hardness: 48 },
      chem: { protein: 8.1, carbohydrate: 76.8, vitamin: 0.30, mineral: 1.3, lipids: 2.6 },
      gmad: { gelatinization: 72, moisture: 13.0, age: 10, density: 1.50 } },
    { variety: "1509", process: "Raw", category: "basmati", grainType: "long-grain", harvestSeason: "Rabi 2024-25", month: "March",
      morpho: { length: 7.95, breadth: 1.70, weight: 20.8, aspectRatio: 4.68, hardness: 40 },
      chem: { protein: 7.5, carbohydrate: 78.2, vitamin: 0.38, mineral: 1.1, lipids: 2.3 },
      gmad: { gelatinization: 67, moisture: 12.8, age: 8, density: 1.46 } },
    { variety: "1509", process: "Single-Boiled", category: "basmati", grainType: "long-grain", harvestSeason: "Kharif 2025", month: "September",
      morpho: { length: 8.00, breadth: 1.72, weight: 21.2, aspectRatio: 4.65, hardness: 45 },
      chem: { protein: 7.9, carbohydrate: 77.0, vitamin: 0.32, mineral: 1.25, lipids: 2.7 },
      gmad: { gelatinization: 70, moisture: 13.2, age: 6, density: 1.49 } },
    { variety: "Pusa-Basmati", process: "Raw", category: "basmati", grainType: "long-grain", harvestSeason: "Kharif 2024", month: "October",
      morpho: { length: 7.60, breadth: 1.65, weight: 19.5, aspectRatio: 4.61, hardness: 38 },
      chem: { protein: 7.2, carbohydrate: 79.0, vitamin: 0.40, mineral: 1.0, lipids: 2.2 },
      gmad: { gelatinization: 66, moisture: 12.2, age: 14, density: 1.44 } },
    { variety: "Sharbati", process: "Raw", category: "basmati", grainType: "long-grain", harvestSeason: "Rabi 2024-25", month: "February",
      morpho: { length: 7.80, breadth: 1.68, weight: 20.0, aspectRatio: 4.64, hardness: 41 },
      chem: { protein: 7.6, carbohydrate: 78.5, vitamin: 0.36, mineral: 1.15, lipids: 2.4 },
      gmad: { gelatinization: 69, moisture: 12.6, age: 10, density: 1.47 } },

    // Non-Basmati - Medium Grain
    { variety: "Sona-Masuri", process: "Raw", category: "non-basmati", grainType: "medium-grain", harvestSeason: "Kharif 2024", month: "November",
      morpho: { length: 5.20, breadth: 2.10, weight: 18.5, aspectRatio: 2.48, hardness: 50 },
      chem: { protein: 6.8, carbohydrate: 80.2, vitamin: 0.28, mineral: 0.9, lipids: 1.8 },
      gmad: { gelatinization: 72, moisture: 13.5, age: 8, density: 1.52 } },
    { variety: "Sona-Masuri", process: "Single-Boiled", category: "non-basmati", grainType: "medium-grain", harvestSeason: "Kharif 2024", month: "December",
      morpho: { length: 5.25, breadth: 2.12, weight: 19.0, aspectRatio: 2.48, hardness: 52 },
      chem: { protein: 7.0, carbohydrate: 79.8, vitamin: 0.25, mineral: 0.95, lipids: 1.9 },
      gmad: { gelatinization: 74, moisture: 14.0, age: 6, density: 1.54 } },
    { variety: "BPT", process: "Raw", category: "non-basmati", grainType: "medium-grain", harvestSeason: "Kharif 2025", month: "October",
      morpho: { length: 5.10, breadth: 2.05, weight: 17.8, aspectRatio: 2.49, hardness: 48 },
      chem: { protein: 6.5, carbohydrate: 81.0, vitamin: 0.30, mineral: 0.85, lipids: 1.7 },
      gmad: { gelatinization: 71, moisture: 13.8, age: 4, density: 1.51 } },
    { variety: "HMT", process: "Double-Boiled", category: "non-basmati", grainType: "medium-grain", harvestSeason: "Rabi 2024-25", month: "April",
      morpho: { length: 5.30, breadth: 2.15, weight: 19.2, aspectRatio: 2.47, hardness: 55 },
      chem: { protein: 7.2, carbohydrate: 79.5, vitamin: 0.22, mineral: 1.0, lipids: 2.0 },
      gmad: { gelatinization: 75, moisture: 14.2, age: 10, density: 1.55 } },
    { variety: "Kolam", process: "Raw", category: "non-basmati", grainType: "medium-grain", harvestSeason: "Kharif 2024", month: "November",
      morpho: { length: 5.00, breadth: 2.00, weight: 17.0, aspectRatio: 2.50, hardness: 46 },
      chem: { protein: 6.3, carbohydrate: 81.5, vitamin: 0.32, mineral: 0.88, lipids: 1.6 },
      gmad: { gelatinization: 70, moisture: 13.0, age: 12, density: 1.50 } },

    // Non-Basmati - Short Grain
    { variety: "Ponni", process: "Raw", category: "non-basmati", grainType: "short-grain", harvestSeason: "Kharif 2024", month: "December",
      morpho: { length: 4.50, breadth: 2.40, weight: 16.5, aspectRatio: 1.88, hardness: 58 },
      chem: { protein: 6.0, carbohydrate: 82.5, vitamin: 0.20, mineral: 0.80, lipids: 1.5 },
      gmad: { gelatinization: 76, moisture: 14.5, age: 6, density: 1.58 } },
    { variety: "Ponni", process: "Single-Boiled", category: "non-basmati", grainType: "short-grain", harvestSeason: "Rabi 2024-25", month: "January",
      morpho: { length: 4.55, breadth: 2.42, weight: 17.0, aspectRatio: 1.88, hardness: 60 },
      chem: { protein: 6.2, carbohydrate: 82.0, vitamin: 0.18, mineral: 0.82, lipids: 1.6 },
      gmad: { gelatinization: 78, moisture: 14.8, age: 8, density: 1.60 } },
    { variety: "Jaya", process: "Raw", category: "non-basmati", grainType: "short-grain", harvestSeason: "Kharif 2025", month: "October",
      morpho: { length: 4.60, breadth: 2.35, weight: 16.8, aspectRatio: 1.96, hardness: 56 },
      chem: { protein: 6.4, carbohydrate: 81.8, vitamin: 0.24, mineral: 0.85, lipids: 1.55 },
      gmad: { gelatinization: 74, moisture: 14.0, age: 4, density: 1.56 } },
    { variety: "Matta", process: "Double-Boiled", category: "non-basmati", grainType: "short-grain", harvestSeason: "Kharif 2024", month: "November",
      morpho: { length: 4.70, breadth: 2.50, weight: 18.0, aspectRatio: 1.88, hardness: 62 },
      chem: { protein: 7.0, carbohydrate: 80.0, vitamin: 0.15, mineral: 1.0, lipids: 2.0 },
      gmad: { gelatinization: 80, moisture: 15.0, age: 14, density: 1.62 } },
    { variety: "Gobindobhog", process: "Raw", category: "non-basmati", grainType: "short-grain", harvestSeason: "Kharif 2024", month: "October",
      morpho: { length: 4.20, breadth: 2.60, weight: 15.5, aspectRatio: 1.62, hardness: 52 },
      chem: { protein: 6.8, carbohydrate: 80.5, vitamin: 0.22, mineral: 0.92, lipids: 1.8 },
      gmad: { gelatinization: 73, moisture: 13.5, age: 10, density: 1.55 } },

    // Non-Basmati - Long Grain
    { variety: "IR-64", process: "Raw", category: "non-basmati", grainType: "long-grain", harvestSeason: "Kharif 2024", month: "November",
      morpho: { length: 6.80, breadth: 2.00, weight: 20.5, aspectRatio: 3.40, hardness: 44 },
      chem: { protein: 7.0, carbohydrate: 79.0, vitamin: 0.30, mineral: 1.0, lipids: 2.0 },
      gmad: { gelatinization: 70, moisture: 13.0, age: 8, density: 1.48 } },
    { variety: "PR-11", process: "SAP", category: "non-basmati", grainType: "long-grain", harvestSeason: "Rabi 2024-25", month: "March",
      morpho: { length: 6.90, breadth: 1.95, weight: 20.0, aspectRatio: 3.54, hardness: 46 },
      chem: { protein: 7.3, carbohydrate: 78.5, vitamin: 0.28, mineral: 1.05, lipids: 2.1 },
      gmad: { gelatinization: 71, moisture: 13.2, age: 6, density: 1.49 } },
  ];

  for (let i = 0; i < grainDb.length; i++) {
    const g = grainDb[i];
    entries.push({
      _id: `grain_entry_${String(i + 1).padStart(3, '0')}`,
      grainInfoId: `GI-${String(i + 1).padStart(4, '0')}`,
      variety: g.variety,
      process: g.process,
      harvestSeason: g.harvestSeason,
      month: g.month,
      category: g.category,
      grainType: g.grainType,
      MorphologicalProperties: {
        length: { value: g.morpho.length, unit: "mm", description: "Average grain length" },
        breadth: { value: g.morpho.breadth, unit: "mm", description: "Average grain breadth" },
        weight: { value: g.morpho.weight, unit: "mg", description: "Thousand grain weight" },
        aspectRatio: { value: g.morpho.aspectRatio, unit: null, description: "Length to breadth ratio" },
        hardness: { value: g.morpho.hardness, unit: "N", description: "Grain hardness" },
      },
      chemicalProperties: {
        protein: { value: g.chem.protein, unit: "%", description: "Protein content" },
        carbohydrate: { value: g.chem.carbohydrate, unit: "%", description: "Carbohydrate content" },
        vitamin: { value: g.chem.vitamin, unit: "mg/100g", description: "Vitamin content" },
        mineral: { value: g.chem.mineral, unit: "%", description: "Mineral content" },
        lipids: { value: g.chem.lipids, unit: "%", description: "Lipid content" },
      },
      gmadProperties: {
        gelatinization: { value: g.gmad.gelatinization, unit: "°C", description: "Gelatinization temperature" },
        moisture: { value: g.gmad.moisture, unit: "%", description: "Moisture content" },
        age: { value: g.gmad.age, unit: "months", description: "Grain age" },
        density: { value: g.gmad.density, unit: "g/cm³", description: "Grain density" },
      },
      customProperties: [],
      createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
      isActive: true,
    });
  }
  return entries;
}

// ============================================================
// FETCH INTERCEPTOR
// ============================================================

const originalFetch = window.fetch;

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let urlString: string;

  if (input instanceof Request) {
    urlString = input.url;
  } else if (input instanceof URL) {
    urlString = input.toString();
  } else {
    urlString = input;
  }

  // Handle relative URLs
  if (urlString.startsWith('/')) {
    urlString = `${window.location.origin}${urlString}`;
  }

  // Only intercept API calls
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return originalFetch(input, init);
  }

  // Only intercept /api/ calls (including calls to port 5000)
  if (!url.pathname.startsWith('/api')) {
    return originalFetch(input, init);
  }

  const method = (init?.method || 'GET').toUpperCase();
  let body: any = undefined;
  if (init?.body) {
    try {
      body = JSON.parse(init.body as string);
    } catch {
      body = init.body;
    }
  }

  console.log(`[MockAPI] ${method} ${url.pathname}`);

  // Try each route handler
  for (const handler of routes) {
    const response = handler(url, method, body);
    if (response) {
      return Promise.resolve(response);
    }
  }

  // Fallback: return a generic success for any unmatched /api/ calls
  console.warn(`[MockAPI] Unhandled: ${method} ${url.pathname} - returning generic success`);
  return Promise.resolve(makeResponse({ status: "success", message: "OK (mock fallback)" }));
}

// ============================================================
// SOCKET.IO MOCK
// ============================================================

class MockSocket {
  private listeners: Record<string, Function[]> = {};
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private segmentation = {
    headrice: 0, threefourthhead: 0, halfbrokens: 0, quarterfinebrokens: 0, tips: 0,
    secondone: 0, tibar: 0, dubar: 0, minidubar: 0, mongra: 0, minimongra: 0, nakku: 0,
  };
  private defective = {
    chalky: 0, yellow: 0, black: 0, immature: 0, peckygrains: 0, discolored: 0,
    blacktips: 0, burnt: 0, spot: 0, chalkywhole: 0, discoloration: 0,
  };
  private foreign = {
    red: 0, husk: 0, paddy: 0, chaff: 0, straw: 0, sticks: 0, brownrice: 0,
    stones: 0, mud: 0, thread: 0, plastic: 0, metals: 0, glass: 0, paper: 0, cardboard: 0,
  };
  connected = true;
  id = 'mock-socket-id';

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);

    // Auto-start emitting live updates when listeners are attached
    if ((event === 'grain_statistics' || event === 'statistics_update') && !this.intervalId) {
      this.startEmitting();
    }
    return this;
  }

  off(event: string, callback?: Function) {
    if (callback && this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
    return this;
  }

  emit(event: string, ...args: any[]) {
    console.log(`[MockSocket] emit: ${event}`, args);
    if (event === 'processing_paused') {
      mockAnalysisPaused = true;
    }
    if (event === 'processing_resumed') {
      mockAnalysisPaused = false;
    }
    // Handle request_stats by sending back stats in the structure expected by the UI
    if (event === 'request_stats') {
      setTimeout(() => this.emitStatisticsUpdate(), 80);
    }
    return this;
  }

  disconnect() {
    this.connected = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  connect() {
    this.connected = true;
    return this;
  }

  close() {
    this.disconnect();
  }

  removeAllListeners() {
    this.listeners = {};
    return this;
  }

  private startEmitting() {
    // Emit live stats every second for smooth charts/gauges
    this.intervalId = setInterval(() => {
      this.emitStatisticsUpdate();
    }, 1000);
  }

  private emitTo(event: string, data: any) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach((cb) => cb(data));
  }

  private incrementCounts() {
    const add = (max: number) => Math.floor(Math.random() * (max + 1));
    this.segmentation.headrice += 6 + add(8);
    this.segmentation.threefourthhead += add(3);
    this.segmentation.halfbrokens += add(2);
    this.segmentation.quarterfinebrokens += add(2);
    this.segmentation.tips += add(1);

    this.defective.chalky += add(2);
    this.defective.yellow += add(1);
    this.defective.black += add(1);
    this.defective.immature += add(1);
    this.defective.peckygrains += add(1);
    this.defective.discolored += add(1);

    this.foreign.red += add(1);
    this.foreign.husk += add(1);
    this.foreign.paddy += add(1);
    this.foreign.chaff += add(1);
    this.foreign.straw += add(1);
    this.foreign.brownrice += add(1);
    this.foreign.paper += add(1);
  }

  private buildPayload() {
    if (mockAnalysisRunning && !mockAnalysisPaused) {
      this.incrementCounts();
    }

    const goodTotal = Object.values(this.segmentation).reduce((s, v) => s + v, 0);
    const defectiveTotal = Object.values(this.defective).reduce((s, v) => s + v, 0);
    const foreignTotal = Object.values(this.foreign).reduce((s, v) => s + v, 0);
    const grandTotal = goodTotal + defectiveTotal + foreignTotal;

    return {
      timestamp: new Date().toISOString(),
      total_unique_objects: {
        total: grandTotal,
        goodrice: {
          total: goodTotal,
          segmentation: { ...this.segmentation },
          details: { ...this.segmentation },
        },
        defective: {
          total: defectiveTotal,
          details: { ...this.defective },
        },
        foreign: {
          total: foreignTotal,
          details: { ...this.foreign },
        },
      },
      qualityIndices: {
        whitenessIndex: +(31 + Math.random() * 5).toFixed(1),
        slenderRatio: +(3.7 + Math.random() * 0.7).toFixed(2),
        glossyIndex: +(74 + Math.random() * 9).toFixed(1),
        branPercentage: +(1.3 + Math.random() * 1.8).toFixed(1),
        degreeOfMilling: +(5.0 + Math.random() * 3.5).toFixed(1),
        degreeOfNutrition: +(5.5 + Math.random() * 3.5).toFixed(1),
      },
      cameraFps: mockAnalysisRunning ? 30 : 0,
      detectionsPerFrame: mockAnalysisRunning ? +(1.4 + Math.random() * 2.2).toFixed(1) : 0,
      cameraActive: mockAnalysisRunning && !mockAnalysisPaused,
      region: "non-basmati",
      _isReset: !mockAnalysisRunning,
    };
  }

  private emitStatisticsUpdate() {
    const data = this.buildPayload();
    this.emitTo('statistics_update', data);
    this.emitTo('stats_response', data);

    // Backward-compatible legacy payload for any remaining listeners
    const legacy = {
      ...data.total_unique_objects,
      qualityIndices: data.qualityIndices,
      total: data.total_unique_objects.total,
      cameraFps: data.cameraFps,
      detectionsPerFrame: data.detectionsPerFrame,
      cameraActive: data.cameraActive,
    };
    this.emitTo('grain_statistics', legacy);
  }
}

// ============================================================
// INSTALL MOCKS
// ============================================================

export function installMockApi() {
  // Intercept fetch
  window.fetch = mockFetch as typeof window.fetch;

  // Mock Socket.IO - override the io() function from socket.io-client
  // We need to intercept the import. We do this by adding to window.
  (window as any).__MOCK_SOCKET_IO__ = true;
  (window as any).__DUMMY_MODE__ = true;

  console.log('[MockAPI] Mock API installed - all fetch calls will return dummy data');
  console.log('[MockAPI] Socket.IO mock enabled');
}

// Export MockSocket for use in the socket.io override
export { MockSocket };
