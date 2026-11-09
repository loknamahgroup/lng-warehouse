import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DownloadIcon from '@mui/icons-material/Download'
import api from '../api'
import { useAuth } from '../auth'
import DataTable from '../components/DataTable'
import { useFeedback } from '../components/Feedback'
import { Loading, PageHeader } from '../components/common'
import { statusColors, statusLabels } from '../requestStatus'

export default function ApproveRequest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { notify, confirm } = useFeedback()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [approvedQty, setApprovedQty] = useState({})

  const load = async () => {
    try {
      const r = await api.get(`/api/requests/${id}`)
      setRequest(r.data)
      const initial = {}
      r.data.lines.forEach((l) => { initial[l.id] = l.approvedQuantity > 0 ? l.approvedQuantity : l.requestedQuantity })
      setApprovedQty(initial)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load request')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const setQty = (line, value) => {
    const n = Math.min(Math.max(parseInt(value, 10) || 0, 0), line.requestedQuantity)
    setApprovedQty((prev) => ({ ...prev, [line.id]: n }))
  }

  const run = async (fn, okMessage, failMessage) => {
    setSaving(true)
    try {
      await fn()
      notify(okMessage)
      await load()
    } catch (e) {
      notify(e.response?.data?.message || failMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    const total = request.lines.reduce((s, l) => s + (approvedQty[l.id] ?? 0), 0)
    const ok = await confirm({
      title: 'Approve this request?',
      message: `${total} unit(s) will be shipped to ${request.branchName}. Anything not approved is released back to the warehouse.`,
      confirmLabel: 'Approve'
    })
    if (!ok) return
    run(() => api.post(`/api/requests/${request.id}/approve`, {
      lines: request.lines.map((l) => {
        const quantity = approvedQty[l.id] ?? 0
        return { id: l.id, quantity, approved: quantity > 0, rejected: quantity === 0 }
      })
    }), 'Request approved', 'Approval failed')
  }
  const handleReject = async () => {
    const ok = await confirm({ title: 'Reject this request?', message: 'All reserved stock will be released.', confirmLabel: 'Reject', danger: true })
    if (ok) run(() => api.post(`/api/requests/${request.id}/reject`), 'Request rejected', 'Rejection failed')
  }
  const handleAdjust = () => run(() => api.post(`/api/requests/${request.id}/adjust`, {
    adjustments: request.lines.map((l) => ({ id: l.id, quantity: approvedQty[l.id] ?? 0 }))
  }), 'Quantities saved', 'Adjustment failed')

  const handleDownload = async () => {
    try {
      const resp = await api.get(`/api/requests/${request.id}/approval-copy`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `approval-copy-${request.id}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      notify('Failed to download approval copy', 'error')
    }
  }

  if (loading) return <Loading />
  if (error) return <Alert severity="error">{error}</Alert>

  const canAct = isAdmin && request.status === 'RESERVED'
  const columns = [
    { key: 'productName', label: 'Product', mobile: 'title' },
    { key: 'sku', label: 'SKU', mobile: 'subtitle' },
    { key: 'lineStatus', label: 'Status', mobile: 'badge', render: (l) => <Chip size="small" color={statusColors[l.lineStatus]} label={statusLabels[l.lineStatus] || l.lineStatus} /> },
    { key: 'requestedQuantity', label: 'Requested', align: 'right', render: (l) => `${l.requestedQuantity} ${l.unit || ''}` },
    {
      key: 'approvedQuantity', label: 'Approved', align: 'right',
      render: (l) => canAct
        ? <TextField size="small" type="number" value={approvedQty[l.id] ?? ''} onChange={(e) => setQty(l, e.target.value)} inputProps={{ min: 0, max: l.requestedQuantity, inputMode: 'numeric' }} sx={{ width: 100 }} />
        : l.approvedQuantity
    }
  ]

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Request details"
        subtitle={`${request.branchName} · requested by ${request.requestedBy}`}
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/requests')}>Back</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>Approval copy</Button>
          </>
        }
      />
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
            <Chip color={statusColors[request.status]} label={statusLabels[request.status] || request.status} />
            <Typography variant="body2" color="text.secondary">{request.totalQuantity} units total</Typography>
            {request.createdAt && <Typography variant="body2" color="text.secondary">{new Date(request.createdAt).toLocaleString()}</Typography>}
          </Stack>
          {request.notes && <Typography variant="body2" sx={{ mt: 1.5 }}>Notes: {request.notes}</Typography>}
        </CardContent>
      </Card>

      <DataTable
        columns={columns} rows={request.lines}
        actions={canAct ? (l) => (
          <>
            <Button size="small" variant="contained" color="success" onClick={() => setQty(l, l.requestedQuantity)}>Full</Button>
            <Button size="small" variant="outlined" color="error" onClick={() => setQty(l, 0)}>None</Button>
          </>
        ) : undefined}
      />

      {canAct && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="contained" size="large" onClick={handleApprove} disabled={saving}>Approve</Button>
          <Button variant="outlined" size="large" onClick={handleAdjust} disabled={saving}>Save quantities</Button>
          <Button variant="outlined" size="large" color="error" onClick={handleReject} disabled={saving}>Reject all</Button>
        </Stack>
      )}
    </Stack>
  )
}
