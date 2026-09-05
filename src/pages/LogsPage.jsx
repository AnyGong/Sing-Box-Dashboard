import { useEffect, useRef, useState } from 'react'
import {
  Paper,
  Stack,
  Select,
  MenuItem,
  Button,
  Chip,
  Box,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material'
import PageHeader from '../components/Common/PageHeader'
import { EmptyBlock } from '../components/Common/StateBlocks'
import { useSettings } from '../context/SettingsContext'
import { useClashWebSocket } from '../hooks/useClashWebSocket'
import { wsUrl } from '../api/clashClient'
import { monoFont } from '../theme'

const LEVELS = ['debug', 'info', 'warning', 'error', 'silent']

const LEVEL_COLOR = {
  debug: 'default',
  info: 'info',
  warning: 'warning',
  error: 'error',
}

export default function LogsPage() {
  const { settings, secretReady } = useSettings()
  const [level, setLevel] = useState('info')
  const [paused, setPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef(null)

  const url = paused || !secretReady ? null : wsUrl(settings, '/logs', { level })
  const { items, status, clear } = useClashWebSocket(url, { maxItems: 500 })

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [items, autoScroll])

  return (
    <>
      <PageHeader
        title="Logs"
        description="Streams sing-box's runtime log via the Clash API's WebSocket /logs endpoint."
        actions={
          <Chip size="small" variant="outlined" color={status === 'open' ? 'success' : 'default'} label={status} />
        }
      />

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <Select size="small" value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => (
            <MenuItem key={l} value={l}>
              {l}
            </MenuItem>
          ))}
        </Select>
        <Button variant="outlined" size="small" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="outlined" size="small" onClick={clear}>
          Clear
        </Button>
        <FormControlLabel
          control={<Switch size="small" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />}
          label="Auto-scroll"
        />
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          height: 520,
          overflowY: 'auto',
          p: 1.5,
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)'),
        }}
      >
        {items.length === 0 && <EmptyBlock label={paused ? 'Streaming paused.' : 'Waiting for log lines…'} />}
        {items.map((item, idx) => {
          const entry = item.data
          const text = typeof entry === 'string' ? entry : entry?.payload
          const lvl = typeof entry === 'object' ? entry?.type : undefined
          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                gap: 1,
                fontFamily: monoFont,
                fontSize: 12.5,
                py: 0.4,
                borderBottom: '1px solid',
                borderColor: 'divider',
                // Same technique already used for the Connections/Rules/
                // Providers tables: rows scrolled out of view skip layout/
                // style/paint entirely. Matters more here than anywhere
                // else in the app — up to 500 lines re-rendering on every
                // incoming message during high-volume debug logging.
                contentVisibility: 'auto',
                containIntrinsicSize: 'auto 24px',
              }}
            >
              <Typography component="span" variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                {new Date(item.at).toLocaleTimeString()}
              </Typography>
              {lvl && (
                <Chip size="small" label={lvl} color={LEVEL_COLOR[lvl] || 'default'} sx={{ height: 18, fontSize: 10 }} />
              )}
              <Typography component="span" sx={{ fontFamily: monoFont, fontSize: 12.5, wordBreak: 'break-all' }}>
                {text}
              </Typography>
            </Box>
          )
        })}
        <div ref={bottomRef} />
      </Paper>
    </>
  )
}
