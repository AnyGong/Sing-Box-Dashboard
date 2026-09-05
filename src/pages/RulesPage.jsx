import { useDeferredValue, useMemo, useState } from 'react'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import PageHeader from '../components/Common/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../components/Common/StateBlocks'
import { useSettings } from '../context/SettingsContext'
import { useClashResource } from '../hooks/useClashResource'
import { clashApi } from '../api/clashClient'
import { monoFont } from '../theme'

export default function RulesPage() {
  const { settings, secretReady } = useSettings()
  const { data, loading, error, refresh } = useClashResource(clashApi.getRules, settings, {
    enabled: secretReady,
  })
  const [filter, setFilter] = useState('')
  const deferredFilter = useDeferredValue(filter)

  const rules = useMemo(() => {
    // Keep each rule's position in the *unfiltered* list attached before
    // filtering. It's used both as a stable React key (so filtering doesn't
    // reassign keys — and therefore identity — to different rules mid-type,
    // which was defeating reconciliation and could mismatch the
    // content-visibility sizing hints against the wrong row) and as the "#"
    // column, so it keeps showing each rule's real evaluation order instead
    // of its position within the current filter results.
    const list = (data?.rules || []).map((r, originalIndex) => ({ ...r, originalIndex }))
    if (!deferredFilter) return list
    const needle = deferredFilter.toLowerCase()
    return list.filter(
      (r) =>
        r.type?.toLowerCase().includes(needle) ||
        r.payload?.toLowerCase().includes(needle) ||
        r.proxy?.toLowerCase().includes(needle),
    )
  }, [data, deferredFilter])

  return (
    <>
      <PageHeader
        title="Rules"
        description="Routing rules loaded from your sing-box configuration, in evaluation order."
        actions={
          <Button startIcon={<RefreshIcon />} onClick={refresh} size="small">
            Refresh
          </Button>
        }
      />

      <TextField
        size="small"
        placeholder="Filter by type, payload, or target outbound…"
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

      {loading && !data && <LoadingBlock label="Loading rules…" />}
      {error && <ErrorBlock error={error} onRetry={refresh} />}
      {data && rules.length === 0 && <EmptyBlock label="No rules match your filter." />}

      {rules.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={64}>#</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Payload</TableCell>
                <TableCell>Outbound</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((r) => (
                <TableRow
                  key={r.originalIndex}
                  hover
                  sx={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 33px' }}
                >
                  <TableCell sx={{ color: 'text.secondary' }}>{r.originalIndex + 1}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={r.type} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: monoFont, fontSize: 13 }}>{r.payload || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: monoFont, fontSize: 13 }}>{r.proxy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  )
}
