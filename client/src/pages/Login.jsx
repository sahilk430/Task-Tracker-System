import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart2, Eye, EyeOff } from 'lucide-react'
import { login } from '../api/auth'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { setAuth, token }    = useAuthStore()
  const navigate              = useNavigate()

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true })
  }, [token, navigate])

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await login(form.email, form.password)
      setAuth(data.user, data.token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BarChart2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Task Tracker</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your team workspace</p>
        </div>

        {/* Form card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                className="input-field" placeholder="you@seoteam.com" required autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} className="input-field pr-10" placeholder="Enter your password" required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Demo credentials</p>
          <div className="space-y-1 text-xs text-gray-600 font-mono">
            <div className="flex justify-between gap-4"><span className="font-sans font-medium text-gray-700">Super Admin</span><span>admin@seoteam.com / admin123</span></div>
            <div className="flex justify-between gap-4"><span className="font-sans font-medium text-gray-700">Team Lead</span><span>sarah@seoteam.com / password123</span></div>
            <div className="flex justify-between gap-4"><span className="font-sans font-medium text-gray-700">SEO Executive</span><span>mike@seoteam.com / password123</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
