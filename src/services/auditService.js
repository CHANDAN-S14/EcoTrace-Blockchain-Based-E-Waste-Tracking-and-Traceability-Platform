import { request, fetchBlob, triggerBlobDownload, createBlobPreviewUrl, buildApiUrl } from './apiClient'
import { getLocalBatches } from './batchService'
import { getLocalRecoveryLogs } from './recoveryService'

/**
 * Fetches blockchain network status and contract deployment information
 */
export async function fetchBlockchainStatus() {
  try {
    const res = await request('/blockchain/status')
    return res.data || res
  } catch (err) {
    return {
      connected: false,
      network: 'Unknown',
      mode: 'Offline',
      error: err.message,
    }
  }
}

/**
 * Fetches audit records from backend API or falls back to local data store
 */
export async function fetchAuditRecords({ query = '', statusFilter = 'ALL', forceRefresh = false } = {}) {
  try {
    const timestamp = forceRefresh ? `&_t=${Date.now()}` : `&_t=${Date.now()}`
    const res = await request(`/audit/records?q=${encodeURIComponent(query)}&status=${statusFilter}${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store',
      },
    })
    const payload = res.data || res
    const records = Array.isArray(payload.records)
      ? payload.records
      : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload)
      ? payload
      : []

    return {
      records,
      facilities: Array.isArray(payload.facilities) ? payload.facilities : [],
      recentAuditEvents: payload.recentAuditEvents || [],
      source: 'backend',
    }
  } catch (err) {
    console.warn('[AuditService] Backend fetch fallback:', err.message)
    const batches = getLocalBatches()
    const recoveryLogs = getLocalRecoveryLogs()

    const records = batches.map(batch => {
      const recovery = recoveryLogs.find(r => r.batchId === batch.id) || batch.processingData
      const hasDiscrepancy = batch.status === 'Flagged Discrepancy' || recovery?.validationStatus === 'Discrepancy Detected'
      const isDuplicate = recovery?.validationStatus === 'Duplicate Claim'
      const hasMissingHandover = batch.handovers?.some(h => h.status === 'Pending Review' || !h.verifiedAt)

      let auditStatus = 'Pending Verification'
      if (isDuplicate) auditStatus = 'Duplicate Claim'
      else if (hasDiscrepancy) auditStatus = 'Discrepancy Detected'
      else if (batch.status === 'In Transit') auditStatus = 'In Transit'
      else if (batch.blockchainHash) auditStatus = 'Anchored'
      else if (batch.status === 'Processed') auditStatus = 'Verified'

      return {
        batchId: batch.id,
        category: batch.category,
        grossWeight: batch.grossWeight,
        sourceOrg: batch.sourceOrg,
        collectionFacility: batch.collectionFacility || 'CPCB Hub',
        collectionDate: batch.collectionDate,
        blockchainHash: batch.blockchainHash || '',
        blockchainStatus: batch.blockchainHash ? 'ANCHORED' : 'PENDING',
        evidenceHash: batch.evidenceHash || '',
        auditStatus,
        recovery,
        handovers: batch.handovers || [],
        auditTrail: [],
        notes: batch.notes,
        flagReason: recovery?.flagReason,
      }
    })

    const filtered = records.filter(r => {
      const matchesQuery = query === '' ||
        r.batchId.toLowerCase().includes(query.toLowerCase()) ||
        r.sourceOrg.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase()) ||
        r.blockchainHash?.toLowerCase().includes(query.toLowerCase())

      const matchesStatus = statusFilter === 'ALL' || r.auditStatus === statusFilter
      return matchesQuery && matchesStatus
    })

    return {
      records: filtered,
      facilities: [],
      attentionItems: [],
      source: 'local',
    }
  }
}

/**
 * Verifies batch evidence digest against live on-chain smart contract
 */
export async function verifyBatchOnChain(batchId, evidenceHash) {
  try {
    const res = await request('/blockchain/verify', {
      method: 'POST',
      body: JSON.stringify({ batchId, evidenceHash }),
    })
    return res.data || res
  } catch (err) {
    return {
      verified: false,
      isLiveRpc: false,
      message: err.message || 'Verification request failed',
      batchId,
    }
  }
}

/**
 * Anchors an unanchored batch to the smart contract
 */
export async function anchorBatchToBlockchain(batchId, evidenceHash) {
  return await request(`/blockchain/anchor/${batchId}`, {
    method: 'POST',
    body: JSON.stringify({ evidenceHash }),
  })
}

/**
 * Re-anchors an amended consignment under an immutable versioned identifier (e.g., V2)
 */
export async function reAnchorVersionedBatch(batchId, reason) {
  return await request('/blockchain/re-anchor-versioned', {
    method: 'POST',
    body: JSON.stringify({ batchId, reason }),
  })
}

/**
 * Certifies a batch upon final regulatory compliance audit
 */
export async function certifyBatchAudit(batchId) {
  const res = await request(`/audit/${batchId}/certify`, {
    method: 'POST',
  })
  return res.data || res
}

/**
 * Fetches transaction event logs for a batch
 */
export async function fetchBatchAuditEvents(batchId) {
  try {
    const res = await request(`/blockchain/transactions/${batchId}`)
    return res.data || []
  } catch {
    return []
  }
}

/**
 * Fetches comprehensive, real-data audit report dossier for a consignment
 */
export async function fetchBatchFullAuditReport(batchId) {
  try {
    const res = await request(`/audit/report/${batchId}`)
    return res.data || res.report || res
  } catch (err) {
    console.warn(`[AuditService] Could not fetch remote audit dossier for ${batchId}:`, err.message)
    return null
  }
}

/**
 * Returns a direct URL for the batch audit PDF (for window.open or iframe src)
 */
export function getBatchAuditPdfUrl(batchId, inline = false) {
  const cleanId = String(batchId || '').trim().replace(/\.pdf$/i, '')
  return buildApiUrl(`/audit/report/${encodeURIComponent(cleanId)}/pdf${inline ? '?view=true' : ''}`)
}

/**
 * Downloads comprehensive PDF audit report for a consignment
 */
export async function downloadBatchAuditPdf(batchId) {
  const cleanId = String(batchId || '').trim().replace(/\.pdf$/i, '')
  if (!cleanId) {
    throw new Error('Batch ID is required to download audit PDF.')
  }

  const result = await fetchBlob(`/audit/report/${encodeURIComponent(cleanId)}/pdf`)
  const targetFilename = result.filename || `EcoTrace_Audit_Report_${cleanId}.pdf`
  triggerBlobDownload(result.blob, targetFilename)
  return { ok: true, filename: targetFilename }
}

/**
 * Retrieves PDF blob and returns a preview URL for inline viewing or browser tab
 */
export async function viewBatchAuditPdf(batchId) {
  const cleanId = String(batchId || '').trim().replace(/\.pdf$/i, '')
  if (!cleanId) {
    throw new Error('Batch ID is required to view audit PDF.')
  }

  const result = await fetchBlob(`/audit/report/${encodeURIComponent(cleanId)}/pdf?view=true`)
  const preview = createBlobPreviewUrl(result.blob)
  return {
    ok: true,
    url: preview.url,
    blob: result.blob,
    filename: result.filename || `EcoTrace_Audit_Report_${cleanId}.pdf`,
    revoke: preview.revoke,
  }
}

/**
 * Downloads CSV audit dataset for a consignment
 */
export async function downloadBatchAuditCsv(batchId) {
  const cleanId = String(batchId || '').trim().replace(/\.pdf$/i, '')
  if (!cleanId) {
    throw new Error('Batch ID is required to download audit CSV.')
  }

  const result = await fetchBlob('/reports/export/csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchIds: [cleanId] }),
  })
  const targetFilename = result.filename || `EcoTrace_Audit_${cleanId}.csv`
  triggerBlobDownload(result.blob, targetFilename)
  return { ok: true, filename: targetFilename }
}

