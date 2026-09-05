import { useState } from 'react'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Radio,
  IconButton,
  Chip,
  Stack,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import BoltIcon from '@mui/icons-material/BoltOutlined'
import { monoFont } from '../../theme'
import { clashApi } from '../../api/clashClient'
import { useSettings } from '../../context/SettingsContext'

const SELECTABLE_TYPES = new Set(['Selector'])

function delayColor(ms) {
  if (ms === undefined || ms === null) return 'default'
  if (ms <= 0) return 'error' // 0 / negative encodes "timeout" in Clash API
  if (ms < 250) return 'success'
  if (ms < 800) return 'warning'
  return 'error'
}

function DelayChip({ ms, testing }) {
  if (testing) return <CircularProgress size={14} />
  if (ms === undefined) return <Chip size="small" variant="outlined" label="—" sx={{ fontFamily: monoFont }} />
  const label = ms <= 0 ? 'timeout' : `${ms} ms`
  return <Chip size="small" color={delayColor(ms)} label={label} sx={{ fontFamily: monoFont }} />
}

export default function ProxyGroupCard({ group, allProxies, onChanged, defaultExpanded }) {
  const { settings } = useSettings()
  const [testing, setTesting] = useState({}) // name -> bool
  const [delays, setDelays] = useState({}) // name -> ms
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const selectable = SELECTABLE_TYPES.has(group.type)
  const members = group.all || []

  const testOne = async (name) => {
    setTesting((t) => ({ ...t, [name]: true }))
    try {
      const res = await clashApi.getProxyDelay(settings, name)
      setDelays((d) => ({ ...d, [name]: res.delay }))
    } catch {
      setDelays((d) => ({ ...d, [name]: 0 }))
    } finally {
      setTesting((t) => ({ ...t, [name]: false }))
    }
  }

  const testAll = async () => {
    setBusy(true)
    try {
      const res = await clashApi.getGroupDelay(settings, group.name)
      setDelays((d) => ({ ...d, ...res }))
    } catch {
      // fall back to per-node testing if the batch endpoint isn't supported
      await Promise.all(members.map((m) => testOne(m)))
    } finally {
      setBusy(false)
    }
  }

  const select = async (name) => {
    setErr(null)
    setBusy(true)
    try {
      await clashApi.selectProxy(settings, group.name, name)
      onChanged?.()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Accordion defaultExpanded={defaultExpanded} variant="outlined" disableGutters>
      {/* AccordionSummary renders as a real <button> (via ButtonBase) by
          default. It contains a "test all" IconButton — also a real
          <button> — which produces React's "<button> cannot appear as a
          descendant of <button>" DOM-nesting warning. Rendering the summary
          as a <div> instead keeps all of ButtonBase's click/keyboard/focus
          behavior (it adds role="button" + tabIndex automatically for
          non-button components) while avoiding the invalid nesting. */}
      <AccordionSummary component="div" expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', pr: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{group.name}</Typography>
          <Chip size="small" label={group.type} variant="outlined" />
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: monoFont }}>
            → {group.now}
          </Typography>
          <Stack sx={{ ml: 'auto' }} direction="row" spacing={1} alignItems="center">
            <Tooltip title="Test latency for all members">
              <span>
                <IconButton
                  size="small"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    testAll()
                  }}
                >
                  <BoltIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && <TableCell padding="checkbox" />}
              <TableCell>Node</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Delay</TableCell>
              <TableCell align="right">Test</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((name) => {
              const proxy = allProxies?.[name]
              const history = proxy?.history || []
              const lastDelay = delays[name] ?? history[history.length - 1]?.delay
              return (
                <TableRow key={name} hover selected={group.now === name}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Radio
                        size="small"
                        checked={group.now === name}
                        onChange={() => select(name)}
                        disabled={busy}
                      />
                    </TableCell>
                  )}
                  <TableCell sx={{ fontFamily: monoFont, fontSize: 13 }}>{name}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={proxy?.type || '—'} />
                  </TableCell>
                  <TableCell align="right">
                    <DelayChip ms={lastDelay} testing={testing[name]} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => testOne(name)} disabled={testing[name]}>
                      <BoltIcon fontSize="inherit" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {err && (
          <Typography color="error" variant="caption" sx={{ display: 'block', p: 1.5 }}>
            {err}
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
