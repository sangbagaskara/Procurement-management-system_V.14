// ============================================================
// api.js — Salak Unit 7 Dashboard API Client
// Semua request GET (no CORS) — data via ?payload=<base64>
// Max URL safe: ~7000 chars — single record ~3KB = OK
// ============================================================

const API = (() => {
  const GAS_URL = () => window.APPS_SCRIPT_URL || '';

  async function gasCall(params = {}) {
    const url = GAS_URL();
    if (!url || url.includes('YOUR_APPS')) throw new Error('APPS_SCRIPT_URL not configured');
    const qs  = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${qs}`, { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error('Response not JSON: ' + text.substring(0, 200)); }
  }

  function encodePayload(obj) {
    const json  = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let binary  = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  async function gasWrite(action, data) {
    return gasCall({ action, payload: encodePayload(data) });
  }

  // ── READ ───────────────────────────────────────────────────
  async function ping() {
    try { const r = await gasCall({ action: 'ping' }); return r.status === 'ok'; }
    catch { return false; }
  }

  async function fetchAll() {
    return gasCall({ action: 'getAll' });
  }

  // ── WRITE (per-record — payload kecil, aman untuk GET) ─────
  async function upsertPackage(record) {
    return gasWrite('upsertPackage', { record });
  }

  async function deletePackage(id) {
    return gasWrite('deletePackage', { id: String(id) });
  }

  async function upsertRisk(record) {
    return gasWrite('upsertRisk', { record });
  }

  async function deleteRisk(id) {
    return gasWrite('deleteRisk', { id: String(id) });
  }

  async function upsertProject(record) {
    return gasWrite('upsertProject', { record });
  }

  async function logActivity(entry) {
    return gasWrite('logActivity', { entry });
  }

  return {
    ping, fetchAll,
    upsertPackage, deletePackage,
    upsertRisk,    deleteRisk,
    upsertProject, logActivity
  };
})();
