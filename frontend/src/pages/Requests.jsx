import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import api from '../api'
import { useAuth } from '../auth'

const colors = {
  RESERVED: 'warning',
  FULFILLED: 'success',
  CANCELLED: 'default',
  REJECTED: 'error'
}

export default function Requests() {
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [r, b] = await Promise.all([
        api.get('/api/requests'),
        isAdmin ? api.get('/api/branches') : Promise.resolve({ data: [] })
      ])
      setRows(r.data)
      setBranches(b.data)
    } catch (e) { setError(e.response?.data?.message || 'Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (branchFilter && r.branchId !== Number(branchFilter)) return false
      if (statusFilter && r.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (r.productName || '').toLowerCase().includes(q) || (r.sku || '').toLowerCase().includes(q) || (r.requestedBy || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [rows, branchFilter, statusFilter, search])

  const act = async (id, action) => {
    try {
      await api.post(`/api/requests/${id}/${action}`)
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed')
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5">{isAdmin ? 'Branch orders' : 'My requests'}</Typography>
          <Typography color="text.secondary">Reserved requests block warehouse stock. Fulfillment ships stock to the branch holding.</Typography>
        </div>
        <Stack direction="row" spacing={1.5}>
          <TextField size="small" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 180 }} />
          {isAdmin && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Branch</InputLabel>
              <Select value={branchFilter} label="Branch" onChange={(e) => setBranchFilter(e.target.value)}>
                <MenuItem value="">All branches</MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="RESERVED">Reserved</MenuItem>
              <MenuItem value="FULFILLED">Fulfilled</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box> : (
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              {isAdmin && <TableCell>Branch</TableCell>}
              <TableCell>Product</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested by</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 6}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No requests found.</Typography></TableCell></TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.id}>
                {isAdmin && <TableCell>{row.branchName}</TableCell>}
                <TableCell>{row.sku} · {row.productName}</TableCell>
                <TableCell align="right">{row.quantity}</TableCell>
                <TableCell><Chip size="small" color={colors[row.status]} label={row.status} /></TableCell>
                <TableCell>{row.requestedBy}</TableCell>
                <TableCell>{row.notes}</TableCell>
                <TableCell align="right">
                  {row.status === 'RESERVED' && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {isAdmin && <Button size="small" variant="contained" onClick={() => act(row.id, 'fulfill')}>Fulfill</Button>}
                      {isAdmin && <Button size="small" color="error" onClick={() => act(row.id, 'reject')}>Reject</Button>}
                      <Button size="small" onClick={() => act(row.id, 'cancel')}>Cancel</Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      )}
    </Stack>
  )
}
