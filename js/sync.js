// ============================================================
// sync.js — Sync Manager
// Handles online/offline sync between localStorage and Sheets
// ============================================================

const SyncManager = (() => {
  const QUEUE_KEY    = 'salak_sync_queue';
  const LAST_SYNC_KEY = 'salak_last_sync';
  const STATUS_CB    = [];   // status change callbacks

  // ── STATUS ─────────────────────────────────────────────────
  let _status = 'idle'; // idle | syncing | ok | error | offline
  function setStatus(s, msg = '') {
    _status = s;
    STATUS_CB.forEach(cb => cb(s, msg));
  }
  function onStatusChange(cb) { STATUS_CB.push(cb); }

  // ── QUEUE ──────────────────────────────────────────────────
  function getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch { return []; }
  }
  function saveQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

  function enqueue(op) {
    const q = getQueue();
    // De-duplicate: remove prior op for same id + action
    const filtered = q.filter(x => !(x.table === op.table && x.id === op.id));
    filtered.push({ ...op, ts: new Date().toISOString() });
    saveQueue(filtered);
  }

  function clearQueue() { localStorage.removeItem(QUEUE_KEY); }

  // ── FULL SYNC TO SHEETS ────────────────────────────────────
  async function pushAll(data) {
    if (!window.APPS_SCRIPT_URL) { setStatus('offline', 'No URL'); return false; }
    setStatus('syncing', 'Pushing all data…');
    try {
      const flat = {
        projects: data.projects,
        packages: DataTransform.packagesToFlat(data.packages, new Date().toISOString()),
        risks:    DataTransform.risksNormalize(data.risks)
      };
      await API.syncAll(flat);
      clearQueue();
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      setStatus('ok', 'Synced');
      return true;
    } catch (e) {
      setStatus('error', e.message);
      return false;
    }
  }

  // ── FETCH FROM SHEETS ──────────────────────────────────────
  async function pullAll() {
    if (!window.APPS_SCRIPT_URL) { setStatus('offline', 'No URL'); return null; }
    setStatus('syncing', 'Fetching from Sheets…');
    try {
      const data = await API.fetchAll();
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      setStatus('ok', 'Fetched');
      return {
        projects: data.projects || [],
        packages: DataTransform.packagesToNested(data.packages || []),
        risks:    DataTransform.risksNormalize(data.risks || [])
      };
    } catch (e) {
      setStatus('error', e.message);
      return null;
    }
  }

  // ── SEED (first time setup) ────────────────────────────────
  async function seedSheets(data) {
    if (!window.APPS_SCRIPT_URL) return { ok: false, msg: 'No URL' };
    setStatus('syncing', 'Seeding Google Sheets…');
    try {
      const flat = {
        projects: data.projects,
        packages: DataTransform.packagesToFlat(data.packages, new Date().toISOString()),
        risks:    DataTransform.risksNormalize(data.risks)
      };
      await API.seedData(flat);
      clearQueue();
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      setStatus('ok', 'Seeded');
      return { ok: true };
    } catch (e) {
      setStatus('error', e.message);
      return { ok: false, msg: e.message };
    }
  }

  // ── DRAIN QUEUE (flush pending ops) ───────────────────────
  async function drainQueue() {
    const q = getQueue();
    if (!q.length) return { flushed: 0 };
    setStatus('syncing', `Flushing ${q.length} queued ops…`);
    let flushed = 0;
    for (const op of q) {
      try {
        if (op.action === 'upsertPackage') await API.upsertPackage(op.record);
        else if (op.action === 'deletePackage') await API.deletePackage(op.id);
        else if (op.action === 'upsertRisk') await API.upsertRisk(op.record);
        else if (op.action === 'deleteRisk') await API.deleteRisk(op.id);
        flushed++;
      } catch { /* leave in queue */ }
    }
    const remaining = getQueue().slice(flushed);
    saveQueue(remaining);
    if (remaining.length === 0) setStatus('ok', 'Queue flushed');
    return { flushed, remaining: remaining.length };
  }

  // ── PING ───────────────────────────────────────────────────
  async function ping() {
    const ok = await API.ping();
    setStatus(ok ? 'ok' : 'offline', ok ? 'Connected' : 'Offline');
    return ok;
  }

  return {
    pushAll, pullAll, seedSheets, drainQueue, ping,
    enqueue, getQueue, clearQueue,
    onStatusChange,
    getStatus: () => _status,
    lastSync: () => localStorage.getItem(LAST_SYNC_KEY)
  };
})();
