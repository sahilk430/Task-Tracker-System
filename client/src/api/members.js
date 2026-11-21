import api from './axios'

export const getMembers = ()   => api.get('/members')
export const getMember  = (id) => api.get(`/members/${id}`)
