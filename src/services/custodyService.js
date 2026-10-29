import { request } from './apiClient'

export async function assignTransporter(batchId, { transporterName, vehicleNumber, notes }) {
  const res = await request(`/custody/${batchId}/assign-transporter`, {
    method: 'POST',
    body: JSON.stringify({ transporterName, vehicleNumber, notes }),
  })
  return { data: res.data || res, source: 'backend', message: res.message }
}

export async function acceptHandover(batchId, handoverId, actorNotes = '') {
  const targetId = handoverId || batchId
  const res = await request(`/custody/${targetId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ actorNotes, batchId }),
  })
  return { data: res.data || res, source: 'backend', message: res.message }
}

export async function recordDepotReceipt(batchId, handoverId, { receivedWeight, scaleSlipId, dockNotes, evidenceNote }) {
  const targetId = handoverId || batchId
  const res = await request(`/custody/${targetId}/depot-receipt`, {
    method: 'POST',
    body: JSON.stringify({
      receivedWeight: Number(receivedWeight),
      scaleSlipId,
      dockNotes,
      evidenceNote,
      batchId,
    }),
  })
  return { data: res.data || res, source: 'backend', message: res.message }
}

export async function assignRecycler(batchId, handoverId, { facilityId, facilityName, notes }) {
  const targetId = handoverId || batchId
  const res = await request(`/custody/${targetId}/assign-recycler`, {
    method: 'POST',
    body: JSON.stringify({
      facilityId,
      facilityName,
      notes,
      batchId,
    }),
  })
  return { data: res.data || res, source: 'backend', message: res.message }
}

export async function reportDiscrepancy(batchId, handoverId, { reportedWeight, reason, evidenceNote }) {
  const targetId = handoverId || batchId
  const res = await request(`/custody/${targetId}/discrepancy`, {
    method: 'POST',
    body: JSON.stringify({
      reportedWeight: Number(reportedWeight),
      reason,
      evidenceNote,
      batchId,
    }),
  })
  return { data: res.data || res, source: 'backend', message: res.message }
}

export async function confirmRecyclerIntake(batchId, handoverId, payload = {}) {
  const targetId = handoverId || batchId
  const res = await request(`/custody/${targetId}/confirm-intake`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      batchId,
      receivedWeight: payload.receivedWeight !== undefined ? Number(payload.receivedWeight) : undefined,
    }),
  })
  return { data: res.data || res, source: 'backend', message: res.message, nextStage: res.nextStage }
}

export async function syncBatchLedger(batchId) {
  const res = await request(`/custody/${batchId}/sync`, {
    method: 'POST',
  })
  return {
    data: res.data || res,
    batch: res.batch,
    blockchain: res.blockchain,
    summary: res.summary,
    issues: res.issues,
    source: 'backend',
    message: res.message,
  }
}

export async function fetchBatchHandovers(batchId) {
  const res = await request(`/custody/${batchId}/handovers`)
  return { data: res.data || res, source: 'backend' }
}
