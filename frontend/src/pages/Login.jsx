import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, IconButton, InputAdornment,
  Stack, TextField, Typography
} from '@mui/material'
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
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Admin@123')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <IconButton onClick={toggle}>{mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}</IconButton>
      </Box>
      <Card sx={{ width: 420, boxShadow: 6 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2} component="form" onSubmit={submit}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <WarehouseIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h5">LNG Control Center</Typography>
                <Typography variant="body2" color="text.secondary">Warehouse and branch inventory</Typography>
              </Box>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth required />
            <TextField
              label="Password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShow((v) => !v)} edge="end">
                      {show ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              Admin: admin / Admin@123 · Branch: downtown or northside / Branch@123
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
