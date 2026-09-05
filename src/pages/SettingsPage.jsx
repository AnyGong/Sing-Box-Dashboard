import { useEffect, useRef, useState } from 'react'
import {
  Paper,
  Stack,
  TextField,
  Button,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined'
import PageHeader from '../components/Common/PageHeader'
import { useSettings } from '../context/SettingsContext'
import { clashApi, ClashApiError } from '../api/clashClient'

export default function SettingsPage() {
  const { settings, updateSettings, secretReady } = useSettings()
  const [form, setForm] = useState(settings)
  const [showSecret, setShowSecret] = useState(false)
  const [testState, setTestState] = useState({ status: 'idle' })
  const syncedSecretRef = useRef(false)

  // The stored secret is decrypted asynchronously (Web Crypto + IndexedDB
  // are async APIs), so it isn't in `settings` yet on first render. Pull it
  // into the form once it lands, but only if the field is still untouched —
  // never overwrite something the user has started typing.
  useEffect(() => {
    if (secretReady && !syncedSecretRef.current) {
      syncedSecretRef.current = true
      setForm((f) => (f.secret ? f : { ...f, secret: settings.secret }))
    }
  }, [secretReady, settings.secret])

  const dirty = secretReady && JSON.stringify(form) !== JSON.stringify(settings)

  const handleTest = async () => {
    setTestState({ status: 'testing' })
    try {
      const version = await clashApi.getVersion(form)
      setTestState({ status: 'success', version })
    } catch (err) {
      const message =
        err instanceof ClashApiError
          ? `${err.status}: ${err.message}`
          : 'Could not reach the controller. Check the address and that sing-box is running with clash_api enabled.'
      setTestState({ status: 'error', message })
    }
  }

  const handleSave = () => {
    updateSettings(form)
    setTestState({ status: 'idle' })
  }

  return (
    <>
      <PageHeader
        title="Connection settings"
        description="Point this dashboard at your sing-box instance's external_controller address. These values are only stored in this browser."
      />
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
        <Stack spacing={2.5}>
          <TextField
            label="Clash API base URL"
            placeholder="http://127.0.0.1:9090"
            value={form.baseUrl}
            onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
            helperText="Matches experimental.clash_api.external_controller in your sing-box config."
            fullWidth
          />
          <TextField
            label="Secret (optional)"
            type={showSecret ? 'text' : 'password'}
            value={form.secret}
            onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
            helperText="Matches experimental.clash_api.secret, sent as a Bearer token."
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowSecret((s) => !s)} edge="end" size="small">
                    {showSecret ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Divider />

          <TextField
            label="gRPC-Web / JSON gateway URL (optional)"
            placeholder="http://127.0.0.1:8080"
            value={form.grpcWebUrl}
            onChange={(e) => setForm((f) => ({ ...f, grpcWebUrl: e.target.value }))}
            helperText="Only needed for the gRPC API module. Browsers cannot speak raw gRPC, so point this at a grpc-web or grpc-gateway proxy in front of sing-box's V2Ray stats service, if you run one."
            fullWidth
          />

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={handleTest}
              disabled={testState.status === 'testing' || !secretReady}
            >
              Test connection
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={!dirty}>
              Save
            </Button>
          </Stack>

          {testState.status === 'success' && (
            <Alert severity="success">
              Connected — sing-box {testState.version?.version} (meta: {String(testState.version?.meta ?? 'n/a')})
            </Alert>
          )}
          {testState.status === 'error' && <Alert severity="error">{testState.message}</Alert>}
          {dirty && testState.status === 'idle' && (
            <Alert severity="info">You have unsaved changes — click Save to apply them.</Alert>
          )}
        </Stack>
      </Paper>
    </>
  )
}
