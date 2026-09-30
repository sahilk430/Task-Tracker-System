import api from './axios'

export const getProjects   = (websiteId) => api.get('/projects', { params: { websiteId } })
export const getProject    = (id)        => api.get(`/projects/${id}`)
export const createProject = (data)      => api.post('/projects', data)
export const updateProject = (id, data)  => api.put(`/projects/${id}`, data)
export const deleteProject = (id)        => api.delete(`/projects/${id}`)
