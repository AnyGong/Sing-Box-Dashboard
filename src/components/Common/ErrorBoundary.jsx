import { Component } from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'

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

  handleReset = () => {
    this.setState({ error: null })
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
          <Button variant="contained" onClick={this.handleReset}>
            Try again
          </Button>
        </Paper>
      </Box>
    )
  }
}
