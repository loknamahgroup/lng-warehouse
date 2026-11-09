import { useEffect, useState } from 'react'
import {
  Box, Button, Card, CardActionArea, Divider, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, Typography, useMediaQuery
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { EmptyState } from './common'

/**
 * Responsive data table. Desktop/tablet: a normal table with pagination.
 * Phones: a list of cards (title / subtitle / badge / label-value fields / action row).
 *
 * columns: [{ key, label, align, render(row), mobile: 'title' | 'subtitle' | 'badge' | 'hide' }]
 * actions: (row) => ReactNode   (buttons shown in the last column / card footer)
 */
export default function DataTable({
  columns, rows, rowKey = 'id', actions, onRowClick, emptyTitle, emptyHint, pageSize = 10, dense = false, rowSx
}) {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('md'))
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(pageSize)
  const [shown, setShown] = useState(10)

  useEffect(() => {
    setPage(0)
    setShown(10)
  }, [rows.length])

  const keyOf = (row, i) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? i)
  const cell = (col, row) => (col.render ? col.render(row) : row[col.key] ?? '—')

  if (!rows.length) {
    return (
      <Paper variant="outlined">
        <EmptyState title={emptyTitle} hint={emptyHint} />
      </Paper>
    )
  }

  if (mobile) {
    const titleCol = columns.find((c) => c.mobile === 'title') || columns[0]
    const subCol = columns.find((c) => c.mobile === 'subtitle')
    const badgeCol = columns.find((c) => c.mobile === 'badge')
    const fields = columns.filter((c) => ![titleCol, subCol, badgeCol].includes(c) && c.mobile !== 'hide')
    const visible = rows.slice(0, shown)
    return (
      <Stack spacing={1.5}>
        {visible.map((row, i) => {
          const body = (
            <Box sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                    {cell(titleCol, row)}
                  </Typography>
                  {subCol && (
                    <Typography variant="body2" color="text.secondary" component="div">{cell(subCol, row)}</Typography>
                  )}
                </Box>
                {badgeCol && <Box sx={{ flexShrink: 0 }}>{cell(badgeCol, row)}</Box>}
              </Stack>
              {fields.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, mt: 1.5 }}>
                  {fields.map((c) => (
                    <Box key={c.key || c.label} sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" component="div">{c.label}</Typography>
                      <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word' }}>{cell(c, row)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )
          return (
            <Card key={keyOf(row, i)} sx={rowSx?.(row)}>
              {onRowClick ? <CardActionArea onClick={() => onRowClick(row)}>{body}</CardActionArea> : body}
              {actions && (
                <>
                  <Divider />
                  <Box sx={{ p: 1, display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>{actions(row)}</Box>
                </>
              )}
            </Card>
          )
        })}
        {rows.length > shown && (
          <Button onClick={() => setShown((n) => n + 10)}>Show more ({rows.length - shown} remaining)</Button>
        )}
      </Stack>
    )
  }

  const slice = rows.slice(page * perPage, page * perPage + perPage)
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key || c.label} align={c.align}>{c.label}</TableCell>
              ))}
              {actions && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {slice.map((row, i) => (
              <TableRow
                key={keyOf(row, i)}
                hover
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{ cursor: onRowClick ? 'pointer' : 'default', ...(rowSx?.(row) || {}) }}
              >
                {columns.map((c) => (
                  <TableCell key={c.key || c.label} align={c.align}>{cell(c, row)}</TableCell>
                ))}
                {actions && (
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">{actions(row)}</Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length > 10 && (
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={perPage}
          onRowsPerPageChange={(e) => { setPerPage(Number(e.target.value)); setPage(0) }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      )}
    </Paper>
  )
}
