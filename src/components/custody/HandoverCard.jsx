import React from 'react'
import {
  Scale,
  Calendar,
  MapPin,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Building,
  Recycle,
  Award,
} from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'
import { formatWeight, formatDate, truncateHash } from '../../utils/formatters'

export function HandoverCard({
  batchId,
  handover,
  parentBatch,
  onAccept,
  onAssignTransporter,
  onRecordDockScale,
  onAssignRecycler,
  onConfirmRecyclerIntake,
  onCertifyAudit,
  onNavigateRecovery,
  onReportDiscrepancy,
  onViewEvidence,
}) {
  const isPending = handover.status === 'Pending Review' || handover.status === 'Pending'
  const isDiscrepant = handover.status === 'Discrepancy Detected' || (handover.variance && Math.abs(handover.variance) > 0.5)

  const varianceKg = handover.variance !== undefined && handover.variance !== null
    ? handover.variance
    : handover.receivedWeight !== null && handover.receivedWeight !== undefined
    ? Number((handover.receivedWeight - handover.dispatchWeight).toFixed(2))
    : 0


const stageName = handover.stage || ''

const isStep1 =
  Number(handover.step) === 1 ||
  stageName.includes('Collection Center')

const isStep2 =
  Number(handover.step) === 2 ||
  stageName.includes('Transporter → Receiving Facility')

const isStep3 =
  Number(handover.step) === 3 ||
  stageName.includes('Receiving Facility → Recycler')

const isStep4 =
  Number(handover.step) === 4 ||
  stageName.includes('Final Audit')

  const needsTransporterAssignment = isStep1 && (!handover.receiver || handover.receiver.includes('Pending'))
  const needsRecyclerAssignment = isStep3 && (!handover.receiver || handover.receiver.includes('Pending'))

  const isParentProcessed = parentBatch?.status === 'Processed' || Boolean(parentBatch?.processingData)

  const canCertifyFinalAudit =
    isStep4 &&
    handover.status === 'Accepted' &&
    isParentProcessed &&
    parentBatch?.status !== 'Audited' &&
    parentBatch?.status !== 'Flagged Discrepancy'

  const needsRecoveryProcessing =
    isStep4 &&
    handover.status === 'Accepted' &&
    !isParentProcessed &&
    parentBatch?.status !== 'Audited' &&
    parentBatch?.status !== 'Flagged Discrepancy'

  return (
    <div
      className={`bg-white rounded-2xl p-5 border transition-all ${
        isDiscrepant
          ? 'border-[#F8B4B4] shadow-xs'
          : isPending
          ? 'border-[#FAD7A0] shadow-xs'
          : 'border-[#E3EAE5]'
      }`}
    >
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F4F7F5]">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs text-[#176B45]">{batchId}</span>
          <span className="text-xs font-semibold text-[#26352E]">
            Step 0{handover.step || 1}: {handover.stage}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={handover.status} size="xs" />
          <StatusBadge status={handover.verificationStatus} size="xs" />
        </div>
      </div>

      {/* Custody Route Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <div className="p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5]">
          <span className="text-[10px] font-mono text-[#8C9B93] uppercase block">
            Dispatching Custodian (Sender)
          </span>
          <p className="text-xs font-semibold text-[#26352E] mt-0.5">{handover.sender}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <Scale className="w-3.5 h-3.5 text-[#176B45]" />
            <span className="text-[#66756D]">Dispatched Weight:</span>
            <strong className="font-mono text-[#26352E]">
              {formatWeight(handover.dispatchWeight)}
            </strong>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5]">
          <span className="text-[10px] font-mono text-[#8C9B93] uppercase block">
            Receiving Custodian (Receiver)
          </span>
          <p className="text-xs font-semibold text-[#26352E] mt-0.5">
            {handover.receiver}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <Scale className="w-3.5 h-3.5 text-[#239B66]" />
            <span className="text-[#66756D]">Received Weight:</span>
            <strong className="font-mono text-[#26352E]">
              {handover.receivedWeight !== null && handover.receivedWeight !== undefined
                ? formatWeight(handover.receivedWeight)
                : 'Pending Scale Verification'}
            </strong>
            {handover.receivedWeight !== null && varianceKg !== 0 && (
              <span
                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  Math.abs(varianceKg) > 0.5
                    ? 'bg-[#FDF2F2] text-[#D94F4F]'
                    : 'bg-[#FEF5E7] text-[#B8741A]'
                }`}
              >
                {varianceKg > 0 ? `+${varianceKg.toFixed(2)}` : varianceKg.toFixed(2)} kg
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Discrepancy Reason if present */}
      {handover.discrepancyReason && (
        <div className="mb-3 p-2.5 rounded-xl bg-[#FDF2F2] border border-[#F8B4B4] text-xs text-[#D94F4F] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block">Discrepancy Detail:</strong>
            <span>{handover.discrepancyReason}</span>
          </div>
        </div>
      )}

      {/* Actor / Process Notes if present */}
      {handover.actorNotes && (
        <div className="mb-3 p-2 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5] text-[11px] text-[#66756D]">
          <span className="font-semibold text-[#26352E]">Handover Manifest Notes: </span>
          {handover.actorNotes}
        </div>
      )}

      {/* Metadata & Blockchain Anchor */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#66756D] gap-2 pt-2 border-t border-[#F4F7F5]">
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#8C9B93]" />
            {handover.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#8C9B93]" />
            {formatDate(handover.date)}
          </span>
          {handover.txHash && (
            <span className="font-mono text-[10px] text-[#176B45] flex items-center gap-1 bg-[#E8F5EE] px-2 py-0.5 rounded border border-[#C2E3D0]">
              <ShieldCheck className="w-3 h-3" />
              Tx: {truncateHash(handover.txHash, 6, 4)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {handover.evidenceUrl && (
            <button
              type="button"
              onClick={() => onViewEvidence(handover)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#176B45] hover:bg-[#E8F5EE] rounded-lg transition-colors border border-[#C2E3D0] cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Evidence</span>
            </button>
          )}

          {/* Step 1: Assign Transporter Button */}
          {needsTransporterAssignment && onAssignTransporter && (
            <button
              type="button"
              onClick={() => onAssignTransporter(batchId, handover)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Assign Transporter &amp; Dispatch</span>
            </button>
          )}

          {/* Step 2: Receiving Depot Dock Scale Weighing */}
          {isStep2 && isPending && onRecordDockScale && (
            <button
              type="button"
              onClick={() => onRecordDockScale(batchId, handover)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Record Dock Scale Weight</span>
            </button>
          )}

          {/* Step 3: Assign Certified Recycler */}
          {needsRecyclerAssignment && onAssignRecycler && (
            <button
              type="button"
              onClick={() => onAssignRecycler(batchId, handover)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Recycle className="w-3.5 h-3.5" />
              <span>Assign Certified Recycler</span>
            </button>
          )}

          {/* Generic Pending Accept / Discrepancy actions */}
          {isPending &&
  (isStep1 || isStep3) &&
  !needsTransporterAssignment &&
  !needsRecyclerAssignment && (
            <>
              <button
                type="button"
               onClick={() => {
  if (isStep3 && onConfirmRecyclerIntake) {
    onConfirmRecyclerIntake(batchId, handover)
  } else {
    onAccept(batchId, handover.id || handover.handoverId)
  }
}}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#D94F4F] bg-[#FDF2F2] hover:bg-[#FEE2E2] rounded-lg transition-colors border border-[#F8B4B4] cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Report Discrepancy</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isStep3 && onConfirmRecyclerIntake) {
                    onConfirmRecyclerIntake(batchId, handover)
                  } else {
                    onAccept(batchId, handover.id || handover.handoverId)
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isStep1
                    ? 'Accept Transporter Custody'
                    : isStep3
                    ? 'Confirm Recycler Intake'
                    : 'Accept Handover'}
                </span>
              </button>
            </>
          )}

          {/* Recovery Required CTA if Step 4 is reached but batch has not been processed */}
          {needsRecoveryProcessing && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Processing &amp; recovery record required
              </span>
              {onNavigateRecovery && (
                <button
                  type="button"
                  onClick={() => onNavigateRecovery(batchId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 cursor-pointer shadow-xs"
                  title="Navigate to Recovery section to enter material breakdown and mass balance"
                >
                  <Recycle className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Record Metallurgy Recovery</span>
                </button>
              )}
            </div>
          )}

          {/* Final Audit Certification CTA if ready */}
          {canCertifyFinalAudit && onCertifyAudit && (
            <button
              type="button"
              onClick={() => onCertifyAudit(batchId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 cursor-pointer shadow-xs"
            >
              <Award className="w-3.5 h-3.5 text-emerald-700" />
              <span>Certify Final Regulatory Audit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
