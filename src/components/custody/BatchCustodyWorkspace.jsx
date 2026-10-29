import React, { useState } from 'react'
import {
  ArrowLeft,
  Boxes,
  Scale,
  Calendar,
  Building2,
  Truck,
  Building,
  Recycle,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Award,
  RefreshCw,
  QrCode,
  MapPin,
  FileText,
} from 'lucide-react'
import { CustodyTimeline } from './CustodyTimeline'
import { HandoverCard } from './HandoverCard'
import { StatusBadge } from '../common/StatusBadge'
import { formatWeight, formatDate, truncateHash } from '../../utils/formatters'
import { getBatchCustodyStage, getBatchAvailableAction } from '../../utils/custodyStageUtils'

export function BatchCustodyWorkspace({
  batch,
  onBack,
  onRefresh,
  onAssignTransporter,
  onAcceptHandover,
  onRecordDockScale,
  onAssignRecycler,
  onConfirmRecyclerIntake,
  onCertifyAudit,
  onNavigateRecovery,
  onReportDiscrepancy,
  onViewEvidence,
  onViewAuditReport,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  if (!batch) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-[#E3EAE5] text-center">
        <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-gray-800">No Consignment Selected</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">Please select a batch from the searchable selector above.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-[#176B45] text-white text-xs font-semibold rounded-xl hover:bg-[#003B23] transition-colors"
        >
          Return to Batches Directory
        </button>
      </div>
    )
  }

  const bId = batch.batchId || batch.id
  const stage = getBatchCustodyStage(batch)
  const action = getBatchAvailableAction(batch)
  const handovers = Array.isArray(batch.handovers) ? batch.handovers : []
  const hasDiscrepancy = stage.isDiscrepancy

  const handleManualRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E3EAE5]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-[#E3EAE5] transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
            <span>Back to All Batches</span>
          </button>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Selected Consignment:</span>
            <span className="font-mono font-bold text-sm text-[#176B45] bg-[#E8F5EE] px-2.5 py-0.5 rounded-lg border border-[#C2E3D0]">
              {bId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#176B45] bg-[#E8F5EE] hover:bg-[#D5EFE0] rounded-xl border border-[#C2E3D0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Synchronize consignment custody records with immutable blockchain ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#176B45]' : ''}`} />
            <span>{isRefreshing ? 'Syncing Ledger...' : 'Sync Ledger'}</span>
          </button>
        </div>
      </div>

      {/* Primary Consignment Dossier Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F0F4F2]">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold font-heading text-gray-900 tracking-tight flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#176B45]" />
                Consignment Dossier: {bId}
              </h2>
              <StatusBadge status={batch.status} />
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                hasDiscrepancy
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : stage.step === 6
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-[#E8F5EE] text-[#176B45] border-[#C2E3D0]'
              }`}>
                Step 0{stage.step > 5 ? 5 : stage.step}: {stage.name}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stage.label} • Dispatched from {batch.sourceOrg || 'Initial Generator'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs">
            <div className="p-2.5 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5] text-right">
              <span className="text-[10px] text-gray-400 font-mono block">INITIAL GROSS WEIGHT</span>
              <strong className="font-mono text-sm text-[#003B23]">{formatWeight(batch.grossWeight)}</strong>
            </div>

            {batch.blockchainHash && (
              <div className="p-2.5 rounded-xl bg-[#E8F5EE] border border-[#C2E3D0] text-right">
                <span className="text-[10px] text-[#176B45] font-mono block">CRYPTOGRAPHIC DIGEST</span>
                <span className="font-mono text-xs font-bold text-[#003B23]">
                  {truncateHash(batch.blockchainHash, 6, 4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Core Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
          <div>
            <span className="text-[10px] font-mono text-gray-400 uppercase block">Waste Category</span>
            <p className="font-semibold text-gray-800 mt-0.5">{batch.category || batch.collectionType || 'Mixed E-Waste'}</p>
          </div>

          <div>
            <span className="text-[10px] font-mono text-gray-400 uppercase block">Intake Depot Hub</span>
            <p className="font-semibold text-gray-800 mt-0.5">{batch.collectionFacility || 'Central Depot'}</p>
          </div>

          <div>
            <span className="text-[10px] font-mono text-gray-400 uppercase block">Collection Date</span>
            <p className="font-semibold text-gray-800 mt-0.5">{formatDate(batch.collectionDate || batch.createdAt)}</p>
          </div>

          <div>
            <span className="text-[10px] font-mono text-gray-400 uppercase block">Assigned Custodian</span>
            <p className="font-semibold text-gray-800 mt-0.5">{batch.assignedHandler || 'Authorized Field Agent'}</p>
          </div>
        </div>

        {/* Discrepancy Banner if present */}
        {hasDiscrepancy && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-red-900">Chain of Custody Discrepancy Flagged</strong>
              <p className="mt-0.5 text-red-700">
                {handovers.find(h => h.status === 'Discrepancy Detected')?.discrepancyReason ||
                  batch.notes ||
                  'Measured intake weight deviated from declared manifest outside statutory ±0.5kg tolerance.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5-Stage Custody Timeline for this specific batch */}
      <CustodyTimeline
        currentStep={stage.step}
        hasDiscrepancy={hasDiscrepancy}
      />

      {/* Actionable Next Step CTA Banner */}
      {action && action.type !== 'AUDIT_COMPLETE' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#003B23] to-[#176B45] text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/20 uppercase tracking-wide">
                Next Required Custody Action
              </span>
              <span className="text-xs text-white/80">Step 0{stage.step > 5 ? 5 : stage.step}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight">
              {action.label}
            </h3>
            <p className="text-xs text-white/80 max-w-xl">
              {action.description}
            </p>
          </div>

          <div className="shrink-0">
            {action.type === 'ASSIGN_TRANSPORTER' && (
              <button
                type="button"
                onClick={() => onAssignTransporter(bId, action.targetHandover)}
                className="px-4 py-2 bg-white text-[#003B23] hover:bg-gray-100 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Truck className="w-4 h-4 text-[#176B45]" />
                <span>Assign Transporter &amp; Dispatch</span>
              </button>
            )}

            {action.type === 'ACCEPT_TRANSPORTER' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onReportDiscrepancy(bId, action.targetHandover)}
                  className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all border border-red-400"
                >
                  Report Variance
                </button>
                <button
                  type="button"
                  onClick={() => onAcceptHandover(bId, action.targetHandover?.id || action.targetHandover?.handoverId)}
                  className="px-4 py-2 bg-white text-[#003B23] hover:bg-gray-100 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#176B45]" />
                  <span>Accept Custody</span>
                </button>
              </div>
            )}

            {action.type === 'RECORD_DEPOT_SCALE' && (
              <button
                type="button"
                onClick={() => onRecordDockScale(bId, action.targetHandover)}
                className="px-4 py-2 bg-white text-[#003B23] hover:bg-gray-100 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Scale className="w-4 h-4 text-[#176B45]" />
                <span>Record Dock Scale Weight</span>
              </button>
            )}

            {action.type === 'ASSIGN_RECYCLER' && (
              <button
                type="button"
                onClick={() => onAssignRecycler(bId, action.targetHandover)}
                className="px-4 py-2 bg-white text-[#003B23] hover:bg-gray-100 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Recycle className="w-4 h-4 text-[#176B45]" />
                <span>Assign Certified Recycler</span>
              </button>
            )}

            {action.type === 'ACCEPT_RECYCLER' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onReportDiscrepancy(bId, action.targetHandover)}
                  className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all border border-red-400"
                >
                  Report Variance
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmRecyclerIntake ? onConfirmRecyclerIntake(bId, action.targetHandover) : onAcceptHandover(bId, action.targetHandover?.id || action.targetHandover?.handoverId)}
                  className="px-4 py-2 bg-white text-[#003B23] hover:bg-gray-100 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#176B45]" />
                  <span>Confirm Recycler Intake</span>
                </button>
              </div>
            )}

            {action.type === 'NAVIGATE_RECOVERY' && (
              <button
                type="button"
                onClick={() => onNavigateRecovery ? onNavigateRecovery(bId) : null}
                className="px-4 py-2 bg-emerald-400 text-[#003B23] hover:bg-emerald-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Recycle className="w-4 h-4 text-[#003B23]" />
                <span>Record Metallurgy Recovery</span>
              </button>
            )}

            {action.type === 'CERTIFY_AUDIT' && (
              <button
                type="button"
                onClick={() => onCertifyAudit(bId)}
                className="px-4 py-2 bg-emerald-400 text-[#003B23] hover:bg-emerald-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Award className="w-4 h-4 text-[#003B23]" />
                <span>Certify Final Regulatory Audit</span>
              </button>
            )}

            {action.type === 'DISCREPANCY_FLAGGED' && (
              <button
                type="button"
                onClick={() => onReportDiscrepancy(bId, action.targetHandover)}
                className="px-4 py-2 bg-red-100 text-red-900 hover:bg-red-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span>Update Discrepancy Record</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Individual Handover Cards for this selected batch only */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#176B45]" />
            Sequential Custody Handover Ledger ({handovers.length} Handover{handovers.length === 1 ? '' : 's'})
          </h3>
          <span className="text-[11px] font-mono text-gray-500">Target Consignment: {bId}</span>
        </div>

        {handovers.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-[#E3EAE5] text-center text-gray-500 text-xs">
            <p className="font-semibold text-gray-700">No physical handovers initiated yet</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Assign a transporter to initiate the digital custody manifest for consignment {bId}.
            </p>
          </div>
        ) : (
          handovers.map((ho) => (
            <HandoverCard
              key={ho.id || ho.handoverId}
              batchId={bId}
              handover={{
                ...ho,
                id: ho.id || ho.handoverId,
                batchId: bId,
              }}
              parentBatch={batch}
              onAccept={(targetBatchId, hId) => onAcceptHandover(targetBatchId, hId)}
              onAssignTransporter={(targetBatchId, targetHo) => onAssignTransporter(targetBatchId, targetHo)}
              onRecordDockScale={(targetBatchId, targetHo) => onRecordDockScale(targetBatchId, targetHo)}
              onAssignRecycler={(targetBatchId, targetHo) => onAssignRecycler(targetBatchId, targetHo)}
              onConfirmRecyclerIntake={(targetBatchId, targetHo) => onConfirmRecyclerIntake ? onConfirmRecyclerIntake(targetBatchId, targetHo) : onAcceptHandover(targetBatchId, targetHo?.id || targetHo?.handoverId)}
              onCertifyAudit={(targetBatchId) => onCertifyAudit(targetBatchId)}
              onNavigateRecovery={(targetBatchId) => onNavigateRecovery ? onNavigateRecovery(targetBatchId) : null}
              onReportDiscrepancy={(targetBatchId, targetHo) => onReportDiscrepancy(targetBatchId, targetHo)}
              onViewEvidence={(targetHo) => onViewEvidence(targetHo)}
            />
          ))
        )}
      </div>

      {/* Evidence Attachments for Selected Batch */}
      {batch.evidenceFiles && batch.evidenceFiles.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-xs">
          <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#176B45]" />
            Consignment Evidence Files ({batch.evidenceFiles.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {batch.evidenceFiles.map((file, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-[#E3EAE5] bg-[#FAFCFA] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {file.type === 'photo' ? (
                    <img src={file.url} alt={file.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <FileText className="w-8 h-8 text-red-500 shrink-0 p-1 bg-red-50 rounded-lg" />
                  )}
                  <div className="truncate">
                    <p className="font-semibold text-gray-800 truncate">{file.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {file.size ? `${(file.size / 1024).toFixed(0)} KB` : 'Verified attachment'}
                    </p>
                  </div>
                </div>
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-[#176B45] rounded-lg transition-colors shrink-0"
                    title="View file"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
