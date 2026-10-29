import React from 'react'
import { AlertCircle, X } from 'lucide-react'

export function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary', // 'primary' | 'danger'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmVariant === 'danger'
                  ? 'bg-[#FDF2F2] text-[#D94F4F]'
                  : 'bg-[#E8F5EE] text-[#176B45]'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#26352E]">{title}</h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[#66756D] hover:text-[#26352E] p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#66756D] mt-3 leading-relaxed">{description}</p>

        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors shadow-xs ${
              confirmVariant === 'danger'
                ? 'bg-[#D94F4F] hover:bg-[#B91C1C]'
                : 'bg-[#176B45] hover:bg-[#003B23]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
