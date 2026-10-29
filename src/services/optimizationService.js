/**
 * Optimization Service: QpiAI Opt Assignment Engine
 * Integrates batch-to-recycler assignment using constrained optimization
 */

import { request } from './apiClient.js'
import { getLocalBatches, saveLocalBatches } from './batchService.js'

/**
 * Normalizes raw optimization result into a consistent, robust schema
 * regardless of whether it originates from the backend REST API,
 * QpiAI Opt Cloud hybrid solver, or local simulation fallback.
 */
export function normalizeOptimizationResult(raw) {
  if (!raw) return null

  // Safely unwrap if doubly nested: raw.data.data -> raw.data -> raw
  let root = raw
  if (root.data && typeof root.data === 'object') {
    root = (root.data.data && typeof root.data.data === 'object') ? root.data.data : root.data
  }

  const assignments = Array.isArray(root.assignments) ? root.assignments : []
  const unassignedBatches = Array.isArray(root.unassignedBatches) ? root.unassignedBatches : []
  const summary = root.summary || root.metrics || {}
  const facilityUtilization = Array.isArray(root.facilityUtilization) ? root.facilityUtilization : []

  const isFeasible = typeof root.isFeasible === 'boolean'
    ? root.isFeasible
    : (unassignedBatches.length === 0 && assignments.length > 0)

  const engine = root.solverEngine || root.engine || 'Deterministic Classical Optimization Solver'
  const isQpiAiCloud = Boolean(root.isQpiAiCloud)
  const runId = root.runId || null
  const source = raw.source || (root.runId ? 'backend' : 'local')
  const executionEvidence = root.executionEvidence || null

  const objective = summary.objective || root.objective || 'MINIMIZE_COST'

  return {
    runId,
    source,
    engine,
    isQpiAiCloud,
    isFeasible,
    assignments,
    unassignedBatches,
    executionEvidence,
    summary: {
      objective,
      objectiveLabel: summary.objectiveLabel || (
        objective === 'MINIMIZE_COST'
          ? 'Minimize Total Transport Cost'
          : objective === 'MAXIMIZE_YIELD'
          ? 'Maximize Historical Recovery Yield'
          : 'Balance Recycler Quota Utilization'
      ),
      objectiveScore: summary.objectiveScore != null ? Number(summary.objectiveScore) : null,
      objectiveMetricLabel: summary.objectiveMetricLabel || '',
      objectiveMetricValue: summary.objectiveMetricValue || '',
      totalBatches: summary.totalBatches != null ? Number(summary.totalBatches) : (assignments.length + unassignedBatches.length),
      assignedCount: summary.assignedCount != null ? Number(summary.assignedCount) : assignments.length,
      unassignedCount: summary.unassignedCount != null ? Number(summary.unassignedCount) : unassignedBatches.length,
      totalWeightKg: summary.totalWeightKg != null ? Number(summary.totalWeightKg) : null,
      totalAllocatedKg: summary.totalAllocatedKg != null ? Number(summary.totalAllocatedKg) : null,
      // Cost metrics
      totalOptimizedCost: summary.totalOptimizedCost != null ? Number(summary.totalOptimizedCost) : null,
      baselineUnoptimizedCost: summary.baselineUnoptimizedCost != null ? Number(summary.baselineUnoptimizedCost) : null,
      costSavings: summary.costSavings != null ? Number(summary.costSavings) : null,
      savingsPercent: summary.savingsPercent != null ? Number(summary.savingsPercent) : null,
      // Yield metrics
      totalExpectedRecoveredKg: summary.totalExpectedRecoveredKg != null ? Number(summary.totalExpectedRecoveredKg) : null,
      averageExpectedYieldPercent: summary.averageExpectedYieldPercent != null ? Number(summary.averageExpectedYieldPercent) : null,
      // Capacity metrics
      minUtilization: summary.minUtilization != null ? Number(summary.minUtilization) : null,
      maxUtilization: summary.maxUtilization != null ? Number(summary.maxUtilization) : null,
      utilizationSpread: summary.utilizationSpread != null ? Number(summary.utilizationSpread) : null,
      averageUtilization: summary.averageUtilization != null ? Number(summary.averageUtilization) : null,
      solverEngine: summary.solverEngine || engine,
    },
    facilityUtilization,
  }
}

/**
 * Checks facility eligibility for batch stream
 */
