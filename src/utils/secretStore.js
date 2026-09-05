// Encrypts the Clash API `secret` at rest instead of keeping it as plain
// text in localStorage. The AES-GCM key itself is generated as
// non-extractable and persisted in IndexedDB (browsers can structured-clone
// a CryptoKey object directly), so the raw key material never touches
// localStorage, devtools "Application" tab copy/paste, or a JSON.stringify
// of storage contents — only an opaque key *handle* lives in IndexedDB, and
// it can only be used via SubtleCrypto, not read out as bytes.
//
// This does not defend against a compromised page (any script running on
// the same origin can call decryptSecret() itself), but it does stop the
// secret from being trivially visible in plain text if someone inspects
// localStorage, a localStorage export, or a backup/sync of browser storage.

const DB_NAME = 'sbdash-keystore'
const DB_VERSION = 1
const STORE_NAME = 'keys'
const KEY_ID = 'settings-secret-key'

function isSupported() {
  return typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && !!crypto.subtle
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

let keyPromise = null

function getOrCreateKey() {
  if (keyPromise) return keyPromise
  keyPromise = (async () => {
    const db = await openDb()
    const existing = await idbGet(db, KEY_ID)
    if (existing) return existing
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])
    await idbPut(db, KEY_ID, key)
    return key
  })()
  return keyPromise
}

function toBase64(bytes) {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function fromBase64(b64) {
  const binary = atob(b64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

// Returns a plain-object payload safe to JSON.stringify into localStorage:
// { iv: base64, data: base64 }. Returns null for an empty secret so we
// don't persist an encrypted-empty-string blob.
export async function encryptSecret(plainText) {
  if (!plainText) return null
  if (!isSupported()) return { plain: plainText } // graceful fallback, see decryptSecret
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plainText))
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(cipherBuf)) }
}

export async function decryptSecret(payload) {
  if (!payload) return ''
  if (payload.plain !== undefined) return payload.plain // fallback path (no WebCrypto/IndexedDB)
  try {
    const key = await getOrCreateKey()
    const iv = fromBase64(payload.iv)
    const data = fromBase64(payload.data)
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(plainBuf)
  } catch {
    // Key store was cleared/unavailable (e.g. private browsing eviction) —
    // treat as "no secret" rather than throwing, so the app still loads.
    return ''
  }
}
