import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Switch, TextField } from '@mui/material'
import api from '../api'
import DataTable from '../components/DataTable'
import { useFeedback } from '../components/Feedback'
import { FilterBar, Loading, PageHeader, useIsMobile } from '../components/common'

const empty = { code: '', name: '', address: '', active: true }

export default function Branches() {
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
    try { setRows((await api.get('/api/branches')).data) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      if (editing) await api.put(`/api/branches/${editing.id}`, { ...editing, ...form })
      else await api.post('/api/branches', form)
      setOpen(false)
      notify(editing ? 'Branch updated' : 'Branch added')
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed')
    }
  }
  const toggle = async (row) => {
    try {
      await api.put(`/api/branches/${row.id}`, { ...row, active: !row.active })
      load()
    } catch (e) {
      notify(e.response?.data?.message || 'Update failed', 'error')
    }
  }
  const openForm = (row) => { setEditing(row); setForm(row ? { ...empty, ...row } : empty); setError(''); setOpen(true) }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => !q || [r.code, r.name, r.address].some((v) => (v || '').toLowerCase().includes(q)))
  }, [rows, search])

  const columns = [
    { key: 'name', label: 'Name', mobile: 'title' },
    { key: 'code', label: 'Code', mobile: 'subtitle' },
    { key: 'address', label: 'Address' },
    { key: 'active', label: 'Status', mobile: 'badge', render: (r) => <Chip size="small" color={r.active ? 'success' : 'default'} label={r.active ? 'Active' : 'Inactive'} /> }
  ]

  return (
    <Stack spacing={2}>
      <PageHeader title="Branches" subtitle="Shop locations that can request warehouse stock" actions={<Button variant="contained" onClick={() => openForm(null)}>Add branch</Button>} />
      <FilterBar><TextField size="small" placeholder="Search branches…" value={search} onChange={(e) => setSearch(e.target.value)} /></FilterBar>
      {loading ? <Loading /> : (
        <DataTable
          columns={columns} rows={filtered} emptyTitle="No branches found"
          rowSx={(r) => ({ opacity: r.active ? 1 : 0.65 })}
          actions={(r) => (
            <>
              <Switch size="small" checked={r.active} onChange={() => toggle(r)} inputProps={{ 'aria-label': 'Active' }} />
              <Button size="small" onClick={() => openForm(r)}>Edit</Button>
            </>
          )}
        />
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={mobile}>
        <DialogTitle>{editing ? 'Update branch' : 'New branch'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.code || !form.name}>Save</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
