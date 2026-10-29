import React from 'react'
import { Inbox, Plus } from 'lucide-react'

export function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your search criteria or register a new batch.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-2xl border border-[#E3EAE5] my-2">
      <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] flex items-center justify-center text-[#176B45] mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#26352E]">{title}</h3>
      <p className="text-xs text-[#66756D] max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
