import { useState } from 'react'
import {
  Paper,
  Stack,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Snackbar,
  Alert,
  Checkbox,
  Grid,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import PageHeader from '../components/Common/PageHeader'
import { LoadingBlock, ErrorBlock } from '../components/Common/StateBlocks'
import ConfirmDialog from '../components/Common/ConfirmDialog'
import { useSettings } from '../context/SettingsContext'
import { useClashResource } from '../hooks/useClashResource'
import { clashApi } from '../api/clashClient'
import { monoFont } from '../theme'

const BOOL_FIELDS = ['allow-lan', 'ipv6', 'unified-delay', 'tcp-concurrent']
const MODE_OPTIONS = ['rule', 'global', 'direct']
const LOG_LEVEL_OPTIONS = ['debug', 'info', 'warning', 'error', 'silent']
const READONLY_NUMERIC_FIELDS = ['port', 'socks-port', 'redir-port', 'tproxy-port', 'mixed-port']

// The controller's Clash API can report enum-ish fields (e.g. `mode`) with
// different casing than the lowercase values these <Select>s use as their
// <MenuItem> values (sing-box has returned "Rule" rather than "rule" on some
// versions). Map whatever comes back onto the option list case-insensitively
// so the Select never receives a value with no matching MenuItem — MUI logs
// an "out-of-range value" warning in that case, and, worse, renders the
// select as blank instead of showing the actual current mode.
function normalizeToOption(value, options) {
  if (value === undefined || value === null) return ''
  const match = options.find((o) => o.toLowerCase() === String(value).toLowerCase())
  return match ?? ''
}

export default function ConfigsPage() {
  const { settings, secretReady } = useSettings()
  const { data, loading, error, refresh } = useClashResource(clashApi.getConfigs, settings, {
    enabled: secretReady,
  })
  const [toast, setToast] = useState(null)
  const [reloadPath, setReloadPath] = useState('')
  const [force, setForce] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [reloadConfirmOpen, setReloadConfirmOpen] = useState(false)

  const patch = async (key, value) => {
    try {
      await clashApi.patchConfigs(settings, { [key]: value })
      setToast({ severity: 'success', message: `Updated ${key}.` })
      refresh()
    } catch (err) {
      setToast({ severity: 'error', message: `Failed to update ${key}: ${err.message}` })
    }
  }

  const doReload = async () => {
    setReloading(true)
    try {
      await clashApi.reloadConfigs(settings, { path: reloadPath || undefined, force })
      setToast({ severity: 'success', message: 'Configuration reloaded.' })
      refresh()
    } catch (err) {
      setToast({ severity: 'error', message: `Reload failed: ${err.message}` })
    } finally {
      setReloading(false)
      setReloadConfirmOpen(false)
    }
  }

  // A plain reload just re-reads the config file — low-risk. "Force" is the
  // one that drops every in-flight connection, so that's the case worth an
  // extra step before it fires.
  const handleReloadClick = () => {
    if (force) {
      setReloadConfirmOpen(true)
    } else {
      doReload()
    }
  }

  return (
    <>
      <PageHeader
        title="Configs"
        description="Live-editable runtime settings via GET/PATCH /configs, plus a full reload via PUT /configs."
        actions={
          <Button startIcon={<RefreshIcon />} onClick={refresh} size="small">
            Refresh
          </Button>
        }
      />

      {loading && !data && <LoadingBlock label="Loading configuration…" />}
      {error && <ErrorBlock error={error} onRetry={refresh} />}

      {data && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Toggles
              </Typography>
              <Stack spacing={1}>
                {BOOL_FIELDS.filter((f) => f in data).map((field) => (
                  <FormControlLabel
                    key={field}
                    control={
                      <Switch
                        checked={!!data[field]}
                        onChange={(e) => patch(field, e.target.checked)}
                      />
                    }
                    label={field}
                    sx={{ '& .MuiFormControlLabel-label': { fontFamily: monoFont, fontSize: 14 } }}
                  />
                ))}
                {BOOL_FIELDS.every((f) => !(f in data)) && (
                  <Typography color="text.secondary" variant="body2">
                    No boolean settings reported by this controller.
                  </Typography>
                )}
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Modes
              </Typography>
              <Stack spacing={2}>
                {'mode' in data && (
                  <Select
                    size="small"
                    value={normalizeToOption(data.mode, MODE_OPTIONS)}
                    onChange={(e) => patch('mode', e.target.value)}
                  >
                    {MODE_OPTIONS.map((m) => (
                      <MenuItem key={m} value={m}>
                        {m}
                      </MenuItem>
                    ))}
                  </Select>
                )}
                {'log-level' in data && (
                  <Select
                    size="small"
                    value={normalizeToOption(data['log-level'], LOG_LEVEL_OPTIONS)}
                    onChange={(e) => patch('log-level', e.target.value)}
                  >
                    {LOG_LEVEL_OPTIONS.map((l) => (
                      <MenuItem key={l} value={l}>
                        {l}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 3, mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Listener ports
              </Typography>
              <Stack spacing={1.5}>
                {READONLY_NUMERIC_FIELDS.filter((f) => f in data).map((field) => (
                  <TextField
                    key={field}
                    label={field}
                    value={data[field]}
                    size="small"
                    InputProps={{ readOnly: true }}
                    helperText="Set in the sing-box config file, not editable here."
                  />
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Reload configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Triggers PUT /configs, which reloads sing-box's routing configuration. Leave the
                path blank to reload the currently active file.
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="Config path (optional)"
                  placeholder="/etc/sing-box/config.json"
                  value={reloadPath}
                  onChange={(e) => setReloadPath(e.target.value)}
                  size="small"
                />
                <FormControlLabel
                  control={<Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} />}
                  label="Force (discard in-flight connections)"
                />
                <Button
                  variant="contained"
                  onClick={handleReloadClick}
                  disabled={reloading}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Reload
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      <ConfirmDialog
        open={reloadConfirmOpen}
        title="Force-reload configuration?"
        description="Force reload discards every in-flight connection immediately when the new config takes effect. Anything mid-transfer will be cut off."
        confirmLabel="Force reload"
        busy={reloading}
        onConfirm={doReload}
        onClose={() => setReloadConfirmOpen(false)}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        {toast ? <Alert severity={toast.severity}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </>
  )
}
