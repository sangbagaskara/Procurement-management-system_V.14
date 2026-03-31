// ============================================================
// api.js — Salak Unit 7 Dashboard API Client
// Semua request pakai GET (no CORS issue dengan Apps Script)
// Data dikirim via URL parameter ?payload=<base64-json>
// ============================================================

const API = (() => {
  const GAS_URL = () => window.APPS_SCRIPT_URL || '';

  // ── LOW-LEVEL: GET only ────────────────────────────────────
  // Untuk read: ?action=xxx
  // Untuk write: ?action=xxx&payload=<base64(JSON)>
  async function gasCall(params = {}) {
    const url = GAS_URL();
    if (!url || url.includes('YOUR_APPS')) throw new Error('APPS_SCRIPT_URL not configured');
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${qs}`, {
      method: 'GET',
      redirect: 'follow'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error('Invalid JSON response: ' + text.substring(0, 100)); }
  }

  // Encode payload sebagai base64 untuk dikirim via GET
  function encodePayload(obj) {
    const json = JSON.stringify(obj);
    // btoa tidak support Unicode — encode dulu
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  // ── PUBLIC API ─────────────────────────────────────────────

  async function ping() {
    try {
      const r = await gasCall({ action: 'ping' });
      return r.status === 'ok';
    } catch { return false; }
  }

  async function fetchAll() {
    return gasCall({ action: 'getAll' });
  }

  // Untuk write operations — pakai action + payload via GET
  async function gasWrite(action, data) {
    return gasCall({ action, payload: encodePayload(data) });
  }

  async function syncAll(data) {
    return gasWrite('syncAll', data);
  }

  async function seedData(data) {
    return gasWrite('seedData', data);
  }

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

  async function logActivity(entry) {
    return gasWrite('logActivity', { entry });
  }

  return {
    ping, fetchAll, syncAll, seedData,
    upsertPackage, deletePackage,
    upsertRisk, deleteRisk,
    logActivity
  };
})();
