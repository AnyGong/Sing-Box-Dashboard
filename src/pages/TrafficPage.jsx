import { useState } from 'react'
import { Paper, Stack, Chip, Button, Grid, Typography } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import PageHeader from '../components/Common/PageHeader'
import { useSettings } from '../context/SettingsContext'
import { useClashWebSocket } from '../hooks/useClashWebSocket'
import { wsUrl } from '../api/clashClient'
import { formatBytes, formatBytesPerSec } from '../utils/format'
import { monoFont } from '../theme'

export default function TrafficPage() {
  const { settings } = useSettings()
  const [paused, setPaused] = useState(false)
  const url = paused ? null : wsUrl(settings, '/traffic')
  const { items, status, clear } = useClashWebSocket(url, { maxItems: 300 })

  const latest = items[items.length - 1]?.data
  const totalUp = items.reduce((acc, i) => acc + (i.data?.up || 0), 0)
  const totalDown = items.reduce((acc, i) => acc + (i.data?.down || 0), 0)

  const up = items.map((i) => i.data?.up ?? 0)
  const down = items.map((i) => i.data?.down ?? 0)
  const xAxisData = items.map((_, idx) => idx)

  return (
    <>
      <PageHeader
        title="Traffic"
        description="Real-time upload/download throughput, sampled once per second from the Clash API's WebSocket /traffic endpoint."
        actions={
          <Stack direction="row" spacing={1}>
            <Chip size="small" variant="outlined" color={status === 'open' ? 'success' : 'default'} label={status} />
            <Button size="small" variant="outlined" onClick={() => setPaused((p) => !p)}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button size="small" variant="outlined" onClick={clear}>
              Clear
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Upload
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: monoFont, fontWeight: 700 }}>
              {formatBytesPerSec(latest?.up ?? 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Download
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: monoFont, fontWeight: 700 }}>
              {formatBytesPerSec(latest?.down ?? 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Session upload
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: monoFont, fontWeight: 700 }}>
              {formatBytes(totalUp)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Session download
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: monoFont, fontWeight: 700 }}>
              {formatBytes(totalDown)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        {items.length > 1 ? (
          <LineChart
            height={360}
            series={[
              { data: up, label: 'Upload', color: '#2DD4BF', showMark: false, area: true },
              { data: down, label: 'Download', color: '#8B5CF6', showMark: false, area: true },
            ]}
            xAxis={[{ data: xAxisData, scaleType: 'point', valueFormatter: () => '' }]}
            yAxis={[{ valueFormatter: (v) => formatBytes(v) }]}
          />
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
            {paused ? 'Streaming paused.' : 'Waiting for traffic samples…'}
          </Typography>
        )}
      </Paper>
    </>
  )
}
