// ============================================================
// api.js — Salak Unit 7 Dashboard API Client
// Handles all communication with Google Apps Script backend
// ============================================================

const API = (() => {
  // ── CONFIG ─────────────────────────────────────────────────
  // Set your deployed Apps Script Web App URL here
  // or in config.js as window.APPS_SCRIPT_URL
  const GAS_URL = window.APPS_SCRIPT_URL || '';

  let _online = false;
  let _lastSync = null;

  // ── LOW-LEVEL FETCH ────────────────────────────────────────
  async function gasGet(params = {}) {
    if (!GAS_URL) throw new Error('APPS_SCRIPT_URL not configured');
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${GAS_URL}?${qs}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function gasPost(body = {}) {
    if (!GAS_URL) throw new Error('APPS_SCRIPT_URL not configured');
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ── PUBLIC API ─────────────────────────────────────────────

  /** Test connectivity */
  async function ping() {
    try {
      const r = await gasGet({ action: 'ping' });
      _online = r.status === 'ok';
      return _online;
    } catch {
      _online = false;
      return false;
    }
  }

  /** Fetch all data from Sheets */
  async function fetchAll() {
    const data = await gasGet({ action: 'getAll' });
    _lastSync = new Date().toISOString();
    return data;
  }

  /** Full sync: push all local data to Sheets (overwrites) */
  async function syncAll(data) {
    const r = await gasPost({ action: 'syncAll', data });
    _lastSync = new Date().toISOString();
    return r;
  }

  /** Seed Sheets on first setup */
  async function seedData(data) {
    return gasPost({ action: 'seedData', data });
  }

  /** Upsert one package */
  async function upsertPackage(record) {
    return gasPost({ action: 'upsertPackage', record });
  }

  /** Delete one package */
  async function deletePackage(id) {
    return gasPost({ action: 'deletePackage', id: String(id) });
  }

  /** Upsert one risk */
  async function upsertRisk(record) {
    return gasPost({ action: 'upsertRisk', record });
  }

  /** Delete one risk */
  async function deleteRisk(id) {
    return gasPost({ action: 'deleteRisk', id: String(id) });
  }

  /** Log activity entry */
  async function logActivity(entry) {
    return gasPost({ action: 'logActivity', entry });
  }

  return {
    ping, fetchAll, syncAll, seedData,
    upsertPackage, deletePackage,
    upsertRisk, deleteRisk,
    logActivity,
    isOnline: () => _online,
    lastSync: () => _lastSync
  };
})();
