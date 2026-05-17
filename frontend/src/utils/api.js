import axios from 'axios'
import { addToQueue } from './offlineQueue'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance-dashboard-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config
    const status = error.response?.status

    // Sem resposta = sem internet: enfileira operações de escrita
    if (!error.response && !navigator.onLine) {
      const method = original.method?.toLowerCase()
      if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
        addToQueue({ method, url: original.url, data: original.data ? JSON.parse(original.data) : undefined })
        return Promise.resolve({ data: { offline: true, msg: 'Salvo offline. Será enviado quando conectar.' } })
      }
      return Promise.reject(error)
    }

    // 401: tenta refresh silencioso
    if (status === 401 && !original._retry && original.url !== '/refresh' && original.url !== '/login') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then(token => { original.headers.Authorization = `Bearer ${token}`; return api(original) })
          .catch(err => Promise.reject(err))
      }

      original._retry = true
      isRefreshing = true
      const refreshToken = localStorage.getItem('finance-dashboard-refresh')

      if (!refreshToken) {
        localStorage.removeItem('finance-dashboard-token')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        })
        localStorage.setItem('finance-dashboard-token', data.access_token)
        localStorage.setItem('finance-dashboard-refresh', data.refresh_token)
        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`
        processQueue(null, data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('finance-dashboard-token')
        localStorage.removeItem('finance-dashboard-refresh')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
