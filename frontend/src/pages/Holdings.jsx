import { useEffect, useMemo, useState } from 'react'
import { Alert, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import { Stack } from '@mui/material'
import api from '../api'
import { useAuth } from '../auth'
import DataTable from '../components/DataTable'
import { FilterBar, Loading, PageHeader } from '../components/common'

export default function Holdings() {
  const { user } = useAuth()
  const seesAll = user?.role !== 'BRANCH_USER' // admin / sub-admin see every branch
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([api.get('/api/holdings'), seesAll ? api.get('/api/branches') : Promise.resolve({ data: [] })])
      .then(([h, b]) => { setRows(h.data); setBranches(b.data) })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      if (branchFilter && r.branchId !== branchFilter) return false
      return !q || (r.sku || '').toLowerCase().includes(q) || (r.productName || '').toLowerCase().includes(q)
    })
  }, [rows, branchFilter, search])

  const columns = [
    ...(seesAll ? [{ key: 'branchName', label: 'Branch', mobile: 'subtitle' }] : []),
    { key: 'productName', label: 'Product', mobile: 'title' },
    { key: 'sku', label: 'SKU' },
    { key: 'quantity', label: 'Quantity', align: 'right', mobile: 'badge', render: (r) => <strong>{r.quantity} {r.unit}</strong> }
  ]

  return (
    <Stack spacing={2}>
      <PageHeader
        title={seesAll ? 'Holdings by branch' : 'My branch holdings'}
        subtitle="Stock already received at shop locations after warehouse approval."
      />
      <FilterBar>
        <TextField size="small" placeholder="Search product or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {seesAll && (
          <FormControl size="small">
            <InputLabel>Branch</InputLabel>
            <Select value={branchFilter} label="Branch" onChange={(e) => setBranchFilter(e.target.value)}>
              <MenuItem value="">All branches</MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </FilterBar>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <Loading /> : (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => `${r.branchId}-${r.productId}`} emptyTitle="No holdings found" />
      )}
    </Stack>
  )
}
