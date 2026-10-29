import React from 'react'
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Eye,
  CheckCircle2,
  Copy,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'
import { EmptyState } from '../common/EmptyState'
import { formatWeight, truncateHash, formatDate } from '../../utils/formatters'
import { useBatchStore } from '../../hooks/useBatchStore'

export function AuditRecordTable({
  records = [],
  onInspectBatch,
  onGenerateReport,
  onVerifyOnChain,
  onCertifyAudit,
  verifyingBatchId = null,
}) {
  const { addToast } = useBatchStore()

  const copyHash = (hash, label) => {
    if (!hash) return
    navigator.clipboard?.writeText(hash)
    addToast({
      type: 'info',
      title: 'Hash Copied',
      message: `${label} copied to clipboard.`,
    })
  }

  if (records.length === 0) {
    return (
      <EmptyState
        title="No audit records match query"
        description="Try searching for a different batch identifier, cryptographic hash, or status."
      />
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
        <div>
          <h3 className="text-base font-semibold text-[#003B23]">
            Audited Consignments &amp; Cryptographic Proofs
          </h3>
          <p className="text-xs text-[#66756D]">
            Review immutably anchored batch state hashes, mass-balance proofs, and compliance flags
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#8C9B93]">
          {records.length} Consignments Listed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E3EAE5] text-[#8C9B93] text-[10px] uppercase font-mono tracking-wider">
              <th className="py-3 px-3">Batch Consignment</th>
              <th className="py-3 px-3">Gross Weight</th>
              <th className="py-3 px-3">Origin / Facility</th>
              <th className="py-3 px-3">Ledger Transaction Hash</th>
              <th className="py-3 px-3">SHA-256 Evidence Digest</th>
              <th className="py-3 px-3">Audit Verdict</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F7F5]">
            {records.map((rec) => {
              const isVerifying = verifyingBatchId === rec.batchId
              const hasTxHash = Boolean(rec.blockchainHash && rec.blockchainHash.length > 10)

              return (
                <tr key={rec.batchId} className="hover:bg-[#FAFCFA] transition-colors">
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onInspectBatch(rec.batchId)}
                      className="font-mono font-bold text-[#176B45] hover:underline block text-left"
                    >
                      {rec.batchId}
                    </button>
                    {rec.versionedBatchId && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-semibold inline-block mb-0.5">
                        {rec.versionedBatchId}
                      </span>
                    )}
                    <span className="text-[11px] text-[#66756D] block">{rec.category}</span>
                  </td>

                  <td className="py-3 px-3 font-mono font-semibold text-[#26352E]">
                    {formatWeight(rec.grossWeight)}
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-medium text-[#26352E] truncate max-w-[150px]">
                      {rec.sourceOrg}
                    </div>
                    <div className="text-[10px] text-[#8C9B93]">{formatDate(rec.collectionDate)}</div>
                  </td>

                  <td className="py-3 px-3">
                    {hasTxHash ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#26352E]">
                          <span>{truncateHash(rec.blockchainHash, 6, 4)}</span>
                          <button
                            type="button"
                            onClick={() => copyHash(rec.blockchainHash, 'Tx Hash')}
                            className="p-0.5 text-[#8C9B93] hover:text-[#176B45] cursor-pointer"
                            title="Copy Tx Hash"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {(rec.blockchainChainId === 11155111 || rec.blockchainNetwork?.includes('Sepolia')) && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${rec.blockchainTx || rec.blockchainHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-600 hover:text-purple-800 p-0.5"
                              title="View on Sepolia Etherscan"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {rec.blockchainChainId === 11155111 || rec.blockchainNetwork?.includes('Sepolia') ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                              Sepolia (11155111)
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Local (31337)
                            </span>
                          )}
                          {rec.blockchainBlockNumber && (
                            <span className="text-[9px] font-mono text-gray-400">
                              #{rec.blockchainBlockNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-[#8C9B93] bg-[#F4F7F5] px-2 py-0.5 rounded border border-[#E3EAE5]">
                        Unanchored
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    {rec.evidenceHash ? (
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#66756D]">
                        <span>{truncateHash(rec.evidenceHash, 6, 4)}</span>
                        <button
                          type="button"
                          onClick={() => copyHash(rec.evidenceHash, 'Evidence Digest')}
                          className="p-0.5 text-[#8C9B93] hover:text-[#176B45]"
                          title="Copy Digest"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#8C9B93] italic">No hash</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <StatusBadge status={rec.auditStatus} size="xs" />
                    {rec.mismatchDetails?.reason ? (
                      <p className="text-[10px] text-[#D94F4F] mt-0.5 line-clamp-1 max-w-[180px]" title={rec.mismatchDetails.reason}>
                        Consensus digest mismatch
                      </p>
                    ) : rec.flagReason ? (
                      <p className="text-[10px] text-[#D94F4F] mt-0.5 line-clamp-1 max-w-[180px]">
                        {rec.flagReason}
                      </p>
                    ) : null}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {/* Verify On-Chain CTA */}
                      <button
                        type="button"
                        onClick={() => onVerifyOnChain && onVerifyOnChain(rec)}
                        disabled={isVerifying}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors border border-[#BFDBFE] disabled:opacity-50 cursor-pointer"
                        title="Verify against live smart contract registry"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#1E40AF]" />
                        ) : (
                          <ShieldCheck className="w-3 h-3 text-[#1E40AF]" />
                        )}
                        <span>{isVerifying ? 'Checking...' : 'Verify'}</span>
                      </button>

                      {/* Certify Audit CTA if batch processed */}
                      {rec.status === 'Processed' && rec.auditStatus !== 'Verified' && onCertifyAudit && (
                        <button
                          type="button"
                          onClick={() => onCertifyAudit(rec.batchId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 cursor-pointer shadow-xs"
                          title="Certify Final Regulatory Audit under CPCB Standard"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />
                          <span>Certify Audit</span>
                        </button>
                      )}

                      {/* Certificate Modal CTA */}
                      <button
                        type="button"
                        onClick={() => onGenerateReport(rec.batchId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#176B45] bg-[#E8F5EE] hover:bg-[#C2E3D0] rounded-lg transition-colors border border-[#C2E3D0] cursor-pointer"
                        title="Generate Official Audit Certificate"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Certificate</span>
                      </button>

                      {/* Inspect Dossier CTA */}
                      <button
                        type="button"
                        onClick={() => onInspectBatch(rec.batchId)}
                        className="p-1.5 text-[#66756D] hover:text-[#176B45] hover:bg-[#F4F7F5] rounded-lg transition-colors cursor-pointer"
                        title="Inspect Batch Dossier & Audit Trail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
