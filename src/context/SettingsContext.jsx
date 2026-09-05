import { createContext, useContext, useMemo, useState, useCallback } from 'react'

const STORAGE_KEY = 'sbdash.connection'

const DEFAULT_SETTINGS = {
  // sing-box "clash_api.external_controller" address, e.g. 127.0.0.1:9090
  baseUrl: 'http://127.0.0.1:9090',
  secret: '',
  // Optional grpc-web gateway in front of the sing-box V2Ray stats gRPC
  // service (the raw gRPC port is not reachable from a browser directly).
  grpcWebUrl: '',
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadInitial)

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore persistence errors (e.g. private browsing)
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
