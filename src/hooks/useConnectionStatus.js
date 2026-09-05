import { useEffect, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { clashApi } from '../api/clashClient'

const PROBE_INTERVAL_MS = 10000

export function useConnectionStatus() {
  const { settings } = useSettings()
  const { baseUrl, secret } = settings
  const [status, setStatus] = useState('connecting')
  const [version, setVersion] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus('connecting')

    async function probe() {
      try {
        const v = await clashApi.getVersion({ baseUrl, secret })
        if (cancelled) return
        setVersion(v)
        setStatus('connected')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    probe()
    const id = setInterval(probe, PROBE_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [baseUrl, secret])

  return { status, version }
}
