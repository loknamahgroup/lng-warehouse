import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack,
  Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material'
import api from '../api'

const empty = { code: '', name: '', address: '' }

export default function Branches() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try { setRows((await api.get('/api/branches')).data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      await api.post('/api/branches', form)
      setOpen(false)
      setForm(empty)
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed')
    }
  }

  const toggle = async (row) => {
    await api.put(`/api/branches/${row.id}`, { ...row, active: !row.active })
    load()
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5">Branches</Typography>
          <Typography color="text.secondary">Shop locations that can request warehouse stock</Typography>
        </div>
        <Button variant="contained" onClick={() => { setForm(empty); setError(''); setOpen(true) }}>Add branch</Button>
      </Stack>
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box> : (
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.address}</TableCell>
                <TableCell><Switch checked={row.active} onChange={() => toggle(row)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>New branch</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
