import { useEffect, useRef, useState } from 'react'
import { Paper, Stack, Chip, Button, Grid, Typography } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import PageHeader from '../components/Common/PageHeader'
import { useTrafficStream } from '../context/TrafficStreamContext'
import { formatBytes, formatBytesPerSec } from '../utils/format'
import { monoFont } from '../theme'

export default function TrafficPage() {
  // Reads the single app-wide /traffic subscription (TrafficStreamContext)
  // instead of opening its own — previously this page's chart reset to
  // empty every time you navigated here, since it tore down and reopened
  // its own WebSocket per visit. The shared connection now stays open (and
  // keeps feeding the daily-totals accumulator on the Activity page) the
  // whole time the app is open, regardless of which page you're looking at.
  const { items: liveItems, status } = useTrafficStream()

  // "Pause" used to actually close the socket. Now that the connection is
  // shared with ActivityPage's sparkline and the daily accumulator, pausing
  // it here would silently stop their data too — so this instead freezes
  // only what *this page* is displaying, by snapshotting the buffer at the
  // moment Pause is clicked and rendering that snapshot until Resume.
  const [paused, setPaused] = useState(false)
  const frozenRef = useRef(null)
  const togglePaused = () => {
    setPaused((p) => {
      if (!p) frozenRef.current = liveItems
      return !p
    })
  }
  const items = paused ? frozenRef.current : liveItems

  // `items` is capped at maxItems (~5 min of samples at 1/sec) so the chart
  // stays cheap to render — older samples silently fall out of the array.
  // Summing `items` directly for a "session" total is therefore wrong for
  // any session longer than the cap (it quietly becomes a "last 5 minutes"
  // total). Track the running total separately: each render, add whatever
  // sample is newest — identified by its timestamp, not array position —
  // exactly once, independent of how much of the display buffer gets
  // trimmed.
  const [sessionTotals, setSessionTotals] = useState({ up: 0, down: 0 })
  const lastCountedAtRef = useRef(0)

  useEffect(() => {
    if (paused) return
    const last = liveItems[liveItems.length - 1]
    if (last && last.at > lastCountedAtRef.current) {
      lastCountedAtRef.current = last.at
      setSessionTotals((t) => ({
        up: t.up + (last.data?.up || 0),
        down: t.down + (last.data?.down || 0),
      }))
    }
  }, [liveItems, paused])

  // Resets this page's own session counters. Doesn't touch the shared
  // buffer itself (see the comment on `paused` above) — that's the whole
  // point of lifting the connection out of this page.
  const resetSession = () => {
    lastCountedAtRef.current = 0
    setSessionTotals({ up: 0, down: 0 })
  }

  const latest = items[items.length - 1]?.data

  const up = items.map((i) => i.data?.up ?? 0)
  const down = items.map((i) => i.data?.down ?? 0)
  const xAxisData = items.map((_, idx) => idx)

  return (
    <>
      <PageHeader
        title="Traffic"
        description="Real-time upload/download throughput, sampled once per second from the Clash API's WebSocket /traffic endpoint. This stream stays connected in the background (feeding the Activity page's daily total) even while you're on another page."
        actions={
          <Stack direction="row" spacing={1}>
            <Chip size="small" variant="outlined" color={status === 'open' ? 'success' : 'default'} label={status} />
            <Button size="small" variant="outlined" onClick={togglePaused}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button size="small" variant="outlined" onClick={resetSession}>
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
              {formatBytes(sessionTotals.up)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Session download
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: monoFont, fontWeight: 700 }}>
              {formatBytes(sessionTotals.down)}
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
