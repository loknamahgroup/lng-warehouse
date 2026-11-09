import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Avatar, Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import { useAuth } from '../auth'
import { useThemeMode } from '../theme'

export default function Login() {
  const { login } = useAuth()
  const { mode, toggle } = useThemeMode()
  const theme = useTheme()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', bgcolor: 'background.default' }}>
      {/* Brand panel (tablet / desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' }, flex: 1, flexDirection: 'column', justifyContent: 'center', p: 8, color: '#fff',
          background: `linear-gradient(145deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 60%, ${theme.palette.secondary.main} 140%)`
        }}
      >
        <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: alpha('#fff', 0.18), mb: 3 }}><WarehouseIcon sx={{ fontSize: 36 }} /></Avatar>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>LNG Control Center</Typography>
        <Typography variant="h6" sx={{ mt: 1, fontWeight: 400, opacity: 0.9, maxWidth: 460 }}>
          One place for warehouse stock, branch requests, approvals and sales.
        </Typography>
      </Box>

      <Box sx={{ flex: { xs: 1, md: '0 0 480px' }, display: 'grid', placeItems: 'center', p: 3, position: 'relative', pt: 'calc(24px + env(safe-area-inset-top))' }}>
        <IconButton onClick={toggle} aria-label="Toggle theme" sx={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', right: 12 }}>
          {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
        <Stack component="form" onSubmit={submit} spacing={2.5} sx={{ width: '100%', maxWidth: 380 }}>
          <Stack alignItems={{ xs: 'center', md: 'flex-start' }} spacing={1.5}>
            <Avatar variant="rounded" sx={{ display: { md: 'none' }, width: 64, height: 64, bgcolor: 'primary.main' }}><WarehouseIcon sx={{ fontSize: 36 }} /></Avatar>
            <Typography variant="h4" component="h1" sx={{ textAlign: { xs: 'center', md: 'left' } }}>Sign in</Typography>
            <Typography color="text.secondary" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              Use your LNG Control Center account.
            </Typography>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" fullWidth required autoFocus />
          <TextField
            label="Password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" fullWidth required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShow((v) => !v)} edge="end" aria-label="Show password">{show ? <VisibilityOff /> : <Visibility />}</IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button type="submit" variant="contained" size="large" disabled={busy || !username || !password} sx={{ py: 1.4 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
