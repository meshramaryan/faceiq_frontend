// NotFound Page — displayed for invalid routes
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20
                      flex items-center justify-center mb-5 animate-bounce">
        <ShieldAlert className="w-8 h-8 text-danger" />
      </div>
      <h2 className="text-3xl font-extrabold text-white mb-2">404 — Page Not Found</h2>
      <p className="text-gray-500 text-sm max-w-md mb-6">
        The system page you are trying to access does not exist or has been relocated by administrators.
      </p>
      <Link to="/dashboard" className="btn-primary py-2.5 px-6">
        Return to Dashboard
      </Link>
    </div>
  )
}
