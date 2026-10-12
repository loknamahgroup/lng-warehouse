import { useEffect, useState } from 'react'
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material'
import api from '../api'
import { useAuth } from '../auth'

function Stat({ label, value, hint }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" sx={{ mt: 0.5 }}>{value}</Typography>
        {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { isAdmin, user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/dashboard').then((r) => setData(r.data)).catch((e) => setError(e.response?.data?.message || 'Failed to load'))
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress /></Box>

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Dashboard</Typography>
        <Typography color="text.secondary">
          {isAdmin ? 'Warehouse overview across all branches' : `Stock position for ${user.branchName}`}
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}><Stat label="Warehouse on hand" value={data.warehouseOnHand} hint="Physical units in warehouse" /></Grid>
        <Grid item xs={12} sm={6} md={3}><Stat label="Reserved / blocked" value={data.warehouseReserved} hint="Requested by branches, not yet shipped" /></Grid>
        <Grid item xs={12} sm={6} md={3}><Stat label="Available to request" value={data.warehouseAvailable} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Stat label="Open requests" value={data.openRequests} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Stat label="Products" value={data.productCount} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Stat label="Branches" value={data.branchCount} /></Grid>
        <Grid item xs={12} sm={6} md={3}><Stat label="Branch holdings" value={data.totalBranchHoldings} hint="Already received at shops" /></Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Holdings by branch</Typography>
          {data.holdingsByBranch.length === 0 && <Typography color="text.secondary">No holdings yet.</Typography>}
          <Stack spacing={1}>
            {data.holdingsByBranch.map((h) => (
              <Stack key={h.branchId} direction="row" justifyContent="space-between">
                <Typography>{h.branchName}</Typography>
                <Typography>{h.totalUnits} units · {h.productLines} products</Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Low stock</Typography>
          {data.lowStock.length === 0 && <Typography color="text.secondary">All products are above reorder level.</Typography>}
          <Stack spacing={1}>
            {data.lowStock.map((s) => (
              <Stack key={s.productId} direction="row" spacing={1} alignItems="center">
                <Typography sx={{ flexGrow: 1 }}>{s.sku} · {s.name}</Typography>
                <Chip size="small" color="warning" label={`Available ${s.available}`} />
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
