import React, { useState } from 'react'
import { X, Scale, AlertTriangle, CheckCircle2, ShieldAlert, Building2 } from 'lucide-react'

export function ConfirmRecyclerIntakeModal({ isOpen, batchId, handover, onClose, onSubmit }) {
  const dispatchWeight = Number(handover?.dispatchWeight || 0)
  const recyclerName = handover?.receiver || 'Certified Recycler Facility'
  
  const [measuredWeight, setMeasuredWeight] = useState(
    handover?.receivedWeight !== null && handover?.receivedWeight !== undefined
      ? String(handover.receivedWeight)
      : String(dispatchWeight)
  )
  const [scaleSlipId, setScaleSlipId] = useState(`SLIP-REC-${Math.floor(1000 + Math.random() * 9000)}`)
  const [scaleCalibrationDetails, setScaleCalibrationDetails] = useState('Certified Industrial Scale (IS 1436:2002 / NABL Accredited)')
  const [operatorName, setOperatorName] = useState('Recycler Intake Supervisor')
  const [cpcbAcknowledged, setCpcbAcknowledged] = useState(true)
  const [actorNotes, setActorNotes] = useState('Physical intake verified and custody accepted at certified processing facility.')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const numMeasured = Number(measuredWeight) || 0
  const variance = Number((numMeasured - dispatchWeight).toFixed(2))
  const absVariance = Math.abs(variance)
  const isDiscrepant = absVariance > 0.5

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!measuredWeight || numMeasured <= 0 || !cpcbAcknowledged) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        receivedWeight: numMeasured,
        scaleSlipId: scaleSlipId.trim(),
        scaleCalibrationDetails: scaleCalibrationDetails.trim(),
        operatorName: operatorName.trim(),
        actorNotes: actorNotes.trim(),
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isDiscrepant ? 'bg-[#FDF2F2] text-[#D94F4F]' : 'bg-[#E8F5EE] text-[#176B45]'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Confirm Recycler Intake</h3>
              <p className="text-[11px] font-mono text-gray-500">Consignment: {batchId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Assigned Recycler:</span>
              <span className="font-semibold text-gray-800">{recyclerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Manifest Dispatch Weight:</span>
              <span className="font-mono font-bold text-[#176B45]">{dispatchWeight} kg</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-800 mb-1">
              Physical Intake Weighbridge Scale (kg) <span className="text-[#D94F4F]">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                required
                value={measuredWeight}
                onChange={(e) => setMeasuredWeight(e.target.value)}
                className={`w-full px-3 py-2 text-xs font-mono bg-white border rounded-xl text-gray-800 focus:outline-none focus:ring-2 ${
                  isDiscrepant
                    ? 'border-[#D94F4F] focus:ring-[#D94F4F]/20'
                    : 'border-[#176B45] focus:ring-[#176B45]/20'
                }`}
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-gray-400">kg</span>
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
                <div className="p-2.5 rounded-xl bg-[#E8F5EE] border border-[#C2E3D0] text-xs text-[#176B45] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Variance {variance > 0 ? `+${variance}` : variance} kg is within statutory ±0.5 kg tolerance limit.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Weighbridge Slip ID</label>
              <input
                type="text"
                required
                value={scaleSlipId}
                onChange={(e) => setScaleSlipId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E3EAE5] rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#176B45]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Intake Inspector Name</label>
              <input
                type="text"
                required
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#176B45]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Scale Calibration Standard</label>
            <input
              type="text"
              value={scaleCalibrationDetails}
              onChange={(e) => setScaleCalibrationDetails(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#176B45]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Intake Verification Notes</label>
            <textarea
              rows={2}
              value={actorNotes}
              onChange={(e) => setActorNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 resize-none"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={cpcbAcknowledged}
              onChange={(e) => setCpcbAcknowledged(e.target.checked)}
              className="mt-0.5 rounded text-[#176B45] focus:ring-[#176B45]"
            />
            <span className="text-gray-700">
              I certify that physical intake inspection has been performed at the registered facility under CPCB guidelines and weight measurements comply with statutory mass balance standards.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3EAE5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !cpcbAcknowledged || numMeasured <= 0}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isDiscrepant
                  ? 'bg-[#D94F4F] hover:bg-[#B83E3E]'
                  : 'bg-[#176B45] hover:bg-[#003B23]'
              }`}
            >
              {isSubmitting ? 'Verifying Intake...' : isDiscrepant ? 'Flag Discrepancy & Intake' : 'Confirm Intake & Activate Recovery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
