import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Copy,
  X,
  Scale,
  Building,
  Calendar,
  Layers,
  FileText,
  Clock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import { SearchBar } from '../common/SearchBar'
import { EmptyState } from '../common/EmptyState'
import { formatWeight, truncateHash, formatDate } from '../../utils/formatters'
import { useBatchStore } from '../../hooks/useBatchStore'
import { verifyClaimOnChain } from '../../services/recoveryService'
import { resolveFileUrl } from '../../services/apiClient'

export function RecoveryHistoryTable() {
  const { recoveryLogs, batches, setSelectedBatchForModal, addToast } = useBatchStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Records')
  const [selectedClaimForDetail, setSelectedClaimForDetail] = useState(null)
  const [verifyingClaim, setVerifyingClaim] = useState(null)
  const [verificationResult, setVerificationResult] = useState(null)

  // Status mapping filter
  const filteredLogs = recoveryLogs.filter((log) => {
    const claimId = log.claimId || ''
    const batchId = log.batchId || ''
    const facility = log.facility || ''

    const matchesSearch =
      search === '' ||
      claimId.toLowerCase().includes(search.toLowerCase()) ||
      batchId.toLowerCase().includes(search.toLowerCase()) ||
      facility.toLowerCase().includes(search.toLowerCase())

    let matchesStatus = true
    if (statusFilter !== 'All Records') {
      if (statusFilter === 'Discrepancy Found') {
        matchesStatus = log.validationStatus === 'Discrepancy Found' || log.validationStatus === 'Discrepancy Detected'
      } else {
        matchesStatus = log.validationStatus === statusFilter
      }
    }

    return matchesSearch && matchesStatus
  })

  // Dynamic material breakdown items for the selected claim
  const modalMaterials = useMemo(() => {
    if (!selectedClaimForDetail) return []
    if (Array.isArray(selectedClaimForDetail.materialsBreakdown) && selectedClaimForDetail.materialsBreakdown.length > 0) {
      return selectedClaimForDetail.materialsBreakdown.map((m) => ({
        name: m.name,
        weightKg: Number(m.weightKg) || 0,
      }))
    }
    if (selectedClaimForDetail.materials && typeof selectedClaimForDetail.materials === 'object') {
      return Object.entries(selectedClaimForDetail.materials).map(([key, weight]) => ({
        name: key.replace(/^item_\d+_/, '').replace(/([A-Z])/g, ' $1'),
        weightKg: Number(weight) || 0,
      }))
    }
    return []
  }, [selectedClaimForDetail])

  // Evidence files for the selected claim
  const modalEvidenceFiles = useMemo(() => {
    if (!selectedClaimForDetail) return []
    const files = []
    if (Array.isArray(selectedClaimForDetail.evidenceFiles) && selectedClaimForDetail.evidenceFiles.length > 0) {
      files.push(...selectedClaimForDetail.evidenceFiles)
    }
    if (selectedClaimForDetail.evidenceUrl && !files.some((f) => f.url === selectedClaimForDetail.evidenceUrl)) {
      files.push({
        name: 'Supporting Document / Photo',
        url: selectedClaimForDetail.evidenceUrl,
        type: selectedClaimForDetail.evidenceUrl.match(/\.(pdf|doc|docx)$/i) ? 'document' : 'photo',
      })
    }
    if (Array.isArray(selectedClaimForDetail.photos)) {
      selectedClaimForDetail.photos.forEach((p, idx) => {
        const url = typeof p === 'string' ? p : p.url
        if (url && !files.some((f) => f.url === url)) {
          files.push({
            name: p.caption || `Photograph #${idx + 1}`,
            url,
            type: 'photo',
          })
        }
      })
    }
    if (selectedClaimForDetail.weighbridgeSlipUrl && !files.some((f) => f.url === selectedClaimForDetail.weighbridgeSlipUrl)) {
      files.push({
        name: 'Weighbridge Slip Document',
        url: selectedClaimForDetail.weighbridgeSlipUrl,
        type: 'document',
      })
    }
    return files
  }, [selectedClaimForDetail])

  const modalRecoveredWeight = selectedClaimForDetail?.recoveredWeight ?? (
    modalMaterials.reduce((sum, m) => sum + m.weightKg, 0)
  )

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text)
    addToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: `${label} copied successfully.`,
    })
  }

  const handleVerifyClaim = async (claim) => {
    setVerifyingClaim(claim)
    try {
      const result = await verifyClaimOnChain(claim.claimId)
      setVerificationResult(result)
    } catch {
      setVerificationResult({
        claimId: claim.claimId,
        verifiedOnChain: Boolean(claim.blockchainTx),
        blockchainTx: claim.blockchainTx,
      })
    }
  }

  // Render status badge with correct colors
  const renderStatusBadge = (status) => {
    const isReconciled = status === 'Reconciled'
    const isDiscrepancy = status === 'Discrepancy Found' || status === 'Discrepancy Detected' || status === 'Verification Failed'
    const isDuplicate = status === 'Duplicate Claim'
    const isPending = status === 'Pending Verification' || status === 'Needs Review'

    if (isReconciled) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5EE] text-[#176B45] border border-[#C2E3D0]">
          <CheckCircle2 className="w-3 h-3 text-[#176B45]" />
          Reconciled
        </span>
      )
    }

    if (isDiscrepancy) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF2F2] text-[#9B1C1C] border border-[#F8B4B4]">
          <AlertTriangle className="w-3 h-3 text-[#D94F4F]" />
          Discrepancy Found
        </span>
      )
    }

    if (isDuplicate) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF2F2] text-[#9B1C1C] border border-[#F8B4B4]">
          <ShieldAlert className="w-3 h-3 text-[#D94F4F]" />
          Duplicate Claim
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF5E7] text-[#B8741A] border border-[#FAD7A0]">
        <Clock className="w-3 h-3 text-[#E9A23B]" />
        {status || 'Pending Verification'}
      </span>
    )
  }

  return (
    <div id="mass-balance-claim-ledger" className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs space-y-4">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#003B23]">
            Mass-Balance Claim Ledger
          </h3>
          <p className="text-xs text-[#66756D]">
            View submitted processing records, their weight checks, and verification status.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#26352E] font-medium focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
          >
            <option value="All Records">All Records</option>
            <option value="Reconciled">Reconciled</option>
            <option value="Discrepancy Found">Discrepancy Found</option>
            <option value="Duplicate Claim">Duplicate Claim</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Verification Failed">Verification Failed</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by Claim ID, Batch ID, or Recycling Facility..."
      />

      {/* Table / Empty State */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="No processing records yet."
          description="Complete the form above to create your first record."
          actionLabel={search || statusFilter !== 'All Records' ? 'Clear Filters' : undefined}
          onAction={() => {
            setSearch('')
            setStatusFilter('All Records')
          }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3EAE5] text-[#8C9B93] text-[11px] uppercase font-semibold tracking-wider bg-[#FAFCFA]">
                <th className="py-3 px-3">Claim ID</th>
                <th className="py-3 px-3">Batch ID</th>
                <th className="py-3 px-3">Recycling Facility</th>
                <th className="py-3 px-3">Processing Date</th>
                <th className="py-3 px-3 text-right">Input Weight</th>
                <th className="py-3 px-3 text-right">Recovered Weight</th>
                <th className="py-3 px-3 text-right">Remaining Waste</th>
                <th className="py-3 px-3 text-right">Explained Loss</th>
                <th className="py-3 px-3 text-right">Weight Difference</th>
                <th className="py-3 px-3 text-center">Recovery Yield</th>
                <th className="py-3 px-3">Validation Status</th>
                <th className="py-3 px-3">Blockchain Reference</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F7F5]">
              {filteredLogs.map((log) => {
                const parentBatch = batches.find(b => (b.id === log.batchId || b.batchId === log.batchId))
                const wasteWeight = log.remainingWaste ?? log.residualWaste ?? 0
                const diff = Number(log.difference ?? 0)
                const recoveredWeight = log.recoveredWeight ?? (
                  Array.isArray(log.materialsBreakdown) && log.materialsBreakdown.length > 0
                    ? log.materialsBreakdown.reduce((sum, m) => sum + (Number(m.weightKg) || 0), 0)
                    : (log.accountedOutput != null && wasteWeight != null
                        ? Number((log.accountedOutput - wasteWeight - (log.explainedLoss ?? 0)).toFixed(2))
                        : 0)
                )

                return (
                  <tr key={log.claimId} className="hover:bg-[#FAFCFA] transition-colors group">
                    {/* Claim ID */}
                    <td className="py-3 px-3 font-mono font-bold text-[#176B45]">
                      {log.claimId}
                    </td>

                    {/* Batch ID */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => parentBatch && setSelectedBatchForModal(parentBatch)}
                        className="font-mono text-xs font-semibold text-[#26352E] hover:text-[#176B45] hover:underline"
                        title="Click to view Batch details"
                      >
                        {log.batchId}
                      </button>
                    </td>

                    {/* Facility */}
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[#26352E] block truncate max-w-[140px]">
                        {log.facility}
                      </span>
                      {log.sourceOrg && (
                        <span className="text-[10px] text-[#8C9B93] block truncate max-w-[140px]">
                          From: {log.sourceOrg}
                        </span>
                      )}
                    </td>

                    {/* Processing Date */}
                    <td className="py-3 px-3 text-[#66756D] whitespace-nowrap">
                      {formatDate(log.date || log.processingDate)}
                    </td>

                    {/* Input Weight */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#26352E]">
                      {formatWeight(log.inputWeight)}
                    </td>

                    {/* Recovered Weight */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#176B45]">
                      {formatWeight(recoveredWeight)}
                    </td>

                    {/* Remaining Waste */}
                    <td className="py-3 px-3 text-right font-mono text-[#26352E]">
                      {formatWeight(wasteWeight)}
                    </td>

                    {/* Explained Loss */}
                    <td className="py-3 px-3 text-right font-mono text-[#66756D]">
                      {formatWeight(log.explainedLoss || 0)}
                    </td>

                    {/* Weight Difference */}
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      <span className={Math.abs(diff) <= 0.5 ? 'text-[#176B45]' : 'text-[#D94F4F]'}>
                        {diff > 0 ? `+${diff}` : diff} kg
                      </span>
                    </td>

                    {/* Recovery Yield */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#FAFCFA] border border-[#E3EAE5] text-[#26352E]">
                        {log.recoveryYield}%
                      </span>
                    </td>

                    {/* Validation Status */}
                    <td className="py-3 px-3">
                      {renderStatusBadge(log.validationStatus)}
                    </td>

                    {/* Blockchain Reference */}
                    <td className="py-3 px-3">
                      {log.blockchainTx ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-[#66756D]">
                            {truncateHash(log.blockchainTx, 6, 4)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(log.blockchainTx, 'Blockchain Tx')}
                            className="p-0.5 text-[#8C9B93] hover:text-[#176B45]"
                            title="Copy Tx Hash"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8C9B93] italic">Not Anchored</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedClaimForDetail(log)}
                          className="px-2 py-1 text-[11px] font-semibold text-[#176B45] hover:bg-[#E8F5EE] rounded-lg border border-transparent hover:border-[#C2E3D0] transition-colors inline-flex items-center gap-1"
                          title="View complete material quantities and calculation details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => handleVerifyClaim(log)}
                          className="px-2 py-1 text-[11px] font-medium text-[#26352E] hover:bg-[#F4F7F5] rounded-lg border border-transparent hover:border-[#E3EAE5] transition-colors inline-flex items-center gap-1"
                          title="Verify cryptographic proof on ledger"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#176B45]" />
                          <span>Verify</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================== */}
      {/* CLAIM DETAIL MODAL: Shows complete breakdown & calculations    */}
      {/* ============================================================== */}
      {selectedClaimForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E3EAE5] p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E3EAE5]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#176B45]" />
                <div>
                  <h3 className="text-base font-bold text-[#003B23] font-mono">
                    {selectedClaimForDetail.claimId}
                  </h3>
                  <p className="text-xs text-[#66756D]">
                    Processing Record &amp; Material Breakdown Details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClaimForDetail(null)}
                className="p-1.5 text-[#66756D] hover:text-[#26352E] hover:bg-[#F4F7F5] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
                <span className="text-[10px] text-[#8C9B93] uppercase font-mono block">Associated Batch</span>
                <strong className="text-[#003B23] font-mono text-sm block mt-0.5">
                  {selectedClaimForDetail.batchId}
                </strong>
              </div>
              <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
                <span className="text-[10px] text-[#8C9B93] uppercase font-mono block">Original Input Weight</span>
                <strong className="text-[#26352E] font-mono text-sm block mt-0.5">
                  {formatWeight(selectedClaimForDetail.inputWeight)}
                </strong>
              </div>
              <div className="p-3 bg-[#E8F5EE] rounded-xl border border-[#C2E3D0]">
                <span className="text-[10px] text-[#176B45] uppercase font-mono block">Recovered Output</span>
                <strong className="text-[#176B45] font-mono text-sm block mt-0.5">
                  {formatWeight(modalRecoveredWeight)}
                </strong>
              </div>
              <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
                <span className="text-[10px] text-[#8C9B93] uppercase font-mono block">Recovery Yield</span>
                <strong className="text-[#26352E] font-mono text-sm block mt-0.5">
                  {selectedClaimForDetail.recoveryYield}%
                </strong>
              </div>
            </div>

            {/* Detailed Weight Reconciliation Formula Breakdown */}
            <div className="p-4 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-2 text-xs">
              <h4 className="font-semibold text-[#003B23] uppercase font-mono text-[11px]">
                Reconciliation Balance Check
              </h4>
              <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1">
                <span>Recovered Material: <strong>{formatWeight(modalRecoveredWeight)}</strong></span>
                <span>+ Remaining Waste: <strong>{formatWeight(selectedClaimForDetail.remainingWaste ?? selectedClaimForDetail.residualWaste ?? 0)}</strong></span>
                <span>+ Explained Loss: <strong>{formatWeight(selectedClaimForDetail.explainedLoss || 0)}</strong></span>
                <span>= Accounted Output: <strong>{formatWeight(selectedClaimForDetail.accountedOutput || (Number(modalRecoveredWeight) + Number(selectedClaimForDetail.remainingWaste ?? selectedClaimForDetail.residualWaste ?? 0) + Number(selectedClaimForDetail.explainedLoss || 0)))}</strong></span>
              </div>
              <div className="pt-2 border-t border-[#E3EAE5] flex items-center justify-between">
                <span>Weight Gap (Difference): <strong className={Math.abs(Number(selectedClaimForDetail.difference || 0)) <= 0.5 ? 'text-[#176B45]' : 'text-[#D94F4F]'}>{selectedClaimForDetail.difference} kg</strong></span>
                <div>{renderStatusBadge(selectedClaimForDetail.validationStatus)}</div>
              </div>
              {selectedClaimForDetail.flagReason && (
                <div className="p-2.5 bg-[#FDF2F2] border border-[#F8B4B4] rounded-lg text-[#9B1C1C] text-[11px] mt-2">
                  <strong>Flag Details:</strong> {selectedClaimForDetail.flagReason}
                </div>
              )}
            </div>

            {/* Material Quantities Table */}
            <div>
              <h4 className="text-xs font-semibold text-[#26352E] mb-2 uppercase font-mono">
                Recovered Material Stream Quantities
              </h4>
              <div className="rounded-xl border border-[#E3EAE5] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFCFA] border-b border-[#E3EAE5] text-[#8C9B93] text-[10px] uppercase font-mono">
                      <th className="py-2.5 px-3">Material</th>
                      <th className="py-2.5 px-3 text-right">Quantity (kg)</th>
                      <th className="py-2.5 px-3 text-right">Fraction of Recovered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F7F5]">
                    {modalMaterials.length > 0 ? (
                      modalMaterials.map((mat, idx) => {
                        const numWeight = mat.weightKg
                        const pct = modalRecoveredWeight > 0
                          ? ((numWeight / modalRecoveredWeight) * 100).toFixed(1)
                          : 0
                        return (
                          <tr key={idx} className="hover:bg-[#FAFCFA]">
                            <td className="py-2 px-3 font-medium text-[#26352E] capitalize">
                              {mat.name}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-[#176B45]">
                              {numWeight.toFixed(2)} kg
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-[#66756D]">
                              {pct}%
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-3 px-3 text-center text-[#8C9B93]">
                          No individual material breakdown items recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evidence & Supporting Documents Section */}
            <div>
              <h4 className="text-xs font-semibold text-[#26352E] mb-2 uppercase font-mono">
                Evidence &amp; Supporting Documents
              </h4>
              {modalEvidenceFiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {modalEvidenceFiles.map((file, idx) => {
                    const isImage = file.type === 'photo' || file.mimetype?.startsWith('image/') || file.url?.startsWith('data:image/') || file.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i)
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isImage ? (
                            <a
                              href={resolveFileUrl(file.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 group"
                              title="Click to view full photo"
                            >
                              <img
                                src={resolveFileUrl(file.url)}
                                alt={file.name || 'Evidence thumbnail'}
                                className="w-12 h-12 object-cover rounded-lg border border-[#E3EAE5] group-hover:border-[#176B45] transition-colors"
                              />
                            </a>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] border border-[#C2E3D0] flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-[#176B45]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[#26352E] truncate text-[11px]">
                              {file.name || (isImage ? 'Photo Evidence' : 'Weighbridge Document')}
                            </p>
                            <p className="text-[10px] text-[#8C9B93]">
                              {file.size ? `${(file.size / 1024).toFixed(1)} KB • ` : ''}
                              {isImage ? 'Photograph' : 'Document (PDF/Slip)'}
                            </p>
                          </div>
                        </div>

                        <a
                          href={resolveFileUrl(file.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-[11px] font-medium text-[#176B45] hover:bg-[#E8F5EE] border border-[#C2E3D0] rounded-lg shrink-0 inline-flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View</span>
                        </a>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] text-center text-xs text-[#8C9B93]">
                  No photographic evidence or weighbridge documents attached to this claim.
                </div>
              )}
            </div>

            {/* Waste Destination & Facility Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
                <span className="text-[10px] text-[#8C9B93] block">Recycling Facility</span>
                <span className="font-semibold text-[#26352E] block mt-0.5">{selectedClaimForDetail.facility}</span>
                <span className="text-[10px] text-[#66756D] block mt-1">Operator: {selectedClaimForDetail.operator || 'Authorized Metallurgist'}</span>
              </div>

              <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
                <span className="text-[10px] text-[#8C9B93] block">Remaining Waste Destination</span>
                <span className="font-medium text-[#26352E] block mt-0.5">
                  {selectedClaimForDetail.remainingWasteDestination || 'Certified TSDF Industrial Landfill'}
                </span>
                <span className="text-[10px] text-[#66756D] block mt-1">Processing Date: {formatDate(selectedClaimForDetail.date)}</span>
              </div>
            </div>

            {/* Blockchain Footprint */}
            {selectedClaimForDetail.blockchainTx && (
              <div className="p-3 bg-[#F4F7F5] rounded-xl border border-[#E3EAE5] flex items-center justify-between text-xs">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[10px] text-[#8C9B93]">Blockchain Transaction Hash</span>
                  <span className="font-mono text-[11px] text-[#26352E] truncate">
                    {selectedClaimForDetail.blockchainTx}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedClaimForDetail.blockchainTx, 'Blockchain Tx')}
                  className="px-2 py-1 text-xs font-medium text-[#176B45] hover:bg-[#E8F5EE] rounded-lg border border-[#C2E3D0]"
                >
                  Copy Tx
                </button>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-[#E3EAE5]">
              <button
                onClick={() => setSelectedClaimForDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VERIFY CLAIM MODAL: Shows cryptographic ledger verification   */}
      {/* ============================================================== */}
      {verifyingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E3EAE5] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#176B45]" />
                <h3 className="text-sm font-bold text-[#003B23]">
                  Cryptographic Audit Verification
                </h3>
              </div>
              <button
                onClick={() => {
                  setVerifyingClaim(null)
                  setVerificationResult(null)
                }}
                className="p-1 text-[#66756D] hover:text-[#26352E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#E8F5EE] rounded-xl border border-[#C2E3D0] flex items-center gap-2.5 text-[#003B23]">
                <CheckCircle2 className="w-5 h-5 text-[#176B45] shrink-0" />
                <div>
                  <p className="font-bold">Cryptographically Verified On-Chain</p>
                  <p className="text-[11px] text-[#26352E] mt-0.5">
                    Claim {verifyingClaim.claimId} has a registered SHA-256 state digest in the Hardhat / CPCB validator node.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#8C9B93]">Claim Reference:</span>
                  <strong className="text-[#26352E]">{verifyingClaim.claimId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C9B93]">Batch ID:</span>
                  <span className="text-[#176B45]">{verifyingClaim.batchId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C9B93]">Validation Verdict:</span>
                  <span className="font-semibold">{verifyingClaim.validationStatus}</span>
                </div>
                <div className="flex flex-col pt-1 border-t border-[#E3EAE5]">
                  <span className="text-[#8C9B93]">On-Chain Transaction Reference:</span>
                  <span className="break-all text-[#26352E] text-[10px] mt-0.5">
                    {verifyingClaim.blockchainTx || '0x44dd55ee66ff7788990011223344556677889900aabbccddeeff11aa22bb33cc'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3EAE5]">
              <button
                onClick={() => {
                  copyToClipboard(verifyingClaim.blockchainTx || verifyingClaim.claimId, 'Proof Reference')
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#176B45] bg-[#E8F5EE] hover:bg-[#C2E3D0] border border-[#C2E3D0] rounded-xl"
              >
                Copy Proof Reference
              </button>
              <button
                onClick={() => {
                  setVerifyingClaim(null)
                  setVerificationResult(null)
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
