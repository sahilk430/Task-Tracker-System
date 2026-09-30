import api from './axios'

export const getTasks   = (params)   => api.get('/tasks', { params })
export const getTask    = (id)       => api.get(`/tasks/${id}`)
export const createTask = (data)     => api.post('/tasks', data)
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data)
export const deleteTask = (id)       => api.delete(`/tasks/${id}`)

export const getComments   = (taskId)        => api.get(`/tasks/${taskId}/comments`)
export const addComment    = (taskId, body)  => api.post(`/tasks/${taskId}/comments`, { body })
export const deleteComment = (taskId, cId)   => api.delete(`/tasks/${taskId}/comments/${cId}`)
export const getActivity   = (taskId)        => api.get(`/tasks/${taskId}/activity`)
