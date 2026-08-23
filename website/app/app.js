/**
 * TMA mini web app — the iOS/Safari-friendly counterpart to the Android app, talking to the same
 * server (see /server at the repo root). No build step, no framework — plain fetch + DOM, in
 * keeping with the rest of this static site (see ../js/main.js).
 *
 * Domain/DTO shapes here mirror android/app/.../data/remote/dto/Dtos.kt exactly, since both
 * clients talk to the same backend.
 */

const STORAGE = {
  serverUrl: "tma_server_url",
  token: "tma_token",
  session: "tma_session",
};

const state = {
  serverUrl: localStorage.getItem(STORAGE.serverUrl) || "",
  token: localStorage.getItem(STORAGE.token) || "",
  session: JSON.parse(localStorage.getItem(STORAGE.session) || "null"),
  reports: [],
  millLines: [],
  isLoading: false,
  error: "",
};

const root = document.getElementById("app");

function persist() {
  localStorage.setItem(STORAGE.serverUrl, state.serverUrl);
  if (state.token) localStorage.setItem(STORAGE.token, state.token);
  else localStorage.removeItem(STORAGE.token);
  if (state.session) localStorage.setItem(STORAGE.session, JSON.stringify(state.session));
  else localStorage.removeItem(STORAGE.session);
}

function normalizedBase() {
  return state.serverUrl.endsWith("/") ? state.serverUrl : state.serverUrl + "/";
}

async function api(path, options = {}) {
  const url = normalizedBase() + path.replace(/^\//, "");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(`Could not reach ${state.serverUrl} — check the server address and your connection.`);
  }

  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    logout();
    throw new Error("Session expired — please sign in again.");
  }
  if (!response.ok) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return body;
}

function logout() {
  state.token = "";
  state.session = null;
  state.reports = [];
  state.millLines = [];
  persist();
  render();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtPct(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ---------- Views ----------

function renderServerSetup() {
  root.innerHTML = `
    <div class="tma-screen tma-screen-center">
      <div class="tma-card tma-card-narrow">
        <img class="tma-logo" src="../assets/images/tma-logo.jpeg" alt="TMA" />
        <h1>Connect to your TMA server</h1>
        <p class="tma-muted">Enter the server address shared with you. You only need to do this once per device.</p>
        <form id="server-form">
          <label class="tma-label" for="server-url">Server URL</label>
          <input class="tma-input" id="server-url" type="url" inputmode="url" placeholder="https://your-server.example.com" required autocapitalize="off" autocorrect="off" />
          <button class="tma-btn tma-btn-primary" type="submit">Continue</button>
        </form>
        <p class="tma-hint">No server yet? Ask your TMA administrator for the address, or run the server locally from <code>/server</code> in this repo.</p>
      </div>
    </div>
  `;
  document.getElementById("server-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const value = document.getElementById("server-url").value.trim();
    if (!value) return;
    state.serverUrl = value;
    persist();
    render();
  });
}

function renderLogin() {
  root.innerHTML = `
    <div class="tma-screen tma-screen-center">
      <div class="tma-card tma-card-narrow">
        <img class="tma-logo" src="../assets/images/tma-logo.jpeg" alt="TMA" />
        <h1>Sign in</h1>
        <p class="tma-muted">Total Mill Analyzer — quality reports on the go.</p>
        <form id="login-form">
          <label class="tma-label" for="username">Username</label>
          <input class="tma-input" id="username" name="username" type="text" autocapitalize="off" autocorrect="off" required />
          <label class="tma-label" for="password">Password</label>
          <input class="tma-input" id="password" name="password" type="password" required />
          ${state.error ? `<p class="tma-error">${escapeHtml(state.error)}</p>` : ""}
          <button class="tma-btn tma-btn-primary" type="submit" ${state.isLoading ? "disabled" : ""}>
            ${state.isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p class="tma-hint">Demo credentials: <code>admin</code> / <code>tma1234</code></p>
        <button class="tma-link" id="change-server">Not the right server? Change it</button>
      </div>
    </div>
  `;
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    state.isLoading = true;
    state.error = "";
    render();
    try {
      const body = await api("api/raice_labz/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      state.token = body.token;
      state.session = body.session;
      persist();
      await loadHomeData();
    } catch (err) {
      state.error = err.message;
    } finally {
      state.isLoading = false;
      render();
    }
  });
  document.getElementById("change-server").addEventListener("click", () => {
    state.serverUrl = "";
    state.error = "";
    persist();
    render();
  });
}

