// Thin client for sing-box's Clash API (experimental.clash_api).
// sing-box implements the Clash Meta-compatible control-plane API; see
// https://sing-box.sagernet.org/configuration/experimental/clash-api/
//
// Every function takes the connection ({ baseUrl, secret }) explicitly so
// call sites stay in control of which server they talk to, instead of a
// hidden singleton.

export class ClashApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ClashApiError'
    this.status = status
    this.body = body
  }
}

function authHeaders(secret) {
  return secret ? { Authorization: `Bearer ${secret}` } : {}
}

async function request(conn, path, { method = 'GET', query, body } = {}) {
  const url = new URL(path.replace(/^\//, ''), conn.baseUrl.replace(/\/?$/, '/'))
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders(conn.secret),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    throw new ClashApiError(data?.message || res.statusText, res.status, data)
  }
  return data
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// Build a ws:// or wss:// URL for the streaming endpoints (logs/traffic/memory).
export function wsUrl(conn, path, query = {}) {
  const httpUrl = new URL(path.replace(/^\//, ''), conn.baseUrl.replace(/\/?$/, '/'))
  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  if (conn.secret) httpUrl.searchParams.set('token', conn.secret)
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') httpUrl.searchParams.set(k, v)
  })
  return httpUrl.toString()
}

export const clashApi = {
  // --- Root / meta -------------------------------------------------
  hello: (conn) => request(conn, '/'),
  getVersion: (conn) => request(conn, '/version'),

  // --- Configs -------------------------------------------------------
  getConfigs: (conn) => request(conn, '/configs'),
  // Patch a subset of running config (e.g. { "mode": "rule", "log-level": "info" })
  patchConfigs: (conn, patch) => request(conn, '/configs', { method: 'PATCH', body: patch }),
  // Force-reload full config, optionally from a different config file path
  reloadConfigs: (conn, { path, force } = {}) =>
    request(conn, '/configs', { method: 'PUT', query: { force }, body: path ? { path } : {} }),

  // --- Proxies ---------------------------------------------------------
  getProxies: (conn) => request(conn, '/proxies'),
  getProxy: (conn, name) => request(conn, `/proxies/${encodeURIComponent(name)}`),
  // Select the active member of a selector/url-test/fallback group
  selectProxy: (conn, name, selected) =>
    request(conn, `/proxies/${encodeURIComponent(name)}`, { method: 'PUT', body: { name: selected } }),
  getProxyDelay: (conn, name, { timeout = 5000, url = 'https://www.gstatic.com/generate_204' } = {}) =>
    request(conn, `/proxies/${encodeURIComponent(name)}/delay`, { query: { timeout, url } }),

  // --- Proxy groups ------------------------------------------------------
  getGroupDelay: (conn, name, { timeout = 5000, url = 'https://www.gstatic.com/generate_204' } = {}) =>
    request(conn, `/group/${encodeURIComponent(name)}/delay`, { query: { timeout, url } }),

  // --- Rules -------------------------------------------------------------
  getRules: (conn) => request(conn, '/rules'),

  // --- Providers -----------------------------------------------------
  getProxyProviders: (conn) => request(conn, '/providers/proxies'),
  getProxyProvider: (conn, name) => request(conn, `/providers/proxies/${encodeURIComponent(name)}`),
  updateProxyProvider: (conn, name) =>
    request(conn, `/providers/proxies/${encodeURIComponent(name)}`, { method: 'PUT' }),
  healthCheckProxyProvider: (conn, name) =>
    request(conn, `/providers/proxies/${encodeURIComponent(name)}/healthcheck`),

  getRuleProviders: (conn) => request(conn, '/providers/rules'),
  updateRuleProvider: (conn, name) =>
    request(conn, `/providers/rules/${encodeURIComponent(name)}`, { method: 'PUT' }),

  // --- Connections ---------------------------------------------------
  getConnections: (conn) => request(conn, '/connections'),
  closeAllConnections: (conn) => request(conn, '/connections', { method: 'DELETE' }),
  closeConnection: (conn, id) => request(conn, `/connections/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // --- DNS -----------------------------------------------------------
  queryDns: (conn, { name, type = 'A' }) => request(conn, '/dns/query', { query: { name, type } }),

  // --- Cache -----------------------------------------------------------
  flushFakeIpCache: (conn) => request(conn, '/cache/fakeip/flush', { method: 'POST' }),
}
