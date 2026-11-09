import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inventory2Outlined'

/** Title + subtitle on the left, actions on the right; stacks on phones. */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      spacing={1.5}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" component="h1">{title}</Typography>
        {subtitle && <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          {actions}
        </Stack>
      )}
    </Stack>
  )
}

/** Row of filters; each control takes a full row on phones. */
export function FilterBar({ children }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      flexWrap="wrap"
      sx={{ '& > *': { flex: { xs: '1 1 100%', sm: '0 1 auto' }, minWidth: { sm: 160 } } }}
    >
      {children}
    </Stack>
  )
}

export function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  )
}

export function EmptyState({ title = 'Nothing here yet', hint, icon }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 6, px: 2, textAlign: 'center', color: 'text.secondary' }}>
      {icon || <InboxIcon sx={{ fontSize: 44, opacity: 0.6 }} />}
      <Typography variant="subtitle1" color="text.primary">{title}</Typography>
      {hint && <Typography variant="body2">{hint}</Typography>}
    </Stack>
  )
}

import { useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'

/** true below the md breakpoint (phones / small tablets) */
export function useIsMobile() {
  const theme = useTheme()
  return useMediaQuery(theme.breakpoints.down('md'))
}
