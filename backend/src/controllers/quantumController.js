import {
  submitQuantumJob,
  getExperimentById,
  getAllExperiments,
  getQCloudStatus,
} from '../services/quantumService.js'
import { quantumExperimentSchema } from '../validators/schemas.js'
import { AuditEvent } from '../models/AuditEvent.js'

export async function runQuantumExperiment(req, res, next) {
  try {
    const validated = quantumExperimentSchema.parse(req.body)

    const jobResult = await submitQuantumJob({
      circuitId: validated.circuitId,
      backendId: validated.backendId,
      shots: validated.shots,
      gamma: validated.gamma,
      beta: validated.beta,
    })

    if (!jobResult.success) {
      return res.status(400).json({
        success: false,
        message: jobResult.error || 'Quantum experiment execution failed',
        error: jobResult.error,
        suggestion: jobResult.suggestion,
        data: jobResult,
      })
    }

    // Log Audit Event
    try {
      await AuditEvent.create({
        eventType: 'QUANTUM_JOB_COMPLETED',
        organization: 'QpiAI QCloud Consortium',
        actor: req.user?.name || 'Quantum Research Scientist',
        details: {
          experimentId: jobResult.experimentId,
          backend: jobResult.backend?.name || 'QpiAI Quantum Backend',
          shots: jobResult.shots,
          optimalState: jobResult.optimalState,
          probability: jobResult.optimalStateProbability,
        },
      })
    } catch (auditErr) {
      console.warn('[QuantumController] Audit log non-critical warning:', auditErr.message)
    }

    return res.status(201).json({
      success: true,
      message: `Quantum experiment ${jobResult.experimentId} completed in ${jobResult.executionTimeMs} ms`,
      data: jobResult,
    })
  } catch (err) {
    next(err)
  }
}

export async function getQuantumJob(req, res, next) {
  try {
    const { experimentId } = req.params
    const experiment = await getExperimentById(experimentId)
    if (!experiment) {
      return res.status(404).json({ success: false, message: 'Quantum experiment job not found' })
    }
    return res.json({ success: true, data: experiment })
  } catch (err) {
    next(err)
  }
}

export async function getQuantumHistory(req, res, next) {
  try {
    const history = await getAllExperiments()
    return res.json({
      success: true,
      count: history.length,
      data: history,
    })
  } catch (err) {
    next(err)
  }
}

export async function getQuantumStatus(req, res, next) {
  try {
    const status = await getQCloudStatus()
    return res.json({
      success: true,
      data: status,
    })
  } catch (err) {
    next(err)
  }
}
