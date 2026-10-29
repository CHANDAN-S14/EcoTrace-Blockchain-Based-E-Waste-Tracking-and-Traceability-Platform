import React, { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration || 4500)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#176B45] shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#E9A23B] shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-[#D94F4F] shrink-0" />,
    info: <Info className="w-5 h-5 text-[#3978C5] shrink-0" />,
  }

  const borderColors = {
    success: 'border-[#C2E3D0] bg-[#FFFFFF]',
    warning: 'border-[#FAD7A0] bg-[#FFFFFF]',
    danger: 'border-[#F8B4B4] bg-[#FFFFFF]',
    info: 'border-[#BEE3F8] bg-[#FFFFFF]',
  }

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-md w-full transition-all duration-200 ${borderColors[toast.type] || borderColors.info}`}
    >
      {icons[toast.type] || icons.info}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-sm font-semibold text-[#26352E]">{toast.title}</h4>
        )}
        <p className="text-xs text-[#66756D] mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[#66756D] hover:text-[#26352E] p-1 rounded-md transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-auto">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
