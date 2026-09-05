import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useSettings } from './SettingsContext'
import { clashApi } from '../api/clashClient'
import { usePageVisibility } from '../hooks/usePageVisibility'

const PROBE_INTERVAL_MS = 10000

const ConnectionStatusContext = createContext(null)

// A single, app-wide /version probe. Previously AppShell polled /version
// every 10s for the header's status chip *and* DashboardPage separately
// polled the same endpoint every 30s for its version chip — two independent
// pollers hitting the controller for the same data whenever the dashboard
// route was open. Lifting this into one provider means every consumer reads
// the same state instead of running its own interval.
export function ConnectionStatusProvider({ children }) {
  const { settings, secretReady } = useSettings()
  const { baseUrl, secret } = settings
  const [status, setStatus] = useState('connecting')
  const [version, setVersion] = useState(null)
  const visible = usePageVisibility()

  useEffect(() => {
    // Wait for the encrypted secret to finish loading from IndexedDB before
    // probing — otherwise this fires once with secret === '' and gets a
    // spurious 401 from any controller that has a secret configured.
    if (!visible || !secretReady) return undefined
    let cancelled = false
    const controller = new AbortController()
    setStatus('connecting')

    async function probe() {
      try {
        const v = await clashApi.getVersion({ baseUrl, secret }, { signal: controller.signal })
        if (cancelled) return
        setVersion(v)
        setStatus('connected')
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError') setStatus('error')
      }
    }

    probe()
    const id = setInterval(probe, PROBE_INTERVAL_MS)
    return () => {
      cancelled = true
      controller.abort()
      clearInterval(id)
    }
  }, [baseUrl, secret, visible, secretReady])

  const value = useMemo(() => ({ status, version }), [status, version])

  return <ConnectionStatusContext.Provider value={value}>{children}</ConnectionStatusContext.Provider>
}

export function useConnectionStatus() {
  const ctx = useContext(ConnectionStatusContext)
  if (!ctx) throw new Error('useConnectionStatus must be used within ConnectionStatusProvider')
  return ctx
}
