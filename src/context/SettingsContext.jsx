import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { encryptSecret, decryptSecret } from '../utils/secretStore'

const STORAGE_KEY = 'sbdash.connection'

const DEFAULT_SETTINGS = {
  // sing-box "clash_api.external_controller" address, e.g. 127.0.0.1:9090
  baseUrl: 'http://127.0.0.1:9090',
  secret: '',
  // Optional grpc-web gateway in front of the sing-box V2Ray stats gRPC
  // service (the raw gRPC port is not reachable from a browser directly).
  grpcWebUrl: '',
}

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeRaw(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {
    // ignore persistence errors (e.g. private browsing quota)
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  // secret starts empty and is filled in asynchronously below, once
  // decrypted — SubtleCrypto/IndexedDB are async APIs, so it can't be read
  // synchronously on first render the way plain localStorage could.
  const [settings, setSettings] = useState(() => {
    const stored = readRaw()
    return { ...DEFAULT_SETTINGS, ...stored, secret: '' }
  })
  const [secretReady, setSecretReady] = useState(false)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = readRaw()
      if (!stored) {
        setSecretReady(true)
        return
      }
      // Migrate the old plain-text `secret` field (pre-encryption builds)
      // to the encrypted `secretEnc` field, transparently, on first load.
      if (typeof stored.secret === 'string' && stored.secret && !stored.secretEnc) {
        const secretEnc = await encryptSecret(stored.secret)
        const { secret: _drop, ...rest } = stored
        writeRaw({ ...rest, secretEnc })
        if (!cancelled) {
          setSettings((prev) => ({ ...prev, secret: stored.secret }))
          setSecretReady(true)
        }
        return
      }
      const secret = await decryptSecret(stored.secretEnc)
      if (!cancelled) {
        setSettings((prev) => ({ ...prev, secret }))
        setSecretReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // Only run once on mount — updateSettings below keeps state and storage
    // in sync from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      const { secret, ...persistable } = next
      if (Object.prototype.hasOwnProperty.call(patch, 'secret')) {
        encryptSecret(secret).then((secretEnc) => {
          writeRaw({ ...persistable, secretEnc })
        })
      } else {
        // Preserve whatever encrypted secret is already on disk.
        const stored = readRaw()
        writeRaw({ ...persistable, secretEnc: stored?.secretEnc ?? null })
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ settings, updateSettings, secretReady }),
    [settings, updateSettings, secretReady],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
