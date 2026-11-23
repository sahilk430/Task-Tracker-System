import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import AuthShell from '../components/auth/AuthShell'
import FormError from '../components/ui/FormError'
import { forgotPassword } from '../api/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const request = useMutation({ mutationFn: () => forgotPassword(email.trim()).then(({ data }) => data) })

  const handleSubmit = (e) => { e.preventDefault(); request.mutate() }
  const errorMessage = request.isError
    ? request.error.response?.data?.message || 'Something went wrong. Please try again.'
    : ''

  return (
    <AuthShell subtitle="Reset your password">
      {request.isSuccess ? (
        <div className="text-center space-y-4">
          <MailCheck className="w-10 h-10 text-green-600 mx-auto" />
          <p className="text-sm text-gray-700">{request.data.message}</p>
          <p className="text-xs text-gray-500">
            No email after a few minutes? Check your spam folder, or ask an admin for a reset link from Manage Users.
          </p>
          <Link to="/login" className="btn-primary inline-block">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormError message={errorMessage} />
          <p className="text-sm text-gray-600">Enter your work email and we will send you a link to choose a new password.</p>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input-field" placeholder="you@seoteam.com" required autoFocus autoComplete="email" />
          </div>
          <button type="submit" disabled={request.isPending} className="btn-primary w-full py-2.5">
            {request.isPending ? 'Sending…' : 'Send reset link'}
          </button>
          <p className="text-center text-sm"><Link to="/login" className="text-blue-600 hover:underline">Back to sign in</Link></p>
        </form>
      )}
    </AuthShell>
  )
}
