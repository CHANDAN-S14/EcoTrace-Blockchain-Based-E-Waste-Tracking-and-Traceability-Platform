import { RecyclerAssignment } from '../models/RecyclerAssignment.js'
import { Batch } from '../models/Batch.js'
import { AuditEvent } from '../models/AuditEvent.js'
import { optimizationRunSchema } from '../validators/schemas.js'
import { solveBatchOptimization, logQpiAiError } from '../services/optimizationService.js'
import { qpiLogger } from '../utils/qpiLogger.js'

export async function runOptimization(req, res, next) {
  try {
    qpiLogger.header('ECOTRACE | QPIAI OPT DISPATCH')
    qpiLogger.stage('Received dispatch request from UI...')

    const parseResult = optimizationRunSchema.safeParse(req.body)
    if (!parseResult.success) {
      const errDetails = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      qpiLogger.error(`Invalid dispatch inputs: ${errDetails}`)
      logQpiAiError({
        errorCode: 'INVALID_INPUT_PAYLOAD',
        description: `Request payload validation failed: ${errDetails}`,
        remediation: 'Provide valid parameters: batchId (string), batchIds (array), objective (MINIMIZE_COST, MAXIMIZE_YIELD, BALANCED_CAPACITY), enforceCapacity (boolean), enforceLicence (boolean).',
      })
      return res.status(400).json({
        success: false,
        message: `Invalid optimization dispatch parameters: ${errDetails}`,
        errors: parseResult.error.errors,
      })
    }

    const validated = parseResult.data

    // 1. Resolve batch IDs
    let targetBatchIds = [...(validated.batchIds || [])]
    if (validated.batchId && !targetBatchIds.includes(validated.batchId)) {
      targetBatchIds.unshift(validated.batchId)
    }

    // 2. Retrieve batches from database or direct payload
    let batches = []
    if (targetBatchIds.length > 0) {
      batches = await Batch.find({ batchId: { $in: targetBatchIds } }).lean()
      if (batches.length === 0) {
        qpiLogger.error(`Batch lookup failed: No consignments found matching batch ID(s): [${targetBatchIds.join(', ')}]`)
        logQpiAiError({
          errorCode: 'CONSIGNMENTS_NOT_FOUND',
          description: `No consignments found matching batch ID(s): [${targetBatchIds.join(', ')}]`,
          remediation: 'Ensure the batch ID is registered in the EcoTrace system before requesting optimization dispatch.',
        })
        return res.status(404).json({
          success: false,
          message: `No consignments found matching batch ID(s): ${targetBatchIds.join(', ')}`,
        })
      }
    } else if (validated.batches && Array.isArray(validated.batches) && validated.batches.length > 0) {
      batches = validated.batches
    } else {
      batches = await Batch.find({ status: { $ne: 'Processed' } }).limit(10).lean()
      if (batches.length === 0) {
        batches = await Batch.find({}).limit(5).lean()
      }
    }

    if (batches.length === 0) {
      qpiLogger.error('No consignments available in the database for optimization dispatch.')
      logQpiAiError({
        errorCode: 'NO_CONSIGNMENTS_AVAILABLE',
        description: 'No consignments available in the database for optimization dispatch.',
        remediation: 'Register consignments before requesting smart facility dispatch.',
      })
      return res.status(404).json({
        success: false,
        message: 'No consignments available for optimization',
      })
    }

    const finalTargetBatchIds = batches.map(b => b.batchId || b.id)
    qpiLogger.stage(`Batch ID: ${finalTargetBatchIds.join(', ')}`)
    qpiLogger.stage(`Target Objective: ${validated.objective} (enforceCapacity: ${validated.enforceCapacity}, enforceLicence: ${validated.enforceLicence})`)

    const routeInvoked = `${req.method} ${req.originalUrl || req.baseUrl + req.path}`

    // 3. Execute QUBO optimization solver
    const optimizationResult = await solveBatchOptimization({
      batches,
      objective: validated.objective,
      enforceCapacity: validated.enforceCapacity,
      enforceLicence: validated.enforceLicence,
      routeInvoked,
    })

    const runId = `OPT-RUN-${Date.now().toString().slice(-6)}`
    const record = await RecyclerAssignment.create({
      runId,
      selectedBatchIds: finalTargetBatchIds,
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

    const firstAssignment = optimizationResult.assignments[0] || null

    return res.status(201).json({
      success: true,
      message: `Optimization run completed via ${optimizationResult.solverEngine}`,
      data: {
        ...record.toObject(),
        selectedFacility: firstAssignment ? firstAssignment.facilityName : null,
        selectedFacilityId: firstAssignment ? firstAssignment.facilityId : null,
        selectedBatchId: firstAssignment ? firstAssignment.batchId : (finalTargetBatchIds[0] || null),
        metrics: optimizationResult.summary,
        facilityUtilization: optimizationResult.facilityUtilization,
        executionEvidence: optimizationResult.executionEvidence,
      },
    })
  } catch (err) {
    qpiLogger.error('Unexpected exception during optimization dispatch execution', err)
    logQpiAiError({
      errorCode: 'DISPATCH_INTERNAL_EXCEPTION',
      description: err.message,
      details: err.stack,
      remediation: 'Check database connectivity and backend server logs.',
    })
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
