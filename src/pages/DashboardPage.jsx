import { memo } from 'react'
import { Grid, Paper, Typography, Stack, Box, Chip } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import PageHeader from '../components/Common/PageHeader'
import { useSettings } from '../context/SettingsContext'
import { useConnectionStatus } from '../context/ConnectionStatusContext'
import { useClashResource } from '../hooks/useClashResource'
import { useClashWebSocket } from '../hooks/useClashWebSocket'
import { clashApi, wsUrl } from '../api/clashClient'
import { formatBytes, formatBytesPerSec } from '../utils/format'
import { monoFont } from '../theme'

const StatCard = memo(function StatCard({ label, value, sub }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontFamily: monoFont, fontWeight: 700, mt: 0.5 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Paper>
  )
})

// Owns the /traffic WebSocket subscription. Ticks once a second, so it's
// pulled out of DashboardPage into its own component — otherwise every
// message would re-render the whole page, including the three stat cards
// that only depend on slow polling intervals (15-30s) and have no reason
// to re-render every second. `pauseWhenHidden` is on here (unlike the
// dedicated Traffic page) since this is a small decorative ticker nobody
// is watching while the tab is in the background.
function TrafficPanel() {
  const { settings, secretReady } = useSettings()
  // Hold off building the URL (and thus opening the socket) until the
  // encrypted secret has finished loading — otherwise the first connection
  // attempt goes out with no `?token=`, gets rejected, and immediately
  // reconnects once the real secret resolves a moment later.
  const trafficUrl = secretReady ? wsUrl(settings, '/traffic') : null
  const { items: trafficItems, status: trafficStatus } = useClashWebSocket(trafficUrl, {
    maxItems: 60,
    pauseWhenHidden: true,
  })
  const latest = trafficItems[trafficItems.length - 1]?.data

  const up = trafficItems.map((i) => i.data?.up ?? 0)
  const down = trafficItems.map((i) => i.data?.down ?? 0)
  const xAxisData = trafficItems.map((_, idx) => idx)

  return (
    <>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="Current throughput"
          value={latest ? formatBytesPerSec(latest.up + latest.down) : '—'}
          sub={latest ? `↑ ${formatBytesPerSec(latest.up)} · ↓ ${formatBytesPerSec(latest.down)}` : trafficStatus}
        />
      </Grid>

      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Traffic (last {trafficItems.length}s)
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={trafficStatus}
              color={trafficStatus === 'open' ? 'success' : 'default'}
            />
          </Stack>
          {trafficItems.length > 1 ? (
            <LineChart
              height={260}
              series={[
                { data: up, label: 'Upload', color: '#2DD4BF', showMark: false },
                { data: down, label: 'Download', color: '#8B5CF6', showMark: false },
              ]}
              xAxis={[{ data: xAxisData, scaleType: 'point', valueFormatter: () => '' }]}
              yAxis={[{ valueFormatter: (v) => formatBytes(v) }]}
              slotProps={{ legend: { hidden: false } }}
            />
          ) : (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              {trafficStatus === 'paused' ? 'Streaming paused (tab hidden)…' : 'Waiting for streaming traffic data…'}
            </Box>
          )}
        </Paper>
      </Grid>
    </>
  )
}

export default function DashboardPage() {
  const { settings, secretReady } = useSettings()
  // Reuses the same app-wide /version probe the header's status chip is
  // already running (see ConnectionStatusContext) instead of polling the
  // same endpoint again on a separate interval.
  const { version } = useConnectionStatus()
  const { data: proxies } = useClashResource(clashApi.getProxies, settings, {
    intervalMs: 15000,
    enabled: secretReady,
  })
  const { data: connections } = useClashResource(clashApi.getConnections, settings, {
    intervalMs: 5000,
    enabled: secretReady,
  })
  const { data: rules } = useClashResource(clashApi.getRules, settings, {
    intervalMs: 30000,
    enabled: secretReady,
  })

  const proxyCount = proxies ? Object.keys(proxies.proxies || {}).length : '—'
  const connCount = connections ? (connections.connections || []).length : '—'
  const ruleCount = rules ? (rules.rules || []).length : '—'

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A live snapshot of the sing-box core reachable at the configured Clash API address."
        actions={
          version && (
            <Chip
              variant="outlined"
              label={`sing-box ${version.version}${version.meta ? ' · meta' : ''}`}
              sx={{ fontFamily: monoFont }}
            />
          )
        }
      />

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Proxy nodes" value={proxyCount} sub="Outbounds + groups" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Active connections" value={connCount} sub="Live tracked sessions" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Routing rules" value={ruleCount} sub="Loaded from config" />
        </Grid>
        <TrafficPanel />
      </Grid>
    </>
  )
}
