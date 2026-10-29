import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, X, Check, Boxes, AlertTriangle } from 'lucide-react'

export function BatchSearchCombobox({
  batches = [],
  selectedBatchId = '',
  onSelectBatch,
  placeholder = 'Search batch ID, weight, or waste type (e.g. EW-2026-00095)...',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Find currently selected batch object
  const currentBatch = useMemo(() => {
    if (!selectedBatchId) return null
    return batches.find(b => (b.batchId || b.id) === selectedBatchId) || null
  }, [batches, selectedBatchId])

  // Filter batches based on user search term
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return batches

    return batches.filter(b => {
      const bId = (b.batchId || b.id || '').toLowerCase()
      const category = (b.category || b.collectionType || '').toLowerCase()
      const weight = String(b.grossWeight || '')
      const sourceOrg = (b.sourceOrg || '').toLowerCase()
      const facility = (b.collectionFacility || '').toLowerCase()
      const status = (b.status || '').toLowerCase()

      return (
        bId.includes(term) ||
        category.includes(term) ||
        weight.includes(term) ||
        sourceOrg.includes(term) ||
        facility.includes(term) ||
        status.includes(term)
      )
    })
  }, [batches, searchTerm])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (batch) => {
    const bId = batch.batchId || batch.id
    onSelectBatch(bId)
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onSelectBatch('')
    setSearchTerm('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Display label for selected batch matching required format:
  // BATCH-ID — WEIGHT kg (WASTE TYPE)
  const selectedLabel = currentBatch
    ? `${currentBatch.batchId || currentBatch.id} — ${currentBatch.grossWeight || 0} kg (${currentBatch.category || currentBatch.collectionType || 'Mixed E-Waste'})`
    : ''

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Combobox Input Trigger */}
      <div
        onClick={() => {
          setIsOpen(true)
          if (inputRef.current) inputRef.current.focus()
        }}
        className={`flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border rounded-xl text-xs transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'border-[#176B45] ring-2 ring-[#176B45]/20 shadow-sm'
            : currentBatch
            ? 'border-[#C2E3D0] bg-[#FAFCFA]'
            : 'border-[#E3EAE5] hover:border-[#C2E3D0]'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Search className={`w-4 h-4 shrink-0 transition-colors ${isOpen ? 'text-[#176B45]' : 'text-gray-400'}`} />

          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={selectedLabel || placeholder}
              className="w-full bg-transparent border-0 p-0 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 font-mono"
              autoFocus
            />
          ) : currentBatch ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-bold text-[#176B45] truncate">
                {currentBatch.batchId || currentBatch.id}
              </span>
              <span className="text-gray-400">—</span>
              <span className="font-mono font-medium text-gray-700 shrink-0">
                {currentBatch.grossWeight || 0} kg
              </span>
              <span className="text-gray-500 truncate">
                ({currentBatch.category || currentBatch.collectionType || 'Mixed E-Waste'})
              </span>
            </div>
          ) : (
            <span className="text-gray-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentBatch && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#176B45]' : ''}`} />
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E3EAE5] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Quick Header */}
          <div className="px-3 py-2 bg-[#FAFCFA] border-b border-[#F0F4F2] flex items-center justify-between text-[11px] text-[#66756D]">
            <span className="font-semibold text-[#003B23]">
              Available Consignments ({filteredOptions.length})
            </span>
            <span className="font-mono text-[10px] text-gray-400">
              Format: BATCH-ID — WEIGHT kg (WASTE TYPE)
            </span>
          </div>

          {/* Options Scroll Container */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#F4F7F5] overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-500">
                <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">No matching batches found</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Try searching by ID, weight (e.g. 1000), or category
                </p>
              </div>
            ) : (
              filteredOptions.map((batch) => {
                const bId = batch.batchId || batch.id
                const isSelected = (currentBatch?.batchId || currentBatch?.id) === bId
                const weight = batch.grossWeight || 0
                const wasteType = batch.category || batch.collectionType || 'Mixed E-Waste'
                const isFlagged = batch.status === 'Flagged Discrepancy'

                return (
                  <div
                    key={bId}
                    onClick={() => handleSelect(batch)}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#E8F5EE] text-[#003B23]'
                        : isFlagged
                        ? 'hover:bg-[#FDF2F2]'
                        : 'hover:bg-[#F4F7F5]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        isFlagged
                          ? 'bg-red-500'
                          : batch.status === 'Audited'
                          ? 'bg-emerald-600'
                          : batch.status === 'In Transit'
                          ? 'bg-amber-500'
                          : 'bg-[#176B45]'
                      }`} />

                      <div className="truncate">
                        {/* Required exact format: BATCH-ID — WEIGHT kg (WASTE TYPE) */}
                        <div className="font-mono flex items-center gap-1.5 flex-wrap">
                          <strong className="text-gray-900 font-bold">{bId}</strong>
                          <span className="text-gray-400 font-normal">—</span>
                          <span className="font-semibold text-gray-800">{weight} kg</span>
                          <span className="text-gray-600 font-sans font-normal">({wasteType})</span>
                        </div>

                        {batch.sourceOrg && (
                          <p className="text-[10px] text-gray-500 truncate mt-0.5 font-sans">
                            {batch.sourceOrg} {batch.collectionFacility ? `• ${batch.collectionFacility}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isFlagged
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : batch.status === 'Audited'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : batch.status === 'In Transit'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {batch.status}
                      </span>

                      {isSelected && (
                        <Check className="w-4 h-4 text-[#176B45]" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Footer */}
          <div className="px-3 py-1.5 bg-[#FAFCFA] border-t border-[#F0F4F2] text-[10px] text-gray-400 flex items-center justify-between">
            <span>Click any batch to load individual custody details</span>
            <span>{batches.length} total consignments in DB</span>
          </div>
        </div>
      )}
    </div>
  )
}
