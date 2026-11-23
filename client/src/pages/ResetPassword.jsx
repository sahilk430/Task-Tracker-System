import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'
import AuthShell from '../components/auth/AuthShell'
import FormError from '../components/ui/FormError'
import { resetPassword } from '../api/auth'
import { passwordProblem, PASSWORD_HINT } from '../utils/password'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')

  const reset = useMutation({
    mutationFn: () => resetPassword(token, password),
    onError: (err) => setError(err.response?.data?.message || 'Something went wrong. Please try again.'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const problem = passwordProblem(password) || (password !== confirm ? 'The two passwords do not match.' : '')
    setError(problem)
    if (!problem) reset.mutate()
  }

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthShell subtitle="Reset your password">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-700">This reset link is incomplete or invalid.</p>
          <Link to="/forgot-password" className="btn-primary inline-block">Request a new link</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell subtitle="Choose a new password">
      {reset.isSuccess ? (
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
          <p className="text-sm text-gray-700">Your password has been updated and you have been signed out on other devices.</p>
          <Link to="/login" className="btn-primary inline-block">Sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormError message={error} />
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <div className="relative">
              <input id="password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10" required autoFocus autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{PASSWORD_HINT}</p>
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
            <input id="confirm" type={showPw ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="input-field" required autoComplete="new-password" />
          </div>
          <button type="submit" disabled={reset.isPending} className="btn-primary w-full py-2.5">
            {reset.isPending ? 'Saving…' : 'Set new password'}
          </button>
          {/expired|invalid/i.test(error) && (
            <p className="text-center text-sm"><Link to="/forgot-password" className="text-blue-600 hover:underline">Request a new link</Link></p>
          )}
        </form>
      )}
    </AuthShell>
  )
}
