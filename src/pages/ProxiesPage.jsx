import { useDeferredValue, useMemo, useState } from 'react'
import {
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import PageHeader from '../components/Common/PageHeader'
import ProxyGroupCard from '../components/Proxies/ProxyGroupCard'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../components/Common/StateBlocks'
import { useSettings } from '../context/SettingsContext'
import { useClashResource } from '../hooks/useClashResource'
import { clashApi } from '../api/clashClient'
import { monoFont } from '../theme'

const GROUP_TYPES = new Set(['Selector', 'URLTest', 'Fallback', 'LoadBalance', 'Relay'])

export default function ProxiesPage() {
  const { settings, secretReady } = useSettings()
  const { data, loading, error, refresh } = useClashResource(clashApi.getProxies, settings, {
    enabled: secretReady,
  })
  const [leafFilter, setLeafFilter] = useState('')
  const deferredLeafFilter = useDeferredValue(leafFilter)

  const { groups, leaves } = useMemo(() => {
    const all = data?.proxies || {}
    const groupList = []
    const leafList = []
    Object.entries(all).forEach(([name, proxy]) => {
      if (name === 'GLOBAL') return
      if (GROUP_TYPES.has(proxy.type)) groupList.push({ ...proxy, name })
      else leafList.push({ ...proxy, name })
    })
    return { groups: groupList, leaves: leafList }
  }, [data])

  // Rules and Connections both already get a search box for exactly this
  // reason — a config with dozens of outbounds otherwise makes finding one
  // by name a manual scroll-and-scan.
  const filteredLeaves = useMemo(() => {
    if (!deferredLeafFilter) return leaves
    const needle = deferredLeafFilter.toLowerCase()
    return leaves.filter((p) => p.name.toLowerCase().includes(needle) || p.type?.toLowerCase().includes(needle))
  }, [leaves, deferredLeafFilter])

  return (
    <>
      <PageHeader
        title="Proxies"
        description="Proxy groups from your outbounds. Select a group's active member, or run latency tests against any node."
        actions={
          <Button startIcon={<RefreshIcon />} onClick={refresh} size="small">
            Refresh
          </Button>
        }
      />

      {loading && !data && <LoadingBlock label="Loading proxies…" />}
      {error && <ErrorBlock error={error} onRetry={refresh} />}

      {data && groups.length === 0 && leaves.length === 0 && <EmptyBlock label="No proxies reported." />}

      {groups.length > 0 && (
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          {groups.map((group, idx) => (
            <ProxyGroupCard
              key={group.name}
              group={group}
              allProxies={data.proxies}
              onChanged={refresh}
              defaultExpanded={idx === 0}
            />
          ))}
        </Stack>
      )}

      {leaves.length > 0 && (
        <Paper variant="outlined">
          <Typography variant="subtitle1" sx={{ fontWeight: 700, p: 2, pb: 1.5 }}>
            Outbound proxies
          </Typography>
          <TextField
            size="small"
            placeholder="Filter by name or type…"
            value={leafFilter}
            onChange={(e) => setLeafFilter(e.target.value)}
            sx={{ mx: 2, mb: 2, maxWidth: 360 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {filteredLeaves.length === 0 ? (
            <EmptyBlock label="No outbound proxies match your filter." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>UDP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLeaves.map((p) => (
                  <TableRow key={p.name} hover>
                    <TableCell sx={{ fontFamily: monoFont, fontSize: 13 }}>{p.name}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={p.type} />
                    </TableCell>
                    <TableCell>{p.udp ? 'yes' : 'no'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}
    </>
  )
}
