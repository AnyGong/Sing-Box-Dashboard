import { useEffect, useRef, useState } from 'react'

/**
 * Subscribes to one of sing-box's streaming Clash API endpoints
 * (/logs, /traffic, /memory), each of which pushes newline-delimited
 * JSON objects over a WebSocket connection.
 *
 * @param {string|null} url - full ws(s):// URL, or null to stay disconnected
 * @param {object} opts
 * @param {number} opts.maxItems - how many recent messages to retain in `items`
 */
export function useClashWebSocket(url, { maxItems = 200 } = {}) {
  const [status, setStatus] = useState('idle') // idle | connecting | open | closed | error
  const [items, setItems] = useState([])
  const [lastError, setLastError] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    setItems([])
    if (!url) {
      setStatus('idle')
      return undefined
    }

    let cancelled = false
    setStatus('connecting')
    setLastError(null)

    let socket
    try {
      socket = new WebSocket(url)
    } catch (err) {
      setStatus('error')
      setLastError(String(err))
      return undefined
    }
    socketRef.current = socket

    socket.onopen = () => {
      if (!cancelled) setStatus('open')
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
      if (!cancelled) {
        setStatus('error')
        setLastError('WebSocket error')
      }
    }
    socket.onclose = () => {
      if (!cancelled) setStatus('closed')
    }

    return () => {
      cancelled = true
      socket.close()
      socketRef.current = null
    }
  }, [url, maxItems])

  const clear = () => setItems([])

  return { status, items, lastError, clear }
}
