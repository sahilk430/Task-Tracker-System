import api from './axios'

export const getMembers = ()   => api.get('/members')
export const getMember  = (id) => api.get(`/members/${id}`)
export const getTrends  = (params) => api.get('/members/trends', { params })
