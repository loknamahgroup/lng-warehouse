import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import api from '../api'
import { useAuth } from '../auth'
import DataTable from '../components/DataTable'
import { useFeedback } from '../components/Feedback'
import { FilterBar, Loading, PageHeader } from '../components/common'
import { statusColors, statusLabels } from '../requestStatus'

export default function Requests() {
  const { user, can } = useAuth()
  const canApprove = can('REQUESTS_APPROVE')
  const { notify, confirm } = useFeedback()
  const navigate = useNavigate()
  const isBranchUser = user?.role === 'BRANCH_USER'
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const [r, b] = await Promise.all([api.get('/api/requests'), !isBranchUser ? api.get('/api/branches') : Promise.resolve({ data: [] })])
      setRows(r.data)
      setBranches(b.data)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      if (branchFilter && r.branchId !== branchFilter) return false
      if (statusFilter && r.status !== statusFilter) return false
      if (!q) return true
      return (r.branchName || '').toLowerCase().includes(q) || (r.requestedBy || '').toLowerCase().includes(q) ||
        (r.lines || []).some((l) => (l.productName || '').toLowerCase().includes(q) || (l.sku || '').toLowerCase().includes(q))
    })
  }, [rows, branchFilter, statusFilter, search])

  const cancel = async (row) => {
    const ok = await confirm({ title: 'Cancel this request?', message: 'The reserved stock will be released back to the warehouse.', confirmLabel: 'Cancel request', cancelLabel: 'Keep', danger: true })
    if (!ok) return
    try {
      await api.post(`/api/requests/${row.id}/cancel`)
      notify('Request cancelled')
      load()
    } catch (e) {
      notify(e.response?.data?.message || 'Action failed', 'error')
    }
  }

  const summary = (lines = []) => {
    const names = lines.slice(0, 2).map((l) => `${l.productName} ×${l.requestedQuantity}`).join(', ')
    return lines.length > 2 ? `${names} +${lines.length - 2} more` : names
  }

  const columns = [
    ...(!isBranchUser ? [{ key: 'branchName', label: 'Branch', mobile: 'title' }] : []),
    { key: 'items', label: 'Items', mobile: isBranchUser ? 'title' : 'subtitle', render: (r) => summary(r.lines) },
    { key: 'totalQuantity', label: 'Total qty', align: 'right' },
    { key: 'status', label: 'Status', mobile: 'badge', render: (r) => <Chip size="small" color={statusColors[r.status]} label={statusLabels[r.status] || r.status} /> },
    { key: 'requestedBy', label: 'Requested by' },
    { key: 'createdAt', label: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '') }
  ]

  return (
    <Stack spacing={2}>
      <PageHeader
        title={isBranchUser ? 'My requests' : 'Branch orders'}
        subtitle="Reserved requests block warehouse stock until approved, rejected or cancelled."
        actions={isBranchUser && <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/create-request')}>New request</Button>}
      />
      <FilterBar>
        <TextField size="small" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {!isBranchUser && (
          <FormControl size="small">
            <InputLabel>Branch</InputLabel>
            <Select value={branchFilter} label="Branch" onChange={(e) => setBranchFilter(e.target.value)}>
              <MenuItem value="">All branches</MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All statuses</MenuItem>
            {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
      </FilterBar>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Loading /> : (
        <DataTable
          columns={columns} rows={filtered} emptyTitle="No requests found"
          onRowClick={(r) => navigate(`/requests/approve/${r.id}`)}
          actions={(r) => (
            <>
              <Button size="small" variant={canApprove && r.status === 'RESERVED' ? 'contained' : 'text'} onClick={() => navigate(`/requests/approve/${r.id}`)}>
                {canApprove && r.status === 'RESERVED' ? 'Review' : 'View'}
              </Button>
              {r.status === 'RESERVED' && (canApprove || isBranchUser) && <Button size="small" color="error" onClick={() => cancel(r)}>Cancel</Button>}
            </>
          )}
        />
      )}
    </Stack>
  )
}
