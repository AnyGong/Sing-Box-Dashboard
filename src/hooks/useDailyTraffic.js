import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'sbdash.dailyTraffic'
const HOURS_IN_DAY = 24

// Local calendar date, not UTC — "today" should follow the browser's own
// clock/timezone, matching what someone watching the dashboard expects,
// and matching when the hourly buckets below roll over.
function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyDay(date) {
  return { date, up: 0, down: 0, hourly: Array(HOURS_IN_DAY).fill(0) }
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStored(day) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(day))
  } catch {
    // ignore persistence errors (e.g. private browsing quota)
  }
}

/**
 * Accumulates the /traffic WebSocket's per-second upload/download samples
 * into a running "today" total and a 24-entry (one per hour) history,
 * persisted to localStorage so it keeps counting across the whole day —
 * not just however long any one tab happens to stay open — and survives
 * reloads.
 *
 * sing-box's Clash API only reports instantaneous throughput, not a
 * historical total, so this is this dashboard's own best-effort tally: it
 * only counts traffic sampled while some tab with this dashboard open was
 * subscribed to /traffic, not all system traffic for the day. It resets
 * automatically the first time a sample arrives after local midnight.
 *
 * @param {Array<{at: number, data: {up?: number, down?: number}}>} items -
 *   the same `items` array `useClashWebSocket` returns for a /traffic
 *   subscription.
 */
export function useDailyTraffic(items) {
  const [day, setDay] = useState(() => {
    const stored = readStored()
    const key = todayKey()
    return stored && stored.date === key ? stored : emptyDay(key)
  })
  // Identifies the newest sample already folded into `day`, by timestamp
  // rather than array position — `items` is a capped ring buffer, so a
  // given sample's index shifts (and old ones fall off) as new ones
  // arrive. Starts at 0 rather than "now": `items` always starts out empty
  // for a fresh WebSocket subscription (see useClashWebSocket), so there's
  // no risk of double-counting anything already in the buffer at mount.
  // Mirrors the same technique TrafficPage uses for its session-total
  // counter.
  const lastCountedAtRef = useRef(0)

  useEffect(() => {
    const last = items[items.length - 1]
    if (!last || last.at <= lastCountedAtRef.current) return
    lastCountedAtRef.current = last.at

    setDay((prev) => {
      const key = todayKey(new Date(last.at))
      const base = prev.date === key ? prev : emptyDay(key)
      const hour = new Date(last.at).getHours()
      const hourly = base.hourly.slice()
      const up = last.data?.up || 0
      const down = last.data?.down || 0
      hourly[hour] += up + down
      const next = { date: key, up: base.up + up, down: base.down + down, hourly }
      writeStored(next)
      return next
    })
  }, [items])

  return day
}
