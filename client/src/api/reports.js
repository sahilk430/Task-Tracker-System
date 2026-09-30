import api from './axios'

export const getTaskReport    = (params) => api.get('/reports/tasks',    { params })
export const getWebsiteReport = ()       => api.get('/reports/websites')
