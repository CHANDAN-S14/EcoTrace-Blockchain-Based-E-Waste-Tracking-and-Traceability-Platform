import React, { useState } from 'react'
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  Layers,
  Clock,
  Database,
  ArrowRight,
  Loader2,
  RefreshCw,
  ServerOff,
} from 'lucide-react'
import { truncateHash, formatDate } from '../../utils/formatters'
import { useBatchStore } from '../../hooks/useBatchStore'
import { anchorBatchToBlockchain, reAnchorVersionedBatch } from '../../services/auditService'

export function BlockchainVerificationModal({ isOpen, data, onClose, onBatchAnchored }) {
  const { addToast } = useBatchStore()
  const [isAnchoring, setIsAnchoring] = useState(false)
  const [isReAnchoring, setIsReAnchoring] = useState(false)
  const [copiedField, setCopiedField] = useState(null)

  if (!isOpen || !data) return null

  const copyToClipboard = (text, fieldName, label) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
    addToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: `${label} copied successfully.`,
    })
  }

  const handleAnchorNow = async () => {
    setIsAnchoring(true)
    try {
      const res = await anchorBatchToBlockchain(data.batchId, data.evidenceHash)
      addToast({
        type: 'success',
        title: 'Batch Anchored on Blockchain',
        message: `Consignment ${data.batchId} successfully registered on smart contract (Block #${res.data?.blockNumber || res.blockNumber}).`,
      })
      if (onBatchAnchored) {
        onBatchAnchored(data.batchId)
      }
      onClose()
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Anchoring Failed',
        message: err.message || 'Could not anchor batch to blockchain.',
      })
    } finally {
      setIsAnchoring(false)
    }
  }

  const handleVersionedReAnchor = async () => {
    setIsReAnchoring(true)
    try {
      const res = await reAnchorVersionedBatch(
        data.batchId,
        'Amended consignment manifest anchored on Sepolia under immutable versioned audit identifier'
      )
      addToast({
        type: 'success',
        title: 'Versioned Manifest Anchored',
        message: `Consignment ${data.batchId} successfully versioned as ${res.data?.versionedBatchId || 'V2'} on ${res.data?.network || 'Ethereum Sepolia'} (Block #${res.data?.blockNumber}).`,
      })
      if (onBatchAnchored) {
        onBatchAnchored(data.batchId)
      }
      onClose()
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Re-Anchoring Failed',
        message: err.message || 'Could not anchor versioned manifest to blockchain.',
      })
    } finally {
      setIsReAnchoring(false)
    }
  }

  const {
    batchId,
    versionedBatchId,
    verified,
    isLiveRpc,
    isApiError,
    contractAvailable,
    existsOnChain,
    message,
    mismatchReason,
    evidenceHash,
    onChainEvidenceHash,
    contractAddress,
    registeredAt,
    registeredBy,
    totalCustodyEvents,
    blockchainHash,
  } = data

  const isSepolia = data.chainId === 11155111 || data.network?.includes('Sepolia')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E3EAE5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${
              verified
                ? 'bg-[#E8F5EE] text-[#176B45]'
                : isApiError
                ? 'bg-red-50 text-red-700'
                : isLiveRpc === false || data.status === 'RPC_OFFLINE'
                ? 'bg-amber-50 text-amber-700'
                : contractAvailable === false || data.status === 'CONTRACT_UNAVAILABLE'
                ? 'bg-orange-50 text-orange-700'
                : existsOnChain === false || data.status === 'NOT_REGISTERED'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {verified ? (
                <ShieldCheck className="w-5 h-5" />
              ) : isLiveRpc === false || data.status === 'RPC_OFFLINE' ? (
                <ServerOff className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#003B23]">
                Blockchain Verification Dossier
              </h3>
              <p className="font-mono text-xs text-[#66756D]">
                Consignment: {batchId} {versionedBatchId && <span className="text-purple-700 font-bold">({versionedBatchId})</span>}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#66756D] hover:text-[#26352E] hover:bg-[#F4F7F5] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-[#26352E]">
          {/* Main Status Verdict Banner */}
          {verified ? (
            <div className="p-4 bg-[#E8F5EE] rounded-xl border border-[#C2E3D0] space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#176B45]" />
                <h4 className="font-semibold text-[#003B23]">
                  Cryptographic Integrity Verified (Consensus Match)
                </h4>
              </div>
              <p className="text-[11px] text-[#176B45] leading-relaxed">
                {message || 'The SHA-256 evidence digest matches the immutable batch registration anchored on Ethereum Sepolia.'}
              </p>
            </div>
          ) : isApiError ? (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-1 text-xs text-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h4 className="font-semibold text-red-900">
                  Verification Service Communication Error
                </h4>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                {message || 'Unable to connect to the EcoTrace verification service. Please check your backend connection.'}
              </p>
            </div>
          ) : isLiveRpc === false || data.status === 'RPC_OFFLINE' ? (
            <div className="p-4 bg-[#FEF5E7] rounded-xl border border-[#FAD7A0] space-y-1 text-xs text-[#B8741A]">
              <div className="flex items-center gap-2">
                <ServerOff className="w-4 h-4 text-[#E9A23B]" />
                <h4 className="font-semibold text-[#8C5205]">
                  Blockchain Node Offline
                </h4>
              </div>
              <p className="text-[11px] text-[#A2620A] leading-relaxed">
                {message || 'The EVM RPC node is currently unreachable. Verification cannot be confirmed on-chain.'}
              </p>
            </div>
          ) : contractAvailable === false || data.status === 'CONTRACT_UNAVAILABLE' ? (
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 space-y-1.5 text-xs text-orange-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <h4 className="font-semibold text-orange-900">
                  Smart Contract Unavailable / Not Deployed
                </h4>
              </div>
              <p className="text-[11px] text-orange-800 leading-relaxed">
                {message || `The blockchain RPC node is online, but the smart contract could not be verified at address ${contractAddress || 'unconfigured'}. Bytecode or ABI is unavailable on ${data.network || 'Sepolia'}.`}
              </p>
            </div>
          ) : existsOnChain === false || data.status === 'NOT_REGISTERED' ? (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-semibold text-amber-900">
                  Unanchored Consignment (Not on Chain)
                </h4>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This batch exists in the local operational database, but its initial evidence hash has not yet been submitted to the EcoTraceRegistry smart contract.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAnchorNow}
                  disabled={isAnchoring}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isAnchoring ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Anchoring to Contract...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Anchor to Blockchain Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <h4 className="font-semibold text-red-900">
                    Evidence Digest Mismatch Detected
                  </h4>
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  {message || 'Evidence digest mismatch: provided digest does not match the immutably anchored digest on Ethereum Sepolia.'}
                </p>
                {mismatchReason && (
                  <p className="text-[10px] text-red-700 italic pt-1 border-t border-red-100">
                    {mismatchReason}
                  </p>
                )}
              </div>

              {/* Versioned Resolution Action Box */}
              <div className="p-4 bg-[#FAFCFA] rounded-xl border border-purple-200 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-700" />
                  <h4 className="font-semibold text-purple-900">
                    Audit Resolution: Versioned Manifest Re-Anchor
                  </h4>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  The on-chain consensus digest was immutably recorded for an earlier intake under this sequence number. To certify this consignment under CPCB audit standards without rewriting blockchain history, you can anchor an amended manifest version (V2).
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleVersionedReAnchor}
                    disabled={isReAnchoring}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isReAnchoring ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Anchoring Versioned Manifest to Sepolia...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Anchor Versioned Re-Audit ({versionedBatchId ? 'Next Version' : 'V2'})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cryptographic Comparison */}
          <div className="space-y-3 p-4 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5]">
            <span className="text-[10px] font-mono uppercase font-bold text-[#8C9B93] block">
              Cryptographic Digest Audit
            </span>

            {/* Local Evidence Hash */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#66756D]">Local Intake Evidence Digest (SHA-256):</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(evidenceHash, 'local', 'Local Evidence Digest')}
                  className="text-[10px] text-[#176B45] hover:underline inline-flex items-center gap-1"
                >
                  {copiedField === 'local' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E3EAE5] font-mono text-[11px] text-[#26352E] break-all">
                {evidenceHash || 'No evidence digest available'}
              </div>
            </div>

            {/* On-Chain Evidence Hash (if anchored) */}
            {onChainEvidenceHash && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#66756D]">On-Chain Consensus Digest (bytes32):</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(onChainEvidenceHash, 'onchain', 'On-Chain Consensus Digest')}
                    className="text-[10px] text-[#176B45] hover:underline inline-flex items-center gap-1"
                  >
                    {copiedField === 'onchain' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className={`p-2 bg-white rounded-lg border font-mono text-[11px] font-semibold break-all ${verified ? 'border-[#C2E3D0] text-[#176B45]' : 'border-red-200 text-red-700'}`}>
                  {onChainEvidenceHash}
                </div>
              </div>
            )}
          </div>

          {/* Smart Contract Infrastructure Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#8C9B93] uppercase block font-mono">Smart Contract</span>
                {(data.contractExplorerUrl || isSepolia) && (
                  <a
                    href={data.contractExplorerUrl || `https://sepolia.etherscan.io/address/${contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-purple-600 hover:text-purple-800 underline inline-flex items-center gap-0.5"
                  >
                    Etherscan <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <div className="font-mono text-[11px] text-[#26352E] truncate" title={contractAddress || '0xF81819d91d0d23612C888987cfA4EdC09e91B862'}>
                {contractAddress || '0xF81819d91d0d23612C888987cfA4EdC09e91B862'}
              </div>
              <span className="text-[10px] text-[#8C9B93]">EcoTraceRegistry.sol (EVM)</span>
            </div>

            <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
              <span className="text-[10px] text-[#8C9B93] uppercase block font-mono">Consensus Network</span>
              <div className="font-semibold text-[#26352E] flex items-center gap-1.5">
                <span>{data.network || (isSepolia ? 'Ethereum Sepolia' : isLiveRpc ? 'Local Hardhat' : 'Local Ledger')}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${isSepolia ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                  {data.chainId ? `Chain ${data.chainId}` : '11155111'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#176B45]">
                {totalCustodyEvents != null ? `${totalCustodyEvents} on-chain custody steps` : 'Consensus State'}
              </span>
            </div>

            {registeredAt && (
              <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
                <span className="text-[10px] text-[#8C9B93] uppercase block font-mono">Registered On-Chain</span>
                <div className="font-mono text-[11px] text-[#26352E]">
                  {formatDate(registeredAt)}
                </div>
              </div>
            )}

            {registeredBy && (
              <div className="p-3 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
                <span className="text-[10px] text-[#8C9B93] uppercase block font-mono">Recorded By Operator</span>
                <div className="font-mono text-[11px] text-[#26352E] truncate" title={registeredBy}>
                  {registeredBy}
                </div>
              </div>
            )}
          </div>

          {/* Statutory Disclaimer */}
          <div className="p-3 bg-[#FEF5E7] rounded-xl border border-[#FAD7A0] text-[10px] text-[#8C5205] leading-relaxed">
            <strong>Statutory Protocol Notice:</strong> On-chain consensus establishes mathematical non-repudiation and timestamp immutability. It does not replace physical weighbridge calibration certificates issued by accredited inspection bureaus.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAFCFA] border-t border-[#E3EAE5] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  )
}
