import { Component } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 420, textAlign: 'center' }}>
          <Typography variant="h5">Something went wrong</Typography>
          <Typography color="text.secondary">
            This screen hit an unexpected error. Reloading usually fixes it; if it keeps happening, tell your administrator.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {String(this.state.error?.message || this.state.error)}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => window.location.reload()}>Reload</Button>
            <Button onClick={() => { window.location.href = '/' }}>Go to home</Button>
          </Stack>
        </Stack>
      </Box>
    )
  }
}
