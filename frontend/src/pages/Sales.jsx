import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DownloadIcon from '@mui/icons-material/Download'
import api from '../api'
import { useAuth } from '../auth'

const emptyItem = { productId: '', quantity: 1, price: 0 }

export default function Sales() {
  const { isAdmin } = useAuth()
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([{ ...emptyItem }])
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [summary, setSummary] = useState(null)
  const [viewRow, setViewRow] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [s, p, hld] = await Promise.all([
        api.get('/api/sales'),
        api.get('/api/products'),
        api.get('/api/holdings')
      ])
      setSales(s.data || [])
      setProducts((p.data || []).filter((x) => x.active))
      setHoldings(hld.data || [])
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const holdingById = useMemo(() => {
    const m = new Map()
    holdings.forEach((h) => m.set(h.productId, h.quantity))
    return m
  }, [holdings])

  // Branch users may only select products their branch actually holds
  const selectableProducts = useMemo(() => {
    if (isAdmin) return products
    return products
      .filter((p) => (holdingById.get(p.id) || 0) > 0)
      .map((p) => ({ ...p, available: holdingById.get(p.id) || 0 }))
  }, [products, holdings, isAdmin, holdingById])

  const loadSummary = async () => {
    if (!dateFrom || !dateTo) { setSummary(null); return }
    try {
      const r = await api.get(`/api/sales/report?from=${dateFrom}&to=${dateTo}`)
      setSummary(r.data)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load report')
    }
  }

  useEffect(() => { loadSummary() }, [dateFrom, dateTo])

  const handleItemChange = (idx, field, value) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], [field]: value }
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { ...emptyItem }])

  const removeItem = (idx) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  const save = async () => {
    setError('')
    try {
      for (const item of items) {
        if (!item.productId || item.quantity < 1 || item.price < 0) {
          throw { response: { data: { message: 'Please fill all fields correctly' } } }
        }
      }
      await api.post('/api/sales', {
        customerName: customer.name?.trim() || null,
        customerPhone: customer.phone?.trim() || null,
        customerEmail: customer.email?.trim() || null,
        customerAddress: customer.address?.trim() || null,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price }))
      })
      setOpen(false)
      setItems([{ ...emptyItem }])
      setCustomer({ name: '', phone: '', email: '', address: '' })
      load()
      if (dateFrom && dateTo) loadSummary()
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed')
    }
  }

  const handleExport = async () => {
    if (!dateFrom || !dateTo) { setError('Select date range first'); return }
    setError('')
    try {
      const r = await api.get(`/api/sales/export?from=${dateFrom}&to=${dateTo}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `sales-${dateFrom}-to-${dateTo}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('Failed to download Excel report')
    }
  }

  const formatItems = (row) => {
    if (!row.items || row.items.length === 0) return '-'
    return row.items.map((it) => `${it.productName} x${it.quantity} @ $${Number(it.price).toFixed(2)}`).join(', ')
  }

  const totalUnits = (row) => {
    if (!row.items) return 0
    return row.items.reduce((s, it) => s + (it.quantity || 0), 0)
  }

  const totalValue = useMemo(() => sales.reduce((sum, s) => sum + (s.total || 0), 0), [sales])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5">Selling records</Typography>
          <Typography color="text.secondary">Branch users record sales - inventory checked and reduced automatically</Typography>
        </div>
        <Stack direction="row" spacing={1.5}>
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} sx={{ minWidth: 150 }} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} sx={{ minWidth: 150 }} />
          <Tooltip title="Download Excel">
            <span><IconButton color="primary" onClick={handleExport} disabled={!dateFrom || !dateTo}><DownloadIcon /></IconButton></span>
          </Tooltip>
          {!isAdmin && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setOpen(true); setError(''); setItems([{ ...emptyItem }]) }}>Record sale</Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {summary && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>Report summary ({dateFrom} to {dateTo})</Typography>
          <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
            <Typography>Invoices: <strong>{summary.invoiceCount || 0}</strong></Typography>
            <Typography>Items sold: <strong>{summary.itemCount || 0}</strong></Typography>
            <Typography>Total value: <strong>${Number(summary.totalValue || 0).toFixed(2)}</strong></Typography>
          </Stack>
          {summary.byProduct && Object.keys(summary.byProduct).length > 0 && (
            <Box sx={{ mt: 1 }}>
              {Object.entries(summary.byProduct).map(([name, agg]) => (
                <Typography key={name} variant="body2">{name}: {agg.quantity} units - ${Number(agg.totalValue).toFixed(2)}</Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Invoice #</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell align="right">Units</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Sold by</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No sales found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((row) => (
                <TableRow key={row.id} hover onClick={() => setViewRow(row)} sx={{ cursor: 'pointer' }}>
                  <TableCell>{new Date(row.soldAt).toLocaleString()}</TableCell>
                  <TableCell>{row.invoiceNo}</TableCell>
                  <TableCell>{row.branchName}</TableCell>
                  <TableCell>{row.customerName || '-'}</TableCell>
                  <TableCell align="right">{totalUnits(row)}</TableCell>
                  <TableCell align="right">${Number(row.total || 0).toFixed(2)}</TableCell>
                  <TableCell>{row.soldBy || row.username}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {sales.length > 0 && (
          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography fontWeight={600}>Grand total: ${totalValue.toFixed(2)}</Typography>
          </Box>
        )}
      </Paper>
      {/* Record sale dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Record sale</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle2" fontWeight={600}>Customer details</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <TextField label="Customer name" size="small" value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })} sx={{ minWidth: 220, flex: 1 }} />
                <TextField label="Phone / Contact" size="small" value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} sx={{ minWidth: 180, flex: 1 }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <TextField label="Email" size="small" type="email" value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })} sx={{ minWidth: 220, flex: 1 }} />
                <TextField label="Address" size="small" value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })} sx={{ minWidth: 220, flex: 1 }} />
              </Stack>
            </Stack>
            <Divider />
            {items.map((item, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                <Autocomplete
                  size="small"
                  sx={{ minWidth: 260, flex: 1 }}
                  options={selectableProducts}
                  getOptionLabel={(p) => `${p.sku} - ${p.name}`}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={selectableProducts.find((p) => p.id === item.productId) || null}
                  onChange={(_, val) => handleItemChange(idx, 'productId', val ? val.id : '')}
                  filterOptions={(options, state) => {
                    const q = state.inputValue.trim().toLowerCase()
                    if (!q) return options
                    return options.filter((p) =>
                      p.name.toLowerCase().includes(q) ||
                      p.sku.toLowerCase().includes(q)
                    )
                  }}
                  renderOption={(props, p) => (
                    <li {...props} key={p.id}>
                      {p.sku} - {p.name}{p.available ? ` (avail: ${p.available})` : ''}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label="Product (type to search)" placeholder="Start typing name or SKU..." />
                  )}
                  noOptionsText="No matching product"
                />
                <TextField label="Qty" type="number" size="small" value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))} sx={{ width: 90 }} />
                <TextField label="Price" type="number" size="small" value={item.price}
                  onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))} sx={{ width: 120 }}
                  InputProps={{ startAdornment: <span>$</span> }} />
                {item.productId && (
                  <Typography variant="body2" color="text.secondary">= ${(Number(item.quantity) * Number(item.price)).toFixed(2)}</Typography>
                )}
                {items.length > 1 && (
                  <Button color="error" size="small" onClick={() => removeItem(idx)}>Remove</Button>
                )}
              </Stack>
            ))}
            <Button startIcon={<AddIcon />} size="small" onClick={addItem}>Add item</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save all items</Button>
        </DialogActions>
      </Dialog>

      {/* View sale details dialog */}
      <Dialog open={!!viewRow} onClose={() => setViewRow(null)} fullWidth maxWidth="md">
        <DialogTitle>Invoice details</DialogTitle>
        <DialogContent dividers>
          {viewRow && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <Typography><strong>Invoice #:</strong> {viewRow.invoiceNo}</Typography>
                <Typography><strong>Date:</strong> {new Date(viewRow.soldAt).toLocaleString()}</Typography>
                <Typography><strong>Branch:</strong> {viewRow.branchName}</Typography>
                <Typography><strong>Sold by:</strong> {viewRow.soldBy || viewRow.username}</Typography>
              </Stack>
              <Divider />
              <Stack spacing={1}>
                <Typography fontWeight={600}>Customer details</Typography>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                  <Typography><strong>Name:</strong> {viewRow.customerName || '-'}</Typography>
                  <Typography><strong>Phone:</strong> {viewRow.customerPhone || '-'}</Typography>
                  <Typography><strong>Email:</strong> {viewRow.customerEmail || '-'}</Typography>
                </Stack>
                <Typography><strong>Address:</strong> {viewRow.customerAddress || '-'}</Typography>
              </Stack>
              <Divider />
              <Box>
                <Typography fontWeight={600}>Items:</Typography>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewRow.items || []).map((it, i) => (
                      <TableRow key={i}>
                        <TableCell>{it.sku}</TableCell>
                        <TableCell>{it.productName}</TableCell>
                        <TableCell align="right">{it.quantity}</TableCell>
                        <TableCell align="right">${Number(it.price).toFixed(2)}</TableCell>
                        <TableCell align="right">${Number(it.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Typography fontWeight={600}><strong>Grand total:</strong> ${Number(viewRow.total || 0).toFixed(2)}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewRow(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}