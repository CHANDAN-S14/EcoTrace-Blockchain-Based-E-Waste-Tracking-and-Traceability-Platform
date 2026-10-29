import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Search,
  FileCheck2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Download,
  RefreshCw,
  Layers,
  Database,
  Box,
  ExternalLink,
} from 'lucide-react'
import { truncateHash } from '../utils/formatters'
import { AuditSearch } from '../components/audit/AuditSearch'
import { AuditRecordTable } from '../components/audit/AuditRecordTable'
import { AuditReportModal } from '../components/audit/AuditReportModal'
import { AttachedCertificatesSection } from '../components/audit/AttachedCertificatesSection'
import { BlockchainVerificationModal } from '../components/audit/BlockchainVerificationModal'
import { BatchAuditHistoryModal } from '../components/audit/BatchAuditHistoryModal'
import { fetchAuditRecords, verifyBatchOnChain, fetchBlockchainStatus } from '../services/auditService'
import { useBatchStore } from '../hooks/useBatchStore'

export function AuditCompliancePage() {
  const navigate = useNavigate()
  const { batches, addToast, updateBatchBlockchainStatus, handleCertifyBatch } = useBatchStore()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [networkFilter, setNetworkFilter] = useState('ALL')
  const [blockchainStatus, setBlockchainStatus] = useState(null)
  const [auditRecords, setAuditRecords] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Modals state
  const [selectedReportBatch, setSelectedReportBatch] = useState(null)
  const [inspectingBatch, setInspectingBatch] = useState(null)
  const [verificationModalData, setVerificationModalData] = useState(null)
  const [verifyingBatchId, setVerifyingBatchId] = useState(null)

  // Load audit records and live blockchain network status
  const loadRecords = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true)
    try {
      const [res, netStatus] = await Promise.all([
        fetchAuditRecords({ query, statusFilter, forceRefresh: isManualRefresh }),
        fetchBlockchainStatus().catch(() => null),
      ])

      if (netStatus) {
        setBlockchainStatus(netStatus)
      }

      const serverRecords = res.records || []

      // Deduplicate on batchId
      const seen = new Set()
      const uniqueServerRecords = []
      for (const rec of serverRecords) {
        const id = rec.batchId || rec.id
        if (id && !seen.has(id)) {
          seen.add(id)
          uniqueServerRecords.push(rec)
        }
      }

      // Merge any new batches from useBatchStore that are not yet in server records
      const additionalFromStore = batches
        .filter(b => {
          const id = b.batchId || b.id
          return id && !seen.has(id)
        })
        .map(b => {
          const id = b.batchId || b.id
          seen.add(id)
          const isAnchored = b.blockchainStatus === 'ANCHORED' || Boolean(b.blockchainHash && b.blockchainHash.length > 20)
          const isVerified = b.blockchainStatus === 'VERIFIED'
          return {
            batchId: id,
            category: b.category,
            collectionType: b.collectionType || 'Mixed E-Waste',
            grossWeight: Number(b.grossWeight) || 0,
            sourceOrg: b.sourceOrg,
            collectionFacility: b.collectionFacility || 'CPCB Hub',
            collectionLocation: b.collectionLocation || 'Bangalore, Karnataka',
            collectionDate: b.collectionDate,
            assignedHandler: b.assignedHandler || 'Authorized Technician',
            blockchainHash: b.blockchainHash || '',
            blockchainTx: b.blockchainTx || b.blockchainHash || '',
            blockchainStatus: b.blockchainStatus || (isAnchored ? 'ANCHORED' : 'PENDING'),
            blockchainChainId: b.blockchainChainId || (b.blockchainHash ? 31337 : null),
            blockchainNetwork: b.blockchainNetwork || (b.blockchainChainId === 11155111 ? 'Ethereum Sepolia' : (b.blockchainHash ? 'Local Hardhat' : '')),
            blockchainContractAddress: b.blockchainContractAddress || '',
            blockchainBlockNumber: b.blockchainBlockNumber || null,
            blockchainExplorerUrl: b.blockchainExplorerUrl || '',
            blockchainAnchorHistory: b.blockchainAnchorHistory || [],
            evidenceHash: b.evidenceHash || '',
            status: b.status || 'Registered',
            auditStatus: isVerified ? 'Verified' : isAnchored ? 'Anchored' : 'Pending Verification',
            recovery: b.processingData || null,
            handovers: b.handovers || [],
            auditTrail: [],
          }
        })

      let combined = [...uniqueServerRecords, ...additionalFromStore]
      if (statusFilter && statusFilter !== 'ALL') {
        combined = combined.filter(r => r.auditStatus === statusFilter)
      }

      setAuditRecords(combined)

      if (isManualRefresh) {
        addToast({
          type: 'info',
          title: 'Ledger Refreshed',
          message: `Consignment ledger reloaded: ${combined.length} audit records updated.`,
        })
      }
    } catch (err) {
      console.error('[AuditCompliancePage] Error loading records:', err)
      addToast({
        type: 'danger',
        title: 'Audit Records Error',
        message: 'Could not load compliance records from server.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [query, statusFilter, batches, addToast])

  useEffect(() => {
    loadRecords(false)
  }, [loadRecords])

  const handleInspectBatch = (batchId) => {
    // Find in auditRecords first (which has full audit history from backend)
    const matched = auditRecords.find(b => b.batchId === batchId) ||
                    batches.find(b => (b.batchId || b.id) === batchId)
    if (matched) {
      setInspectingBatch(matched)
    }
  }

  const handleGenerateReport = (batchId) => {
    const matched = auditRecords.find(b => b.batchId === batchId) ||
                    batches.find(b => (b.batchId || b.id) === batchId)
    if (matched) {
      setSelectedReportBatch(matched)
    }
  }

  const handleVerifyOnChain = async (record) => {
    const batchId = record.batchId || record.id
    if (verifyingBatchId === batchId) return
    setVerifyingBatchId(batchId)
    try {
      const verifyRes = await verifyBatchOnChain(batchId, record.evidenceHash)
      setVerificationModalData({
        ...verifyRes,
        batchId,
        evidenceHash: record.evidenceHash,
        blockchainHash: record.blockchainHash,
      })

      if (verifyRes.verified) {
        updateBatchBlockchainStatus?.(batchId, 'VERIFIED')

        // Immediately update row in local state
        setAuditRecords(prev =>
          prev.map(r =>
            (r.batchId === batchId || r.id === batchId)
              ? { ...r, auditStatus: 'Verified', blockchainStatus: 'VERIFIED' }
              : r
          )
        )

        addToast({
          type: 'success',
          title: 'Blockchain Verification Passed',
          message: `Consignment ${batchId} evidence digest verified against on-chain consensus state.`,
        })

        // Refresh records in background to sync newly persisted status
        loadRecords(false)
      } else if (verifyRes.isApiError) {
        addToast({
          type: 'danger',
          title: 'Verification Request Failed',
          message: verifyRes.message || 'Could not reach blockchain verification service.',
        })
      } else if (verifyRes.isLiveRpc === false) {
        addToast({
          type: 'warning',
          title: 'Blockchain RPC Offline',
          message: 'The Ethereum/EVM RPC node is currently unreachable. Verification could not be confirmed on-chain.',
        })
      } else if (verifyRes.existsOnChain === false) {
        addToast({
          type: 'warning',
          title: 'Batch Unanchored',
          message: `Consignment ${batchId} has not yet been anchored to the smart contract.`,
        })
      } else {
        addToast({
          type: 'danger',
          title: 'Digest Mismatch',
          message: `Evidence hash mismatch detected on ${batchId}.`,
        })
      }

      if (verifyRes.isLiveRpc) {
        setBlockchainStatus(prev => ({
          ...prev,
          connected: true,
          network: verifyRes.network || prev?.network || 'Ethereum Sepolia',
          chainId: verifyRes.chainId || prev?.chainId || 11155111,
          contractAddress: verifyRes.contractAddress || prev?.contractAddress,
          contractExplorerUrl: verifyRes.contractExplorerUrl || prev?.contractExplorerUrl,
          isSepolia: verifyRes.chainId === 11155111 || verifyRes.network?.includes('Sepolia'),
        }))
      }
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Verification Request Failed',
        message: err.message || 'Could not reach blockchain verification service.',
      })
    } finally {
      setVerifyingBatchId(null)
    }
  }

  const isSepoliaRecord = (r) => r.blockchainChainId === 11155111 || r.blockchainNetwork?.includes('Sepolia')
  const isLocalRecord = (r) =>
    r.blockchainChainId === 31337 ||
    (r.blockchainHash && !r.blockchainNetwork?.includes('Sepolia') && r.blockchainChainId !== 11155111)
  const isUnanchoredRecord = (r) => !r.blockchainHash || r.blockchainStatus === 'PENDING'

  const filteredRecords = auditRecords.filter((rec) => {
    if (networkFilter === 'SEPOLIA') return isSepoliaRecord(rec)
    if (networkFilter === 'LOCAL') return isLocalRecord(rec)
    if (networkFilter === 'UNANCHORED') return isUnanchoredRecord(rec)
    return true
  })

  const totalCount = auditRecords.length
  const sepoliaCount = auditRecords.filter(isSepoliaRecord).length
  const localCount = auditRecords.filter(isLocalRecord).length
  const unanchoredCount = auditRecords.filter(isUnanchoredRecord).length

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
              Audit &amp; Blockchain
            </h1>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Audit Trail
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Verify the provenance, custody trail, and cryptographic integrity of e-waste consignments and mass-balance claims.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadRecords(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#176B45] bg-[#E8F5EE] hover:bg-[#C2E3D0] rounded-xl transition-colors border border-[#C2E3D0] self-start sm:self-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reload ledger records and sync with smart contract"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh Ledger'}</span>
        </button>
      </div>

      {/* Blockchain Network Infrastructure Strip */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3EAE5] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                blockchainStatus?.connected
                  ? blockchainStatus?.isSepolia
                    ? 'bg-purple-50 text-purple-700'
                    : 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-gray-900 font-heading">
                  {blockchainStatus?.network ||
                    (blockchainStatus?.isSepolia ? 'Ethereum Sepolia Testnet' : 'Local Hardhat EVM')}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${
                    blockchainStatus?.isSepolia
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  Chain ID: {blockchainStatus?.chainId || (blockchainStatus?.isSepolia ? '11155111' : '31337')}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    blockchainStatus?.connected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      blockchainStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {blockchainStatus?.connected ? 'RPC Consensus Active' : 'RPC Offline'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                {blockchainStatus?.isSepolia
                  ? 'Connected to Ethereum Sepolia public testnet. Cryptographic evidence hashes and custody transitions are anchored directly into the global EVM consensus layer.'
                  : 'Connected to local Hardhat EVM node. High-frequency immutable ledger anchoring for zero-gas test execution and rapid verification cycles.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {blockchainStatus?.contractAddress && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[11px]">
                <span className="text-gray-400 font-sans text-[10px] uppercase font-bold">Contract:</span>
                <span className="text-gray-800 font-medium" title={blockchainStatus.contractAddress}>
                  {truncateHash(blockchainStatus.contractAddress, 6, 4)}
                </span>
                {blockchainStatus.contractExplorerUrl && (
                  <a
                    href={blockchainStatus.contractExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 hover:text-purple-800 p-0.5 inline-flex items-center"
                    title="View on Sepolia Etherscan"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
            {blockchainStatus?.signerBalance != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 text-[11px]">
                <span className="text-gray-400 font-sans text-[10px] uppercase font-bold">Relayer:</span>
                <span className="font-mono font-semibold text-gray-800">
                  {parseFloat(blockchainStatus.signerBalance).toFixed(4)} ETH
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Statutory Notice */}
      {/* <div className="p-4 bg-[#FEF5E7] rounded-2xl border border-[#FAD7A0] text-xs text-[#B8741A]">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#E9A23B] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-[#8C5205] text-xs mb-0.5">
              CPCB Regulatory Audit Protocol &amp; Truthfulness Notice
            </h4>
            <p className="text-[11px] text-[#A2620A] leading-relaxed">
              Blockchain technology establishes the tamper-evident integrity and non-repudiation of recorded timestamps, weights, and evidence digests relative to their cryptographic hashes. It does <strong>not</strong> independently prove that an initial physical scale reading or uploaded photo is truthful without accredited physical audits and periodic weighbridge calibration.
            </p>
          </div>
        </div>
      </div> */}

      {/* Search & Filter Component */}
      <AuditSearch
        query={query}
        onQueryChange={setQuery}
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Network Ledger Partition Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[10px] font-mono uppercase text-gray-400 mr-1 font-semibold">Ledger Partition:</span>
        <button
          type="button"
          onClick={() => setNetworkFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            networkFilter === 'ALL'
              ? 'bg-[#176B45] text-white shadow-xs'
              : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
          }`}
        >
          All Networks ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setNetworkFilter('SEPOLIA')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            networkFilter === 'SEPOLIA'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white hover:bg-purple-50 text-purple-700 border border-purple-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Sepolia Testnet (11155111)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800">
            {sepoliaCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setNetworkFilter('LOCAL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            networkFilter === 'LOCAL'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Local EVM (31337)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
            {localCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setNetworkFilter('UNANCHORED')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            networkFilter === 'UNANCHORED'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Unanchored / Pending</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
            {unanchoredCount}
          </span>
        </button>
      </div>

      {/* Attached Audit Certificates & Reports Section */}
      <AttachedCertificatesSection
        records={filteredRecords}
        onViewReport={handleGenerateReport}
        onPrintReport={(record) => {
          handleGenerateReport(record.batchId || record.id)
        }}
        onCertifyAudit={(id) => handleCertifyBatch(id).then(() => loadRecords(false))}
        onNavigateRecovery={(id) => navigate(`/recovery?batch=${encodeURIComponent(id)}`)}
        onRefresh={() => loadRecords(false)}
        addToast={addToast}
      />

      {/* Audited Records Table */}
      <AuditRecordTable
        records={filteredRecords}
        onInspectBatch={handleInspectBatch}
        onGenerateReport={handleGenerateReport}
        onVerifyOnChain={handleVerifyOnChain}
        onCertifyAudit={(id) => handleCertifyBatch(id).then(() => loadRecords(false))}
        verifyingBatchId={verifyingBatchId}
      />

      {/* Blockchain Verification Verdict Modal */}
      {verificationModalData && (
        <BlockchainVerificationModal
          isOpen={true}
          data={verificationModalData}
          onClose={() => setVerificationModalData(null)}
          onBatchAnchored={() => {
            loadRecords()
          }}
        />
      )}

      {/* Batch Full Audit Trail Modal */}
      {inspectingBatch && (
        <BatchAuditHistoryModal
          isOpen={true}
          batch={inspectingBatch}
          onClose={() => setInspectingBatch(null)}
          onVerifyOnChain={(b) => handleVerifyOnChain(b)}
          onGenerateCertificate={(id) => {
            setInspectingBatch(null)
            handleGenerateReport(id)
          }}
        />
      )}

      {/* Official Audit Certificate Modal */}
      {selectedReportBatch && (
        <AuditReportModal
          isOpen={true}
          batch={selectedReportBatch}
          onClose={() => setSelectedReportBatch(null)}
        />
      )}
    </div>
  )
}
