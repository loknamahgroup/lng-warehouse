import { useState } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import api from '../api'
import { useAuth } from '../auth'

export default function CreateRequest() {
  const { user } = useAuth()
  const [items, setItems] = useState([{ productId: '', quantity: '', notes: '' }])
  const [requestNotes, setRequestNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const addItem = () => {
    setItems([...items, { productId: '', quantity: '', notes: '' }])
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index, field, value) => {
    const newItems = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setItems(newItems)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const requestItems = items.filter(item => item.productId.trim())
      if (requestItems.length === 0) {
        setError('Please add at least one item')
        return
      }
      await api.post('/api/requests', {
        items: requestItems.map(item => ({
          productId: item.productId.trim(),
          quantity: parseInt(item.quantity) || 0,
          notes: item.notes
        })),
        notes: requestNotes
      })
      setSuccess('Request created successfully!')
      setItems([{ productId: '', quantity: '', notes: '' }])
      setRequestNotes('')
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper>
      <form onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>Create Multi-Item Request</Typography>
        <Typography color="text.secondary">Branch: {user?.branchName || ''}</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Product ID *"
              value={items[0]?.productId || ''}
              onChange={(e) => updateItem(0, 'productId', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Quantity *"
              type="number"
              value={items[0]?.quantity || ''}
              onChange={(e) => updateItem(0, 'quantity', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Notes"
              value={items[0]?.notes || ''}
              onChange={(e) => updateItem(0, 'notes', e.target.value)}
              fullWidth
            />
            <Button type="button" variant="outlined" onClick={addItem}>Add Item</Button>
          </Stack>

          {items.map((item, index) => (
            <Stack key={index} direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                label="Product ID"
                value={item.productId}
                onChange={(e) => updateItem(index, 'productId', e.target.value)}
                fullWidth
              />
              <TextField
                label="Quantity"
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                fullWidth
              />
              <TextField
                label="Notes"
                value={item.notes}
                onChange={(e) => updateItem(index, 'notes', e.target.value)}
                fullWidth
              />
              {items.length > 1 && (
                <Button type="button" variant="outlined" color="error" size="small" onClick={() => removeItem(index)}>
                  Remove
                </Button>
              )}
            </Stack>
          ))}

          <TextField
            label="Request Notes"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="outlined" onClick={() => setItems([{ productId: '', quantity: '', notes: '' }])}>
              Reset
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      </form>
    </Paper>
  )
}
import { useState } from 'react'
