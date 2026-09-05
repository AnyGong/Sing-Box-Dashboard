import { useMemo } from 'react'
import { Stack, Table, TableHead, TableBody, TableRow, TableCell, Chip, Paper, Typography, Button } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import PageHeader from '../components/Common/PageHeader'
import ProxyGroupCard from '../components/Proxies/ProxyGroupCard'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../components/Common/StateBlocks'
import { useSettings } from '../context/SettingsContext'
import { useClashResource } from '../hooks/useClashResource'
import { clashApi } from '../api/clashClient'
import { monoFont } from '../theme'

const GROUP_TYPES = new Set(['Selector', 'URLTest', 'Fallback', 'LoadBalance', 'Relay'])

export default function ProxiesPage() {
  const { settings } = useSettings()
  const { data, loading, error, refresh } = useClashResource(clashApi.getProxies, settings)

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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, p: 2, pb: 0 }}>
            Outbound proxies
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>UDP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaves.map((p) => (
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
        </Paper>
      )}
    </>
  )
}
