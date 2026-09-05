import { useCallback, useEffect, useRef, useState } from 'react'
import { usePageVisibility } from './usePageVisibility'

/**
 * Fetches a Clash API resource via `fetcher(conn, { signal })`, optionally
 * polling on an interval, and exposes { data, loading, error, refresh }.
 *
 * Two efficiency/timeliness behaviors on top of a plain setInterval poll:
 *  - Each fetch is cancelled (AbortController) if a newer one starts before
 *    it resolves, so a slow response can't race a fresher one and stomp it
 *    with stale data.
 *  - Polling pauses while the tab is hidden (Page Visibility API) and
 *    immediately refetches the moment it becomes visible again, instead of
 *    burning CPU/battery/network in the background and then waiting out a
 *    stale interval when the user comes back.
 *
 * @param {Function} fetcher - async (conn, { signal }) => data
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
  const abortRef = useRef(null)
  const visible = usePageVisibility()

  const refresh = useCallback(async () => {
    if (!enabled) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const result = await fetcherRef.current(conn, { signal: controller.signal })
      if (controller.signal.aborted) return
      setData(result)
      setError(null)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn?.baseUrl, conn?.secret, enabled, ...deps])

  useEffect(() => {
    if (!enabled || !visible) return undefined
    refresh()
    if (!intervalMs) return undefined
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs, enabled, visible])

  // Cancel any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), [])

  return { data, loading, error, refresh, setData }
}
