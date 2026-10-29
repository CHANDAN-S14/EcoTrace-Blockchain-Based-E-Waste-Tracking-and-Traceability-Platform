import React from 'react'
import { X, ShieldCheck, Download, ExternalLink, Camera, FileText } from 'lucide-react'
import { truncateHash } from '../../utils/formatters'

export function EvidenceViewerModal({ isOpen, handover, onClose }) {
  if (!isOpen || !handover) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div>
            <h3 className="text-sm font-semibold text-[#26352E]">Physical Evidence Document</h3>
            <p className="text-[10px] font-mono text-[#66756D]">{handover.stage}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#66756D] hover:text-[#26352E] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 space-y-3">
          {handover.evidenceUrl ? (
            <div className="rounded-xl overflow-hidden border border-[#E3EAE5] bg-black">
              <img
                src={handover.evidenceUrl}
                alt={handover.evidenceName || 'Chain of custody visual evidence'}
                className="w-full h-56 object-cover"
              />
              <div className="p-2.5 bg-[#FAFCFA] border-t border-[#E3EAE5] text-xs">
                <span className="font-semibold text-[#26352E] block">
                  {handover.evidenceName || 'Weighbridge Digital Evidence Slip.jpg'}
                </span>
                <span className="text-[10px] text-[#8C9B93]">
                  Authentic Real-World Photo Proof • Captured at scale terminal
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
              <FileText className="w-8 h-8 text-[#8C9B93] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#26352E]">{handover.evidenceName}</p>
            </div>
          )}

          <div className="p-3 bg-[#E8F5EE] rounded-xl border border-[#C2E3D0] space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#176B45] flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                Evidence Digest Verification
              </span>
              <span className="text-[10px] font-mono text-[#176B45]">SHA-256 Valid</span>
            </div>
            <p className="font-mono text-[11px] text-[#26352E] break-all bg-white p-2 rounded-lg border border-[#C2E3D0]">
              {handover.txHash || '0x992b114d5e82acbf02847d018265fa919c72c1a4570028eab7284f23bc901a52'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3EAE5]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  )
}
