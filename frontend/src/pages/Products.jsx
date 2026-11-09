import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Switch, TextField } from '@mui/material'
import api from '../api'
import DataTable from '../components/DataTable'
import { useFeedback } from '../components/Feedback'
import { FilterBar, Loading, PageHeader, useIsMobile } from '../components/common'

const empty = { sku: '', name: '', category: '', unit: 'unit', description: '', reorderLevel: 10, active: true }

export default function Products() {
  const { notify } = useFeedback()
  const mobile = useIsMobile()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    try { setRows((await api.get('/api/products')).data) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      if (editing) await api.put(`/api/products/${editing.id}`, { ...editing, ...form })
      else await api.post('/api/products', form)
      setOpen(false)
      notify(editing ? 'Product updated' : 'Product added')
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
      notify(e.response?.data?.message || 'Update failed', 'error')
    }
  }
  const openForm = (row) => { setEditing(row); setForm(row ? { ...empty, ...row } : empty); setError(''); setOpen(true) }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => !q || [r.sku, r.name, r.category].some((v) => (v || '').toLowerCase().includes(q)))
  }, [rows, search])

  const columns = [
    { key: 'name', label: 'Name', mobile: 'title' },
    { key: 'sku', label: 'SKU', mobile: 'subtitle' },
    { key: 'category', label: 'Category', render: (r) => r.category || '—' },
    { key: 'unit', label: 'Unit' },
    { key: 'reorderLevel', label: 'Reorder level' },
    { key: 'active', label: 'Status', mobile: 'badge', render: (r) => <Chip size="small" color={r.active ? 'success' : 'default'} label={r.active ? 'Active' : 'Inactive'} /> }
  ]

  return (
    <Stack spacing={2}>
      <PageHeader title="Products" subtitle="Catalog items stored in the central warehouse" actions={<Button variant="contained" onClick={() => openForm(null)}>Add product</Button>} />
      <FilterBar><TextField size="small" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} /></FilterBar>
      {loading ? <Loading /> : (
        <DataTable
          columns={columns} rows={filtered} emptyTitle="No products found"
          rowSx={(r) => ({ opacity: r.active ? 1 : 0.65 })}
          actions={(r) => (
            <>
              <Switch size="small" checked={r.active} onChange={() => toggleActive(r)} inputProps={{ 'aria-label': 'Active' }} />
              <Button size="small" onClick={() => openForm(r)}>Edit</Button>
            </>
          )}
        />
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={mobile}>
        <DialogTitle>{editing ? 'Update product' : 'New product'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Category" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Unit" value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <TextField label="Reorder level" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
            <TextField label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.sku || !form.name}>Save</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
