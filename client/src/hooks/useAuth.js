import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { login, getMe } from '../api/auth'
import { getToken, setToken, clearToken } from '../api/token'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => getMe().then(({ data }) => data.user),
    enabled: !!getToken(),
    staleTime: Infinity,
  })
}

// Logged-in user — always loaded inside <ProtectedRoute>
export const useUser = () => useMe().data

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }) => login(email, password).then(({ data }) => data),
    onSuccess: ({ user, token }) => {
      setToken(token)
      queryClient.setQueryData(['me'], user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return () => {
    clearToken()
    queryClient.clear()
  }
}
