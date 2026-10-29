import React from 'react'
import { Boxes, CheckSquare, Square, Scale, AlertCircle } from 'lucide-react'
import { formatWeight } from '../../utils/formatters'

export function BatchSelector({ batches, selectedIds, onToggleBatch, onSelectAll }) {
  const allSelected = batches.length > 0 && selectedIds.length === batches.length

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
        <div>
          <h3 className="text-sm font-semibold text-[#003B23]">
            1. Select Pending Batches for Routing ({selectedIds.length} of {batches.length} selected)
          </h3>
          <p className="text-xs text-[#66756D]">
            Batches currently awaiting optimal dispatch assignment to authorized recyclers
          </p>
        </div>

        <button
          onClick={onSelectAll}
          className="text-xs font-semibold text-[#176B45] hover:text-[#003B23] flex items-center gap-1.5"
        >
          {allSelected ? (
            <>
              <CheckSquare className="w-4 h-4" /> Deselect All
            </>
          ) : (
            <>
              <Square className="w-4 h-4" /> Select All ({batches.length})
            </>
          )}
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {batches.map((batch) => {
          const isSelected = selectedIds.includes(batch.id)
          return (
            <div
              key={batch.id}
              onClick={() => onToggleBatch(batch.id)}
              className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                isSelected
                  ? 'bg-[#E8F5EE]/40 border-[#176B45] ring-1 ring-[#176B45]'
                  : 'bg-[#FAFCFA] border-[#E3EAE5] hover:bg-[#F4F7F5]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // handled by parent div
                  className="rounded text-[#176B45] focus:ring-[#176B45] h-4 w-4"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#176B45]">{batch.id}</span>
                    <span className="font-medium text-[#26352E]">{batch.category}</span>
                  </div>
                  <p className="text-[11px] text-[#66756D] mt-0.5 truncate">
                    Origin: {batch.sourceOrg} ({batch.collectionFacility})
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-sm text-[#26352E]">
                  {formatWeight(batch.grossWeight)}
                </span>
                <span className="text-[10px] text-[#8C9B93] block">Intake Weight</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
