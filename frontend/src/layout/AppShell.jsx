import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Alert, AppBar, Avatar, Badge, BottomNavigation, BottomNavigationAction, Box, Button, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, IconButton, InputAdornment, List, ListItemButton, ListItemIcon,
  ListItemText, Menu, MenuItem, Paper, Stack, TextField, Toolbar, Tooltip, Typography, useMediaQuery
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined'
import StoreIcon from '@mui/icons-material/StorefrontOutlined'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined'
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined'
import BusinessIcon from '@mui/icons-material/BusinessCenterOutlined'
import PeopleIcon from '@mui/icons-material/PeopleOutline'
import HistoryIcon from '@mui/icons-material/History'
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined'
import AddIcon from '@mui/icons-material/Add'
import MoreIcon from '@mui/icons-material/MoreHoriz'
import KeyIcon from '@mui/icons-material/Key'
import LogoutIcon from '@mui/icons-material/Logout'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import api from '../api'
import { useAuth } from '../auth'
import { useThemeMode } from '../theme'

const DRAWER_WIDTH = 272

const NAV = {
  ADMIN: [
    { to: '/', label: 'Dashboard', short: 'Home', icon: <DashboardIcon /> },
    { to: '/warehouse', label: 'Warehouse', short: 'Stock', icon: <WarehouseIcon /> },
    { to: '/requests', label: 'Branch orders', short: 'Orders', icon: <AssignmentIcon />, badge: true },
    { to: '/sales', label: 'Selling records', short: 'Sales', icon: <ReceiptIcon /> },
    { to: '/holdings', label: 'Branch holdings', short: 'Holdings', icon: <BusinessIcon /> },
    { to: '/products', label: 'Products', short: 'Products', icon: <InventoryIcon /> },
    { to: '/branches', label: 'Branches', short: 'Branches', icon: <StoreIcon /> },
    { to: '/users', label: 'Users', short: 'Users', icon: <PeopleIcon /> },
    { to: '/movements', label: 'Stock movements', short: 'Movements', icon: <HistoryIcon /> }
  ],
  SUBADMIN: [
    { to: '/', label: 'Dashboard', short: 'Home', icon: <DashboardIcon /> },
    { to: '/warehouse', label: 'Warehouse stock', short: 'Stock', icon: <WarehouseIcon /> },
    { to: '/requests', label: 'Branch orders', short: 'Orders', icon: <AssignmentIcon />, badge: true },
    { to: '/holdings', label: 'Branch holdings', short: 'Holdings', icon: <BusinessIcon /> },
    { to: '/sales', label: 'Selling records', short: 'Sales', icon: <ReceiptIcon /> }
  ],
  BRANCH_USER: [
    { to: '/', label: 'Dashboard', short: 'Home', icon: <DashboardIcon /> },
    { to: '/warehouse', label: 'Available stock', short: 'Stock', icon: <WarehouseIcon /> },
    { to: '/create-request', label: 'New request', short: 'Request', icon: <AddIcon /> },
    { to: '/requests', label: 'My requests', short: 'Orders', icon: <AssignmentIcon />, badge: true },
    { to: '/sales', label: 'Selling records', short: 'Sales', icon: <ReceiptIcon /> },
    { to: '/holdings', label: 'My holdings', short: 'Holdings', icon: <BusinessIcon /> }
  ]
}

// Destinations pinned to the phone's bottom bar; the rest go under "More"
const PINNED = {
  ADMIN: ['/', '/warehouse', '/requests', '/sales'],
  SUBADMIN: ['/', '/warehouse', '/requests', '/holdings'],
  BRANCH_USER: ['/', '/warehouse', '/create-request', '/requests']
}

const ROLE_LABEL = { ADMIN: 'Administrator', SUBADMIN: 'Sub-admin', BRANCH_USER: 'Branch user' }

