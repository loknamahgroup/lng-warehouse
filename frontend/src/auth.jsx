import { createContext, useContext, useMemo, useState } from 'react'
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

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === 'ADMIN',
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
    [user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
