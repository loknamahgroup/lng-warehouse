import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Alert, AppBar, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Drawer, IconButton, InputAdornment, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, TextField, Toolbar, Tooltip, Typography
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined'
import StoreIcon from '@mui/icons-material/StorefrontOutlined'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined'
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined'
import BusinessIcon from '@mui/icons-material/BusinessCenterOutlined'
import PeopleIcon from '@mui/icons-material/PeopleOutline'
import HistoryIcon from '@mui/icons-material/History'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import KeyIcon from '@mui/icons-material/Key'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useAuth } from '../auth'
import { useThemeMode } from '../theme'
import api from '../api'

const drawerWidth = 250

const adminItems = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/branches', label: 'Branches', icon: <StoreIcon /> },
  { to: '/products', label: 'Products', icon: <InventoryIcon /> },
  { to: '/warehouse', label: 'Warehouse', icon: <WarehouseIcon /> },
  { to: '/requests', label: 'Branch orders', icon: <AssignmentIcon /> },
  { to: '/holdings', label: 'Branch holdings', icon: <BusinessIcon /> },
    { to: '/users', label: 'Users', icon: <PeopleIcon /> },
  { to: '/sales', label: 'Selling records', icon: <AssignmentIcon /> },
  { to: '/movements', label: 'Stock movements', icon: <HistoryIcon /> }
]

const branchItems = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/warehouse', label: 'Available stock', icon: <WarehouseIcon /> },
  { to: '/requests', label: 'My requests', icon: <AssignmentIcon /> },
  { to: '/sales', label: 'Selling records', icon: <AssignmentIcon /> },
  { to: '/holdings', label: 'My holdings', icon: <BusinessIcon /> }
]

export default function AppShell() {
  const { user, isAdmin, logout } = useAuth()
  const { mode, toggle } = useThemeMode()
  const navigate = useNavigate()
  const location = useLocation()
  const items = isAdmin ? adminItems : branchItems
  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwShow, setPwShow] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  const submitPassword = async () => {
    setPwError('')
    setPwMsg('')
    try {
      await api.post('/api/auth/change-password', { currentPassword: pwCurrent, newPassword: pwNew })
      setPwMsg('Password updated')
      setPwCurrent('')
      setPwNew('')
      setTimeout(() => setPwOpen(false), 1200)
    } catch (e) {
      setPwError(e.response?.data?.message || 'Failed to change password')
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <WarehouseIcon color="primary" sx={{ mr: 1.2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>LNG Control Center</Typography>
          <Chip
            size="small"
            color={isAdmin ? 'primary' : 'secondary'}
            label={isAdmin ? 'Admin' : user.branchName || 'Branch user'}
            sx={{ mr: 1.5 }}
          />
          <Tooltip title={mode === 'light' ? 'Dark theme' : 'Light theme'}>
            <IconButton onClick={toggle} color="inherit">
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Change password">
            <IconButton color="inherit" onClick={() => { setPwError(''); setPwMsg(''); setPwOpen(true) }}>
              <KeyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign out">
            <IconButton color="inherit" onClick={() => { logout(); navigate('/login') }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
          <Avatar sx={{ ml: 1, width: 34, height: 34, bgcolor: 'primary.main' }}>
            {(user.displayName || user.username).charAt(0).toUpperCase()}
          </Avatar>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', pt: 8 }
        }}
      >
        <Box sx={{ px: 2.5, pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>{user.displayName}</Typography>
          <Typography variant="body2" color="text.secondary">{user.username}</Typography>
        </Box>
        <Divider />
        <List sx={{ px: 1, pt: 1 }}>
          {items.map((item) => (
            <ListItemButton
              key={item.to}
              selected={item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)}
              onClick={() => navigate(item.to)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>

      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {pwError && <Alert severity="error">{pwError}</Alert>}
            {pwMsg && <Alert severity="success">{pwMsg}</Alert>}
            <TextField
              label="Current password"
              type={pwShow ? 'text' : 'password'}
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setPwShow((v) => !v)} edge="end">
                      {pwShow ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="New password"
              type={pwShow ? 'text' : 'password'}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              fullWidth
              inputProps={{ minLength: 6 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitPassword} disabled={!pwCurrent || pwNew.length < 6}>Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
