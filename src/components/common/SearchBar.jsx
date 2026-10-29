import React from 'react'
import { Search, X } from 'lucide-react'

export function SearchBar({ value, onChange, placeholder = 'Search by batch ID, organization, or hash...', className = '' }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-[#66756D] absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2 text-sm bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] placeholder:text-[#8C9B93] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45] transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 p-0.5 text-[#8C9B93] hover:text-[#26352E] rounded-md transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
