import { useEffect, useState } from 'react'
import {
  Alert, Box, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material'
import api from '../api'

const typeColors = {
  INBOUND: 'success',
  ADJUSTMENT: 'info',
  RESERVE: 'warning',
  RELEASE: 'default',
  SHIP: 'primary'
}

export default function Movements() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try { setRows((await api.get('/api/warehouse/movements')).data) }
    catch (e) { setError(e.response?.data?.message || 'Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter((r) => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      (r.sku || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.branchName || '').toLowerCase().includes(q) ||
      (r.type || '').toLowerCase().includes(q)
    )
  })

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5">Stock movements</Typography>
          <Typography color="text.secondary">Audit trail of all warehouse stock changes</Typography>
        </div>
        <TextField
          size="small"
          placeholder="Search by SKU, product, branch…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ width: 280 }}
        />
      </Stack>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box> : (
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell>Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No movements found.</Typography></TableCell></TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell><Chip size="small" color={typeColors[row.type] || 'default'} label={row.type} /></TableCell>
                <TableCell>{row.sku}</TableCell>
                <TableCell>{row.productName}</TableCell>
                <TableCell>{row.branchName || '—'}</TableCell>
                <TableCell align="right">{row.quantity}</TableCell>
                <TableCell>{row.note || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      )}
    </Stack>
  )
}
