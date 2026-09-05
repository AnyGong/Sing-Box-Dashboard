import { useEffect, useRef, useState } from 'react'
import { usePageVisibility } from './usePageVisibility'

const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 15000

/**
 * Subscribes to one of sing-box's streaming Clash API endpoints
 * (/logs, /traffic, /memory), each of which pushes newline-delimited
 * JSON objects over a WebSocket connection.
 *
 * Reconnects automatically with exponential backoff + jitter if the
 * connection drops (e.g. sing-box restarts) — previously a dropped socket
 * just sat in `closed`/`error` until the user navigated away and back,
 * which meant "live" data could silently go stale indefinitely.
 *
 * @param {string|null} url - full ws(s):// URL, or null to stay disconnected
 * @param {object} opts
 * @param {number} opts.maxItems - how many recent messages to retain in `items`
 * @param {boolean} opts.pauseWhenHidden - close the socket while the tab is
 *   backgrounded and reopen it when visible again. Off by default because
 *   Logs/Traffic/Memory are dedicated "watch this stream" pages where a
 *   background tab is often still an active monitor (e.g. on a second
 *   screen); turn it on for incidental/decorative subscriptions, like the
 *   small traffic ticker on the Dashboard, where nobody is watching while
 *   hidden and keeping the socket open just burns battery/network.
 */
export function useClashWebSocket(url, { maxItems = 200, pauseWhenHidden = false } = {}) {
  const [status, setStatus] = useState('idle') // idle | connecting | open | closed | error
  const [items, setItems] = useState([])
  const [lastError, setLastError] = useState(null)
  const socketRef = useRef(null)
  const attemptRef = useRef(0)
  const visible = usePageVisibility()
  const active = !!url && (!pauseWhenHidden || visible)

  useEffect(() => {
    setItems([])
    if (!active) {
      setStatus(pauseWhenHidden && url && !visible ? 'paused' : 'idle')
      return undefined
    }

    let cancelled = false
    let socket
    let reconnectTimer

    const connect = () => {
      setStatus('connecting')
      setLastError(null)
      try {
        socket = new WebSocket(url)
      } catch (err) {
        setStatus('error')
        setLastError(String(err))
        return
      }
      socketRef.current = socket

      socket.onopen = () => {
        if (cancelled) return
        attemptRef.current = 0
        setStatus('open')
      }
      socket.onmessage = (event) => {
        if (cancelled) return
        let parsed = event.data
        try {
          parsed = JSON.parse(event.data)
        } catch {
          // keep raw text if it isn't JSON
        }
        setItems((prev) => {
          const next = [...prev, { at: Date.now(), data: parsed }]
          return next.length > maxItems ? next.slice(next.length - maxItems) : next
        })
      }
      socket.onerror = () => {
        if (cancelled) return
        setStatus('error')
        setLastError('WebSocket error')
      }
      socket.onclose = () => {
        if (cancelled) return
        setStatus('closed')
        const attempt = attemptRef.current + 1
        attemptRef.current = attempt
        const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (attempt - 1), MAX_RECONNECT_DELAY_MS)
        const jitter = delay * (0.8 + Math.random() * 0.4)
        reconnectTimer = setTimeout(() => {
          if (!cancelled) connect()
        }, jitter)
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer)
      socket?.close()
      socketRef.current = null
      attemptRef.current = 0
    }
    // `active` already folds `visible` in when pauseWhenHidden is set, so it
    // alone is the correct signal — including `visible` separately here
    // would also reconnect Logs/Traffic/Memory (pauseWhenHidden=false) on
    // every tab switch, which is exactly the churn this hook exists to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, maxItems, active])

  const clear = () => setItems([])

  return { status, items, lastError, clear }
}
