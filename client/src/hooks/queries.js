import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getStats } from '../api/dashboard'
import { getUsers } from '../api/users'
import { getMembers, getMember, getTrends } from '../api/members'
import { getNotifications } from '../api/notifications'
import { getWebsites, getWebsite } from '../api/websites'
import { getProjects } from '../api/projects'
import { getTasks, getTask, getComments, getActivity, getParticipants, getAttachments } from '../api/tasks'
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

// Completed-per-week, on-time rate, average days. `member` limits to one person.
export const useTrends = (params = {}, options = {}) => useQuery({
  queryKey: ['members', 'trends', params],
  queryFn:  () => getTrends(params).then(({ data }) => data),
  ...options,
})

// Own notifications, polled while the app is open
export const useNotifications = () => useQuery({
  queryKey: ['notifications'],
  queryFn:  () => getNotifications().then(({ data }) => data),
  refetchInterval: 60 * 1000,
  refetchOnWindowFocus: true,
})

// People who can be @mentioned on a task
export const useTaskParticipants = (id, options = {}) => useQuery({
  queryKey: ['tasks', 'detail', id, 'participants'],
  queryFn:  () => getParticipants(id).then(({ data }) => data.users),
  staleTime: 5 * 60 * 1000,
  ...options,
})

export const useTaskAttachments = (id) => useQuery({
  queryKey: ['tasks', 'detail', id, 'attachments'],
  queryFn:  () => getAttachments(id).then(({ data }) => data.attachments),
})
