// ============================================================
// sync.js — Sync Manager
// Push: per-record upsert (menghindari URL length limit)
// Pull: getAll sekaligus (read tidak ada limit)
// ============================================================

const SyncManager = (() => {
  const LAST_SYNC_KEY = 'salak_last_sync';
  const STATUS_CB = [];

  // ── STATUS ─────────────────────────────────────────────────
  let _status = 'idle';
  function setStatus(s, msg = '') {
    _status = s;
    STATUS_CB.forEach(cb => cb(s, msg));
  }
  function onStatusChange(cb) { STATUS_CB.push(cb); }

  // ── PUSH ALL — kirim per record ────────────────────────────
  async function pushAll(data) {
    if (!window.APPS_SCRIPT_URL) { setStatus('offline', 'No URL'); return false; }

    const packages = DataTransform.packagesToFlat(data.packages || [], new Date().toISOString());
    const risks    = DataTransform.risksNormalize(data.risks    || []);
    const projects = data.projects || [];

    const total = projects.length + packages.length + risks.length;
    let done = 0;

    setStatus('syncing', `Syncing 0/${total}…`);

    try {
      // Projects (biasanya hanya 1)
      for (const rec of projects) {
        await API.upsertProject(rec);
        done++;
        setStatus('syncing', `Syncing ${done}/${total}…`);
      }

      // Packages — upsert satu per satu
      for (const rec of packages) {
        await API.upsertPackage(rec);
        done++;
        if (done % 10 === 0) setStatus('syncing', `Syncing packages ${done}/${total}…`);
      }

      // Risks
      for (const rec of risks) {
        await API.upsertRisk(rec);
        done++;
        if (done % 20 === 0) setStatus('syncing', `Syncing risks ${done}/${total}…`);
      }

      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      setStatus('ok', `✓ Synced ${total} records`);
      return true;

    } catch (e) {
      setStatus('error', e.message);
      return false;
    }
  }

  // ── PULL ALL — baca sekaligus (GET, tidak ada limit) ───────
  async function pullAll() {
    if (!window.APPS_SCRIPT_URL) { setStatus('offline', 'No URL'); return null; }
    setStatus('syncing', 'Fetching from Sheets…');
    try {
      const data = await API.fetchAll();
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      setStatus('ok', `✓ Pulled ${(data.packages||[]).length} packages`);
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

  // ── PING ───────────────────────────────────────────────────
  async function ping() {
    const ok = await API.ping();
    setStatus(ok ? 'ok' : 'offline', ok ? 'Connected to Sheets' : 'Offline');
    return ok;
  }

  return {
    pushAll, pullAll, ping,
    onStatusChange,
    getStatus: () => _status,
    lastSync:  () => localStorage.getItem(LAST_SYNC_KEY)
  };
})();
