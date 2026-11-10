import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined'
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import StoreIcon from '@mui/icons-material/StorefrontOutlined'
import BusinessIcon from '@mui/icons-material/BusinessCenterOutlined'
import AddIcon from '@mui/icons-material/Add'
import HistoryIcon from '@mui/icons-material/History'
import api from '../api'
import { useAuth } from '../auth'
import { EmptyState, Loading, PageHeader } from '../components/common'

function Stat({ label, value, hint, icon, color = 'primary', sx }) {
  const theme = useTheme()
  return (
    <Card sx={{ height: '100%', minWidth: 0, ...sx }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
            <Typography variant="h4" sx={{ mt: 0.5, fontSize: { xs: '1.6rem', sm: '2.125rem' } }}>{Number(value ?? 0).toLocaleString()}</Typography>
          </Box>
          <Avatar variant="rounded" sx={{ flexShrink: 0, width: { xs: 36, sm: 44 }, height: { xs: 36, sm: 44 }, bgcolor: alpha(theme.palette[color].main, 0.14), color: `${color}.main` }}>{icon}</Avatar>
        </Stack>
        {hint && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, lineHeight: 1.3 }}>{hint}</Typography>}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const isBranchUser = user?.role === 'BRANCH_USER'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.get('/api/dashboard').then((r) => setData(r.data)).catch((e) => setError(e.response?.data?.message || 'Failed to load'))
  useEffect(() => {
    load()
    const t = setInterval(() => api.get('/api/dashboard').then((r) => setData(r.data)).catch(() => {}), 60000)
    return () => clearInterval(t)
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!data) return <Loading />

  const maxUnits = Math.max(1, ...data.holdingsByBranch.map((h) => h.totalUnits))
  const actions = isBranchUser ? (
    <>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/create-request')}>New request</Button>
      <Button variant="outlined" onClick={() => navigate('/sales')}>Record sale</Button>
    </>
  ) : can('REQUESTS_APPROVE') || can('STOCK_MANAGE') ? (
    <>
      {can('REQUESTS_APPROVE') && (
        <Button variant="contained" startIcon={<AssignmentIcon />} onClick={() => navigate('/requests')}>
          Review requests{data.openRequests > 0 ? ` (${data.openRequests})` : ''}
        </Button>
      )}
      {can('STOCK_MANAGE') && (
        <Button variant={can('REQUESTS_APPROVE') ? 'outlined' : 'contained'} startIcon={<WarehouseIcon />} onClick={() => navigate('/warehouse')}>Restock</Button>
      )}
    </>
  ) : null

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`Hello, ${(user?.displayName || user?.username || '').split(' ')[0]}`}
        subtitle={isBranchUser ? `Stock position for ${user.branchName}` : 'Warehouse overview across all branches'}
        actions={actions}
      />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>
        <Stat label="On hand" value={data.warehouseOnHand} hint="Units in the warehouse" icon={<WarehouseIcon />} />
        <Stat label="Reserved" value={data.warehouseReserved} hint="Blocked for open requests" icon={<AssignmentIcon />} color="warning" />
        <Stat label="Available" value={data.warehouseAvailable} hint="Can still be requested" icon={<InventoryIcon />} color="success" />
        <Stat label={isBranchUser ? 'My open requests' : 'Open requests'} value={data.openRequests} hint="Waiting for approval" icon={<HistoryIcon />} color="secondary" />
        {!isBranchUser && <Stat label="Products" value={data.productCount} icon={<InventoryIcon />} color="info" />}
        {!isBranchUser && <Stat label="Branches" value={data.branchCount} icon={<StoreIcon />} color="info" />}
        <Stat
          label={isBranchUser ? 'Units at my branch' : 'Units at branches'} value={data.totalBranchHoldings}
          hint="Already received at shops" icon={<BusinessIcon />} color="secondary"
          sx={{ gridColumn: { xs: 'span 2', md: 'span 2' } }}
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' } }}>
          <Card sx={{ height: '100%', minWidth: 0 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Low stock</Typography>
              {data.lowStock.length === 0 ? (
                <EmptyState title="All good" hint="Every product is above its reorder level." />
              ) : (
                <Stack spacing={2}>
                  {data.lowStock.map((s) => (
                    <Box key={s.productId}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 0 }} noWrap>{s.sku} · {s.name}</Typography>
                        <Chip size="small" color={s.available <= 0 ? 'error' : 'warning'} label={`${s.available} / ${s.reorderLevel}`} />
                      </Stack>
                      <LinearProgress
                        variant="determinate" color={s.available <= 0 ? 'error' : 'warning'}
                        value={Math.min(100, s.reorderLevel > 0 ? (Math.max(s.available, 0) / s.reorderLevel) * 100 : 0)}
                        sx={{ mt: 0.75, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
          <Card sx={{ height: '100%', minWidth: 0 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>{isBranchUser ? 'My holdings' : 'Holdings by branch'}</Typography>
              {data.holdingsByBranch.length === 0 ? (
                <EmptyState title="No holdings yet" hint="Stock appears here once requests are approved." />
              ) : (
                <Stack spacing={2}>
                  {data.holdingsByBranch.map((h) => (
                    <Box key={h.branchId}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 0 }} noWrap>{h.branchName}</Typography>
                        <Typography variant="body2" color="text.secondary">{h.totalUnits} units · {h.productLines} products</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={(h.totalUnits / maxUnits) * 100} sx={{ mt: 0.75, height: 6, borderRadius: 3 }} />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
      </Box>
    </Stack>
  )
}
