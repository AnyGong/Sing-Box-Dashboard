import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import InboxIcon from '@mui/icons-material/InboxOutlined'

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 6, justifyContent: 'center' }}>
      <CircularProgress size={20} />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  )
}

export function EmptyBlock({ label = 'Nothing here yet.' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 6, color: 'text.secondary' }}>
      <InboxIcon fontSize="large" />
      <Typography>{label}</Typography>
    </Box>
  )
}

export function ErrorBlock({ error, onRetry }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
            Retry
          </Button>
        )
      }
      sx={{ my: 2 }}
    >
      {error?.message || 'Something went wrong while talking to the controller.'}
    </Alert>
  )
}
