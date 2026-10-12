import axios from 'axios'

const api = axios.create()

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bs_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('bs_token')
      localStorage.removeItem('bs_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
