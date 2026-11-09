import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar } from '@mui/material'

const FeedbackContext = createContext(null)

/** notify(message, severity?) -> toast;  confirm({title, message, confirmLabel, danger}) -> Promise<boolean> */
export const useFeedback = () => useContext(FeedbackContext)

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const notify = useCallback((message, severity = 'success') => setToast({ message, severity, key: Date.now() }), [])
  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setDialog(options)
      }),
    []
  )
  const close = (result) => {
    resolver.current?.(result)
    resolver.current = null
    setDialog(null)
  }
  const value = useMemo(() => ({ notify, confirm }), [notify, confirm])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={4000}
        onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 24 } }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
      <Dialog open={!!dialog} onClose={() => close(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog?.title || 'Are you sure?'}</DialogTitle>
        {dialog?.message && (
          <DialogContent>
            <DialogContentText>{dialog.message}</DialogContentText>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => close(false)}>{dialog?.cancelLabel || 'Cancel'}</Button>
          <Button variant="contained" color={dialog?.danger ? 'error' : 'primary'} onClick={() => close(true)} autoFocus>
            {dialog?.confirmLabel || 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </FeedbackContext.Provider>
  )
}
