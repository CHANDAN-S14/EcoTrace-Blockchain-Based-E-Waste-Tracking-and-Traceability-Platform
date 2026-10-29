import React, { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Download, Copy, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'

export function QrCodeModal({ batch, onClose }) {
  const { addToast } = useBatchStore()
  const qrRef = useRef(null)

  if (!batch) return null

  const verificationUrl = batch.qrCodeData || `https://ecotrace.system/verify/${batch.id}`

  const copyUrl = () => {
    navigator.clipboard?.writeText(verificationUrl)
    addToast({
      type: 'info',
      title: 'Link Copied',
      message: 'Batch verification URL copied to clipboard.',
    })
  }

  const downloadQrSvg = () => {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `EcoTrace_QR_${batch.id}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    addToast({
      type: 'success',
      title: 'QR Code Downloaded',
      message: `Vector QR stamp saved for ${batch.id}`,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-[#003B23]">{batch.id}</span>
            <span className="text-[10px] text-[#66756D]">Traceability QR Passport</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#66756D] hover:text-[#26352E] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Canvas/SVG representation */}
        <div className="flex flex-col items-center justify-center py-6" ref={qrRef}>
          <div className="p-4 bg-white rounded-2xl border-2 border-[#176B45]/20 shadow-md">
            <QRCodeSVG
              value={verificationUrl}
              size={180}
              level="H"
              fgColor="#003B23"
              bgColor="#FFFFFF"
            />
          </div>
          <span className="text-xs font-mono font-medium text-[#26352E] mt-3">{batch.id}</span>
          <span className="text-[11px] text-[#66756D]">{batch.category} • {batch.grossWeight} kg</span>
        </div>

        {/* Mandatory Transparency Disclaimer */}
        <div className="p-3 bg-[#FEF5E7] rounded-xl border border-[#FAD7A0] text-xs text-[#B8741A] mb-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#E9A23B]" />
            <p className="text-[11px] leading-tight">
              <strong>Notice:</strong> This QR code links to recorded batch identifiers. A QR code alone does not constitute physical authenticity or guarantee weighing truthfulness without independent physical audits.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={downloadQrSvg}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download SVG
          </button>
          <button
            onClick={copyUrl}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Link
          </button>
        </div>
      </div>
    </div>
  )
}