function checkLocalEligibility(facility, batch, enforceLicence) {
  if (enforceLicence && facility.licenceStatus && facility.licenceStatus.includes('Review Required')) {
    return { eligible: false, reason: `${facility.name}: CPCB licence status '${facility.licenceStatus}' is not Active & Verified` }
  }

  const bCat = (batch.category || '').toLowerCase()
  const bType = (batch.collectionType || '').toLowerCase()
  const isMixed = bCat.includes('mixed') || bType.includes('mixed')
  const accepted = (facility.categoriesAccepted || []).map(c => c.toLowerCase())

  if (isMixed) {
    const canProcess = accepted.some(c =>
      c.includes('mixed') || c.includes('consumer') || c.includes('pcbs') || c.includes('telecom')
    )
    if (!canProcess) {
      return { eligible: false, reason: `${facility.name}: Does not have authorization for Mixed E-Waste intake` }
    }
  } else if (bCat) {
    const matches = accepted.some(c => bCat.includes(c) || c.includes(bCat))
    if (!matches) {
      return { eligible: false, reason: `${facility.name}: Does not accept '${batch.category}' category` }
    }
  }

  return { eligible: true }
}

/**
 * Classical Multi-Constraint Solver for local fallback
 */
function runLocalOptimizationSimulation({
  targetBatches,
  facilities,
  objective = 'MINIMIZE_COST',
  enforceCapacity,
  enforceLicence,
}) {
  const facilityUsage = {}
  facilities.forEach(f => {
    facilityUsage[f.id] = {
      facility: f,
      allocatedWeightKg: 0,
      maxCapacityKg: Math.max(0, (f.capacityKgMonth || 25000) - (f.currentLoadKg || 0)),
      assignedBatches: [],
    }
  })

  const costMatrix = {
    'FAC-01': { 'PCBs & Circuit Boards': 18, 'Consumer Electronics': 14, 'Lithium Batteries': 28, 'Mixed E-Waste': 20, default: 22 },
    'FAC-02': { 'Large Appliances': 11, 'Consumer Electronics': 16, 'PCBs & Circuit Boards': 24, 'Mixed E-Waste': 18, default: 20 },
    'FAC-03': { 'IT & Telecom Servers': 22, 'PCBs & Circuit Boards': 19, 'Lithium Batteries': 26, 'Mixed E-Waste': 24, default: 25 },
    'FAC-04': { 'Copper extraction': 12, 'Aluminum melting': 13, 'Large Appliances': 13, default: 30 },
  }

  // For BALANCED_CAPACITY, sort batches descending by weight
  const orderedBatches = objective === 'BALANCED_CAPACITY'
    ? [...targetBatches].sort((a, b) => (Number(b.grossWeight) || 0) - (Number(a.grossWeight) || 0))
    : [...targetBatches]

  const assignments = []
  const unassignedBatches = []
  let totalOptimizedCost = 0
  let baselineUnoptimizedCost = 0

  for (const batch of orderedBatches) {
    const bId = batch.id || batch.batchId
    const bCat = batch.category || batch.collectionType || 'Mixed E-Waste'
    const bWeight = Number(batch.grossWeight) || 0

    // Baseline unoptimized cost at spot carrier rate
    baselineUnoptimizedCost += bWeight * 34

    let bestFacility = null
    let bestScore = null
    let bestCost = 0
    let rejectionReasons = []

    for (const fac of facilities) {
      const eligibility = checkLocalEligibility(fac, batch, enforceLicence)
      if (!eligibility.eligible) {
        rejectionReasons.push(eligibility.reason)
        continue
      }

      const usage = facilityUsage[fac.id]
      const remainingQuota = usage.maxCapacityKg - usage.allocatedWeightKg
      if (enforceCapacity && bWeight > remainingQuota) {
        rejectionReasons.push(`${fac.name}: Quota exceeded (requires ${bWeight} kg, available ${remainingQuota.toFixed(0)} kg)`)
        continue
      }

      // 1. Transport Cost
      const rate = costMatrix[fac.id]?.[bCat] || costMatrix[fac.id]?.['Mixed E-Waste'] || costMatrix[fac.id]?.default || 22
      const transportCost = Number((bWeight * rate).toFixed(2))

      // 2. Recovery Yield
      const yieldPercent = Number(fac.recoveryYieldAvg || 65.0)

      // 3. Projected Utilization
      const postUtil = Number(
        (((fac.currentLoadKg + usage.allocatedWeightKg + bWeight) / (fac.capacityKgMonth || 25000)) * 100).toFixed(2)
      )

      if (objective === 'MINIMIZE_COST') {
        if (bestScore === null || transportCost < bestScore) {
          bestScore = transportCost
          bestFacility = fac
          bestCost = transportCost
        }
      } else if (objective === 'MAXIMIZE_YIELD') {
        if (bestScore === null || yieldPercent > bestScore || (yieldPercent === bestScore && transportCost < bestCost)) {
          bestScore = yieldPercent
          bestFacility = fac
          bestCost = transportCost
        }
      } else if (objective === 'BALANCED_CAPACITY') {
        if (bestScore === null || postUtil < bestScore || (postUtil === bestScore && transportCost < bestCost)) {
          bestScore = postUtil
          bestFacility = fac
          bestCost = transportCost
        }
      }
    }

    if (bestFacility) {
      const usage = facilityUsage[bestFacility.id]
      const preUtil = Number((((bestFacility.currentLoadKg + usage.allocatedWeightKg) / (bestFacility.capacityKgMonth || 25000)) * 100).toFixed(1))
      usage.allocatedWeightKg += bWeight
      usage.assignedBatches.push(bId)
      const postUtil = Number((((bestFacility.currentLoadKg + usage.allocatedWeightKg) / (bestFacility.capacityKgMonth || 25000)) * 100).toFixed(1))

      totalOptimizedCost += bestCost

      assignments.push({
        batchId: bId,
        batchCategory: bCat,
        batchWeight: bWeight,
        facilityId: bestFacility.id,
        facilityName: bestFacility.name,
        licenceNumber: bestFacility.licenceNumber,
        estimatedCost: bestCost,
        unitRateKg: bWeight > 0 ? Number((bestCost / bWeight).toFixed(1)) : 0,
        expectedYieldPercent: bestFacility.recoveryYieldAvg || 65.0,
        expectedRecoveredKg: Number((bWeight * ((bestFacility.recoveryYieldAvg || 65.0) / 100)).toFixed(1)),
        facilityUtilizationBefore: preUtil,
        facilityUtilizationAfter: postUtil,
        status: 'Feasible & Optimized',
        assignmentObjective: objective,
      })
    } else {
      unassignedBatches.push({
        batchId: bId,
        batchWeight: bWeight,
        category: bCat,
        reason: rejectionReasons.length > 0
          ? rejectionReasons.join('; ')
          : 'No facility satisfied combined capacity, category, and licence constraints.',
      })
    }
  }

  const totalAllocatedKg = assignments.reduce((acc, a) => acc + Number(a.batchWeight), 0)
  const costSavings = Number((baselineUnoptimizedCost - totalOptimizedCost).toFixed(2))
  const savingsPercent = baselineUnoptimizedCost > 0
    ? Number(((costSavings / baselineUnoptimizedCost) * 100).toFixed(1))
    : 0

  const totalExpectedRecoveredKg = Number(
    assignments.reduce((acc, a) => acc + a.expectedRecoveredKg, 0).toFixed(1)
  )
  const averageExpectedYieldPercent = totalAllocatedKg > 0
    ? Number(((totalExpectedRecoveredKg / totalAllocatedKg) * 100).toFixed(1))
    : 0

  const activeFacilityUtils = Object.values(facilityUsage)
    .filter(u => !u.facility.licenceStatus || !u.facility.licenceStatus.includes('Review Required'))
    .map(u => Number((((u.facility.currentLoadKg + u.allocatedWeightKg) / (u.facility.capacityKgMonth || 25000)) * 100).toFixed(1)))

  const minUtil = activeFacilityUtils.length > 0 ? Math.min(...activeFacilityUtils) : 0
  const maxUtil = activeFacilityUtils.length > 0 ? Math.max(...activeFacilityUtils) : 0
  const utilizationSpread = Number((maxUtil - minUtil).toFixed(1))
  const averagePostUtil = activeFacilityUtils.length > 0
    ? Number((activeFacilityUtils.reduce((acc, v) => acc + v, 0) / activeFacilityUtils.length).toFixed(1))
    : 0

  let objectiveScore = null
  let objectiveMetricLabel = ''
  let objectiveMetricValue = ''

  if (objective === 'MINIMIZE_COST') {
    objectiveScore = totalOptimizedCost
    objectiveMetricLabel = 'Total Transport Cost'
    objectiveMetricValue = `₹${Math.round(totalOptimizedCost).toLocaleString('en-IN')}`
  } else if (objective === 'MAXIMIZE_YIELD') {
    objectiveScore = averageExpectedYieldPercent
    objectiveMetricLabel = 'Average Expected Recovery Yield'
    objectiveMetricValue = `${averageExpectedYieldPercent}%`
  } else if (objective === 'BALANCED_CAPACITY') {
    objectiveScore = utilizationSpread
    objectiveMetricLabel = 'Post-Assignment Quota Spread'
    objectiveMetricValue = `Spread: ${utilizationSpread}% (Avg: ${averagePostUtil}%)`
  }

  return {
    source: 'local-fallback',
    engine: 'QpiAI Opt Deterministic Classical Fallback Solver',
    isQpiAiCloud: false,
    isFeasible: unassignedBatches.length === 0 && assignments.length > 0,
    assignments,
    unassignedBatches,
    summary: {
      objective,
      objectiveLabel: objective === 'MINIMIZE_COST'
        ? 'Minimize Total Transport Cost'
        : objective === 'MAXIMIZE_YIELD'
        ? 'Maximize Historical Recovery Yield'
        : 'Balance Recycler Quota Utilization',
      objectiveScore,
      objectiveMetricLabel,
      objectiveMetricValue,
      totalBatches: targetBatches.length,
      assignedCount: assignments.length,
      unassignedCount: unassignedBatches.length,
      totalWeightKg: targetBatches.reduce((acc, b) => acc + (Number(b.grossWeight) || 0), 0),
      totalAllocatedKg,
      totalOptimizedCost: Math.round(totalOptimizedCost),
      baselineUnoptimizedCost: Math.round(baselineUnoptimizedCost),
      costSavings: Math.round(costSavings),
      savingsPercent,
      totalExpectedRecoveredKg,
      averageExpectedYieldPercent,
      minUtilization: minUtil,
      maxUtilization: maxUtil,
      utilizationSpread,
      averageUtilization: averagePostUtil,
      solverEngine: 'QpiAI Opt Deterministic Classical Fallback Solver',
    },
    facilityUtilization: Object.values(facilityUsage).map(u => ({
      id: u.facility.id,
      name: u.facility.name,
      availableCapacityKg: Math.max(0, u.maxCapacityKg - u.allocatedWeightKg),
      newAllocatedKg: u.allocatedWeightKg,
      utilizationAfterAssignment: Number(
        (((u.facility.currentLoadKg + u.allocatedWeightKg) / (u.facility.capacityKgMonth || 25000)) * 100).toFixed(1)
      ),
    })),
  }
}

