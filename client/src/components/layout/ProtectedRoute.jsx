import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from '../../hooks/useAuth'
import { getToken } from '../../api/token'

export default function ProtectedRoute() {
  const { data: user, isPending, isError } = useMe()

  if (!getToken()) return <Navigate to="/login" replace />

  if (isError) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Could not load your session. Please refresh the page.
    </div>
  )

  if (isPending) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
