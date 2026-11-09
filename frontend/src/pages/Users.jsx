import { useEffect, useState } from 'react'
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Switch, TextField } from '@mui/material'
import api from '../api'
import { useAuth } from '../auth'
import DataTable from '../components/DataTable'
import { useFeedback } from '../components/Feedback'
import { Loading, PageHeader, useIsMobile } from '../components/common'

const empty = { username: '', password: '', displayName: '', role: 'BRANCH_USER', branchId: '', active: true }
const roleLabel = { ADMIN: 'Admin', SUBADMIN: 'Sub-admin', BRANCH_USER: 'Branch user' }

export default function Users() {
  const { user: me } = useAuth()
  const { notify } = useFeedback()
  const mobile = useIsMobile()
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [u, b] = await Promise.all([api.get('/api/users'), api.get('/api/branches')])
      setRows(u.data)
      setBranches(b.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      const payload = { ...form, branchId: form.role === 'BRANCH_USER' ? form.branchId : null }
      if (editing) await api.put(`/api/users/${editing.id}`, { ...editing, ...payload })
      else await api.post('/api/users', payload)
      setOpen(false)
      notify(editing ? 'User updated' : 'User created')
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed')
    }
  }
  const toggleActive = async (row) => {
    try {
      await api.put(`/api/users/${row.id}`, { ...row, active: !row.active })
      load()
    } catch (e) {
      notify(e.response?.data?.message || 'Update failed', 'error')
    }
  }
  const locked = (row) => row.username === 'admin'
  const openForm = (row) => { setEditing(row); setForm(row ? { ...empty, ...row, password: '' } : empty); setError(''); setOpen(true) }

  const columns = [
    { key: 'displayName', label: 'Name', mobile: 'title' },
    { key: 'username', label: 'Username', mobile: 'subtitle' },
    { key: 'role', label: 'Role', render: (r) => roleLabel[r.role] || r.role },
    { key: 'branchName', label: 'Branch', render: (r) => r.branchName || '—' },
    { key: 'active', label: 'Status', mobile: 'badge', render: (r) => <Chip size="small" color={r.active ? 'success' : 'default'} label={r.active ? 'Active' : 'Inactive'} /> }
  ]

  return (
    <Stack spacing={2}>
      <PageHeader title="Users" subtitle="Admin accounts and branch users assigned to a shop" actions={<Button variant="contained" onClick={() => openForm(null)}>Add user</Button>} />
      {loading ? <Loading /> : (
        <DataTable
          columns={columns} rows={rows} emptyTitle="No users"
          rowSx={(r) => ({ opacity: r.active ? 1 : 0.65 })}
          actions={(r) => (
            <>
              <Switch size="small" checked={r.active} disabled={locked(r) || r.username === me?.username} onChange={() => toggleActive(r)} inputProps={{ 'aria-label': 'Active' }} />
              <Button size="small" disabled={locked(r)} onClick={() => openForm(r)}>Edit</Button>
            </>
          )}
        />
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={mobile}>
        <DialogTitle>{editing ? 'Update user' : 'New user'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoCapitalize="none" />
            <TextField label={editing ? 'New password (leave blank to keep)' : 'Password (min 6 characters)'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            <TextField label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <MenuItem value="ADMIN">Admin</MenuItem>
              <MenuItem value="SUBADMIN">Sub-admin (read-only)</MenuItem>
              <MenuItem value="BRANCH_USER">Branch user</MenuItem>
            </TextField>
            {form.role === 'BRANCH_USER' && (
              <TextField select label="Branch" value={form.branchId || ''} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!form.username || (!editing && form.password.length < 6) || (form.role === 'BRANCH_USER' && !form.branchId)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
