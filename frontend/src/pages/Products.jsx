import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material'
import api from '../api'

const empty = { sku: '', name: '', category: '', unit: 'unit', description: '', reorderLevel: 10, active: true }

export default function Products() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try { setRows((await api.get('/api/products')).data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      if (editing) await api.put(`/api/products/${editing.id}`, { ...editing, ...form })
      else await api.post('/api/products', form)
      setOpen(false)
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed')
    }
  }

  const toggleActive = async (row) => {
    try {
      await api.put(`/api/products/${row.id}`, { ...row, active: !row.active })
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed')
    }
  }

  const filtered = rows.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (r.sku || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q)
    )
  })

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5">Products</Typography>
          <Typography color="text.secondary">Catalog items stored in the central warehouse</Typography>
        </div>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 220 }}
          />
          <Button variant="contained" onClick={() => { setEditing(null); setForm(empty); setError(''); setOpen(true) }}>Add product</Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box> : (
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Reorder</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No products found.</Typography></TableCell></TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.id} sx={{ opacity: row.active ? 1 : 0.6 }}>
                <TableCell>{row.sku}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.unit}</TableCell>
                <TableCell>{row.reorderLevel}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Switch size="small" checked={row.active} onChange={() => toggleActive(row)} />
                    <Chip size="small" color={row.active ? 'success' : 'default'} label={row.active ? 'Active' : 'Inactive'} />
                  </Stack>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => { setEditing(row); setForm({ ...empty, ...row }); setError(''); setOpen(true) }}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{editing ? 'Update product' : 'New product'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Category" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Unit" value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <TextField label="Reorder level" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
            <TextField label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
