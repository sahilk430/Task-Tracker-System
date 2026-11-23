import api from './axios'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const getMe = () =>
  api.get('/auth/me')

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email })

export const resetPassword = (token, password) =>
  api.post('/auth/reset-password', { token, password })
