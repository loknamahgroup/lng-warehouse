import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('bs_user')
    return raw ? JSON.parse(raw) : null
  })

  // Pull the latest role/permissions from the server (an admin may have changed them)
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      setUser((prev) => {
        if (!prev) return prev
        const merged = { ...prev, ...data }
        localStorage.setItem('bs_user', JSON.stringify(merged))
        return merged
      })
    } catch {
      /* ignore: the api client handles expired sessions */
    }
  }, [])

  const loggedIn = !!user
  useEffect(() => {
    if (!loggedIn) return undefined
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [loggedIn, refresh])

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === 'ADMIN',
      isSubAdmin: user?.role === 'SUBADMIN',
      // admins can do everything; sub-admins only what was granted; branch users nothing
      can: (permission) => user?.role === 'ADMIN' || (user?.permissions || []).includes(permission),
      refresh,
      login: async (username, password) => {
        const { data } = await api.post('/api/auth/login', { username, password })
        localStorage.setItem('bs_token', data.token)
        localStorage.setItem('bs_user', JSON.stringify(data))
        setUser(data)
        return data
      },
      logout: () => {
        localStorage.removeItem('bs_token')
        localStorage.removeItem('bs_user')
        setUser(null)
      }
    }),
    [user, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