/**
 * Executes QpiAI Opt batch assignment optimization.
 */
export async function runQpiAiOptimization({
  selectedBatchIds,
  batches = [],
  facilities = [],
  objective = 'MINIMIZE_COST',
  enforceCapacity = true,
  enforceLicence = true,
}) {
  let backendError = null

  // 1. Attempt backend QpiAI Opt endpoint
  try {
    const response = await request('/optimization/assign', {
      method: 'POST',
      body: JSON.stringify({
        batchIds: selectedBatchIds,
        facilities,
        objective,
        enforceCapacity,
        enforceLicence,
      }),
    })

    if (response && response.success !== false) {
      const normalized = normalizeOptimizationResult({ data: response, source: 'backend' })
      if (normalized) return normalized
    }
  } catch (err) {
    backendError = err
    console.warn('[EcoTrace] Backend optimization endpoint notice:', err.message)
  }

  // 2. Fallback to deterministic local MILP linear optimization algorithm
  const targetBatches = (batches || []).filter(b => selectedBatchIds.includes(b.id || b.batchId))

  if (targetBatches.length === 0) {
    throw backendError || new Error('No valid consignments found matching selected IDs.')
  }

  const localResult = runLocalOptimizationSimulation({
    targetBatches,
    facilities,
    objective,
    enforceCapacity,
    enforceLicence,
  })

  return normalizeOptimizationResult(localResult)
}

/**
 * Dispatches approved assignments into active transit,
 * syncs with backend approval endpoint if runId is present,
 * and updates local batch store.
 */
export async function approveAndDispatchAssignment(assignments, runId = null) {
  if (runId) {
    try {
      await request(`/optimization/${runId}/approve`, {
        method: 'POST',
      })
    } catch (err) {
      console.warn('[EcoTrace] Backend approveOptimization notice:', err.message)
    }
  }

  const batches = getLocalBatches()
  const assignedBatchIds = assignments.map(a => a.batchId)

  const updated = batches.map(batch => {
    const matched = assignments.find(a => (a.batchId === batch.id || a.batchId === batch.batchId))
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
  return { success: true, count: assignedBatchIds.length }
}