async function loadHomeData() {
  state.isLoading = true;
  state.error = "";
  render();
  try {
    const [reportsBody, millLinesBody] = await Promise.all([
      api("api/raice_labz/analytics/grain-analysis"),
      api("api/raice_labz/settings/rice-mill"),
    ]);
    state.reports = reportsBody.reports || [];
    state.millLines = millLinesBody.millLines || [];
  } catch (err) {
    state.error = err.message;
  } finally {
    state.isLoading = false;
    render();
  }
}

function reportCard(report) {
  return `
    <div class="tma-report-card">
      <div class="tma-report-row">
        <strong>${escapeHtml(report.modeId)}</strong>
        <span class="tma-muted">${fmtDate(report.date)}</span>
      </div>
      <div class="tma-report-meta">${escapeHtml(report.variety)} · ${escapeHtml(report.process || "")}</div>
      ${report.machineName ? `<div class="tma-report-meta">Machine: ${escapeHtml(report.machineName)}</div>` : ""}
      ${report.seriesLine ? `<div class="tma-report-meta">Series: ${escapeHtml(report.seriesLine)}</div>` : ""}
      <div class="tma-report-meta">Operator: ${escapeHtml(report.operatorName)}</div>
      <div class="tma-report-metrics">
        Good Rice ${fmtPct(report.overallGoodRice)} · Rejection ${fmtPct(report.overallRejection)} · Foreign Matter ${fmtPct(report.overallForeignMatter)}
      </div>
    </div>
  `;
}

function renderHome() {
  const mill = state.session?.mill;
  root.innerHTML = `
    <div class="tma-screen">
      <header class="tma-topbar">
        <img class="tma-topbar-logo" src="../assets/images/tma-logo.jpeg" alt="TMA" />
        <button class="tma-icon-btn" id="logout-btn" aria-label="Sign out">Sign out</button>
      </header>

      <div class="tma-hero">
        <div class="tma-hero-avatar">TMA</div>
        <div>
          <div class="tma-hero-title">${escapeHtml(mill?.name || "Your mill")}</div>
          <div class="tma-hero-sub">${escapeHtml(mill?.location || "")}</div>
        </div>
      </div>

      ${state.error ? `<p class="tma-error tma-error-banner">${escapeHtml(state.error)}</p>` : ""}

      <div class="tma-section-title">
        <span>Reports</span>
        <button class="tma-link" id="refresh-btn">${state.isLoading ? "Loading…" : "Refresh"}</button>
      </div>

      <div class="tma-reports-list">
        ${
          state.isLoading
            ? `<p class="tma-muted">Loading reports…</p>`
            : state.reports.length === 0
              ? `<p class="tma-muted">No reports yet.</p>`
              : state.reports.map(reportCard).join("")
        }
      </div>
    </div>
  `;
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("refresh-btn").addEventListener("click", () => loadHomeData());
}

function render() {
  if (!state.serverUrl) return renderServerSetup();
  if (!state.token || !state.session) return renderLogin();
  return renderHome();
}

// Bootstrap: if we already have a server + token, verify it's still valid by loading data
// straight away rather than flashing the (possibly stale) cached report list.
if (state.serverUrl && state.token && state.session) {
  loadHomeData();
} else {
  render();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Non-fatal — the app still works online without the service worker.
    });
  });
}
