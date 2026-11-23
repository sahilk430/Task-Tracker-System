import api from './axios'

export const getTasks   = (params)   => api.get('/tasks', { params })
export const getTask    = (id)       => api.get(`/tasks/${id}`)
export const createTask = (data)     => api.post('/tasks', data)
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data)
export const deleteTask = (id)       => api.delete(`/tasks/${id}`)

export const getComments   = (taskId)        => api.get(`/tasks/${taskId}/comments`)
export const deleteComment = (taskId, cId)   => api.delete(`/tasks/${taskId}/comments/${cId}`)
export const getActivity   = (taskId)        => api.get(`/tasks/${taskId}/activity`)
export const addComment       = (taskId, body, mentions = []) => api.post(`/tasks/${taskId}/comments`, { body, mentions })
export const getParticipants  = (taskId)        => api.get(`/tasks/${taskId}/participants`)

export const addChecklistItem    = (taskId, text)         => api.post(`/tasks/${taskId}/checklist`, { text })
export const updateChecklistItem = (taskId, itemId, data) => api.patch(`/tasks/${taskId}/checklist/${itemId}`, data)
export const deleteChecklistItem = (taskId, itemId)       => api.delete(`/tasks/${taskId}/checklist/${itemId}`)

export const getAttachments   = (taskId)        => api.get(`/tasks/${taskId}/attachments`)
export const deleteAttachment = (taskId, attId) => api.delete(`/tasks/${taskId}/attachments/${attId}`)
export const uploadAttachment = (taskId, file, onUploadProgress) => {
  const form = new FormData()
  form.append('file', file)
  // Overrides the instance's JSON default (which would serialise the FormData);
  // axios then lets the browser add the multipart boundary
  return api.post(`/tasks/${taskId}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress })
}
// Fetched with the auth header, then saved from a blob URL
export const downloadAttachment = (taskId, attId) =>
  api.get(`/tasks/${taskId}/attachments/${attId}/download`, { responseType: 'blob' })
