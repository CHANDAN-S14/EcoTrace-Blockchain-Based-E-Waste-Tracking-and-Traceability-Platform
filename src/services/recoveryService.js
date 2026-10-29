import { request } from './apiClient'
import { getLocalBatches, saveLocalBatches } from './batchService'
import { calculateMassBalance } from '../utils/massBalance'

const RECOVERY_LOGS_KEY = 'ecotrace_recovery_logs_v1'

export function getLocalRecoveryLogs() {
  try {
    const saved = localStorage.getItem(RECOVERY_LOGS_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error('Failed to read recovery logs', e)
  }
  return []
}

export function saveLocalRecoveryLogs(logs) {
  try {
    localStorage.setItem(RECOVERY_LOGS_KEY, JSON.stringify(logs))
  } catch (e) {
    console.error('Failed to save recovery logs', e)
  }
}

export async function fetchRecoveryLogs() {
  try {
    const res = await request('/recovery')
    const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    saveLocalRecoveryLogs(list)
    return { data: list, source: 'backend' }
  } catch (err) {
    console.warn('[recoveryService] Backend fetch warning:', err.message)
    return { data: getLocalRecoveryLogs(), source: 'local' }
  }
}

export async function submitProcessingLog(formData) {
  try {
    const res = await request('/recovery', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
    const saved = res.data || res
    return { data: saved, source: 'backend', message: res.message }
  } catch (err) {
    console.error('[recoveryService] Submit processing log failed:', err)
    throw err
  }
}

export async function verifyClaimOnChain(claimId) {
  try {
    const res = await request(`/recovery/claims/${claimId}/verify`)
    return res.data
  } catch (err) {
    return {
      claimId,
      verifiedOnChain: false,
      error: err.message || 'Verification unavailable',
      timestamp: new Date().toISOString(),
    }
  }
}

export async function uploadEvidenceFile(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await request('/upload', {
      method: 'POST',
      body: formData,
    })
    return res.data || res
  } catch {
    return {
      name: file.name,
      filename: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      mimetype: file.type,
      type: file.type.startsWith('image/') ? 'photo' : 'document',
    }
  }
}

export async function uploadCameraSnapshot(base64Data, filename = 'camera_capture.jpg') {
  try {
    const res = await request('/upload/base64', {
      method: 'POST',
      body: JSON.stringify({ base64Data, filename }),
    })
    return res.data
  } catch {
    return {
      name: filename,
      filename,
      url: base64Data,
      size: Math.round(base64Data.length * 0.75),
      mimetype: 'image/jpeg',
      type: 'photo',
    }
  }
}
