import { createContext, useContext, useMemo, useState } from 'react'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'

const ThemeModeContext = createContext(null)

export function useThemeMode() {
  return useContext(ThemeModeContext)
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('bs_theme') || 'light')

  const value = useMemo(
    () => ({
      mode,
      toggle: () => {
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light'
          localStorage.setItem('bs_theme', next)
          return next
        })
      }
    }),
    [mode]
  )

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === 'light' ? '#0d47a1' : '#90caf9' },
          secondary: { main: mode === 'light' ? '#00695c' : '#80cbc4' },
          background: {
            default: mode === 'light' ? '#f4f6f8' : '#0e141b',
            paper: mode === 'light' ? '#ffffff' : '#151d27'
          }
        },
        typography: {
          fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
          h5: { fontWeight: 700 },
          h6: { fontWeight: 700 }
        },
        shape: { borderRadius: 10 },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: { boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }
            }
          },
          MuiDrawer: {
            styleOverrides: {
              paper: { borderRight: '1px solid', borderColor: 'divider' }
            }
          }
        }
      }),
    [mode]
  )

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