const isActive = (pathname, to) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`))

export default function AppShell() {
  const { user, logout } = useAuth()
  const { mode, toggle } = useThemeMode()
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()

  const role = user?.role || 'BRANCH_USER'
  const items = NAV[role] || NAV.BRANCH_USER
  const pinned = useMemo(() => items.filter((i) => PINNED[role]?.includes(i.to)), [items, role])
  const more = useMemo(() => items.filter((i) => !PINNED[role]?.includes(i.to)), [items, role])

  const [openRequests, setOpenRequests] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwShow, setPwShow] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  // Pending-request badge (refreshes on navigation and every minute)
  useEffect(() => {
    let alive = true
    const load = () => api.get('/api/dashboard').then((r) => alive && setOpenRequests(r.data.openRequests || 0)).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [location.pathname])

  const title = useMemo(() => {
    if (location.pathname.startsWith('/requests/approve')) return 'Request details'
    const match = [...items].sort((a, b) => b.to.length - a.to.length).find((i) => isActive(location.pathname, i.to))
    return match?.label || 'LNG Control Center'
  }, [location.pathname, items])

  const go = (to) => { setMoreOpen(false); navigate(to) }

  const changePassword = async () => {
    setPwError('')
    setPwMsg('')
    try {
      await api.post('/api/auth/change-password', { currentPassword: pwCurrent, newPassword: pwNew })
      setPwMsg('Password updated - please sign in again')
      setPwCurrent('')
      setPwNew('')
      setTimeout(() => { setPwOpen(false); logout(); navigate('/login') }, 1200)
    } catch (e) {
      setPwError(e.response?.data?.message || 'Failed to change password')
    }
  }
  const signOut = () => { logout(); navigate('/login') }
  const openPw = () => { setPwError(''); setPwMsg(''); setMenuAnchor(null); setMoreOpen(false); setPwOpen(true) }

  const displayName = user?.displayName || user?.username || ''
  const initials = displayName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const roleChip = role === 'BRANCH_USER' ? user?.branchName || ROLE_LABEL[role] : ROLE_LABEL[role]

  const navButton = (item) => {
    const selected = isActive(location.pathname, item.to)
    const icon = item.badge && openRequests > 0
      ? <Badge badgeContent={openRequests} color="error" max={99}>{item.icon}</Badge>
      : item.icon
    return (
      <ListItemButton
        key={item.to}
        selected={selected}
        onClick={() => go(item.to)}
        sx={{
          borderRadius: 999, mb: 0.5, px: 2,
          '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main' },
          '&.Mui-selected:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
        }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{icon}</ListItemIcon>
        <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }} />
      </ListItemButton>
    )
  }

  const sidebar = (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH, flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: `1px solid ${theme.palette.divider}`, p: 1.5 }
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1.5, py: 2 }}>
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}><WarehouseIcon /></Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>LNG Control Center</Typography>
          <Typography variant="caption" color="text.secondary">Warehouse &amp; branches</Typography>
        </Box>
      </Stack>
      <List sx={{ flexGrow: 1, overflowY: 'auto' }}>{items.map(navButton)}</List>
      <Divider sx={{ my: 1 }} />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5 }}>
        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.16), color: 'primary.main', fontWeight: 700 }}>{initials}</Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{displayName}</Typography>
          <Chip size="small" label={roleChip} sx={{ mt: 0.25, maxWidth: '100%' }} />
        </Box>
      </Stack>
      <Stack direction="row" spacing={0.5} sx={{ px: 1 }}>
        <Tooltip title="Change password"><IconButton onClick={openPw}><KeyIcon /></IconButton></Tooltip>
        <Tooltip title={mode === 'light' ? 'Dark theme' : 'Light theme'}>
          <IconButton onClick={toggle}>{mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}</IconButton>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }} />
        <Button color="inherit" startIcon={<LogoutIcon />} onClick={signOut}>Sign out</Button>
      </Stack>
    </Drawer>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {!mobile && sidebar}

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar sx={{ gap: 1 }}>
            {mobile && <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}><WarehouseIcon fontSize="small" /></Avatar>}
            <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1, fontSize: { xs: '1.05rem', md: '1.25rem' } }}>
              {title}
            </Typography>
            {mobile && (
              <>
                <IconButton onClick={toggle} aria-label="Toggle theme">
                  {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                </IconButton>
                <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Account" sx={{ p: 0.5 }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: alpha(theme.palette.primary.main, 0.16), color: 'primary.main', fontWeight: 700 }}>{initials}</Avatar>
                </IconButton>
              </>
            )}
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          key={location.pathname}
          className="page-in"
          sx={{
            flexGrow: 1, width: '100%', maxWidth: 1400, mx: 'auto',
            px: { xs: 2, md: 4 }, pt: { xs: 2, md: 3 },
            pb: { xs: 'calc(88px + env(safe-area-inset-bottom))', md: 4 }
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {mobile && (
        <Paper
          component="nav"
          elevation={0}
          sx={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: theme.zIndex.appBar,
            borderTop: `1px solid ${theme.palette.divider}`, borderRadius: 0,
            pb: 'env(safe-area-inset-bottom)', bgcolor: alpha(theme.palette.background.paper, 0.96), backdropFilter: 'blur(8px)'
          }}
        >
          <BottomNavigation
            showLabels
            value={pinned.find((i) => isActive(location.pathname, i.to))?.to ?? (more.some((i) => isActive(location.pathname, i.to)) ? '__more' : false)}
            sx={{ bgcolor: 'transparent', height: 64 }}
          >
            {pinned.map((item) => (
              <BottomNavigationAction
                key={item.to}
                value={item.to}
                label={item.short}
                onClick={() => go(item.to)}
                icon={item.badge && openRequests > 0 ? <Badge badgeContent={openRequests} color="error" max={99}>{item.icon}</Badge> : item.icon}
                sx={{ minWidth: 0, '&.Mui-selected': { fontWeight: 700 } }}
              />
            ))}
            <BottomNavigationAction value="__more" label="More" icon={<MoreIcon />} onClick={() => setMoreOpen(true)} sx={{ minWidth: 0 }} />
          </BottomNavigation>
        </Paper>
      )}

      {/* "More" sheet (phones) */}
      <Drawer
        anchor="bottom"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, pb: 'env(safe-area-inset-bottom)' } }}
      >
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mt: 1.5 }} />
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 3, py: 2 }}>
          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.16), color: 'primary.main', fontWeight: 700 }}>{initials}</Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{displayName}</Typography>
            <Typography variant="body2" color="text.secondary">{roleChip}</Typography>
          </Box>
        </Stack>
        <List sx={{ px: 1.5 }}>
          {more.map(navButton)}
          {more.length > 0 && <Divider sx={{ my: 1 }} />}
          <ListItemButton onClick={openPw} sx={{ borderRadius: 999 }}>
            <ListItemIcon sx={{ minWidth: 40 }}><KeyIcon /></ListItemIcon>
            <ListItemText primary="Change password" />
          </ListItemButton>
          <ListItemButton onClick={signOut} sx={{ borderRadius: 999, color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Sign out" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Account menu (phone top bar) */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{displayName}</Typography>
            <Typography variant="caption" color="text.secondary">{roleChip}</Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={openPw}><ListItemIcon><KeyIcon fontSize="small" /></ListItemIcon>Change password</MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); signOut() }}><ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>Sign out</MenuItem>
      </Menu>

      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {pwError && <Alert severity="error">{pwError}</Alert>}
            {pwMsg && <Alert severity="success">{pwMsg}</Alert>}
            <TextField label="Current password" type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" />
            <TextField
              label="New password (min 6 characters)"
              type={pwShow ? 'text' : 'password'}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setPwShow((v) => !v)} edge="end">{pwShow ? <VisibilityOff /> : <Visibility />}</IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPwOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={changePassword} disabled={!pwCurrent || pwNew.length < 6}>Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
