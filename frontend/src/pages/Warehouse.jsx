import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, IconButton, InputAdornment,
  InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import HistoryIcon from '@mui/icons-material/History'
import SearchIcon from '@mui/icons-material/Search'
import api from '../api'
import { useAuth } from '../auth'
import DataTable from '../components/DataTable'
import { useFeedback } from '../components/Feedback'
import { FilterBar, Loading, PageHeader, useIsMobile } from '../components/common'

const emptyLine = { productId: '', quantity: 1, unitCost: '' }

export default function Warehouse() {
  const { can, user } = useAuth()
  const canStock = can('STOCK_MANAGE')
  const isBranchUser = user?.role === 'BRANCH_USER'
  const isMobile = useIsMobile()
  const { notify } = useFeedback()
  const [rows, setRows] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [edit, setEdit] = useState(null)
  const [qty, setQty] = useState(0)
  const [note, setNote] = useState('')
  const [reqItem, setReqItem] = useState(null)
  const [reqQty, setReqQty] = useState(1)
  const [reqNotes, setReqNotes] = useState('')
  const [intakes, setIntakes] = useState([])
  const [intakeLoading, setIntakeLoading] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [viewIntake, setViewIntake] = useState(null)
  const [mode, setMode] = useState('ADD')
  const [supplier, setSupplier] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [updatedBy, setUpdatedBy] = useState('')
  const [bulkNote, setBulkNote] = useState('')
  const [bulkDetails, setBulkDetails] = useState('')
  const [lines, setLines] = useState([{ ...emptyLine }])
  const [intakeSearch, setIntakeSearch] = useState('')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [w, p] = await Promise.all([api.get('/api/warehouse'), api.get('/api/products')])
      setRows(w.data || [])
      setProducts((p.data || []).filter((x) => x.active))
    } catch (e) { setError(e.response?.data?.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  const loadIntakes = async () => {
    if (!canStock) return
    setIntakeLoading(true)
    try { setIntakes((await api.get('/api/warehouse/intakes')).data || []) }
    catch (e) { setError(e.response?.data?.message || 'Failed to load stock updates') }
    finally { setIntakeLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (canStock) loadIntakes() }, [])
  useEffect(() => {
    if (bulkOpen && !updatedBy && user) {
      setUpdatedBy(user.displayName || user.username || '')
    }
  }, [bulkOpen])

  const categories = useMemo(() => {
    return [...new Set(rows.map((r) => r.category).filter(Boolean))].sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false
      if (stockFilter === 'low' && !r.lowStock) return false
      if (stockFilter === 'available' && r.available <= 0) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (r.sku || '').toLowerCase().includes(q) ||
          (r.name || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [rows, categoryFilter, stockFilter, search])

  const filteredIntakes = useMemo(() => {
    if (!intakeSearch) return intakes
    const q = intakeSearch.toLowerCase()
    return intakes.filter((r) => (
      (r.intakeNo || '').toLowerCase().includes(q) ||
      (r.supplier || '').toLowerCase().includes(q) ||
      (r.referenceNo || '').toLowerCase().includes(q) ||
      (r.updatedBy || '').toLowerCase().includes(q) ||
      (r.note || '').toLowerCase().includes(q) ||
      (r.details || '').toLowerCase().includes(q)
    ))
  }, [intakes, intakeSearch])

  const productById = useMemo(() => {
    const m = new Map()
    products.forEach((p) => m.set(p.id, p))
    return m
  }, [products])

  const updateLine = (i, key, value) => {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [key]: value } : l))
  }

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }])

  const removeLine = (i) => {
    setLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  const saveStock = async () => {
    try {
      await api.put(`/api/warehouse/${edit.productId}`, { onHand: Number(qty), note })
      setEdit(null)
      notify('Stock updated')
      load()
      loadIntakes()
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed')
    }
  }

  const request = async () => {
    try {
      await api.post('/api/requests', { items: [{ productId: reqItem.productId, quantity: Number(reqQty), notes: reqNotes }], notes: reqNotes })
      setReqItem(null)
      notify('Request submitted - stock reserved')
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Request failed')
    }
  }

  const resetBulk = () => {
    setMode('ADD')
    setSupplier('')
    setReferenceNo('')
    setBulkNote('')
    setBulkDetails('')
    setLines([{ ...emptyLine }])
    setError('')
  }

  const openBulk = (productId) => {
    resetBulk()
    setUpdatedBy(user?.displayName || user?.username || '')
    if (productId) {
      setLines([{ ...emptyLine, productId }])
    }
    setBulkOpen(true)
  }

  const saveBulk = async () => {
    try {
      const items = lines
        .filter((l) => l.productId)
        .map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 }))
      if (items.length === 0) {
        setError('Add at least one product row')
        return
      }
      const { data } = await api.post('/api/warehouse/intakes', {
        mode, supplier, referenceNo, updatedBy,
        note: bulkNote, details: bulkDetails, items
      })
      setBulkOpen(false)
      setViewIntake(data)
      load()
      loadIntakes()
    } catch (e) {
      setError(e.response?.data?.message || 'Bulk update failed')
    }
  }

  const openIntakeDetail = async (row) => {
    try {
      const { data } = await api.get(`/api/warehouse/intakes/${row.id}`)
      setViewIntake(data)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load update')
    }
  }

  const downloadIntakes = async () => {
    try {
      const params = new URLSearchParams()
      if (exportFrom) params.append('from', exportFrom)
      if (exportTo) params.append('to', exportTo)
      const res = await api.get(`/api/warehouse/intakes/export?${params.toString()}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'warehouse-intakes.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.response?.data?.message || 'Export failed')
    }
  }

  const stockColumns = [
    { key: 'sku', label: 'SKU', mobile: 'subtitle' },
    {
      key: 'name', label: 'Product', mobile: 'title',
      render: (r) => (<>{r.name}{r.lowStock && <Chip size="small" color="warning" label="Low" sx={{ ml: 1 }} />}</>)
    },
    { key: 'onHand', label: 'On hand', align: 'right' },
    { key: 'reserved', label: 'Reserved', align: 'right' },
    {
      key: 'available', label: 'Available', align: 'right', mobile: 'badge',
      render: (r) => <Chip size="small" label={r.available} color={r.available <= 0 ? 'error' : r.lowStock ? 'warning' : 'success'} />
    }
  ]
  const intakeColumns = [
    { key: 'intakeNo', label: 'Intake No.', mobile: 'title' },
    { key: 'createdAt', label: 'Date', mobile: 'subtitle', render: (r) => new Date(r.createdAt).toLocaleString() },
    { key: 'mode', label: 'Mode', mobile: 'badge', render: (r) => <Chip size="small" label={r.mode} /> },
    { key: 'supplier', label: 'Supplier', render: (r) => r.supplier || '—' },
    { key: 'updatedBy', label: 'Updated by', render: (r) => r.updatedBy || '—' },
    { key: 'lineCount', label: 'Lines', align: 'right' },
    { key: 'totalQuantity', label: 'Total qty', align: 'right' },
    { key: 'totalCost', label: 'Total cost', align: 'right', render: (r) => `$${Number(r.totalCost).toFixed(2)}` }
  ]
  const intakeLineColumns = [
    { key: 'productName', label: 'Product', mobile: 'title' },
    { key: 'sku', label: 'SKU', mobile: 'subtitle' },
    { key: 'quantity', label: 'Qty', align: 'right', mobile: 'badge' },
    { key: 'unitCost', label: 'Unit cost', align: 'right', render: (l) => `$${Number(l.unitCost).toFixed(2)}` },
    { key: 'lineCost', label: 'Line cost', align: 'right', render: (l) => `$${Number(l.lineCost).toFixed(2)}` },
    { key: 'previousOnHand', label: 'Before', align: 'right' },
    { key: 'newOnHand', label: 'After', align: 'right' }
  ]

  return (
    <Stack spacing={2}>
      <PageHeader
        title={isBranchUser ? 'Available stock' : 'Warehouse stock'}
        subtitle={canStock
          ? 'Set warehouse on-hand. Reserved units are blocked for open branch requests.'
          : isBranchUser
            ? 'Requesting an item immediately blocks that quantity so other branches cannot take it.'
            : 'Read-only view of warehouse stock and reserved units.'}
        actions={canStock && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openBulk()}>Bulk stock update</Button>
        )}
      />

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      <FilterBar>
        <TextField size="small" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 180 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }} />
        {categories.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Stock</InputLabel>
          <Select value={stockFilter} label="Stock" onChange={(e) => setStockFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="low">Low stock</MenuItem>
          </Select>
        </FormControl>
      </FilterBar>

      {loading ? <Loading /> : (
        <DataTable
          columns={stockColumns} rows={filtered} rowKey="productId" emptyTitle="No stock found"
          actions={canStock || isBranchUser ? (row) => (canStock ? (
            <>
              <Button size="small" onClick={() => { setEdit(row); setQty(row.onHand); setNote('') }}>Quick set</Button>
              <Button size="small" variant="contained" onClick={() => openBulk(row.productId)}>Restock</Button>
            </>
          ) : (
            <Button size="small" variant="contained" disabled={row.available <= 0} onClick={() => { setReqItem(row); setReqQty(1); setReqNotes('') }}>Request</Button>
          )) : undefined}
        />
      )}

      <Dialog open={!!edit} onClose={() => setEdit(null)}>
        <DialogTitle>Set warehouse quantity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <Typography>{edit?.sku} · {edit?.name}</Typography>
            <TextField label="On hand" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveStock}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!reqItem} onClose={() => setReqItem(null)}>
        <DialogTitle>Request stock</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <Typography>{reqItem?.name} · available {reqItem?.available} {reqItem?.unit}</Typography>
            <TextField label="Quantity" type="number" value={reqQty} onChange={(e) => setReqQty(e.target.value)} />
            <TextField label="Notes" value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqItem(null)}>Cancel</Button>
          <Button variant="contained" onClick={request}>Submit request</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Bulk stock update</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Mode</InputLabel>
              <Select value={mode} label="Mode" onChange={(e) => setMode(e.target.value)}>
                <MenuItem value="ADD">Add to existing</MenuItem>
                <MenuItem value="SET">Set absolute</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
              <TextField size="small" label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} sx={{ minWidth: 200 }} />
              <TextField size="small" label="Reference No." value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} sx={{ minWidth: 160 }} />
              <TextField size="small" label="Updated by" value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} sx={{ minWidth: 160 }} />
            </Stack>
            <TextField size="small" label="Note" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} />
            <TextField size="small" label="Details" value={bulkDetails} onChange={(e) => setBulkDetails(e.target.value)} />
            <Divider />
            <Typography variant="subtitle2">Line items</Typography>
            {lines.map((line, i) => {
              const p = line.productId ? productById.get(line.productId) : null
              return (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Autocomplete
                    size="small"
                    options={products}
                    getOptionLabel={(o) => `${o.sku} - ${o.name}`}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={p}
                    onChange={(e, v) => updateLine(i, 'productId', v ? v.id : '')}
                    sx={{ minWidth: 280, flex: 1 }}
                    renderInput={(params) => <TextField {...params} label="Product (search)" />}
                  />
                  <TextField size="small" label={mode === 'ADD' ? 'Add qty' : 'Set qty'} type="number" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} sx={{ width: 120 }} />
                  <TextField size="small" label="Unit cost" type="number" value={line.unitCost} onChange={(e) => updateLine(i, 'unitCost', e.target.value)} sx={{ width: 120 }} />
                  {p && <Chip size="small" label={`On hand: ${rows.find((r) => r.productId === p.id)?.onHand ?? 0}`} sx={{ mt: 1 }} />}
                  <IconButton size="small" color="error" onClick={() => removeLine(i)} disabled={lines.length === 1} sx={{ mt: 1 }}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              )
            })}
            <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ alignSelf: 'flex-start' }}>Add product</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveBulk}>Save stock update</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!viewIntake} onClose={() => setViewIntake(null)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>Stock update {viewIntake?.intakeNo}</DialogTitle>
        <DialogContent>
          {viewIntake && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={3} flexWrap="wrap" gap={1}>
                <Typography variant="body2"><b>Mode:</b> {viewIntake.mode}</Typography>
                <Typography variant="body2"><b>Date:</b> {new Date(viewIntake.createdAt).toLocaleString()}</Typography>
                {viewIntake.supplier && <Typography variant="body2"><b>Supplier:</b> {viewIntake.supplier}</Typography>}
                {viewIntake.referenceNo && <Typography variant="body2"><b>Ref:</b> {viewIntake.referenceNo}</Typography>}
                <Typography variant="body2"><b>Updated by:</b> {viewIntake.updatedBy}</Typography>
                <Typography variant="body2"><b>Login user:</b> {viewIntake.updatedByUsername}</Typography>
                <Typography variant="body2"><b>Lines:</b> {viewIntake.lineCount}</Typography>
                <Typography variant="body2"><b>Total qty:</b> {viewIntake.totalQuantity}</Typography>
                <Typography variant="body2"><b>Total cost:</b> ${Number(viewIntake.totalCost).toFixed(2)}</Typography>
              </Stack>
              {viewIntake.note && <Typography variant="body2"><b>Note:</b> {viewIntake.note}</Typography>}
              {viewIntake.details && <Typography variant="body2"><b>Details:</b> {viewIntake.details}</Typography>}
              <DataTable columns={intakeLineColumns} rows={viewIntake.lines || []} dense pageSize={25} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewIntake(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {canStock && (
        <>
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <HistoryIcon fontSize="small" />
              <Typography variant="h6">Stock update history</Typography>
              <Chip size="small" label={`${filteredIntakes.length} records`} />
            </Stack>
            <FilterBar>
              <TextField size="small" placeholder="Search…" value={intakeSearch} onChange={(e) => setIntakeSearch(e.target.value)} sx={{ width: 180 }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }} />
              <TextField type="date" size="small" label="From" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField type="date" size="small" label="To" value={exportTo} onChange={(e) => setExportTo(e.target.value)} InputLabelProps={{ shrink: true }} />
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadIntakes}>Export Excel</Button>
            </FilterBar>
          </Stack>
          {intakeLoading ? <Loading /> : (
            <DataTable
              columns={intakeColumns} rows={filteredIntakes} emptyTitle="No stock updates yet"
              onRowClick={openIntakeDetail}
              actions={(row) => <Button size="small" onClick={() => openIntakeDetail(row)}>View</Button>}
            />
          )}
        </>
      )}
    </Stack>
  )
}
