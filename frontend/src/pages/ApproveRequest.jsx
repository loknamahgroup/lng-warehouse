import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import api from '../api'
import { useAuth } from '../auth'

const statusColors = {
  RESERVED: 'warning',
  APPROVED: 'success',
  PARTIALLY_APPROVED: 'secondary',
  REJECTED: 'error',
  CANCELLED: 'default'
}

const statusLabels = {
  RESERVED: 'Reserved',
  APPROVED: 'Approved',
  PARTIALLY_APPROVED: 'Partially Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
}

export default function ApproveRequest() {
  const { isAdmin } = useAuth()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [approvedQty, setApprovedQty] = useState({})
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const load = async () => {
    const id = window.location.pathname.split('/').pop()
    setLoading(true)
    try {
      const r = await api.get(`/api/requests/${id}`)
      setRequest(r.data)
      const initialQty = {}
      r.data.lines.forEach(l => {
        initialQty[l.id] = l.requestedQuantity
      })
      setApprovedQty(initialQty)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load request')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleQuantityChange = (lineId, qty) => {
    setApprovedQty(prev => ({ ...prev, [lineId]: parseInt(qty) || 0 }))
  }

  const handleApprove = async () => {
    setSaving(true)
    setActionError('')
    setActionSuccess('')
    try {
      const lines = request.lines
        .map(l => ({
          id: l.id,
          quantity: approvedQty[l.id] || 0,
          approved: true,
          rejected: false
        }))
      await api.post(`/api/requests/${request.id}/approve`, { lines })
      setActionSuccess('Request approved successfully')
      load()
    } catch (e) {
      setActionError(e.response?.data?.message || 'Approval failed')
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    setSaving(true)
    setActionError('')
    setActionSuccess('')
    try {
      const lines = request.lines
        .map(l => ({
          id: l.id,
          quantity: 0,
          approved: false,
          rejected: true
        }))
      await api.post(`/api/requests/${request.id}/reject`, { lines })
      setActionSuccess('Request rejected successfully')
      load()
    } catch (e) {
      setActionError(e.response?.data?.message || 'Rejection failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAdjust = async () => {
    setSaving(true)
    setActionError('')
    setActionSuccess('')
    try {
      const adjustments = request.lines
        .map(l => ({
          id: l.id,
          quantity: approvedQty[l.id] || 0
        }))
      await api.post(`/api/requests/${request.id}/adjust`, { adjustments })
      setActionSuccess('Request adjusted successfully')
      load()
    } catch (e) {
      setActionError(e.response?.data?.message || 'Adjustment failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    try {
      const resp = await api.get(`/api/requests/${request.id}/approval-copy`, { responseType: 'blob' })

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h5">Approval Details</Typography>
          <Typography color="text.secondary">Status: <Chip label={statusLabels[request.status]} size="small" color={statusColors[request.status]} /></Typography>
          <Typography color="text.secondary">Branch: {request.branchName}</Typography>
        </div>
        <Button onClick={handleDownload} disabled={!isAdmin}>Download Approval Copy</Button>
      </Stack>

      {actionError && <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>}
      {actionSuccess && <Alert severity="success" onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Requested</TableCell>
              <TableCell align="right">Approved</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {request.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.requestedQuantity}</TableCell>
                <TableCell>{line.productName}</TableCell>
                <TableCell>{line.sku}</TableCell>
                <TableCell align="right">{line.requestedQuantity}</TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    type="number"
                    value={approvedQty[line.id] || ''}
                    onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                    placeholder="New qty"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" color="success" onClick={() => handleQuantityChange(line.id, line.requestedQuantity)}>Approve</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => handleQuantityChange(line.id, 0)}>Reject</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" spacing={2}>
        <Button variant="contained" size="large" onClick={handleApprove} disabled={saving}>
          Approve All
        </Button>
        <Button variant="outlined" size="large" color="error" onClick={handleReject} disabled={saving}>
          Reject All
        </Button>
        <Button variant="outlined" size="large" onClick={handleAdjust} disabled={saving}>
          Adjust
        </Button>
      </Stack>
    </Stack>
  )
}
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `approval-copy-${request.id}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setActionError('Failed to download approval copy')
    }
  }
import { useEffect, useMemo, useState } from 'react'
