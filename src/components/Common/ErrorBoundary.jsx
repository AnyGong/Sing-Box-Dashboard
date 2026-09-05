import { Component } from 'react'
import { Box, Typography, Button, Stack, Paper } from '@mui/material'

// Nothing above this in the tree catches render-time exceptions, so without
// it a bug in any single page (a bad API response shape, a null deref,
// etc.) unmounts React entirely and leaves a blank white page with no way
// back short of a manual reload.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error in the control panel UI:', error, info)
  }

  // Just clears the boundary's own state and re-renders the same subtree —
  // useful for a genuinely transient error (a one-off race, a blip in
  // freshly-fetched data), but for a deterministic bug (bad response shape,
  // null deref) the exact same state that caused the crash is still there,
  // so this will usually throw again immediately. Keeping it as a first,
  // low-cost attempt — "Reload" below is the reliable fallback since a full
  // navigation discards all state instead of only this boundary's.
  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: { xs: 3, sm: 6 } }}>
        <Paper variant="outlined" sx={{ p: 4, maxWidth: 480, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {error?.message || 'An unexpected error occurred while rendering the control panel.'}
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button variant="outlined" onClick={this.handleReset}>
              Try again
            </Button>
            <Button variant="contained" onClick={this.handleReload}>
              Reload
            </Button>
          </Stack>
        </Paper>
      </Box>
    )
  }
}
