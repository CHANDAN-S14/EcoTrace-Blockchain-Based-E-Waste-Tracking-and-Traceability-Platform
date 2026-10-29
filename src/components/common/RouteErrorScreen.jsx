import React from 'react'
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'

export function RouteErrorScreen() {
  const error = useRouteError()
  let title = 'Something went wrong'
  let message = 'An unexpected error occurred while loading this page.'

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Page Not Found'
      message = 'The requested route does not exist or has been relocated.'
    } else {
      title = `Error ${error.status}: ${error.statusText || 'Application Error'}`
      message = error.data?.message || message
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 border border-[#E3EAE5] shadow-xs max-w-lg w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#FDF2F2] text-[#D94F4F] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#003B23]">{title}</h2>
          <p className="text-xs text-[#66756D] mt-1">{message}</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-semibold text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload Page
          </button>
          <Link
            to="/dashboard"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl inline-flex items-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
