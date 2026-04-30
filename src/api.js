/**
 * iJustOrder API Client
 * Wraps the Supabase Edge Function API with retry logic and pagination.
 */
const fetch = require('node-fetch');

const BASE_URL = process.env.SUPABASE_URL || 'https://zztwxyleihgjqisjlalb.supabase.co/functions/v1';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const API_KEY = process.env.IJUSTORDER_API_KEY || '';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
  'X-Api-Key': API_KEY,
};

/**
 * Make an API call with retry logic.
 */
async function apiCall(method, path, data = null, retries = 3) {
  const url = `${BASE_URL}/${path}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const opts = { method, headers: HEADERS, timeout: 30000 };
      if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        opts.body = JSON.stringify(data);
      }
      const res = await fetch(url, opts);
      const json = await res.json();
      if (res.status < 500) return json;
      console.error(`5xx on ${path}, attempt ${attempt + 1}`);
    } catch (err) {
      console.error(`Error on ${path}: ${err.message}, attempt ${attempt + 1}`);
    }
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
  }
  return { success: false, error: 'max retries exceeded' };
}

/**
 * Fetch all pages of a paginated endpoint.
 */
async function fetchAllPages(path, params = {}) {
  const allData = [];
  let page = 1;
  const limit = params.limit || 100;
  while (true) {
    const qs = new URLSearchParams({ ...params, page: String(page), limit: String(limit) });
    const result = await apiCall('GET', `${path}?${qs}`);
    if (!result.data) return result;
    allData.push(...result.data);
    if (!result.meta || page >= result.meta.pages) break;
    page++;
  }
  return { success: true, data: allData, total: allData.length };
}

module.exports = { apiCall, fetchAllPages, BASE_URL };
