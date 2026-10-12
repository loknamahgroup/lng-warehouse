import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import api from '../api'
import { useAuth } from '../auth'

export default function Holdings() {
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/api/holdings'),
      isAdmin ? api.get('/api/branches') : Promise.resolve({ data: [] })
    ]).then(([h, b]) => {
      setRows(h.data)
      setBranches(b.data)
    }).catch((e) => setError(e.response?.data?.message || 'Failed to load')).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (branchFilter && r.branchId !== Number(branchFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        return (r.sku || '').toLowerCase().includes(q) || (r.productName || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [rows, branchFilter, search])

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5">{isAdmin ? 'Holdings by branch' : 'My branch holdings'}</Typography>
          <Typography color="text.secondary">Stock already received at shop locations after warehouse fulfillment.</Typography>
        </div>
        <Stack direction="row" spacing={1.5}>
          <TextField size="small" placeholder="Search product…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 200 }} />
          {isAdmin && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Branch</InputLabel>
              <Select value={branchFilter} label="Branch" onChange={(e) => setBranchFilter(e.target.value)}>
                <MenuItem value="">All branches</MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box> : (
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              {isAdmin && <TableCell>Branch</TableCell>}
              <TableCell>SKU</TableCell>
              <TableCell>Product</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell>Unit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={isAdmin ? 5 : 4}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No holdings found.</Typography></TableCell></TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={`${row.branchId}-${row.productId}`}>
                {isAdmin && <TableCell>{row.branchName}</TableCell>}
                <TableCell>{row.sku}</TableCell>
                <TableCell>{row.productName}</TableCell>
                <TableCell align="right">{row.quantity}</TableCell>
                <TableCell>{row.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      )}
    </Stack>
  )
}
