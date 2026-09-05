import { useState } from 'react'
import {
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  Button,
  Tooltip,
  IconButton,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import SyncIcon from '@mui/icons-material/SyncOutlined'
import FavoriteIcon from '@mui/icons-material/MonitorHeartOutlined'
import PageHeader from '../components/Common/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../components/Common/StateBlocks'
import { useSettings } from '../context/SettingsContext'
import { useClashResource } from '../hooks/useClashResource'
import { clashApi } from '../api/clashClient'
import { monoFont } from '../theme'

function ProxyProvidersTable({ providers, onRefresh }) {
  const { settings } = useSettings()
  const [busy, setBusy] = useState({})

  const setBusyFor = (name, v) => setBusy((b) => ({ ...b, [name]: v }))

  const update = async (name) => {
    setBusyFor(name, 'update')
    try {
      await clashApi.updateProxyProvider(settings, name)
      onRefresh()
    } finally {
      setBusyFor(name, false)
    }
  }
  const healthCheck = async (name) => {
    setBusyFor(name, 'health')
    try {
      await clashApi.healthCheckProxyProvider(settings, name)
      onRefresh()
    } finally {
      setBusyFor(name, false)
    }
  }

  const entries = Object.entries(providers || {})
  if (entries.length === 0) return <EmptyBlock label="No proxy providers configured." />

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Vehicle</TableCell>
            <TableCell align="right">Nodes</TableCell>
            <TableCell>Last updated</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(([name, p]) => (
            <TableRow key={name} hover>
              <TableCell sx={{ fontFamily: monoFont, fontSize: 13 }}>{name}</TableCell>
              <TableCell>
                <Chip size="small" variant="outlined" label={p.vehicleType} />
              </TableCell>
              <TableCell align="right">{p.proxies?.length ?? '—'}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '—'}</TableCell>
              <TableCell align="right">
                <Tooltip title="Health-check all nodes">
                  <span>
                    <IconButton size="small" onClick={() => healthCheck(name)} disabled={!!busy[name]}>
                      <FavoriteIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Update from source">
                  <span>
                    <IconButton size="small" onClick={() => update(name)} disabled={!!busy[name]}>
                      <SyncIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function RuleProvidersTable({ providers, onRefresh }) {
  const { settings } = useSettings()
  const [busy, setBusy] = useState({})

  const update = async (name) => {
    setBusy((b) => ({ ...b, [name]: true }))
    try {
      await clashApi.updateRuleProvider(settings, name)
      onRefresh()
    } finally {
      setBusy((b) => ({ ...b, [name]: false }))
    }
  }

  const entries = Object.entries(providers || {})
  if (entries.length === 0) return <EmptyBlock label="No rule providers configured." />

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Behavior</TableCell>
            <TableCell>Vehicle</TableCell>
            <TableCell align="right">Rule count</TableCell>
            <TableCell>Last updated</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(([name, p]) => (
            <TableRow key={name} hover>
              <TableCell sx={{ fontFamily: monoFont, fontSize: 13 }}>{name}</TableCell>
              <TableCell>
                <Chip size="small" variant="outlined" label={p.behavior} />
              </TableCell>
              <TableCell>{p.vehicleType}</TableCell>
              <TableCell align="right">{p.ruleCount ?? '—'}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '—'}</TableCell>
              <TableCell align="right">
                <Tooltip title="Update from source">
                  <span>
                    <IconButton size="small" onClick={() => update(name)} disabled={!!busy[name]}>
                      <SyncIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default function ProvidersPage() {
  const { settings } = useSettings()
  const [tab, setTab] = useState(0)
  const proxyRes = useClashResource(clashApi.getProxyProviders, settings)
  const ruleRes = useClashResource(clashApi.getRuleProviders, settings)

  const active = tab === 0 ? proxyRes : ruleRes

  return (
    <>
      <PageHeader
        title="Providers"
        description="Remote proxy and rule sets, with on-demand updates and health checks."
        actions={
          <Button startIcon={<RefreshIcon />} onClick={active.refresh} size="small">
            Refresh
          </Button>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Proxy providers" />
        <Tab label="Rule providers" />
      </Tabs>

      {active.loading && !active.data && <LoadingBlock label="Loading providers…" />}
      {active.error && <ErrorBlock error={active.error} onRetry={active.refresh} />}

      {active.data && tab === 0 && <ProxyProvidersTable providers={proxyRes.data?.providers} onRefresh={proxyRes.refresh} />}
      {active.data && tab === 1 && <RuleProvidersTable providers={ruleRes.data?.providers} onRefresh={ruleRes.refresh} />}
    </>
  )
}
