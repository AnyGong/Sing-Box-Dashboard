import { createContext, useContext } from 'react'
import { useSettings } from './SettingsContext'
import { useClashWebSocket } from '../hooks/useClashWebSocket'
import { useDailyTraffic } from '../hooks/useDailyTraffic'
import { wsUrl } from '../api/clashClient'

// ~5 minutes of history at 1 sample/sec — covers both ActivityPage's small
// sparkline (which only ever looks at the most recent 60) and the dedicated
// Traffic page's full chart from the same buffer.
const MAX_ITEMS = 300

const TrafficStreamContext = createContext(null)

// A single, app-wide /traffic subscription, mounted once above the router —
// mirrors ConnectionStatusContext's reasoning for /version. Previously
// ActivityPage and TrafficPage each opened their own independent WebSocket
// to the same endpoint, so navigating between them (or away and back) closed
// one connection and opened a fresh one with an empty buffer: the
// upload/download charts visibly "reset from zero" on every visit. It also
// meant useDailyTraffic's running "today" total only accumulated while
// ActivityPage specifically was the mounted route, silently undercounting
// any time spent on Traffic, Connections, Settings, or any other page.
//
// pauseWhenHidden is off here (matching the dedicated Traffic page's own
// previous setting, not the old decorative ticker's) since this is now the
// one source everything reads from, including the daily accumulator —
// pausing just because the browser tab is backgrounded would under-count
// "today's traffic" for anyone who leaves the dashboard open on a second
// monitor.
export function TrafficStreamProvider({ children }) {
  const { settings, secretReady } = useSettings()
  const url = secretReady ? wsUrl(settings, '/traffic') : null
  const { items, status } = useClashWebSocket(url, { maxItems: MAX_ITEMS })
  const daily = useDailyTraffic(items)

  const value = { items, status, daily }
  return <TrafficStreamContext.Provider value={value}>{children}</TrafficStreamContext.Provider>
}

export function useTrafficStream() {
  const ctx = useContext(TrafficStreamContext)
  if (!ctx) throw new Error('useTrafficStream must be used within TrafficStreamProvider')
  return ctx
}
