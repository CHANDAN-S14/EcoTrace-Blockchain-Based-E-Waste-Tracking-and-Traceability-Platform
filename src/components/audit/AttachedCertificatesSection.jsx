import React, { useState, useMemo } from 'react'
import {
  FileText,
  Award,
  Download,
  Printer,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Building,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  FileCheck2,
  FileX,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { formatWeight, formatDate, truncateHash } from '../../utils/formatters'
import { downloadBatchAuditPdf } from '../../services/auditService'

export function AttachedCertificatesSection({
  records = [],
  onViewReport,
  onPrintReport,
  onCertifyAudit,
  onNavigateRecovery,
  onRefresh,
  addToast,
}) {
  const [filter, setFilter] = useState('ALL') // ALL, ISSUED, PENDING, DISCREPANT
  const [search, setSearch] = useState('')
  const [downloadingBatchId, setDownloadingBatchId] = useState(null)
  const [certifyingBatchId, setCertifyingBatchId] = useState(null)

  // Map and normalize records to certificate views
  const certificates = useMemo(() => {
    return records.map((rec) => {
      const bId = rec.batchId || rec.id
      const isCertified = rec.status === 'Audited' || rec.auditStatus === 'Verified' || Boolean(rec.certificateId)
      const isProcessed = rec.status === 'Processed'
      const isDiscrepant = rec.status === 'Flagged Discrepancy' || rec.auditStatus === 'Discrepancy Detected'

      // Certificate ID format
      const certId = rec.certificateId || (isCertified ? `CPCB-CERT-2026-${bId.replace(/[^0-9]/g, '').slice(-5) || '00001'}` : null)

      // Audit Status Badge
      let auditBadge = { label: 'Prerequisite Pending', color: 'bg-gray-100 text-gray-700 border-gray-200' }
      if (isDiscrepant || rec.blockchainStatus === 'MISMATCH_DETECTED' || rec.auditStatus === 'Digest Mismatch') {
        auditBadge = { label: 'Discrepancy Flagged', color: 'bg-red-50 text-red-700 border-red-200' }
      } else if (isCertified) {
        auditBadge = { label: 'Audit Approved', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
      } else if (isProcessed) {
        auditBadge = { label: 'Audit Pending', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      } else {
        auditBadge = { label: 'Prerequisite Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      }

      // Blockchain Status
      let blockchainBadge = { label: 'Blockchain Anchoring Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock }
      const hasHash = Boolean(rec.blockchainHash && rec.blockchainHash.length > 10)
      const isSepolia = rec.blockchainChainId === 11155111 || rec.blockchainNetwork?.includes('Sepolia')

      if (rec.blockchainStatus === 'VERIFIED') {
        blockchainBadge = {
          label: isSepolia ? 'Sepolia Verified (On-Chain)' : 'Blockchain Verified',
          color: isSepolia ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: ShieldCheck,
        }
      } else if (rec.blockchainStatus === 'MISMATCH_DETECTED') {
        blockchainBadge = {
          label: 'Evidence Digest Mismatch',
          color: 'bg-red-50 text-red-700 border-red-200',
          icon: AlertTriangle,
        }
      } else if (rec.blockchainStatus === 'SUBMITTED' || rec.blockchainStatus === 'ANCHORED') {
        blockchainBadge = {
          label: isSepolia ? 'Sepolia Tx Anchored' : 'Blockchain Transaction Submitted',
          color: isSepolia ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200',
          icon: ShieldCheck,
        }
      } else if (rec.blockchainStatus === 'FAILED') {
        blockchainBadge = {
          label: 'Blockchain Verification Failed',
          color: 'bg-red-50 text-red-700 border-red-200',
          icon: AlertTriangle,
        }
      } else if (hasHash) {
        blockchainBadge = {
          label: isSepolia ? 'Sepolia Tx Recorded' : 'Ledger Anchored',
          color: isSepolia ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: ShieldCheck,
        }
      }

      // Issuing Organization & Auditor
      const issuingOrg = isCertified
        ? (rec.auditedBy || 'Central Pollution Control Board (CPCB) Consortium Node #04')
        : 'Pending Regulatory Assignment'
      const auditorName = isCertified ? 'Dr. Sunita Rao, Senior Compliance Auditor' : 'Unassigned'

      const timestamp = rec.certifiedAt || rec.collectionDate || rec.createdAt || new Date().toISOString()

      return {
        ...rec,
        batchId: bId,
        isCertified,
        isProcessed,
        isDiscrepant,
        certificateId: certId,
        title: 'CPCB Regulatory Audit Certificate & Traceability Dossier',
        auditBadge,
        blockchainBadge,
        issuingOrg,
        auditorName,
        timestamp,
      }
    })
  }, [records])

  // Filter and search
  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      // Status filter
      if (filter === 'ISSUED' && !c.isCertified) return false
      if (filter === 'PENDING' && (c.isCertified || c.isDiscrepant)) return false
      if (filter === 'DISCREPANT' && !c.isDiscrepant) return false

      // Search query
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.batchId?.toLowerCase().includes(q) ||
        c.certificateId?.toLowerCase().includes(q) ||
        c.sourceOrg?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      )
    })
  }, [certificates, filter, search])

  const totalIssued = certificates.filter(c => c.isCertified).length
  const totalPending = certificates.filter(c => !c.isCertified && !c.isDiscrepant).length
  const totalDiscrepant = certificates.filter(c => c.isDiscrepant).length

  // Handle PDF Download
  const handleDownload = async (cert) => {
    const bId = cert.batchId
    setDownloadingBatchId(bId)
    try {
      await downloadBatchAuditPdf(bId)
      addToast?.({
        type: 'success',
        title: 'Certificate PDF Downloaded',
        message: `Official audit certificate and dossier for ${bId} saved successfully.`,
      })
    } catch (err) {
      addToast?.({
        type: 'danger',
        title: 'Download Failed',
        message: err.message || 'Could not download audit certificate PDF.',
      })
    } finally {
      setDownloadingBatchId(null)
    }
  }

  // Handle Certify Action
  const handleCertify = async (bId) => {
    setCertifyingBatchId(bId)
    try {
      if (onCertifyAudit) {
        await onCertifyAudit(bId)
        if (onRefresh) await onRefresh()
      }
    } finally {
      setCertifyingBatchId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E3EAE5] p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F0F4F2]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] text-[#176B45] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold font-heading text-gray-900 tracking-tight">
              Attached Audit Certificates &amp; Regulatory Reports
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Access, view, download, and verify certified CPCB statutory dossiers and tamper-evident audit documents associated with each consignment.
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#176B45] border border-[#C2E3D0]">
            {totalIssued} Certified &amp; Issued
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
            {totalPending} Certification Pending
          </span>
          {totalDiscrepant > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF2F2] text-[#D94F4F] border border-[#F8B4B4]">
              {totalDiscrepant} Flagged
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certificate by Batch ID, Certificate ID, or generator..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[#176B45] text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Consignments ({certificates.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ISSUED')}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
              filter === 'ISSUED'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Issued Certificates ({totalIssued})
          </button>
          <button
            type="button"
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
              filter === 'PENDING'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Pending ({totalPending})
          </button>
        </div>
      </div>

      {/* Certificates Cards Grid */}
      {filteredCertificates.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <FileX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-gray-700">No Certificates Matching Filter</h4>
          <p className="text-xs text-gray-500 mt-1">Try resetting the search query or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCertificates.map((cert) => {
            const isDownloading = downloadingBatchId === cert.batchId
            const isCertifying = certifyingBatchId === cert.batchId
            const BlockchainIcon = cert.blockchainBadge.icon

            return (
              <div
                key={cert.batchId}
                className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between p-5 ${
                  cert.isCertified
                    ? 'bg-white border-[#C2E3D0] shadow-xs hover:border-[#176B45]/40'
                    : cert.isDiscrepant
                    ? 'bg-[#FEFBFB] border-red-200'
                    : 'bg-[#FAFCFA] border-gray-200'
                }`}
              >
                {/* Card Top: Title, Certificate ID, Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        cert.isCertified
                          ? 'bg-[#E8F5EE] text-[#176B45]'
                          : cert.isDiscrepant
                          ? 'bg-red-50 text-red-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 leading-snug">
                          {cert.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cert.certificateId ? (
                            <span className="font-mono text-[10px] font-bold text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded border border-[#C2E3D0]">
                              {cert.certificateId}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                              Certificate Pending Issuance
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${cert.auditBadge.color}`}>
                      {cert.auditBadge.label}
                    </span>
                  </div>

                  {/* Consignment Attributes Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-mono">Consignment Batch ID</span>
                      <span className="font-mono font-bold text-gray-800 text-xs">
                        {cert.batchId}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-mono">Gross Input Weight</span>
                      <span className="font-mono font-semibold text-gray-800 text-xs">
                        {formatWeight(cert.grossWeight)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-mono">Source Organization</span>
                      <span className="text-gray-700 truncate block text-xs" title={cert.sourceOrg}>
                        {cert.sourceOrg || 'Authorized Generator'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-mono">Issuing Authority</span>
                      <span className="text-gray-700 truncate block text-xs" title={cert.issuingOrg}>
                        {cert.issuingOrg}
                      </span>
                    </div>
                  </div>

                  {/* Blockchain Status & Timestamp Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[10px] border ${cert.blockchainBadge.color}`}>
                      <BlockchainIcon className="w-3 h-3" />
                      <span>{cert.blockchainBadge.label}</span>
                    </span>

                    <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(cert.timestamp)}
                    </span>
                  </div>

                  {/* Tamper-evident digest */}
                  {cert.blockchainHash && (
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-mono flex items-center justify-between text-gray-500">
                      <span className="text-gray-400 uppercase font-sans text-[9px] font-bold">Ledger Digest:</span>
                      <span className="font-bold text-gray-700">
                        {truncateHash(cert.blockchainHash, 10, 6)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  {cert.isCertified ? (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* View Report */}
                        <button
                          type="button"
                          onClick={() => onViewReport(cert)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#176B45] bg-[#E8F5EE] hover:bg-[#D5EFE0] rounded-xl transition-colors border border-[#C2E3D0] cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>

                        {/* Print */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onPrintReport) {
                              onPrintReport(cert)
                            } else {
                              onViewReport(cert)
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-200 cursor-pointer"
                          title="Print official audit certificate"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      </div>

                      {/* Download PDF */}
                      <button
                        type="button"
                        onClick={() => handleDownload(cert)}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                        <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                      </button>
                    </>
                  ) : (
                    /* Not Certified Yet: Context-Sensitive Action */
                    <div className="w-full flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-gray-500">
                        {cert.isProcessed ? (
                          <span className="text-blue-700 font-medium">Recovery reconciled. Ready for audit certification.</span>
                        ) : cert.isDiscrepant ? (
                          <span className="text-red-700 font-medium">Mass balance discrepancy must be resolved first.</span>
                        ) : (
                          <span className="text-gray-500">Complete custody and metallurgy stages to certify.</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Preview draft report */}
                        <button
                          type="button"
                          onClick={() => onViewReport(cert)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white rounded-xl border border-gray-200 transition-colors"
                        >
                          <span>Preview Draft</span>
                        </button>

                        {cert.isProcessed && (
                          <button
                            type="button"
                            onClick={() => handleCertify(cert.batchId)}
                            disabled={isCertifying}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{isCertifying ? 'Certifying...' : 'Certify Audit'}</span>
                          </button>
                        )}

                        {cert.status === 'Received' && (
                          <button
                            type="button"
                            onClick={() => onNavigateRecovery && onNavigateRecovery(cert.batchId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#176B45] bg-[#E8F5EE] hover:bg-[#D5EFE0] rounded-xl transition-colors border border-[#C2E3D0]"
                          >
                            <span>Record Recovery</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
