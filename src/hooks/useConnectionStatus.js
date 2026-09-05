import { useEffect, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { clashApi } from '../api/clashClient'
import { usePageVisibility } from './usePageVisibility'

const PROBE_INTERVAL_MS = 10000

export function useConnectionStatus() {
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

  return { status, version }
}
