import { useState } from 'react'
import { Paper, Stack, Typography, Button, Alert } from '@mui/material'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweepOutlined'
import PageHeader from '../components/Common/PageHeader'
import { useSettings } from '../context/SettingsContext'
import { clashApi, ClashApiError } from '../api/clashClient'

export default function CachePage() {
  const { settings } = useSettings()
  const [state, setState] = useState({ status: 'idle' })

  const flush = async () => {
    setState({ status: 'busy' })
    try {
      await clashApi.flushFakeIpCache(settings)
      setState({ status: 'success' })
    } catch (err) {
      setState({
        status: 'error',
        message:
          err instanceof ClashApiError
            ? `${err.status}: ${err.message}`
            : 'Request failed — check the connection settings.',
      })
    }
  }

  return (
    <>
      <PageHeader
        title="Cache"
        description="Maintenance actions for sing-box's internal caches."
      />

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Fake-IP cache
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Clears the fake-ip address-to-domain mapping table used by the DNS server's fakeip
          strategy. Useful after changing DNS rules or if a client is stuck resolving a stale
          mapping.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteSweepIcon />}
            onClick={flush}
            disabled={state.status === 'busy'}
          >
            Flush fake-IP cache
          </Button>
        </Stack>
        {state.status === 'success' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Fake-IP cache flushed.
          </Alert>
        )}
        {state.status === 'error' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {state.message}
          </Alert>
        )}
      </Paper>
    </>
  )
}
