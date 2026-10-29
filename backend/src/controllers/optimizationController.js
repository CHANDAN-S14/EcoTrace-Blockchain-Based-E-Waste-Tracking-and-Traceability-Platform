import { RecyclerAssignment } from '../models/RecyclerAssignment.js'
import { Batch } from '../models/Batch.js'
import { AuditEvent } from '../models/AuditEvent.js'
import { optimizationRunSchema } from '../validators/schemas.js'
import { solveBatchOptimization } from '../services/optimizationService.js'

export async function runOptimization(req, res, next) {
  try {
    const validated = optimizationRunSchema.parse(req.body)

    // Retrieve batches from database
    let batches = []
    if (validated.batchIds && validated.batchIds.length > 0) {
      batches = await Batch.find({ batchId: { $in: validated.batchIds } }).lean()
    } else {
      batches = await Batch.find({ status: { $ne: 'Processed' } }).limit(10).lean()
      if (batches.length === 0) {
        batches = await Batch.find({}).limit(5).lean()
      }
    }
    if (batches.length === 0) {
      return res.status(404).json({ success: false, message: 'No consignments available for optimization' })
    }
    const targetBatchIds = batches.map(b => b.batchId)

    const optimizationResult = await solveBatchOptimization({
      batches,
      objective: validated.objective,
      enforceCapacity: validated.enforceCapacity,
      enforceLicence: validated.enforceLicence,
    })

    const runId = `OPT-RUN-${Date.now().toString().slice(-6)}`
    const record = await RecyclerAssignment.create({
      runId,
      selectedBatchIds: targetBatchIds,
      objective: validated.objective,
      constraints: {
        enforceCapacity: validated.enforceCapacity,
        enforceLicence: validated.enforceLicence,
      },
      solverEngine: optimizationResult.solverEngine,
      isQpiAiCloud: optimizationResult.isQpiAiCloud,
      assignments: optimizationResult.assignments,
      unassignedBatches: optimizationResult.unassignedBatches,
      summary: optimizationResult.summary,
      executionEvidence: optimizationResult.executionEvidence,
      status: 'RECOMMENDED',
    })

    return res.status(201).json({
      success: true,
      message: `Optimization run completed via ${optimizationResult.solverEngine}`,
      data: {
        ...record.toObject(),
        metrics: optimizationResult.summary,
        facilityUtilization: optimizationResult.facilityUtilization,
        executionEvidence: optimizationResult.executionEvidence,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getOptimizationRun(req, res, next) {
  try {
    const { runId } = req.params
    const run = await RecyclerAssignment.findOne({ runId })
    if (!run) {
      return res.status(404).json({ success: false, message: 'Optimization run not found' })
    }
    return res.json({ success: true, data: run })
  } catch (err) {
    next(err)
  }
}

export async function approveOptimization(req, res, next) {
  try {
    const { runId } = req.params
    const run = await RecyclerAssignment.findOne({ runId })
    if (!run) {
      return res.status(404).json({ success: false, message: 'Optimization run not found' })
    }

    if (run.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Assignment run has already been approved' })
    }

    // Update batches in DB to In Transit and link assigned facility
    for (const assignment of run.assignments) {
      await Batch.findOneAndUpdate(
        { batchId: assignment.batchId },
        {
          status: 'In Transit',
          assignedFacility: assignment.facilityName,
          assignedFacilityId: assignment.facilityId,
        }
      )
    }

    run.status = 'APPROVED'
    run.approvedAt = new Date()
    run.approvedBy = req.user?.name || 'Authorized Logistics Dispatcher'
    await run.save()

    // Log Audit Event
    await AuditEvent.create({
      eventType: 'OPTIMIZATION_APPROVED',
      organization: 'Logistics Central Dispatch',
      actor: run.approvedBy,
      details: {
        runId,
        dispatchedBatchesCount: run.assignments.length,
        totalCostSavings: run.summary?.costSavings,
        savingsPercent: run.summary?.savingsPercent,
      },
    })

    return res.json({
      success: true,
      message: `Approved ${run.assignments.length} batch dispatches. Consignments marked 'In Transit'.`,
      data: run,
    })
  } catch (err) {
    next(err)
  }
}

export async function getOptimizationHistory(req, res, next) {
  try {
    const history = await RecyclerAssignment.find({}).sort({ createdAt: -1 })
    return res.json({
      success: true,
      count: history.length,
      data: history,
    })
  } catch (err) {
    next(err)
  }
}
