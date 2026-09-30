import api from './axios'

export const getWebsites        = (params)       => api.get('/websites', { params })
export const getWebsite         = (id)           => api.get(`/websites/${id}`)
export const createWebsite      = (data)         => api.post('/websites', data)
export const updateWebsite      = (id, data)     => api.put(`/websites/${id}`, data)
export const archiveWebsite     = (id)           => api.delete(`/websites/${id}`)
export const addWebsiteMember   = (id, userId)   => api.post(`/websites/${id}/members`, { userId })
export const removeWebsiteMember = (id, userId)  => api.delete(`/websites/${id}/members/${userId}`)
