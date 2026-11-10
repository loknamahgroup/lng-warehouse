import { useEffect, useState } from 'react'
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'
import api from '../api'
import { useAuth } from '../auth'
import { PERMISSIONS } from '../permissions'
import DataTable from '../components/DataTable'
import { useFeedback } from '../components/Feedback'
import { Loading, PageHeader, useIsMobile } from '../components/common'

const empty = { username: '', password: '', displayName: '', role: 'BRANCH_USER', branchId: '', active: true, permissions: [] }
const roleLabel = { ADMIN: 'Admin', SUBADMIN: 'Sub-admin', BRANCH_USER: 'Branch user' }

export default function Users() {
  const { user: me, isAdmin, can } = useAuth()
  const grantable = PERMISSIONS.filter((p) => can(p.key)) // you can only hand out what you hold
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
      const payload = { ...form, branchId: form.role === 'BRANCH_USER' ? form.branchId : null, permissions: form.role === 'SUBADMIN' ? form.permissions : [] }
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
  const locked = (row) => row.username === 'admin' || (!isAdmin && (row.role === 'ADMIN' || row.username === me?.username))
  const openForm = (row) => { setEditing(row); setForm(row ? { ...empty, ...row, permissions: row.permissions || [], password: '' } : empty); setError(''); setOpen(true) }

  const columns = [
    { key: 'displayName', label: 'Name', mobile: 'title' },
    { key: 'username', label: 'Username', mobile: 'subtitle' },
    { key: 'role', label: 'Role', render: (r) => roleLabel[r.role] || r.role },
    { key: 'branchName', label: 'Branch', render: (r) => r.branchName || '—' },
    {
      key: 'access', label: 'Access',
      render: (r) => (r.role === 'ADMIN' ? 'Full access' : r.role === 'SUBADMIN' ? ((r.permissions || []).length ? `${r.permissions.length} permission(s)` : 'View only') : '—')
    },
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
              {isAdmin && <MenuItem value="ADMIN">Admin</MenuItem>}
              <MenuItem value="SUBADMIN">Sub-admin (permissions below)</MenuItem>
              <MenuItem value="BRANCH_USER">Branch user</MenuItem>
            </TextField>
            {form.role === 'SUBADMIN' && (
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Typography variant="subtitle2">Access permissions</Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                  Every sub-admin can view the dashboard, stock, orders, holdings and sales. Tick what this person may also change.
                </Typography>
                {grantable.map((p) => (
                  <FormControlLabel
                    key={p.key}
                    sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}
                    control={
                      <Checkbox
                        size="small" sx={{ pt: 0.5 }}
                        checked={form.permissions.includes(p.key)}
                        onChange={(e) => setForm({
                          ...form,
                          permissions: e.target.checked ? [...form.permissions, p.key] : form.permissions.filter((k) => k !== p.key)
                        })}
                      />
                    }
                    label={<Box><Typography variant="body2" sx={{ fontWeight: 500 }}>{p.label}</Typography><Typography variant="caption" color="text.secondary">{p.hint}</Typography></Box>}
                  />
                ))}
              </Box>
            )}
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
