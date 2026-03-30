// ============================================================
// sync-ui.js — Injects Google Sheets sync UI into dashboard
// Include AFTER api.js, data.js, sync.js in dashboard HTML
// ============================================================

(function () {
  'use strict';

  // ── 1. Inject CSS ──────────────────────────────────────────
  const css = `
    #gasStatusBar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: #0f172a; border-top: 1px solid #1e293b;
      display: flex; align-items: center; gap: .75rem;
      padding: .45rem 1.25rem; font-size: .78rem; font-family: 'Segoe UI', sans-serif;
    }
    #gasStatusBar .gas-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      background: #475569; transition: background .3s;
    }
    #gasStatusBar .gas-dot.ok     { background: #34d399; }
    #gasStatusBar .gas-dot.error  { background: #f87171; }
    #gasStatusBar .gas-dot.syncing { background: #fbbf24; animation: blink .8s infinite; }
    #gasStatusBar .gas-dot.offline { background: #475569; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
    #gasStatusMsg { color: #94a3b8; flex: 1; }
    #gasLastSync  { color: #475569; font-size: .72rem; }
    .gas-btn {
      padding: .3rem .75rem; border-radius: 6px; border: 1px solid #334155;
      background: transparent; color: #94a3b8; font-size: .75rem; cursor: pointer;
      transition: all .2s;
    }
    .gas-btn:hover { background: #1e293b; color: #2dd4bf; border-color: #2dd4bf; }
    .gas-btn.primary { background: #0d9488; border-color: #0d9488; color: #fff; }
    .gas-btn.primary:hover { background: #0f766e; }
    .gas-btn:disabled { opacity: .4; cursor: not-allowed; }
    #gasQueueBadge {
      background: #f59e0b; color: #000; font-size: .65rem; font-weight: 700;
      border-radius: 10px; padding: .1rem .4rem; display: none;
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── 2. Inject status bar HTML ──────────────────────────────
  const bar = document.createElement('div');
  bar.id = 'gasStatusBar';
  bar.innerHTML = `
    <span class="gas-dot" id="gasDot"></span>
    <span id="gasStatusMsg">Checking Google Sheets connection…</span>
    <span id="gasQueueBadge"></span>
    <span id="gasLastSync"></span>
    <button class="gas-btn" id="gasPullBtn"  title="Pull latest data from Google Sheets">↓ Pull</button>
    <button class="gas-btn primary" id="gasPushBtn" title="Push all local data to Google Sheets">↑ Push All</button>
  `;
  document.body.appendChild(bar);

  // ── 3. Helpers ─────────────────────────────────────────────
  const dot   = () => document.getElementById('gasDot');
  const msg   = () => document.getElementById('gasStatusMsg');
  const badge = () => document.getElementById('gasQueueBadge');
  const lastEl= () => document.getElementById('gasLastSync');

  function setUI(status, text) {
    const d = dot(), m = msg();
    d.className = 'gas-dot ' + status;
    m.textContent = text;
    updateLastSync();
    updateQueueBadge();
  }

  function updateLastSync() {
    const ls = SyncManager.lastSync();
    if (ls) {
      const dt = new Date(ls);
      lastEl().textContent = 'Last sync: ' + dt.toLocaleTimeString();
    }
  }

  function updateQueueBadge() {
    const q = SyncManager.getQueue().length;
    const b = badge();
    if (q > 0) { b.style.display = 'inline'; b.textContent = q + ' pending'; }
    else { b.style.display = 'none'; }
  }

  // ── 4. Wire SyncManager callbacks ─────────────────────────
  SyncManager.onStatusChange((status, detail) => {
    const map = {
      idle:    ['idle',    'Google Sheets ready'],
      syncing: ['syncing', detail || 'Syncing…'],
      ok:      ['ok',      detail || 'Google Sheets synced ✓'],
      error:   ['error',   '⚠ Sync error: ' + detail],
      offline: ['offline', 'Offline — changes saved locally']
    };
    const [cls, txt] = map[status] || ['idle', status];
    setUI(cls, txt);
  });

  // ── 5. Button handlers ─────────────────────────────────────
  document.getElementById('gasPullBtn').addEventListener('click', async () => {
    if (!window.APPS_SCRIPT_URL || window.APPS_SCRIPT_URL.includes('YOUR_APPS')) {
      alert('⚙️ Please set your Apps Script URL in config.js first.');
      return;
    }
    const data = await SyncManager.pullAll();
    if (data) {
      // Inject data into app globals if they exist
      if (typeof projects !== 'undefined' && data.projects.length)  { window.projects  = data.projects; }
      if (typeof packages !== 'undefined' && data.packages.length)  { window.packages  = data.packages; }
      if (typeof risks    !== 'undefined' && data.risks.length)     { window.risks     = data.risks; }
      // Trigger re-render if app exposes it
      if (typeof saveAllData === 'function') saveAllData();
      if (typeof renderAll   === 'function') renderAll();
      if (typeof populateSelects === 'function') populateSelects();
    }
  });

  document.getElementById('gasPushBtn').addEventListener('click', async () => {
    if (!window.APPS_SCRIPT_URL || window.APPS_SCRIPT_URL.includes('YOUR_APPS')) {
      alert('⚙️ Please set your Apps Script URL in config.js first.');
      return;
    }
    const data = {
      projects: typeof projects !== 'undefined' ? projects : [],
      packages: typeof packages !== 'undefined' ? packages : [],
      risks:    typeof risks    !== 'undefined' ? risks    : []
    };
    await SyncManager.pushAll(data);
  });

  // ── 6. Auto-ping on load ───────────────────────────────────
  window.addEventListener('load', async () => {
    if (!window.APPS_SCRIPT_URL || window.APPS_SCRIPT_URL.includes('YOUR_APPS')) {
      setUI('offline', '⚙️ Set APPS_SCRIPT_URL in config.js to enable sync');
      return;
    }
    setUI('syncing', 'Connecting to Google Sheets…');
    const ok = await SyncManager.ping();
    if (ok && window.DASHBOARD_CONFIG?.autoSyncOnLoad) {
      // Auto-pull on load
      const data = await SyncManager.pullAll();
      if (data && data.packages.length) {
        if (typeof packages !== 'undefined') window.packages = data.packages;
        if (typeof risks    !== 'undefined') window.risks    = data.risks;
        if (typeof projects !== 'undefined') window.projects = data.projects;
        if (typeof saveAllData === 'function') saveAllData();
        if (typeof renderAll   === 'function') renderAll();
        if (typeof populateSelects === 'function') populateSelects();
      }
    }
    updateQueueBadge();
  });

})();
