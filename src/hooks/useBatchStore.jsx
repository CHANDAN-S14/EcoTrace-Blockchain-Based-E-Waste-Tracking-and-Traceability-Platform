import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getLocalBatches,
  saveLocalBatches,
  fetchBatches,
  createBatch as createBatchApi,
  recordBatchSorting,
} from '../services/batchService'
import {
  getLocalRecoveryLogs,
  saveLocalRecoveryLogs,
  fetchRecoveryLogs,
  submitProcessingLog,
} from '../services/recoveryService'
import {
  acceptHandover as acceptHandoverApi,
  reportDiscrepancy as reportDiscrepancyApi,
  assignTransporter as assignTransporterApi,
  recordDepotReceipt as recordDepotReceiptApi,
  assignRecycler as assignRecyclerApi,
  confirmRecyclerIntake as confirmRecyclerIntakeApi,
  syncBatchLedger as syncBatchLedgerApi,
} from '../services/custodyService'
import { certifyBatchAudit as certifyBatchAuditApi } from '../services/auditService'
import { checkBackendHealth, getBackendStatus, request } from '../services/apiClient'
import { generateTxHash } from '../utils/hashUtils'
import { calculateMassBalance } from '../utils/massBalance'

const BatchContext = createContext(null)

export function BatchProvider({ children }) {
  const [batches, setBatches] = useState([])
  const [recoveryLogs, setRecoveryLogs] = useState([])
  const [facilities, setFacilities] = useState([])
  const [backendStatus, setBackendStatus] = useState(getBackendStatus())
  const [toasts, setToasts] = useState([])
  const [selectedBatchForModal, setSelectedBatchForModal] = useState(null)
  const [qrModalBatch, setQrModalBatch] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize store and sync with live backend if reachable
  useEffect(() => {
    async function init() {
      const isLive = await checkBackendHealth()
      setBackendStatus(getBackendStatus())

      if (isLive) {
        try {
          const [batchRes, recRes, facRes] = await Promise.all([
            fetchBatches(),
            fetchRecoveryLogs(),
            request('/facilities').catch(() => ({ data: [] })),
          ])

          if (batchRes.data && Array.isArray(batchRes.data)) {
            const formatted = batchRes.data.map(b => ({
              ...b,
              id: b.batchId || b.id,
            }))
            setBatches(formatted)
            saveLocalBatches(formatted)
          } else {
            setBatches(getLocalBatches())
          }

          if (recRes.data && Array.isArray(recRes.data)) {
            setRecoveryLogs(recRes.data)
            saveLocalRecoveryLogs(recRes.data)
          } else {
            setRecoveryLogs(getLocalRecoveryLogs())
          }

          if (facRes && Array.isArray(facRes.data)) {
            setFacilities(facRes.data)
          }

          setIsInitialized(true)
          return
        } catch (err) {
          console.warn('[EcoTrace] Fallback to local store', err)
        }
      }

      setBatches(getLocalBatches())
      setRecoveryLogs(getLocalRecoveryLogs())
      setIsInitialized(true)
    }

    init()
  }, [])

  // Toast dispatch helper
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9)
    const newToast = { id, type: 'success', duration: 4000, ...toast }
    setToasts(prev => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Refresh batches from backend API to maintain single source of truth
  const refreshBatches = useCallback(async () => {
    try {
      const batchRes = await fetchBatches()
      if (batchRes.data && Array.isArray(batchRes.data)) {
        const formatted = batchRes.data.map(b => ({
          ...b,
          id: b.batchId || b.id,
          handovers: (b.handovers || []).map(h => ({
            ...h,
            id: h.handoverId || h._id || h.id,
          })),
        }))
        setBatches(formatted)
        saveLocalBatches(formatted)
        return formatted
      }
    } catch (err) {
      console.warn('[useBatchStore] Failed to refresh batches:', err)
    }
  }, [])

  // Refresh facilities from backend API
  const refreshFacilities = useCallback(async () => {
    try {
      const facRes = await request('/facilities')
      if (facRes && Array.isArray(facRes.data)) {
        setFacilities(facRes.data)
        return facRes.data
      }
    } catch (err) {
      console.warn('[useBatchStore] Failed to refresh facilities:', err)
    }
  }, [])

  // Batch actions - Register New Batch with automatic backend ID assignment
  const registerNewBatch = useCallback(async (batchData) => {
    try {
      const result = await createBatchApi(batchData)
      const saved = result.data
      const rawType = (typeof FormData !== 'undefined' && batchData instanceof FormData)
        ? batchData.get('collectionType')
        : batchData?.collectionType

      const normalized = {
        ...saved,
        id: saved.batchId || saved.id,
        status: saved.status || 'Registered',
        collectionType: saved.collectionType || rawType || 'Mixed E-Waste',
      }

      await refreshBatches()

      addToast({
        type: 'success',
        title: 'Consignment Registered',
        message: `Batch ID: ${normalized.id} (${normalized.grossWeight} kg) anchored to cryptographic ledger.`,
      })

      return normalized
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Batch Registration Error',
        message: err.message || 'Failed to record batch on ledger.',
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Sorting and Reconciliation Action
  const handleSaveSorting = useCallback(async (batchId, sortingData) => {
    try {
      const result = await recordBatchSorting(batchId, sortingData)
      const updatedBatch = result.data
      const normalized = {
        ...updatedBatch,
        id: updatedBatch.batchId || updatedBatch.id,
      }

      setBatches(prev => {
        const updated = prev.map(b => ((b.id === batchId || b.batchId === batchId) ? normalized : b))
        saveLocalBatches(updated)
        return updated
      })

      if (selectedBatchForModal && (selectedBatchForModal.id === batchId || selectedBatchForModal.batchId === batchId)) {
        setSelectedBatchForModal(normalized)
      }

      const breakdown = normalized.sortingBreakdown
      const isExceeded = breakdown?.sortingStatus === 'Weight Difference Exceeded'

      if (isExceeded) {
        addToast({
          type: 'warning',
          title: 'Weight Variance Warning',
          message: `Difference of ${breakdown.sortingDifferenceKg > 0 ? '+' : ''}${breakdown.sortingDifferenceKg} kg exceeds 0.5 kg tolerance limit. Flagged for audit.`,
        })
      } else {
        addToast({
          type: 'success',
          title: 'Sorting Reconciled',
          message: `Total sorted weight of ${breakdown.totalSortedWeightKg} kg matches gross collection within tolerance limit.`,
        })
      }
      return normalized
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Sorting Submission Error',
        message: err.message || 'Failed to record material breakdown.',
      })
      throw err
    }
  }, [addToast, selectedBatchForModal])

  // Assign Transporter (Stage 1 -> 2)
  const handleAssignTransporter = useCallback(async (batchId, transporterDetails) => {
    try {
      const res = await assignTransporterApi(batchId, transporterDetails)
      await refreshBatches()
      addToast({
        type: 'success',
        title: 'Transporter Dispatched',
        message: `Transporter ${transporterDetails.transporterName} assigned to consignment ${batchId}.`,
      })
      return res
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Transporter Assignment Failed',
        message: err.message || 'Could not assign transporter.',
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Accept handover (Transporter custody or Recycler custody)
  const handleAcceptHandover = useCallback(async (batchId, handoverId, notes = '') => {
    try {
      const res = await acceptHandoverApi(batchId, handoverId, notes)
      await refreshBatches()
      addToast({
        type: 'success',
        title: 'Handover Accepted & Anchored',
        message: `Custody handover ${handoverId} accepted and anchored to blockchain.`,
      })
      return res
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Handover Acceptance Failed',
        message: err.message || 'Could not record custody acceptance.',
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Confirm Receiving Depot Receipt and Dock Scale Weighing (Stage 2 -> 3)
  const handleConfirmDepotReceipt = useCallback(async (batchId, handoverId, receiptDetails) => {
    try {
      const res = await recordDepotReceiptApi(batchId, handoverId, receiptDetails)
      await refreshBatches()
      const isDiscrepant = res.data?.discrepancyFlagged || res.discrepancyFlagged
      if (isDiscrepant) {
        addToast({
          type: 'warning',
          title: 'Weight Discrepancy Flagged',
          message: res.message || 'Scale discrepancy exceeds allowable 0.5 kg tolerance.',
        })
      } else {
        addToast({
          type: 'success',
          title: 'Dock Scale Verified',
          message: `Dock weight verified (${receiptDetails.receivedWeight} kg). Next stage activated.`,
        })
      }
      return res
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Depot Receipt Error',
        message: err.message || 'Could not record depot weighing.',
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Assign Certified Recycler (Stage 3 -> 4)
  const handleAssignRecycler = useCallback(async (batchId, handoverId, recyclerDetails) => {
    try {
      const res = await assignRecyclerApi(batchId, handoverId, recyclerDetails)
      await refreshBatches()
      addToast({
        type: 'success',
        title: 'Certified Recycler Assigned',
        message: `Consignment ${batchId} assigned to ${recyclerDetails.facilityName || 'authorized facility'}.`,
      })
      return res
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Recycler Assignment Failed',
        message: err.message || 'Could not assign recycler.',
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Confirm Certified Recycler Physical Intake (Stage 3 -> 4)
  const handleConfirmRecyclerIntake = useCallback(async (batchId, handoverId, intakeDetails) => {
    try {
      const res = await confirmRecyclerIntakeApi(batchId, handoverId, intakeDetails)
      await refreshBatches()
      const isDiscrepant = res.data?.status === 'Discrepancy Detected' || res.data?.discrepancyFlagged
      if (isDiscrepant) {
        addToast({
          type: 'warning',
          title: 'Intake Discrepancy Flagged',
          message: res.message || 'Recycler intake scale deviation exceeds ±0.5 kg tolerance.',
        })
      } else {
        addToast({
          type: 'success',
          title: 'Recycler Intake Confirmed',
          message: res.message || `Physical intake verified for ${batchId}. Recovery stage activated.`,
        })
      }
      return res
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Recycler Intake Error',
        message: err.message || 'Could not confirm recycler intake.',
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Sync Batch Ledger & Hash Chain Consensus
  const handleSyncLedger = useCallback(async (batchId) => {
    try {
      const res = await syncBatchLedgerApi(batchId)
      await refreshBatches()
      const summary = res.summary || {}
      const isChainValid = summary.hashChainValid !== false
      addToast({
        type: isChainValid ? 'success' : 'warning',
        title: 'Consignment Ledger Synced',
        message: `Ledger synced for ${batchId}. ${summary.verifiedOnChain || 0}/${summary.totalHandovers || 0} handovers verified on-chain. Cryptographic hash chain: ${isChainValid ? 'INTACT' : 'FLAGGED'}.`,
      })
      return res
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Ledger Sync Failed',
        message: err.message || `Could not sync ledger for consignment ${batchId}.`,
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Report discrepancy
  const handleReportDiscrepancy = useCallback(async (batchId, handoverId, { reportedWeight, reason, evidenceNote }) => {
    try {
      const res = await reportDiscrepancyApi(batchId, handoverId, { reportedWeight, reason, evidenceNote })
      await refreshBatches()

      // Also add to attention items
      setAttentionItems(prev => [
        {
          id: `ATTN-${Date.now()}`,
          type: 'MASS_BALANCE_MISMATCH',
          severity: 'critical',
          title: `Discrepancy Reported on ${batchId}`,
          description: `Variance noted during handover. Reported: ${reportedWeight} kg. Reason: ${reason}`,
          batchId,
          timestamp: new Date().toLocaleTimeString(),
          actionRequired: 'Audit physical scale calibration and driver manifest',
        },
        ...prev,
      ])

      addToast({
        type: 'warning',
        title: 'Discrepancy Flagged',
        message: `Batch ${batchId} marked for compliance audit due to weight mismatch.`,
      })
      return res
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Discrepancy Submission Failed',
        message: err.message || 'Could not report discrepancy.',
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Certify Regulatory Audit (Final Stage)
  const handleCertifyBatch = useCallback(async (batchId) => {
    // Stage gating check: verify consignment has been processed
    const target = (batches || []).find(b => (b.id === batchId || b.batchId === batchId))
    if (target && target.status !== 'Processed' && !target.processingData) {
      addToast({
        type: 'warning',
        title: 'Recovery Processing Required',
        message: `Consignment ${batchId} must undergo metallurgy processing and mass balance reconciliation before Final Audit certification.`,
      })
      return {
        success: false,
        requiresRecovery: true,
        batchId,
        message: 'Metallurgy processing and mass balance reconciliation required prior to audit.',
      }
    }

    try {
      const res = await certifyBatchAuditApi(batchId)
      await refreshBatches()
      addToast({
        type: 'success',
        title: 'Final Regulatory Audit Certified',
        message: `Consignment ${batchId} certified under CPCB standard. Certificate: ${res.data?.certificateId || res.certificateId}.`,
      })
      return {
        success: true,
        data: res.data || res,
      }
    } catch (err) {
      const isMissingRecovery =
        err.message?.includes('processing & recovery') ||
        err.message?.includes('RecoveryRecord') ||
        err.message?.includes('mass balance') ||
        err.response?.status === 400

      addToast({
        type: isMissingRecovery ? 'warning' : 'danger',
        title: isMissingRecovery ? 'Recovery Record Required' : 'Audit Certification Failed',
        message: isMissingRecovery
          ? `Consignment ${batchId} requires a reconciled metallurgy recovery record before final regulatory audit.`
          : (err.message || 'Could not certify consignment audit.'),
      })

      return {
        success: false,
        requiresRecovery: isMissingRecovery,
        batchId,
        error: err.message,
      }
    }
  }, [batches, addToast, refreshBatches])

  // Submit Processing and Recovery Log
  const handleProcessRecovery = useCallback(async (formData) => {
    try {
      const result = await submitProcessingLog(formData)
      const newRecord = result.data

      setRecoveryLogs(prev => {
        const filtered = prev.filter(r => r.claimId !== newRecord.claimId)
        const updated = [newRecord, ...filtered]
        saveLocalRecoveryLogs(updated)
        return updated
      })

      // Update batch in store
      setBatches(prev => {
        const updated = prev.map(b => {
          if (b.id === formData.batchId || b.batchId === formData.batchId) {
            return {
              ...b,
              status: newRecord.validationStatus === 'Reconciled' ? 'Processed' : 'Flagged Discrepancy',
              processingData: newRecord,
            }
          }
          return b
        })
        saveLocalBatches(updated)
        return updated
      })

      if (newRecord.validationStatus === 'Duplicate Claim') {
        addToast({
          type: 'danger',
          title: 'Duplicate Recovery Claim Detected!',
          message: newRecord.flagReason || `Batch ${formData.batchId} has already been claimed! Flagged for audit.`,
        })
      } else if (newRecord.validationStatus === 'Discrepancy Found' || newRecord.validationStatus === 'Discrepancy Detected') {
        addToast({
          type: 'warning',
          title: 'Weight Difference Found',
          message: `${Math.abs(newRecord.difference).toFixed(1)} kg weight gap exceeds allowed tolerance of 0.5 kg.`,
        })
      } else {
        addToast({
          type: 'success',
          title: 'Processing Record Submitted',
          message: `Reconciliation verified (Yield: ${newRecord.recoveryYield}%, Total Accounted: ${newRecord.accountedOutput} kg).`,
        })
      }

      await refreshBatches()

      return newRecord
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Submission Error',
        message: err.message || 'Failed to submit processing record.',
      })
      throw err
    }
  }, [addToast, refreshBatches])

  // Approve QpiAI Opt assignments
  const handleApproveAssignments = useCallback((assignments) => {
    setBatches(prev => {
      const updated = prev.map(batch => {
        const matched = assignments.find(a => a.batchId === batch.id)
        if (matched) {
          return {
            ...batch,
            status: 'In Transit',
            assignedFacility: matched.facilityName,
            assignedFacilityId: matched.facilityId,
            optimizationDispatchedAt: new Date().toISOString(),
          }
        }
        return batch
      })
      saveLocalBatches(updated)
      return updated
    })

    addToast({
      type: 'success',
      title: 'QpiAI Assignments Approved',
      message: `${assignments.length} batches dispatched according to optimal cost routing.`,
    })
  }, [addToast])

  // Update blockchain status in store
  const updateBatchBlockchainStatus = useCallback((batchId, status) => {
    setBatches(prev => {
      const updated = prev.map(b => ((b.id === batchId || b.batchId === batchId) ? { ...b, blockchainStatus: status } : b))
      saveLocalBatches(updated)
      return updated
    })
  }, [])

  // Calculated dynamic KPIs solely from authentic database records
  const grossIntakeKg = batches.reduce((sum, b) => sum + (Number(b.grossWeight) || 0), 0)
  const batchesInTransit = batches.filter(b => b.status === 'In Transit').length
  const recoveredWeightTotal = recoveryLogs.reduce((sum, r) => {
    const rec = Number(r.recoveredWeight) || (r.materials ? Object.values(r.materials).reduce((s, v) => s + (Number(v) || 0), 0) : 0)
    return sum + rec
  }, 0)
  const recoveryYieldPercent = grossIntakeKg > 0 ? Number(((recoveredWeightTotal / grossIntakeKg) * 100).toFixed(1)) : 0
  const flaggedDiscrepancyBatches = batches.filter(b => b.status === 'Flagged Discrepancy')
  const flaggedRecoveryClaims = recoveryLogs.filter(r => r.validationStatus === 'Duplicate Claim' || r.validationStatus === 'Discrepancy Detected' || r.validationStatus === 'Discrepancy Found')
  const flaggedClaimsCount = flaggedDiscrepancyBatches.length + flaggedRecoveryClaims.length

  const pendingHandoversCount = batches.reduce((count, b) => {
    const pending = b.handovers?.filter(h => h.status === 'Pending Review' || h.verificationStatus === 'Pending Verification') || []
    return count + pending.length
  }, 0)
  const confirmedHandoversCount = batches.reduce((count, b) => {
    const accepted = b.handovers?.filter(h => h.status === 'Accepted' || h.verificationStatus === 'Verified On-Chain') || []
    return count + accepted.length
  }, 0)

  // Real dynamic attention items
  const computedAttentionItems = [
    ...flaggedDiscrepancyBatches.map(b => ({
      id: `ATTN-${b.id || b.batchId}`,
      batchId: b.id || b.batchId,
      title: `Discrepancy in ${b.id || b.batchId}`,
      description: b.notes || `Discrepancy detected during custody/sorting for consignment ${b.id || b.batchId}.`,
      severity: 'high',
      type: 'discrepancy',
      timestamp: b.collectionDate || b.createdAt,
    })),
    ...flaggedRecoveryClaims.map(r => ({
      id: `ATTN-${r.claimId || r._id}`,
      batchId: r.batchId,
      title: `Discrepancy in Claim ${r.claimId || r._id}`,
      description: r.flagReason || `Mass balance deficit detected at ${r.facility}.`,
      severity: 'critical',
      type: 'recovery',
      timestamp: r.date || r.createdAt,
    })),
  ]

  const liveKPIs = {
    grossIntakeKg,
    totalBatches: batches.length,
    batchesInTransit,
    materialRecoveredKg: recoveredWeightTotal,
    recoveryYieldPercent,
    confirmedHandovers: confirmedHandoversCount,
    pendingCustodyHandovers: pendingHandoversCount,
    flaggedClaims: flaggedClaimsCount,
  }

  const value = {
    batches,
    recoveryLogs,
    attentionItems: computedAttentionItems,
    facilities,
    backendStatus,
    toasts,
    liveKPIs,
    isInitialized,
    selectedBatchForModal,
    setSelectedBatchForModal,
    qrModalBatch,
    setQrModalBatch,
    addToast,
    removeToast,
    refreshBatches,
    refreshFacilities,
    registerNewBatch,
    handleSaveSorting,
    handleAssignTransporter,
    handleAcceptHandover,
    handleConfirmDepotReceipt,
    handleAssignRecycler,
    handleConfirmRecyclerIntake,
    handleSyncLedger,
    handleReportDiscrepancy,
    handleCertifyBatch,
    handleProcessRecovery,
    handleApproveAssignments,
    updateBatchBlockchainStatus,
  }

  return <BatchContext.Provider value={value}>{children}</BatchContext.Provider>
}

export function useBatchStore() {
  const context = useContext(BatchContext)
  if (!context) {
    throw new Error('useBatchStore must be used within a BatchProvider')
  }
  return context
}
