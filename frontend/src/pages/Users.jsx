import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material'
import api from '../api'

const empty = { username: '', password: '', displayName: '', role: 'BRANCH_USER', branchId: '', active: true }

export default function Users() {
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [u, b] = await Promise.all([api.get('/api/users'), api.get('/api/branches')])
      setRows(u.data)
      setBranches(b.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      const payload = {
        ...form,
        branchId: form.role === 'ADMIN' ? null : form.branchId
      }
      if (editing) await api.put(`/api/users/${editing.id}`, { ...editing, ...payload })
      else await api.post('/api/users', payload)
      setOpen(false)
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed')
    }
  }

  const toggleActive = async (row) => {
    if (row.username === 'admin') return
    try {
      await api.put(`/api/users/${row.id}`, { ...row, active: !row.active })
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed')
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5">Users</Typography>
          <Typography color="text.secondary">Admin accounts and branch users assigned to a shop</Typography>
        </div>
        <Button variant="contained" onClick={() => { setEditing(null); setForm(empty); setError(''); setOpen(true) }}>Add user</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box> : (
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} sx={{ opacity: row.active ? 1 : 0.6 }}>
                <TableCell>{row.username}</TableCell>
                <TableCell>{row.displayName}</TableCell>
                <TableCell>{row.role}</TableCell>
                <TableCell>{row.branchName || '—'}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Switch size="small" checked={row.active} disabled={row.username === 'admin'} onChange={() => toggleActive(row)} />
                    <Chip size="small" color={row.active ? 'success' : 'default'} label={row.active ? 'Active' : 'Inactive'} />
                  </Stack>
                </TableCell>
                <TableCell>
                  <Button size="small" disabled={row.username === 'admin'} onClick={() => { setEditing(row); setForm({ ...empty, ...row, password: '' }); setError(''); setOpen(true) }}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{editing ? 'Update user' : 'New user'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <TextField label={editing ? 'New password (leave blank to keep)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <TextField label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <MenuItem value="ADMIN">Admin</MenuItem>
              <MenuItem value="BRANCH_USER">Branch user</MenuItem>
            </TextField>
            {form.role === 'BRANCH_USER' && (
              <TextField select label="Branch" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            )}
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
