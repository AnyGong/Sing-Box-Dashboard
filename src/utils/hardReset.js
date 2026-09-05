import { clashApi } from '../api/clashClient'

// "Clear everything and start over" — tears down every piece of client-side
// state this app can reach: the sing-box controller's tracked connections,
// this origin's localStorage/sessionStorage (which is also where the saved
// controller address + encrypted secret live — this really does reset
// Settings back to defaults, by design), the encrypted-secret IndexedDB
// keystore, and anything sitting in the Cache Storage API. It then forces a
// full page reload so no in-memory React state, open WebSocket, or polling
// timer survives the reset either.
//
// Each step is independently best-effort: an unreachable controller, or a
// browser that's missing/blocking one of these storage APIs (e.g. private
// browsing), must never prevent the remaining steps — or the final
// reload — from happening. That's why every step is wrapped individually
// rather than in one try/catch around the whole function.
async function safely(fn) {
  try {
    await fn()
  } catch {
    // Best-effort by design — see module comment above.
  }
}

// Deletes every IndexedDB database this origin owns, not just the secret
// keystore by name (`secretStore.js`'s `sbdash-keystore`), so this stays
// correct if a later version of the app ever adds another database.
// `indexedDB.databases()` is Chrome-only, which matches this project's
// "latest Chrome only" target (see README).
async function clearAllIndexedDb() {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return
  const dbs = await indexedDB.databases()
  await Promise.all(
    dbs
      .filter((db) => db.name)
      .map(
        (db) =>
          new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(db.name)
            // A stuck delete (e.g. another tab still has the DB open) should
            // resolve rather than hang the whole reset — it'll simply be
            // retried the next time this runs.
            req.onsuccess = () => resolve()
            req.onerror = () => resolve()
            req.onblocked = () => resolve()
          }),
      ),
  )
}

// The Cache Storage API is the only "cache" a page can actually clear via
// script — there is no way to reach into the browser's HTTP disk cache from
// JS. This app doesn't register a service worker itself, but clears it
// unconditionally in case one is ever added (a Vite PWA plugin, etc.).
async function clearCacheStorage() {
  if (typeof caches === 'undefined') return
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

/**
 * @param {{ baseUrl: string, secret: string } | null | undefined} conn -
 *   the currently active connection, used to ask the controller to drop its
 *   tracked connections before wiping local state. Safe to call with no
 *   connection configured (or one that isn't reachable) — that step is
 *   simply skipped/swallowed.
 */
export async function hardReset(conn) {
  if (conn?.baseUrl) {
    await safely(() => clashApi.closeAllConnections(conn))
  }

  await safely(async () => localStorage.clear())
  await safely(async () => sessionStorage.clear())
  await safely(clearAllIndexedDb)
  await safely(clearCacheStorage)

  // A real navigation (not a client-side route change) is the point: it
  // discards the entire React tree, every open WebSocket, and every polling
  // interval, then re-fetches index.html from scratch — nothing from before
  // the reset survives.
  window.location.reload()
}
