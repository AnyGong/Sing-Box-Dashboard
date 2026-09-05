import { useState } from 'react'
import {
  Paper,
  Typography,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Box,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined'
import PageHeader from '../components/Common/PageHeader'
import { useSettings } from '../context/SettingsContext'
import { monoFont } from '../theme'

const METHODS = [
  {
    id: 'GetStats',
    summary: 'Reads (and optionally resets) a single named counter, e.g. traffic for one inbound/outbound/user.',
    request: '{ name: string, reset: bool }',
    response: '{ stat: { name: string, value: int64 } }',
  },
  {
    id: 'QueryStats',
    summary: 'Reads every counter whose name matches a prefix pattern, e.g. "user>>>alice" or "outbound>>>proxy".',
    request: '{ pattern: string, reset: bool }',
    response: '{ stat: [ { name: string, value: int64 } ] }',
  },
  {
    id: 'GetSysStats',
    summary: "Reads the process' Go runtime stats (goroutines, GC pauses, memory) — takes no request fields.",
    request: '{}',
    response:
      '{ NumGoroutine, Alloc, TotalAlloc, Sys, Mallocs, Frees, LiveObjects, NumGC, PauseTotalNs, Uptime }',
  },
]

function buildGrpcurlCommand({ address, plaintext, method, name, pattern, reset }) {
  const flags = [plaintext ? '-plaintext' : '', '-d'].filter(Boolean).join(' ')
  let payload = '{}'
  if (method === 'GetStats') payload = JSON.stringify({ name, reset })
  if (method === 'QueryStats') payload = JSON.stringify({ pattern, reset })
  return `grpcurl ${flags} '${payload}' \\\n  ${address} \\\n  v2ray.core.app.stats.command.StatsService/${method}`
}

export default function GrpcPage() {
  const { settings } = useSettings()
  const [address, setAddress] = useState('127.0.0.1:9091')
  const [plaintext, setPlaintext] = useState(true)
  const [method, setMethod] = useState('QueryStats')
  const [name, setName] = useState('outbound>>>proxy>>>traffic>>>uplink')
  const [pattern, setPattern] = useState('outbound>>>')
  const [reset, setReset] = useState(false)
  const [copied, setCopied] = useState(false)
  const [gatewayResult, setGatewayResult] = useState(null)
  const [gatewayError, setGatewayError] = useState(null)
  const [busy, setBusy] = useState(false)

  const command = buildGrpcurlCommand({ address, plaintext, method, name, pattern, reset })

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tryGateway = async () => {
    if (!settings.grpcWebUrl) return
    setBusy(true)
    setGatewayResult(null)
    setGatewayError(null)
    try {
      const body = method === 'GetStats' ? { name, reset } : method === 'QueryStats' ? { pattern, reset } : {}
      const res = await fetch(`${settings.grpcWebUrl.replace(/\/?$/, '/')}${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`)
      setGatewayResult(text)
    } catch (err) {
      setGatewayError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="gRPC API"
        description="sing-box's V2Ray-compatible stats service (experimental.v2ray_api) speaks raw gRPC over HTTP/2, which browsers cannot call directly. This module documents the service and helps you build and test calls against it."
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Service reference — v2ray.core.app.stats.command.StatsService
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Method</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Request</TableCell>
              <TableCell>Response</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {METHODS.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell sx={{ fontFamily: monoFont, fontSize: 13, whiteSpace: 'nowrap' }}>{m.id}</TableCell>
                <TableCell sx={{ maxWidth: 320 }}>{m.summary}</TableCell>
                <TableCell sx={{ fontFamily: monoFont, fontSize: 12 }}>{m.request}</TableCell>
                <TableCell sx={{ fontFamily: monoFont, fontSize: 12 }}>{m.response}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Alert severity="info" sx={{ mt: 2 }}>
          Enable this service in sing-box with an <code>experimental.v2ray_api</code> block whose
          <code> stats.enabled</code> is <code>true</code>, then point the address below at its
          <code> listen</code> value.
        </Alert>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Build a test call
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 640 }}>
          <TextField
            label="gRPC server address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            size="small"
            helperText="host:port of experimental.v2ray_api.listen"
          />
          <FormControlLabel
            control={<Checkbox checked={plaintext} onChange={(e) => setPlaintext(e.target.checked)} />}
            label="Plaintext (no TLS)"
          />
          <Select size="small" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.id}
              </MenuItem>
            ))}
          </Select>

          {method === 'GetStats' && (
            <TextField
              label="Counter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
              helperText="e.g. outbound>>>proxy>>>traffic>>>uplink"
            />
          )}
          {method === 'QueryStats' && (
            <TextField
              label="Name pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              size="small"
              helperText="prefix match, e.g. outbound>>> or user>>>alice"
            />
          )}
          {method !== 'GetSysStats' && (
            <FormControlLabel
              control={<Checkbox checked={reset} onChange={(e) => setReset(e.target.checked)} />}
              label="Reset counter(s) after reading"
            />
          )}
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          grpcurl command
        </Typography>
        <Box
          sx={{
            position: 'relative',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.04)'),
            borderRadius: 1,
            p: 2,
            pr: 6,
          }}
        >
          <Typography component="pre" sx={{ fontFamily: monoFont, fontSize: 13, m: 0, whiteSpace: 'pre-wrap' }}>
            {command}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy command'}>
            <IconButton size="small" onClick={copy} sx={{ position: 'absolute', top: 8, right: 8 }}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Try via JSON gateway
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={settings.grpcWebUrl ? settings.grpcWebUrl : 'not configured'}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          If you run a grpc-gateway or similar JSON-transcoding proxy in front of the stats
          service, set its URL in Settings and this will POST the request body above to
          <code> {'{gateway URL}/'}{method}</code> for a quick in-browser test.
        </Typography>
        <Button variant="outlined" onClick={tryGateway} disabled={!settings.grpcWebUrl || busy}>
          Send test request
        </Button>
        {gatewayResult && (
          <Alert severity="success" sx={{ mt: 2, fontFamily: monoFont, whiteSpace: 'pre-wrap' }}>
            {gatewayResult}
          </Alert>
        )}
        {gatewayError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {gatewayError}
          </Alert>
        )}
      </Paper>
    </>
  )
}
