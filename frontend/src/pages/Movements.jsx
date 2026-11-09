import { useEffect, useMemo, useState } from 'react'
import { Alert, Chip, Stack, TextField } from '@mui/material'
import api from '../api'
import DataTable from '../components/DataTable'
import { FilterBar, Loading, PageHeader } from '../components/common'

const typeColors = { INBOUND: 'success', ADJUSTMENT: 'info', RESERVE: 'warning', RELEASE: 'default', SHIP: 'primary' }

export default function Movements() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get('/api/warehouse/movements').then((r) => setRows(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    return rows.filter((r) => !q || [r.sku, r.productName, r.branchName, r.type].some((v) => (v || '').toLowerCase().includes(q)))
  }, [rows, filter])

  const columns = [
    { key: 'productName', label: 'Product', mobile: 'title' },
    { key: 'sku', label: 'SKU', mobile: 'subtitle' },
    { key: 'type', label: 'Type', mobile: 'badge', render: (r) => <Chip size="small" color={typeColors[r.type] || 'default'} label={r.type} /> },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'branchName', label: 'Branch', render: (r) => r.branchName || '—' },
    { key: 'createdAt', label: 'When', render: (r) => new Date(r.createdAt).toLocaleString() },
    { key: 'note', label: 'Note', render: (r) => r.note || '—' }
  ]

  return (
    <Stack spacing={2}>
      <PageHeader title="Stock movements" subtitle="Audit trail of all warehouse stock changes" />
      <FilterBar>
        <TextField size="small" placeholder="Search SKU, product, branch, type…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </FilterBar>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {loading ? <Loading /> : <DataTable columns={columns} rows={filtered} emptyTitle="No movements found" dense pageSize={25} />}
    </Stack>
  )
}
