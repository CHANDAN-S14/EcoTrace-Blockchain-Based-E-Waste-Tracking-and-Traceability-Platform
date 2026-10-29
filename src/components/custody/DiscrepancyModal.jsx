import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

export function DiscrepancyModal({ isOpen, batchId, handover, onClose, onSubmit }) {
  const [reportedWeight, setReportedWeight] = useState(handover?.receivedWeight || '')
  const [reason, setReason] = useState('Weighbridge scale discrepancy exceeding certified ±0.5% tolerance.')
  const [evidenceNote, setEvidenceNote] = useState('Physical weigh slip re-measured at dock scale. Attached digital tare log.')

  if (!isOpen || !handover) return null

  const dispatchWeight = handover.dispatchWeight || 0
  const variance = reportedWeight ? Number(reportedWeight) - dispatchWeight : 0

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      reportedWeight: Number(reportedWeight),
      reason,
      evidenceNote,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FDF2F2] text-[#D94F4F] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#26352E]">Report Custody Discrepancy</h3>
              <p className="text-[10px] font-mono text-[#66756D]">{batchId} • Stage: {handover.stage}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#66756D] hover:text-[#26352E] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] text-xs">
            <span className="text-[#8C9B93]">Dispatch Origin Weight:</span>
            <span className="font-mono font-bold text-[#26352E] ml-2">{dispatchWeight} kg</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Actual Physical Measured Weight (kg) <span className="text-[#D94F4F]">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                required
                value={reportedWeight}
                onChange={(e) => setReportedWeight(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#D94F4F]/20 focus:border-[#D94F4F]"
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-[#8C9B93]">kg</span>
            </div>
            {variance !== 0 && (
              <p className="text-[11px] font-mono text-[#D94F4F] mt-1 font-semibold">
                Unaccounted Variance: {variance > 0 ? `+${variance.toFixed(1)}` : variance.toFixed(1)} kg
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Discrepancy Classification / Reason <span className="text-[#D94F4F]">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#D94F4F]/20 focus:border-[#D94F4F]"
            >
              <option value="Weighbridge scale discrepancy exceeding certified ±0.5% tolerance.">
                Weight Discrepancy &gt; 0.5%
              </option>
              <option value="Damaged security seals / tampered pallet strapping noted upon arrival.">
                Tampered Security Seals / Packaging
              </option>
              <option value="Moisture leakage or wet contamination altering tare weight.">
                Environmental / Moisture Contamination
              </option>
              <option value="Physical mismatch in manifest category (e.g. consumer scrap instead of PCBs).">
                Manifest Category Mismatch
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Inspector Notes &amp; Supporting Document Reference
            </label>
            <textarea
              rows={2}
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#D94F4F]/20 focus:border-[#D94F4F]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#D94F4F] hover:bg-[#B91C1C] rounded-xl transition-colors shadow-xs"
            >
              Anchor Discrepancy Flag
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
