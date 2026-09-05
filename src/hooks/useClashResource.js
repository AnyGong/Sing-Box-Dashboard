import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fetches a Clash API resource via `fetcher(conn)`, optionally polling on
 * an interval, and exposes { data, loading, error, refresh }.
 *
 * @param {Function} fetcher - async (conn) => data
 * @param {object} conn - current connection settings ({ baseUrl, secret })
 * @param {object} opts
 * @param {number} [opts.intervalMs] - poll interval; omit to fetch once
 * @param {Array} [opts.deps] - extra dependencies that should trigger a refetch
 */
export function useClashResource(fetcher, conn, { intervalMs, deps = [], enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const result = await fetcherRef.current(conn)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn?.baseUrl, conn?.secret, enabled, ...deps])

  useEffect(() => {
    refresh()
    if (!intervalMs || !enabled) return undefined
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs, enabled])

  return { data, loading, error, refresh, setData }
}
