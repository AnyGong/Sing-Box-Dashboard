import { useState } from 'react'
import { Paper, Stack, Chip, Button, Grid, Typography } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import PageHeader from '../components/Common/PageHeader'
import { useSettings } from '../context/SettingsContext'
import { useClashWebSocket } from '../hooks/useClashWebSocket'
import { wsUrl } from '../api/clashClient'
import { formatBytes } from '../utils/format'
import { monoFont } from '../theme'

export default function MemoryPage() {
  const { settings, secretReady } = useSettings()
  const [paused, setPaused] = useState(false)
  const url = paused || !secretReady ? null : wsUrl(settings, '/memory')
  const { items, status, clear } = useClashWebSocket(url, { maxItems: 300 })

  const latest = items[items.length - 1]?.data
  const inuse = items.map((i) => i.data?.inuse ?? 0)
  const xAxisData = items.map((_, idx) => idx)

  return (
    <>
      <PageHeader
        title="Memory"
        description="Live Go runtime heap usage, streamed from the Clash API's WebSocket /memory endpoint."
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
        <Grid item xs={12} sm={4}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              In use
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: monoFont, fontWeight: 700 }}>
              {formatBytes(latest?.inuse ?? 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              OS memory limit
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: monoFont, fontWeight: 700 }}>
              {latest?.oslimit ? formatBytes(latest.oslimit) : 'none'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        {items.length > 1 ? (
          <LineChart
            height={360}
            series={[{ data: inuse, label: 'Heap in use', color: '#2DD4BF', showMark: false, area: true }]}
            xAxis={[{ data: xAxisData, scaleType: 'point', valueFormatter: () => '' }]}
            yAxis={[{ valueFormatter: (v) => formatBytes(v) }]}
          />
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
            {paused ? 'Streaming paused.' : 'Waiting for memory samples…'}
          </Typography>
        )}
      </Paper>
    </>
  )
}
