import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Boxes,
  Truck,
  Building,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { CustodyTimeline } from '../components/custody/CustodyTimeline'
import { BatchSearchCombobox } from '../components/custody/BatchSearchCombobox'
import { BatchCustodyTable } from '../components/custody/BatchCustodyTable'
import { BatchCustodyWorkspace } from '../components/custody/BatchCustodyWorkspace'
import { DiscrepancyModal } from '../components/custody/DiscrepancyModal'
import { EvidenceViewerModal } from '../components/custody/EvidenceViewerModal'
import { AssignTransporterModal } from '../components/custody/AssignTransporterModal'
import { DepotScaleModal } from '../components/custody/DepotScaleModal'
import { AssignRecyclerModal } from '../components/custody/AssignRecyclerModal'
import { ConfirmRecyclerIntakeModal } from '../components/custody/ConfirmRecyclerIntakeModal'
import { AuditReportModal } from '../components/audit/AuditReportModal'
import { CustodyMap } from '../components/custody/CustodyMap'
import { SearchBar } from '../components/common/SearchBar'
import { useBatchStore } from '../hooks/useBatchStore'

export function ChainOfCustodyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const {
    batches,
    handleAssignTransporter,
    handleAcceptHandover,
    handleConfirmDepotReceipt,
    handleAssignRecycler,
    handleConfirmRecyclerIntake,
    handleSyncLedger,
    handleReportDiscrepancy,
    handleCertifyBatch,
    refreshBatches,
    isInitialized,
  } = useBatchStore()

  // Track selected batch from URL parameter for seamless navigation and persistence across reloads
  const urlBatchId = searchParams.get('batch') || ''
  const [selectedBatchId, setSelectedBatchId] = useState(urlBatchId)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal Targets
  const [activeTransporterTarget, setActiveTransporterTarget] = useState(null)
  const [activeDepotScaleTarget, setActiveDepotScaleTarget] = useState(null)
  const [activeRecyclerTarget, setActiveRecyclerTarget] = useState(null)
  const [activeRecyclerIntakeTarget, setActiveRecyclerIntakeTarget] = useState(null)
  const [activeDiscrepancyTarget, setActiveDiscrepancyTarget] = useState(null)
  const [activeEvidenceTarget, setActiveEvidenceTarget] = useState(null)
  const [activeAuditReportBatch, setActiveAuditReportBatch] = useState(null)

  // Keep state in sync with URL
  useEffect(() => {
    if (urlBatchId !== selectedBatchId) {
      setSelectedBatchId(urlBatchId)
    }
  }, [urlBatchId])

  const handleSelectBatch = (bId) => {
    setSelectedBatchId(bId)
    if (bId) {
      setSearchParams({ batch: bId })
    } else {
      setSearchParams({})
    }
  }

  // Selected batch object
  const selectedBatch = useMemo(() => {
    if (!selectedBatchId) return null
    return batches.find(b => (b.batchId || b.id) === selectedBatchId) || null
  }, [batches, selectedBatchId])

  // Aggregate stats across all batches
  const { pendingSignoffsCount, discrepanciesFlaggedCount, inTransitCount } = useMemo(() => {
    let pending = 0
    let discrepancies = 0
    let inTransit = 0

    batches.forEach(b => {
      if (b.status === 'In Transit') inTransit++
      if (b.status === 'Flagged Discrepancy') discrepancies++

      const handovers = Array.isArray(b.handovers) ? b.handovers : []
      handovers.forEach(h => {
        if (h.status === 'Pending Review' || h.status === 'Pending') pending++
        if (h.status === 'Discrepancy Detected') discrepancies++
      })
    })

    return {
      pendingSignoffsCount: pending,
      discrepanciesFlaggedCount: discrepancies,
      inTransitCount: inTransit,
    }
  }, [batches])

  // Direct action execution from directory table
  const handleExecuteAction = async (batch, action) => {
    const bId = batch.batchId || batch.id

    if (action.type === 'ASSIGN_TRANSPORTER') {
      setActiveTransporterTarget({ batchId: bId, handover: action.targetHandover })
    } else if (action.type === 'RECORD_DEPOT_SCALE') {
      setActiveDepotScaleTarget({ batchId: bId, handover: action.targetHandover })
    } else if (action.type === 'ASSIGN_RECYCLER') {
      setActiveRecyclerTarget({ batchId: bId, handover: action.targetHandover })
    } else if (action.type === 'ACCEPT_TRANSPORTER') {
      await handleAcceptHandover(bId, action.targetHandover?.id || action.targetHandover?.handoverId)
      await refreshBatches()
    } else if (action.type === 'ACCEPT_RECYCLER') {
      setActiveRecyclerIntakeTarget({ batchId: bId, handover: action.targetHandover })
    } else if (action.type === 'CERTIFY_AUDIT') {
      await handleCertifyBatch(bId)
      await refreshBatches()
    } else if (action.type === 'DISCREPANCY_FLAGGED') {
      setActiveDiscrepancyTarget({ batchId: bId, handover: action.targetHandover })
    } else if (action.type === 'NAVIGATE_RECOVERY') {
      navigate('/recovery')
    } else {
      handleSelectBatch(bId)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Handover &amp; Custody
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Select a consignment to inspect and process physical custody handovers across transporters, receiving depots, and certified recyclers.
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#176B45] border border-[#C2E3D0]">
            {batches.length} Consignments Tracked
          </span>

          {pendingSignoffsCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF5E7] text-[#B8741A] border border-[#FAD7A0]">
              {pendingSignoffsCount} Pending Sign-offs
            </span>
          )}

          {discrepanciesFlaggedCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF2F2] text-[#D94F4F] border border-[#F8B4B4]">
              {discrepanciesFlaggedCount} Discrepancies Flagged
            </span>
          )}
        </div>
      </div>

      {/* 1. Top Searchable Combobox Matching Exact Format */}
      <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-xs">
        <label className="block text-xs font-bold text-[#003B23] mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-[#176B45]" />
            Select Consignment to Inspect &amp; Process
          </span>
          <span className="text-[10px] font-mono font-normal text-gray-400">
            Type ID, weight, or waste type
          </span>
        </label>

        <BatchSearchCombobox
          batches={batches}
          selectedBatchId={selectedBatchId}
          onSelectBatch={handleSelectBatch}
          placeholder="Search consignment (e.g. EW-2026-00095 — 100 kg)..."
        />
      </div>

      {/* 2. Workspace View vs Directory List View */}
      {selectedBatch ? (
        /* Dedicated Individual Batch Processing Workspace */
        <BatchCustodyWorkspace
          batch={selectedBatch}
          onBack={() => handleSelectBatch('')}
          onRefresh={async () => {
            if (selectedBatchId) {
              await handleSyncLedger(selectedBatchId)
            } else {
              await refreshBatches()
            }
          }}
          onAssignTransporter={(bId, ho) => setActiveTransporterTarget({ batchId: bId, handover: ho })}
          onAcceptHandover={async (bId, hId) => {
            await handleAcceptHandover(bId, hId)
            await refreshBatches()
          }}
          onRecordDockScale={(bId, ho) => setActiveDepotScaleTarget({ batchId: bId, handover: ho })}
          onAssignRecycler={(bId, ho) => setActiveRecyclerTarget({ batchId: bId, handover: ho })}
          onConfirmRecyclerIntake={(bId, ho) => setActiveRecyclerIntakeTarget({ batchId: bId, handover: ho })}
          onNavigateRecovery={(bId) => {
            navigate(`/recovery?batch=${encodeURIComponent(bId)}`)
          }}
          onCertifyAudit={async (bId) => {
            try {
              const res = await handleCertifyBatch(bId)
              if (res?.requiresRecovery) {
                navigate(`/recovery?batch=${encodeURIComponent(bId)}`)
                return
              }
              await refreshBatches()
            } catch (err) {
              console.warn('[Custody] Handled certify audit notice:', err.message)
            }
          }}
          onReportDiscrepancy={(bId, ho) => setActiveDiscrepancyTarget({ batchId: bId, handover: ho })}
          onViewEvidence={(ho) => setActiveEvidenceTarget(ho)}
          onViewAuditReport={(b) => setActiveAuditReportBatch(b)}
        />
      ) : (
        /* Overall Multi-Party Pipeline Overview and Compact Batches Table */
        <div className="space-y-6">
          {/* Multi-Party Chain of Custody Pipeline Banner */}
          <CustodyTimeline
            currentStep={inTransitCount > 0 ? 2 : 1}
            hasDiscrepancy={discrepanciesFlaggedCount > 0}
          />

          {/* Search bar above table */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search directory by Batch ID, source organization, facility, or stage..."
              className="flex-1"
            />
          </div>

          {/* Compact Directory Table */}
          <BatchCustodyTable
            batches={batches}
            onSelectBatch={handleSelectBatch}
            onExecuteAction={handleExecuteAction}
            searchQuery={searchQuery}
            isLoading={!isInitialized}
          />
        </div>
      )}

      {/* Logistics Corridors Geographic Map */}
      {/* <CustodyMap /> */}

      {/* Shared Lifecycle Modals */}
      {activeTransporterTarget && (
        <AssignTransporterModal
          isOpen={true}
          batchId={activeTransporterTarget.batchId}
          handover={activeTransporterTarget.handover}
          onClose={() => setActiveTransporterTarget(null)}
          onSubmit={async (details) => {
            await handleAssignTransporter(activeTransporterTarget.batchId, details)
            await refreshBatches()
            setActiveTransporterTarget(null)
          }}
        />
      )}

      {activeDepotScaleTarget && (
        <DepotScaleModal
          isOpen={true}
          batchId={activeDepotScaleTarget.batchId}
          handover={activeDepotScaleTarget.handover}
          onClose={() => setActiveDepotScaleTarget(null)}
          onSubmit={async (details) => {
            await handleConfirmDepotReceipt(
              activeDepotScaleTarget.batchId,
              activeDepotScaleTarget.handover?.id || activeDepotScaleTarget.handover?.handoverId,
              details
            )
            await refreshBatches()
            setActiveDepotScaleTarget(null)
          }}
        />
      )}

      {activeRecyclerTarget && (
        <AssignRecyclerModal
          isOpen={true}
          batchId={activeRecyclerTarget.batchId}
          handover={activeRecyclerTarget.handover}
          onClose={() => setActiveRecyclerTarget(null)}
          onSubmit={async (details) => {
            await handleAssignRecycler(
              activeRecyclerTarget.batchId,
              activeRecyclerTarget.handover?.id || activeRecyclerTarget.handover?.handoverId,
              details
            )
            await refreshBatches()
            setActiveRecyclerTarget(null)
          }}
        />
      )}

      {activeRecyclerIntakeTarget && (
        <ConfirmRecyclerIntakeModal
          isOpen={true}
          batchId={activeRecyclerIntakeTarget.batchId}
          handover={activeRecyclerIntakeTarget.handover}
          onClose={() => setActiveRecyclerIntakeTarget(null)}
          onSubmit={async (details) => {
            await handleConfirmRecyclerIntake(
  activeRecyclerIntakeTarget.batchId,
  activeRecyclerIntakeTarget.handover?.id ||
    activeRecyclerIntakeTarget.handover?.handoverId,
  details
)
            await refreshBatches()
            setActiveRecyclerIntakeTarget(null)
          }}
        />
      )}

      {activeDiscrepancyTarget && (
        <DiscrepancyModal
          isOpen={true}
          batchId={activeDiscrepancyTarget.batchId}
          handover={activeDiscrepancyTarget.handover}
          onClose={() => setActiveDiscrepancyTarget(null)}
          onSubmit={async (details) => {
            await handleReportDiscrepancy(
              activeDiscrepancyTarget.batchId,
              activeDiscrepancyTarget.handover?.id || activeDiscrepancyTarget.handover?.handoverId,
              details
            )
            await refreshBatches()
            setActiveDiscrepancyTarget(null)
          }}
        />
      )}

      {activeEvidenceTarget && (
        <EvidenceViewerModal
          isOpen={true}
          handover={activeEvidenceTarget}
          onClose={() => setActiveEvidenceTarget(null)}
        />
      )}

      {activeAuditReportBatch && (
        <AuditReportModal
          isOpen={true}
          batch={activeAuditReportBatch}
          onClose={() => setActiveAuditReportBatch(null)}
        />
      )}
    </div>
  )
}
