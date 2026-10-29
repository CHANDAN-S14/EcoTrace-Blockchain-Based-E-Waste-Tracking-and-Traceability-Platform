import React, { useState } from 'react'
import { X, Recycle, ShieldCheck, AlertCircle } from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'

export function AssignRecyclerModal({ isOpen, batchId, handover, onClose, onSubmit }) {
  const { facilities } = useBatchStore()
  const dispatchWeight = Number(handover?.dispatchWeight || 0)

  // Filter authorized recyclers with verified CPCB consent (excludes unverified collection points)
  const eligibleFacilities = (facilities || []).filter(f => {
    const isRecycler = !f.facilityType || f.facilityType === 'RECYCLER'
    const isVerified = f.licenceStatus === 'Active & Verified' || f.verificationStatus === 'VERIFIED'
    const notExpiring = !f.licenceStatus?.toLowerCase().includes('expiring')
    return isRecycler && isVerified && notExpiring
  })

  const [selectedFacilityId, setSelectedFacilityId] = useState(
    eligibleFacilities[0]?.facilityId || 'FAC-01'
  )
  const [notes, setNotes] = useState('Transfer manifest initiated under CPCB Rule 13.')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const selectedFacility = (facilities || []).find(f => f.facilityId === selectedFacilityId) || eligibleFacilities[0]
  const availableCapacity = selectedFacility ? (selectedFacility.capacityKgMonth || 0) - (selectedFacility.currentLoadKg || 0) : 0
  const hasCapacity = availableCapacity >= dispatchWeight

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFacility || !hasCapacity) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        facilityId: selectedFacility.facilityId,
        facilityName: selectedFacility.name,
        notes: notes.trim(),
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] text-[#176B45] flex items-center justify-center">
              <Recycle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#26352E]">Assign Certified Recycler</h3>
              <p className="text-[10px] font-mono text-[#66756D]">Consignment: {batchId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#66756D] hover:text-[#26352E] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] text-xs flex justify-between items-center">
            <span className="text-[#8C9B93]">Transfer Consignment Weight:</span>
            <span className="font-mono font-bold text-[#176B45]">{dispatchWeight} kg</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Select Authorized Certified Recycling Facility <span className="text-[#D94F4F]">*</span>
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
            >
              {(facilities || []).map((f) => {
                const avail = (f.capacityKgMonth || 0) - (f.currentLoadKg || 0)
                const isExpiring = f.licenceStatus && f.licenceStatus.toLowerCase().includes('expiring')
                return (
                  <option key={f.facilityId} value={f.facilityId} disabled={isExpiring || avail < dispatchWeight}>
                    {f.name} — Avail: {avail} kg {isExpiring ? '(Expiring Licence)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {selectedFacility && (
            <div className="p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5] space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8C9B93]">CPCB Licence:</span>
                <span className="font-mono font-semibold text-[#26352E]">{selectedFacility.licenceNumber}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8C9B93]">Available Monthly Capacity:</span>
                <span className={`font-mono font-semibold ${hasCapacity ? 'text-[#176B45]' : 'text-[#D94F4F]'}`}>
                  {availableCapacity} kg
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8C9B93]">Location:</span>
                <span className="text-[#26352E] truncate max-w-[200px]">{selectedFacility.location}</span>
              </div>
            </div>
          )}

          {!hasCapacity && (
            <div className="p-2.5 rounded-xl bg-[#FDF2F2] border border-[#F8B4B4] text-xs text-[#D94F4F] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Insufficient facility capacity for this consignment.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Recycler Intake / Transfer Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3EAE5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-[#66756D] hover:bg-[#FAFCFA] rounded-xl transition-colors border border-[#E3EAE5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasCapacity}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Assigning...' : 'Assign Recycler & Transfer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
