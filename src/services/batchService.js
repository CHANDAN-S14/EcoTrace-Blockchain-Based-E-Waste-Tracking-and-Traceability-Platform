import { request } from './apiClient.js'

const LOCAL_STORAGE_KEY = 'ecotrace_batches_v1'

export function getLocalBatches() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to read from localStorage', e)
  }
  return []
}

export function saveLocalBatches(batches) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(batches))
  } catch (e) {
    console.error('Failed to save to localStorage', e)
  }
}

export async function fetchBatches() {
  try {
    const res = await request('/batches')
    const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    saveLocalBatches(list)
    return { data: list, source: 'backend' }
  } catch (err) {
    console.warn('[batchService] Backend fetch warning:', err.message)
    return { data: getLocalBatches(), source: 'local' }
  }
}

export async function createBatch(batchData) {
  const isFormData = typeof FormData !== 'undefined' && batchData instanceof FormData

  try {
    const res = await request('/batches', {
      method: 'POST',
      body: isFormData ? batchData : JSON.stringify(batchData),
    })
    return { data: res.data || res, source: 'backend' }
  } catch (err) {
    console.error('[batchService] Batch registration failed:', err)
    throw err
  }
}

export async function updateBatch(batchId, updates) {
  try {
    const res = await request(`/batches/${batchId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return { data: res.data || res, source: 'backend' }
  } catch {
    const batches = getLocalBatches()
    const updated = batches.map(b => ((b.id === batchId || b.batchId === batchId) ? { ...b, ...updates } : b))
    saveLocalBatches(updated)
    return { data: updated.find(b => (b.id === batchId || b.batchId === batchId)), source: 'local' }
  }
}

export async function recordBatchSorting(batchId, sortingData) {
  try {
    const res = await request(`/batches/${batchId}/sorting`, {
      method: 'POST',
      body: JSON.stringify(sortingData),
    })
    return { data: res.data || res, source: 'backend', message: res.message }
  } catch (err) {
    const batches = getLocalBatches()
    const target = batches.find(b => (b.batchId || b.id) === batchId)
    if (!target) throw err

    const totalSortedWeightKg = Number(
      sortingData.categories.reduce((acc, cat) => acc + (Number(cat.weightKg) || 0), 0).toFixed(2)
    )
    const differenceKg = Number((totalSortedWeightKg - Number(target.grossWeight)).toFixed(2))
    const isDiscrepancy = Math.abs(differenceKg) > 0.5
    const sortingStatus = isDiscrepancy ? 'Weight Difference Exceeded' : 'Reconciled'

    const updatedBreakdown = {
      isSorted: true,
      sortedAt: new Date().toISOString(),
      sortedBy: sortingData.sortedBy || 'Authorized Sorter',
      categories: sortingData.categories,
      totalSortedWeightKg,
      sortingDifferenceKg: differenceKg,
      sortingStatus,
      sortingNotes: sortingData.sortingNotes || '',
    }

    const updatedBatch = {
      ...target,
      status: isDiscrepancy ? 'Flagged Discrepancy' : target.status,
      sortingBreakdown: updatedBreakdown,
    }

    const updatedBatches = batches.map(b => ((b.batchId || b.id) === batchId ? updatedBatch : b))
    saveLocalBatches(updatedBatches)
    return { data: updatedBatch, source: 'local', message: 'Sorting recorded locally' }
  }
}
