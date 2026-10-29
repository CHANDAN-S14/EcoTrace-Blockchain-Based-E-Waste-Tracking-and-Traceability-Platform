import React from 'react'
import {
  X,
  Clock,
  ShieldCheck,
  Building,
  Scale,
  Calendar,
  Truck,
  Recycle,
  FileText,
  Copy,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'
import { formatWeight, formatDate, truncateHash } from '../../utils/formatters'
import { useBatchStore } from '../../hooks/useBatchStore'

export function BatchAuditHistoryModal({ isOpen, batch, onClose, onVerifyOnChain, onGenerateCertificate }) {
  const { addToast } = useBatchStore()

  if (!isOpen || !batch) return null

  const copyToClipboard = (text, label) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    addToast({
      type: 'info',
      title: 'Copied',
      message: `${label} copied to clipboard.`,
    })
  }

  const batchId = batch.batchId || batch.id
  const handovers = batch.handovers || []
  const auditTrail = batch.auditTrail || []
  const recovery = batch.recovery || batch.processingData || null
  const sorting = batch.sortingBreakdown || null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs p-5 border-b border-[#E3EAE5] flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#E8F5EE] text-[#176B45] rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#003B23]">
                  Consignment Audit Trail &amp; Provenance
                </h3>
                <span className="text-xs font-mono font-bold text-[#176B45]">
                  {batchId}
                </span>
              </div>
              <p className="text-xs text-[#66756D]">
                Chronological chain of custody, mass balance proofs, and ledger anchors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onVerifyOnChain && onVerifyOnChain(batch)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-lg transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify On-Chain</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#66756D] hover:text-[#26352E] hover:bg-[#F4F7F5] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs text-[#26352E]">
          {/* Summary Overview Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAFCFA] p-4 rounded-xl border border-[#E3EAE5]">
            <div>
              <span className="text-[10px] font-mono text-[#8C9B93] uppercase block">Gross Input</span>
              <strong className="text-sm font-mono text-[#26352E]">
                {formatWeight(batch.grossWeight)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#8C9B93] uppercase block">Material Stream</span>
              <span className="font-semibold text-[#26352E]">{batch.category || 'Mixed E-Waste'}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#8C9B93] uppercase block">Collection Date</span>
              <span className="font-mono text-[#26352E]">{formatDate(batch.collectionDate)}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#8C9B93] uppercase block">Audit Status</span>
              <StatusBadge status={batch.auditStatus || batch.status} size="xs" />
            </div>
          </div>

          {/* Step 1: Genesis Intake & Registration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-[#E3EAE5]">
              <span className="w-5 h-5 rounded-full bg-[#176B45] text-white flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              <h4 className="font-semibold text-[#003B23] text-xs">
                Intake &amp; Physical Weighed Consignment
              </h4>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#E3EAE5] space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[#66756D]">Origin Organization:</span>{' '}
                  <strong className="text-[#26352E]">{batch.sourceOrg || 'Commercial Entity'}</strong>
                </div>
                <div>
                  <span className="text-[#66756D]">Intake Hub:</span>{' '}
                  <strong className="text-[#26352E]">{batch.collectionFacility || 'CPCB Bangalore Central Hub'}</strong>
                </div>
                <div>
                  <span className="text-[#66756D]">Scale Reading:</span>{' '}
                  <strong className="font-mono text-[#176B45]">{formatWeight(batch.grossWeight)}</strong>
                </div>
                <div>
                  <span className="text-[#66756D]">Logged By:</span>{' '}
                  <strong className="text-[#26352E]">{batch.assignedHandler || 'Authorized Field Sorter'}</strong>
                </div>
              </div>

              {batch.evidenceHash && (
                <div className="p-2 bg-[#FAFCFA] rounded-lg border border-[#E3EAE5] flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#66756D] truncate mr-2">
                    Evidence SHA-256: {batch.evidenceHash}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(batch.evidenceHash, 'Evidence Digest')}
                    className="text-[#176B45] hover:underline shrink-0"
                  >
                    Copy
                  </button>
                </div>
              )}

              {Array.isArray(batch.evidenceFiles) && batch.evidenceFiles.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#003B23] block">
                    Attached Evidence Documents ({batch.evidenceFiles.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {batch.evidenceFiles.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#E8F5EE] border border-[#E3EAE5] hover:border-[#176B45] rounded-lg text-[10px] text-[#26352E] transition-colors"
                      >
                        <FileText className="w-3 h-3 text-[#176B45]" />
                        <span className="truncate max-w-[150px]" title={file.name}>{file.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-[#8C9B93]" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Sorting Breakdown (if mixed e-waste) */}
          {sorting && sorting.categories && sorting.categories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1 border-b border-[#E3EAE5]">
                <span className="w-5 h-5 rounded-full bg-[#3978C5] text-white flex items-center justify-center font-bold text-[10px]">
                  2
                </span>
                <h4 className="font-semibold text-[#003B23] text-xs">
                  Intake Sorting &amp; Material Breakdown Reconciled
                </h4>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E3EAE5] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#66756D]">Sorted by: <strong>{sorting.sortedBy || 'Facility Sorter'}</strong></span>
                  <span className="font-mono text-[10px] text-[#8C9B93]">
                    {sorting.sortedAt ? formatDate(sorting.sortedAt) : 'Sorted on Intake'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                  {sorting.categories.map((c, idx) => (
                    <div key={idx} className="p-2 bg-[#FAFCFA] rounded-lg border border-[#E3EAE5] text-[11px] flex justify-between">
                      <span className="text-[#66756D] truncate">{c.category}:</span>
                      <strong className="font-mono text-[#26352E] ml-1">{c.weightKg} kg</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Chain of Custody Handovers */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-[#E3EAE5]">
              <span className="w-5 h-5 rounded-full bg-[#E9A23B] text-white flex items-center justify-center font-bold text-[10px]">
                3
              </span>
              <h4 className="font-semibold text-[#003B23] text-xs">
                Chain of Custody Handover Verifications ({handovers.length})
              </h4>
            </div>

            {handovers.length === 0 ? (
              <p className="text-[#8C9B93] italic p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
                No intermediary handovers recorded yet. Consignment pending transit dispatch.
              </p>
            ) : (
              <div className="space-y-2">
                {handovers.map((ho, idx) => (
                  <div key={idx} className="p-3.5 bg-white rounded-xl border border-[#E3EAE5] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#26352E]">{ho.stage}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${ho.status === 'Accepted' ? 'bg-[#E8F5EE] text-[#176B45] border-[#C2E3D0]' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {ho.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#66756D]">
                      <span>{ho.sender}</span>
                      <ArrowRight className="w-3 h-3 text-[#8C9B93]" />
                      <span>{ho.receiver}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-[#F4F7F5]">
                      <div>
                        <span className="text-[#8C9B93]">Dispatch: </span>
                        <strong className="font-mono text-[#26352E]">{ho.dispatchWeight} kg</strong>
                      </div>
                      <div>
                        <span className="text-[#8C9B93]">Received: </span>
                        <strong className="font-mono text-[#26352E]">{ho.receivedWeight != null ? `${ho.receivedWeight} kg` : 'In transit'}</strong>
                      </div>
                      {ho.txHash && (
                        <div className="truncate">
                          <span className="text-[#8C9B93]">Tx: </span>
                          <span className="font-mono text-[10px] text-[#176B45]">{truncateHash(ho.txHash, 6, 4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 4: Metallurgical Recovery & Mass Balance Proof */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-[#E3EAE5]">
              <span className="w-5 h-5 rounded-full bg-[#176B45] text-white flex items-center justify-center font-bold text-[10px]">
                4
              </span>
              <h4 className="font-semibold text-[#003B23] text-xs">
                Smelting Mass-Balance Proof &amp; Yield Certification
              </h4>
            </div>

            {recovery ? (
              <div className="p-4 bg-white rounded-xl border border-[#E3EAE5] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-[#26352E]">{recovery.facility}</strong>
                    <p className="text-[10px] text-[#66756D]">Certified Recovery Record: {recovery.claimId || 'CLM-REC'}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${recovery.validationStatus === 'Reconciled' ? 'bg-[#E8F5EE] text-[#176B45] border-[#C2E3D0]' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {recovery.validationStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#FAFCFA] p-3 rounded-lg border border-[#E3EAE5]">
                  <div>
                    <span className="text-[#8C9B93] block">Input Weight:</span>
                    <strong className="font-mono">{recovery.inputWeight || batch.grossWeight} kg</strong>
                  </div>
                  <div>
                    <span className="text-[#8C9B93] block">Certified Yield:</span>
                    <strong className="font-mono text-[#176B45]">{recovery.recoveryYield || '—'}%</strong>
                  </div>
                  <div>
                    <span className="text-[#8C9B93] block">Residual Waste:</span>
                    <strong className="font-mono">{recovery.residualWaste || recovery.remainingWaste || 0} kg</strong>
                  </div>
                  <div>
                    <span className="text-[#8C9B93] block">Explained Loss:</span>
                    <strong className="font-mono">{recovery.explainedLoss || 0} kg</strong>
                  </div>
                </div>

                {recovery.materials && (
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-bold text-[#8C9B93] block mb-1">
                      Recovered Secondary Raw Materials:
                    </span>
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                      {Object.entries(recovery.materials).map(([mat, wt]) => (
                        Number(wt) > 0 && (
                          <span key={mat} className="px-2 py-1 rounded bg-[#E8F5EE] border border-[#C2E3D0] text-[#176B45]">
                            {mat}: <strong>{wt} kg</strong>
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[#8C9B93] italic p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
                Recovery processing record pending. Mass balance statement will be anchored upon metallurgical extraction.
              </p>
            )}
          </div>

          {/* Step 5: Immutable Blockchain Anchor Log */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-[#E3EAE5]">
              <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-[10px]">
                5
              </span>
              <h4 className="font-semibold text-[#003B23] text-xs">
                Blockchain Anchors &amp; Audit Log Trail
              </h4>
            </div>

            <div className="p-3.5 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-2">
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[#66756D]">Consensus Block Tx Hash:</span>
                    {batch.blockchainChainId === 11155111 || batch.blockchainNetwork?.includes('Sepolia') ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                        Sepolia (11155111)
                      </span>
                    ) : batch.blockchainHash ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Local EVM (31337)
                      </span>
                    ) : null}
                    {batch.blockchainBlockNumber && (
                      <span className="text-[9px] font-mono text-gray-400">
                        Block #{batch.blockchainBlockNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(batch.blockchainChainId === 11155111 || batch.blockchainNetwork?.includes('Sepolia')) && batch.blockchainHash && (
                      <a
                        href={batch.blockchainExplorerUrl || `https://sepolia.etherscan.io/tx/${batch.blockchainTx || batch.blockchainHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 hover:text-purple-800 text-[10px] inline-flex items-center gap-0.5"
                      >
                        Etherscan <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {batch.blockchainHash && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(batch.blockchainHash, 'Tx Hash')}
                        className="text-[#176B45] hover:underline text-[10px]"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-[#E3EAE5] text-[#176B45] font-bold break-all">
                  {batch.blockchainHash || 'Consignment awaiting on-chain registration'}
                </div>
              </div>

              {/* Anchor History across networks */}
              {Array.isArray(batch.blockchainAnchorHistory) && batch.blockchainAnchorHistory.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-[#8C9B93] block mb-1">
                    Multi-Chain Anchor Records ({batch.blockchainAnchorHistory.length}):
                  </span>
                  <div className="space-y-1 font-mono text-[10px]">
                    {batch.blockchainAnchorHistory.map((h, hIdx) => (
                      <div key={hIdx} className="p-2 bg-white rounded-lg border border-[#E3EAE5] flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate mr-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${h.chainId === 11155111 ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {h.network || `Chain ${h.chainId}`}
                          </span>
                          <span className="text-[#26352E] truncate">{truncateHash(h.txHash, 6, 4)}</span>
                          {h.blockNumber && <span className="text-gray-400">#{h.blockNumber}</span>}
                        </div>
                        {h.explorerUrl && (
                          <a
                            href={h.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-600 hover:text-purple-800 shrink-0 inline-flex items-center gap-0.5"
                          >
                            Scan <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {auditTrail.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-[#8C9B93] block mb-1.5">
                    Immutable Audit Events Trail:
                  </span>
                  <div className="space-y-1 font-mono text-[10px]">
                    {auditTrail.map((ev, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-[#E3EAE5] flex items-center justify-between">
                        <div>
                          <strong className="text-[#003B23]">{ev.eventType}</strong>
                          <span className="text-[#8C9B93] ml-2">by {ev.actor}</span>
                        </div>
                        <span className="text-[#8C9B93]">{formatDate(ev.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAFCFA] border-t border-[#E3EAE5] flex items-center justify-between">
          <button
            type="button"
            onClick={() => onGenerateCertificate && onGenerateCertificate(batchId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#176B45] bg-[#E8F5EE] hover:bg-[#C2E3D0] rounded-xl transition-colors border border-[#C2E3D0] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Official Certificate</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors cursor-pointer"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  )
}
