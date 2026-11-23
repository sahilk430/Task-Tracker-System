import { BarChart2 } from 'lucide-react'

// Centered logo + card used by the sign-in and password pages
export default function AuthShell({ subtitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BarChart2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Task Tracker</h1>
          <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}
