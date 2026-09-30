import api from './axios'

export const getStats = () => api.get('/dashboard/stats')
