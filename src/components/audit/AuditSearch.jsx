import React from 'react'
import { Search, Filter, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react'
import { SearchBar } from '../common/SearchBar'

const AUDIT_STATUSES = [
  'ALL',
  'Verified',
  'Anchored',
  'Pending Verification',
  'Discrepancy Detected',
  'Duplicate Claim',
]

export function AuditSearch({ query, onQueryChange, activeStatus, onStatusChange }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#003B23]">
            Auditor Search &amp; Cryptographic Query Engine
          </h3>
          <p className="text-xs text-[#66756D]">
            Query across batch IDs, origin entities, SHA-256 evidence digests, and consensus blocks
          </p>
        </div>
      </div>

      <SearchBar
        value={query}
        onChange={onQueryChange}
        placeholder="Query batch ID, transaction hash, evidence hash, or facility name..."
      />

      {/* Filter status badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] font-mono uppercase text-[#8C9B93] mr-1">Filter By:</span>
        {AUDIT_STATUSES.map((status) => {
          const isActive = activeStatus === status
          return (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#176B45] text-white shadow-xs'
                  : 'bg-[#FAFCFA] hover:bg-[#F4F7F5] text-[#66756D] border border-[#E3EAE5]'
              }`}
            >
              {status === 'ALL' ? 'All Records' : status}
            </button>
          )
        })}
      </div>
    </div>
  )
}
