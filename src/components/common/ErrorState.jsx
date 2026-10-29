import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export function ErrorState({
  title = 'An error occurred',
  message = 'Failed to retrieve records. Please verify connectivity.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-[#FDF2F2]/50 rounded-2xl border border-[#F8B4B4] my-2">
      <div className="w-11 h-11 rounded-2xl bg-[#FDF2F2] flex items-center justify-center text-[#D94F4F] mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#26352E]">{title}</h3>
      <p className="text-xs text-[#66756D] max-w-sm mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  )
}
