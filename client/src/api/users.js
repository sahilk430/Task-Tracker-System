import api from './axios'

export const getUsers        = (params) => api.get('/users', { params })
export const getUser         = (id)     => api.get(`/users/${id}`)
export const createUser      = (data)   => api.post('/users', data)
export const updateUser      = (id, data) => api.put(`/users/${id}`, data)
export const toggleUserActive = (id)   => api.patch(`/users/${id}/toggle-active`)
