import React, { useState } from 'react'
import { X, Truck, ShieldCheck } from 'lucide-react'

const PRESET_TRANSPORTERS = [
  { name: 'VoltHaul Logistics (KA-01-AJ-8820)', vehicle: 'KA-01-AJ-8820' },
  { name: 'CleanRoute Transporters (KA-05-MM-3100)', vehicle: 'KA-05-MM-3100' },
  { name: 'EcoLogistics Fleet (KA-04-E-9041)', vehicle: 'KA-04-E-9041' },
  { name: 'GreenTransit Freight (KA-02-B-7712)', vehicle: 'KA-02-B-7712' },
]

export function AssignTransporterModal({ isOpen, batchId, handover, onClose, onSubmit }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_TRANSPORTERS[0].name)
  const [customName, setCustomName] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState(PRESET_TRANSPORTERS[0].vehicle)
  const [notes, setNotes] = useState('GPS route locked. Manifest Form 6 generated.')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handlePresetChange = (name) => {
    setSelectedPreset(name)
    if (name === 'CUSTOM') {
      setVehicleNumber('')
    } else {
      const found = PRESET_TRANSPORTERS.find(t => t.name === name)
      if (found) setVehicleNumber(found.vehicle)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalTransporter = selectedPreset === 'CUSTOM' ? customName.trim() : selectedPreset
    if (!finalTransporter) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        transporterName: finalTransporter,
        vehicleNumber: vehicleNumber.trim(),
        notes: notes.trim(),
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const dispatchWeight = handover?.dispatchWeight || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] text-[#176B45] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#26352E]">Assign Authorized Transporter</h3>
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
            <span className="text-[#8C9B93]">Consignment Dispatch Weight:</span>
            <span className="font-mono font-bold text-[#176B45]">{dispatchWeight} kg</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Select Authorized Logistics Transporter <span className="text-[#D94F4F]">*</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
            >
              {PRESET_TRANSPORTERS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
              <option value="CUSTOM">+ Specify Other Transporter...</option>
            </select>
          </div>

          {selectedPreset === 'CUSTOM' && (
            <div>
              <label className="block text-xs font-medium text-[#26352E] mb-1">
                Transporter Company Name <span className="text-[#D94F4F]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SpeedEco Hauliers Ltd"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Vehicle Registration Number <span className="text-[#D94F4F]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. KA-01-AJ-8820"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Dispatch &amp; Manifest Notes
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Dispatching...' : 'Confirm Transporter & Dispatch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
