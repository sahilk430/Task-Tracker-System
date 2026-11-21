import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getStats } from '../api/dashboard'
import { getUsers } from '../api/users'
import { getMembers, getMember } from '../api/members'
import { getWebsites, getWebsite } from '../api/websites'
import { getProjects } from '../api/projects'
import { getTasks, getTask, getComments, getActivity } from '../api/tasks'
import { getTaskReport, getWebsiteReport } from '../api/reports'

export const useDashboardStats = () => useQuery({
  queryKey: ['dashboard'],
  queryFn:  () => getStats().then(({ data }) => data),
})

export const useUsers = (params = {}, options = {}) => useQuery({
  queryKey: ['users', params],
  queryFn:  () => getUsers(params).then(({ data }) => data.users),
  placeholderData: keepPreviousData,
  ...options,
})

export const useWebsites = (options = {}) => useQuery({
  queryKey: ['websites', 'list'],
  queryFn:  () => getWebsites().then(({ data }) => data.websites),
  ...options,
})

export const useWebsite = (id) => useQuery({
  queryKey: ['websites', 'detail', id],
  queryFn:  () => getWebsite(id).then(({ data }) => data.website),
})

export const useProjects = (websiteId) => useQuery({
  queryKey: ['projects', websiteId],
  queryFn:  () => getProjects(websiteId).then(({ data }) => data.projects),
  enabled:  !!websiteId,
})

export const useTasks = (params = {}, options = {}) => useQuery({
  queryKey: ['tasks', 'list', params],
  queryFn:  () => getTasks(params).then(({ data }) => data.tasks),
  placeholderData: keepPreviousData,
  ...options,
})

export const useTask = (id) => useQuery({
  queryKey: ['tasks', 'detail', id],
  queryFn:  () => getTask(id).then(({ data }) => data.task),
})

export const useTaskComments = (id) => useQuery({
  queryKey: ['tasks', 'detail', id, 'comments'],
  queryFn:  () => getComments(id).then(({ data }) => data.comments),
})

export const useTaskActivity = (id) => useQuery({
  queryKey: ['tasks', 'detail', id, 'activity'],
  queryFn:  () => getActivity(id).then(({ data }) => data.activity),
})

export const useTaskReport = (params) => useQuery({
  queryKey: ['reports', 'tasks', params],
  queryFn:  () => getTaskReport(params).then(({ data }) => data),
})

export const useWebsiteReport = (options = {}) => useQuery({
  queryKey: ['reports', 'websites'],
  queryFn:  () => getWebsiteReport().then(({ data }) => data.websites),
  ...options,
})

// Team members (existing users) with task summaries
export const useMembers = (options = {}) => useQuery({
  queryKey: ['members', 'list'],
  queryFn:  () => getMembers().then(({ data }) => data.members),
  ...options,
})

export const useMember = (id) => useQuery({
  queryKey: ['members', 'detail', id],
  queryFn:  () => getMember(id).then(({ data }) => data),
  enabled:  !!id,
  // 403 / 404 are final answers — only retry network / server errors
  retry:    (count, err) => count < 1 && (!err.response || err.response.status >= 500),
})
