import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, CardContent, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import api from '../api'
import { useAuth } from '../auth'
import { useFeedback } from '../components/Feedback'
import { Loading, PageHeader } from '../components/common'

const emptyItem = () => ({ productId: '', quantity: '', notes: '' })

export default function CreateRequest() {
  const { user } = useAuth()
  const { notify } = useFeedback()
  const navigate = useNavigate()
  const [stock, setStock] = useState(null)
  const [items, setItems] = useState([emptyItem()])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/warehouse')
      .then((r) => setStock(r.data.filter((s) => s.available > 0)))
      .catch((e) => { setError(e.response?.data?.message || 'Failed to load stock'); setStock([]) })
  }, [])

  const availableOf = (productId) => stock?.find((s) => s.productId === productId)
  const update = (index, field, value) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))

  // total requested per product (duplicates are merged by the server)
  const totals = {}
  items.forEach((it) => { if (it.productId) totals[it.productId] = (totals[it.productId] || 0) + (parseInt(it.quantity, 10) || 0) })
  const overLimit = Object.entries(totals).some(([pid, q]) => q > (availableOf(pid)?.available ?? 0))
  const lines = items.filter((it) => it.productId).map((it) => ({ productId: it.productId, quantity: parseInt(it.quantity, 10) || 0, notes: it.notes }))
  const valid = lines.length > 0 && lines.every((l) => l.quantity > 0) && !overLimit

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/api/requests', { items: lines, notes })
      notify('Request submitted - stock reserved')
      navigate('/requests')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request')
    } finally {
      setBusy(false)
    }
  }

  if (!stock) return <Loading />

  return (
    <Stack spacing={2} component="form" onSubmit={submit} sx={{ maxWidth: 900 }}>
      <PageHeader title="New stock request" subtitle={`For ${user?.branchName || 'your branch'} · stock is reserved as soon as you submit`} />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {stock.length === 0 && <Alert severity="info">No products are currently available in the warehouse.</Alert>}

      {items.map((item, index) => {
        const avail = availableOf(item.productId)
        const qty = parseInt(item.quantity, 10) || 0
        const tooMany = avail && (totals[item.productId] || 0) > avail.available
        return (
          <Card key={index}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField select fullWidth label="Product" value={item.productId} onChange={(e) => update(index, 'productId', e.target.value)}>
                    {stock.map((s) => <MenuItem key={s.productId} value={s.productId}>{s.sku} · {s.name} ({s.available} {s.unit} available)</MenuItem>)}
                  </TextField>
                  <TextField
                    label="Quantity" type="number" value={item.quantity} onChange={(e) => update(index, 'quantity', e.target.value)}
                    inputProps={{ min: 1, inputMode: 'numeric' }} sx={{ minWidth: { md: 160 } }}
                    error={!!tooMany} helperText={tooMany ? `Only ${avail.available} available` : avail && qty > 0 ? `${avail.available - qty} left after this` : ' '}
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField label="Line notes (optional)" value={item.notes} onChange={(e) => update(index, 'notes', e.target.value)} fullWidth size="small" />
                  {items.length > 1 && (
                    <IconButton color="error" onClick={() => setItems(items.filter((_, i) => i !== index))} aria-label="Remove item"><DeleteIcon /></IconButton>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )
      })}

      <div><Button startIcon={<AddIcon />} onClick={() => setItems([...items, emptyItem()])}>Add another item</Button></div>
      <TextField label="Request notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
      <Typography variant="body2" color="text.secondary">
        {lines.length} item(s) · {Object.values(totals).reduce((a, b) => a + b, 0)} units
      </Typography>
      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5}>
        <Button onClick={() => navigate('/requests')}>Cancel</Button>
        <Button type="submit" variant="contained" size="large" disabled={busy || !valid}>{busy ? 'Submitting…' : 'Submit request'}</Button>
      </Stack>
    </Stack>
  )
}
