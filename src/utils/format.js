export function formatBytes(bytes) {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const exp = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exp
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`
}

export function formatBytesPerSec(bytes) {
  return `${formatBytes(bytes)}/s`
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '0s'
  const s = Math.floor(ms / 1000)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (mins) parts.push(`${mins}m`)
  if (!days && !hours) parts.push(`${secs}s`)
  return parts.join(' ')
}

export function relativeTime(fromMs) {
  const diff = Date.now() - fromMs
  return formatDuration(diff) + ' ago'
}

// Labels an hour-of-day bucket (0-23) as e.g. "12AM", "6AM", "12PM" — used
// by the Activity page's hourly traffic history chart.
export function formatHourLabel(hour) {
  const h = ((hour % 24) + 24) % 24
  const period = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${period}`
}

export function safeConnStarted(startedIso) {
  const t = Date.parse(startedIso)
  if (Number.isNaN(t)) return '—'
  return formatDuration(Date.now() - t)
}
