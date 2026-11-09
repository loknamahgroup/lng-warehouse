import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ThemeProvider, alpha, createTheme, responsiveFontSizes } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const ThemeModeContext = createContext(null)

export function useThemeMode() {
  return useContext(ThemeModeContext)
}

const initialMode = () => {
  const saved = localStorage.getItem('bs_theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Material 3 inspired tonal palettes
const palettes = {
  light: {
    primary: { main: '#1565C0', light: '#5E92F3', dark: '#003C8F', contrastText: '#FFFFFF' },
    secondary: { main: '#00796B', light: '#48A999', dark: '#004C40', contrastText: '#FFFFFF' },
    success: { main: '#2E7D32' },
    warning: { main: '#E65100' },
    error: { main: '#C62828' },
    info: { main: '#0277BD' },
    background: { default: '#F3F6FB', paper: '#FFFFFF' },
    text: { primary: '#1A1C1E', secondary: '#5B6470' },
    divider: 'rgba(16, 24, 40, 0.10)'
  },
  dark: {
    primary: { main: '#A8C7FA', light: '#D3E3FD', dark: '#6FA0EE', contrastText: '#062E6F' },
    secondary: { main: '#7FD6C6', light: '#B1F0E3', dark: '#4DB6A3', contrastText: '#00382F' },
    success: { main: '#81C995' },
    warning: { main: '#FFB74D' },
    error: { main: '#F28B82' },
    info: { main: '#8AB4F8' },
    background: { default: '#0E1318', paper: '#151B22' },
    text: { primary: '#E3E8EE', secondary: '#9AA6B2' },
    divider: 'rgba(255, 255, 255, 0.10)'
  }
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(initialMode)

  const value = useMemo(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light'
          localStorage.setItem('bs_theme', next)
          return next
        })
    }),
    [mode]
  )

  const theme = useMemo(() => {
    const palette = { mode, ...palettes[mode] }
    const t = createTheme({
      palette,
      shape: { borderRadius: 12 },
      typography: {
        fontFamily: '"Roboto", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
        h4: { fontWeight: 700, letterSpacing: -0.3 },
        h5: { fontWeight: 700, letterSpacing: -0.2 },
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 500 },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.1 }
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { minHeight: '100dvh' },
            '#root': { minHeight: '100dvh' }
          }
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: { borderRadius: 999, paddingInline: 20 },
            sizeSmall: { paddingInline: 14 }
          }
        },
        MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
        MuiCard: {
          styleOverrides: {
            root: ({ theme: th }) => ({
              borderRadius: 16,
              boxShadow: 'none',
              border: `1px solid ${th.palette.divider}`
            })
          }
        },
        MuiAppBar: {
          defaultProps: { elevation: 0, color: 'inherit' },
          styleOverrides: {
            root: ({ theme: th }) => ({
              backgroundColor: alpha(th.palette.background.paper, 0.9),
              backdropFilter: 'blur(8px)',
              borderBottom: `1px solid ${th.palette.divider}`
            })
          }
        },
        MuiDrawer: { styleOverrides: { paper: { backgroundImage: 'none' } } },
        MuiTableCell: {
          styleOverrides: {
            head: ({ theme: th }) => ({
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: th.palette.text.secondary,
              backgroundColor: alpha(th.palette.primary.main, th.palette.mode === 'light' ? 0.05 : 0.08)
            })
          }
        },
        MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } } },
        MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
        MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
        MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700 } } },
        MuiTooltip: { defaultProps: { arrow: true } }
      }
    })
    return responsiveFontSizes(t)
  }, [mode])

  useEffect(() => {
    // Colour the phone status bar / browser chrome to match the app
    const meta = document.querySelector('meta[name="theme-color"]:not([media])')
    if (meta) meta.setAttribute('content', theme.palette.background.paper)
  }, [theme])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
