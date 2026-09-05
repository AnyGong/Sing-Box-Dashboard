import { useState } from 'react'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  IconButton,
  Button,
  Chip,
  Stack,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweepOutlined'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import PageHeader from '../components/Common/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../components/Common/StateBlocks'
import { useSettings } from '../context/SettingsContext'
import { useClashResource } from '../hooks/useClashResource'
import { clashApi } from '../api/clashClient'
import { formatBytes, safeConnStarted } from '../utils/format'
import { monoFont } from '../theme'

export default function ConnectionsPage() {
  const { settings } = useSettings()
  const { data, loading, error, refresh } = useClashResource(clashApi.getConnections, settings, {
    intervalMs: 3000,
  })
  const [filter, setFilter] = useState('')
  const [closing, setClosing] = useState({})

  const connections = (data?.connections || []).filter((c) => {
    if (!filter) return true
    const needle = filter.toLowerCase()
    const host = c.metadata?.host || c.metadata?.destinationIP || ''
    return (
      host.toLowerCase().includes(needle) ||
      (c.chains || []).join(',').toLowerCase().includes(needle) ||
      (c.rule || '').toLowerCase().includes(needle)
    )
  })

  const closeOne = async (id) => {
    setClosing((c) => ({ ...c, [id]: true }))
    try {
      await clashApi.closeConnection(settings, id)
      refresh()
    } finally {
      setClosing((c) => ({ ...c, [id]: false }))
    }
  }

  const closeAll = async () => {
    await clashApi.closeAllConnections(settings)
    refresh()
  }

  return (
    <>
      <PageHeader
        title="Connections"
        description="Active connections currently tracked by the core, refreshed every few seconds."
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} onClick={refresh} size="small">
              Refresh
            </Button>
            <Button
              startIcon={<DeleteSweepIcon />}
              color="error"
              variant="outlined"
              size="small"
              onClick={closeAll}
              disabled={!connections.length}
            >
              Close all
            </Button>
          </Stack>
        }
      />

      <TextField
        size="small"
        placeholder="Filter by host, outbound chain, or rule…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 2, maxWidth: 420 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {loading && !data && <LoadingBlock label="Loading connections…" />}
      {error && <ErrorBlock error={error} onRetry={refresh} />}
      {data && connections.length === 0 && <EmptyBlock label="No active connections match." />}

      {connections.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Host</TableCell>
                <TableCell>Network</TableCell>
                <TableCell>Chain</TableCell>
                <TableCell>Rule</TableCell>
                <TableCell align="right">Up</TableCell>
                <TableCell align="right">Down</TableCell>
                <TableCell align="right">Age</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {connections.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontFamily: monoFont, fontSize: 12.5 }}>
                    {c.metadata?.host || c.metadata?.destinationIP}
                    {c.metadata?.destinationPort ? `:${c.metadata.destinationPort}` : ''}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={`${c.metadata?.network}/${c.metadata?.type}`} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: monoFont, fontSize: 12 }}>{(c.chains || []).join(' ← ')}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{c.rule || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: monoFont }}>
                    {formatBytes(c.upload)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: monoFont }}>
                    {formatBytes(c.download)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: monoFont }}>
                    {safeConnStarted(c.start)}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Close connection">
                      <span>
                        <IconButton size="small" disabled={closing[c.id]} onClick={() => closeOne(c.id)}>
                          <CloseIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  )
}
