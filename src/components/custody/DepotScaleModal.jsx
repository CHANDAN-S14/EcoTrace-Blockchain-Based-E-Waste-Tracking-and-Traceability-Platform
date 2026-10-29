import React, { useState } from 'react'
import { X, Scale, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

export function DepotScaleModal({ isOpen, batchId, handover, onClose, onSubmit }) {
  const dispatchWeight = Number(handover?.dispatchWeight || 0)
  const [measuredWeight, setMeasuredWeight] = useState(
    handover?.receivedWeight !== null && handover?.receivedWeight !== undefined
      ? String(handover.receivedWeight)
      : String(dispatchWeight)
  )
  const [scaleSlipId, setScaleSlipId] = useState(`SLIP-DOCK-${Math.floor(1000 + Math.random() * 9000)}`)
  const [dockNotes, setDockNotes] = useState('Digital dock weighbridge verified with tare check.')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const numMeasured = Number(measuredWeight) || 0
  const variance = Number((numMeasured - dispatchWeight).toFixed(2))
  const absVariance = Math.abs(variance)
  const isDiscrepant = absVariance > 0.5

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!measuredWeight || numMeasured <= 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        receivedWeight: numMeasured,
        scaleSlipId: scaleSlipId.trim(),
        dockNotes: dockNotes.trim(),
        evidenceNote: isDiscrepant ? `Variance of ${variance} kg detected on slip ${scaleSlipId}` : '',
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
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDiscrepant ? 'bg-[#FDF2F2] text-[#D94F4F]' : 'bg-[#E8F5EE] text-[#176B45]'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#26352E]">Receiving Depot Dock Weighing</h3>
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
            <span className="text-[#8C9B93]">Origin Collection Dispatch Weight:</span>
            <span className="font-mono font-bold text-[#26352E]">{dispatchWeight} kg</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Independently Measured Dock Scale Weight (kg) <span className="text-[#D94F4F]">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                required
                value={measuredWeight}
                onChange={(e) => setMeasuredWeight(e.target.value)}
                className={`w-full px-3 py-2 text-xs font-mono bg-white border rounded-xl text-[#26352E] focus:outline-none focus:ring-2 ${
                  isDiscrepant
                    ? 'border-[#D94F4F] focus:ring-[#D94F4F]/20'
                    : 'border-[#176B45] focus:ring-[#176B45]/20'
                }`}
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-[#8C9B93]">kg</span>
            </div>

            {/* Dynamic Tolerance Comparison */}
            <div className="mt-2">
              {isDiscrepant ? (
                <div className="p-2.5 rounded-xl bg-[#FDF2F2] border border-[#F8B4B4] text-xs text-[#D94F4F] flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Tolerance Exceeded (|Δ| &gt; 0.5 kg)</strong>
                    <span>
                      Variance is {variance > 0 ? `+${variance}` : variance} kg. Consignment will be flagged for compliance audit.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-[#E8F5EE] border border-[#C2E3D0] text-xs text-[#176B45] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Variance is {variance > 0 ? `+${variance}` : variance} kg (within allowable ±0.5 kg tolerance limit).
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Dock Weighbridge Digital Slip # <span className="text-[#D94F4F]">*</span>
            </label>
            <input
              type="text"
              required
              value={scaleSlipId}
              onChange={(e) => setScaleSlipId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Inspector Notes / Scale Calibration Log
            </label>
            <textarea
              rows={2}
              value={dockNotes}
              onChange={(e) => setDockNotes(e.target.value)}
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
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors shadow-xs disabled:opacity-50 ${
                isDiscrepant
                  ? 'bg-[#D94F4F] hover:bg-[#B91C1C]'
                  : 'bg-[#176B45] hover:bg-[#003B23]'
              }`}
            >
              {isDiscrepant ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Flagging...' : 'Flag Discrepancy & Review'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Verifying...' : 'Verify Scale & Accept Custody'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
