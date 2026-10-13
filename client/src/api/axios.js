import axios from 'axios'
import { getToken, clearToken } from './token'

// Locally VITE_API_URL is unset and requests go through the Vite proxy.
// In production (Vercel) it points at the deployed backend URL.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — clear auth and redirect to login
// (skip the login call itself so "invalid password" errors reach the form)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.endsWith('/auth/login')) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
