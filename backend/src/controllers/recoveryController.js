import { RecoveryRecord } from '../models/RecoveryRecord.js'
import { Batch } from '../models/Batch.js'
import { CustodyEvent } from '../models/CustodyEvent.js'
import { MaterialClaim } from '../models/MaterialClaim.js'
import { AuditEvent } from '../models/AuditEvent.js'
import { recoverySchema } from '../validators/schemas.js'
import { computeSha256 } from '../utils/hashUtils.js'
import { recordRecoveryOnChain } from '../services/blockchainService.js'

export async function getAllRecoveryRecords(req, res, next) {
  try {
    const { status, q } = req.query
    const filter = {}

    if (status && status !== 'ALL' && status !== 'All Records') {
      filter.validationStatus = status
    }

    if (q) {
      filter.$or = [
        { claimId: { $regex: q, $options: 'i' } },
        { batchId: { $regex: q, $options: 'i' } },
        { facility: { $regex: q, $options: 'i' } },
        { processingReference: { $regex: q, $options: 'i' } },
      ]
    }

    const records = await RecoveryRecord.find(filter).sort({ createdAt: -1 }).lean()
    return res.json({
      success: true,
      count: records.length,
      data: records,
    })
  } catch (err) {
    next(err)
  }
}

export async function submitRecoveryRecord(req, res, next) {
  try {
    const validated = recoverySchema.parse(req.body)

    const batch = await Batch.findOne({ batchId: validated.batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${validated.batchId} not found` })
    }

    // Validate dynamic material names uniqueness (case-insensitive)
    if (validated.materialsBreakdown && Array.isArray(validated.materialsBreakdown) && validated.materialsBreakdown.length > 0) {
      const seenNames = new Set()
      for (const item of validated.materialsBreakdown) {
        const norm = item.name.trim().toLowerCase()
        if (norm) {
          if (seenNames.has(norm)) {
            return res.status(400).json({
              success: false,
              message: `Duplicate material "${item.name}" detected. Please combine weights or correct duplicate names.`,
            })
          }
          seenNames.add(norm)
        }
      }
    }

    // Recovered material weight sum
    let recoveredMaterialWeight = 0
    if (validated.materialsBreakdown && Array.isArray(validated.materialsBreakdown) && validated.materialsBreakdown.length > 0) {
      recoveredMaterialWeight = validated.materialsBreakdown.reduce(
        (acc, m) => acc + (Number(m.weightKg) || 0),
        0
      )
    } else if (validated.materials && typeof validated.materials === 'object') {
      recoveredMaterialWeight = Object.values(validated.materials).reduce(
        (acc, val) => acc + (Number(val) || 0),
        0
      )
    }
    recoveredMaterialWeight = Number(recoveredMaterialWeight.toFixed(2))

    const waste = Number((validated.remainingWaste ?? validated.residualWaste ?? 0).toFixed(2))
    const loss = Number((validated.explainedLoss ?? 0).toFixed(2))
    const accountedOutput = Number((recoveredMaterialWeight + waste + loss).toFixed(2))
    const inputWeight = Number(Number(batch.grossWeight || validated.inputWeight).toFixed(2))
    const difference = Number((inputWeight - accountedOutput).toFixed(2))
    const recoveryYield = inputWeight > 0 ? Number(((recoveredMaterialWeight / inputWeight) * 100).toFixed(1)) : 0

    // Check if a completed recovery record already exists for this batch
    const existingCompleted = await RecoveryRecord.findOne({
      batchId: validated.batchId,
      validationStatus: 'Reconciled',
    })

    if (existingCompleted || batch.status === 'Processed') {
      return res.status(409).json({
        success: false,
        code: 'RECOVERY_ALREADY_RECORDED',
        message: `Recovery already recorded. Batch ${validated.batchId} has already completed processing and its recovery record exists (Claim: ${existingCompleted?.claimId || 'Existing Claim'}). Review the existing recovery record instead of submitting another claim.`,
        claimId: existingCompleted?.claimId,
        batchId: validated.batchId,
        data: existingCompleted,
      })
    }

    // Duplicate Claim Check across different facilities
    const existingClaim = await RecoveryRecord.findOne({
      batchId: validated.batchId,
      facility: { $ne: validated.facility },
    })

    const tolerance = Number(process.env.MASS_BALANCE_TOLERANCE || 20)
    let finalStatus = 'Reconciled'
    let flagReason = null

    if (existingClaim) {
      finalStatus = 'Duplicate Claim'
      flagReason = `Conflict: Batch ${validated.batchId} has already been claimed by ${existingClaim.facility} on ${new Date(existingClaim.createdAt).toLocaleDateString()}. Duplicate claim flagged.`
    } else if (Math.abs(difference) > tolerance) {
      finalStatus = 'Discrepancy Detected'
      flagReason = `The recorded quantities do not match the original incoming weight. Difference of ${difference > 0 ? '+' : ''}${difference} kg exceeds the ${tolerance} kg tolerance limit.`
    } else {
      finalStatus = 'Reconciled'
    }

    const claimId = req.body.claimId || `CLM-${Math.floor(1000 + Math.random() * 9000)}`
    const recoveryProofPayload = `${claimId}|${validated.batchId}|${validated.facility}|${recoveredMaterialWeight}|${accountedOutput}|${Date.now()}`
    const recoveryHash = computeSha256(recoveryProofPayload)

    // Anchor on blockchain
    const blockchainRes = await recordRecoveryOnChain(validated.batchId, recoveryHash)

    const record = await RecoveryRecord.create({
      claimId,
      batchId: validated.batchId,
      facility: validated.facility,
      sourceOrg: batch.sourceOrg || validated.sourceOrg || '',
      date: validated.processingDate ? new Date(validated.processingDate) : new Date(),
      inputWeight,
      recoveredWeight: recoveredMaterialWeight,
      materials: validated.materials,
      materialsBreakdown: validated.materialsBreakdown || [],
      remainingWaste: waste,
      residualWaste: waste,
      remainingWasteDestination: validated.remainingWasteDestination || '',
      explainedLoss: loss,
      accountedOutput,
      difference,
      recoveryYield,
      validationStatus: finalStatus,
      flagReason,
      processingReference: validated.processingReference || claimId,
      operator: validated.operator || 'Authorized Metallurgy Tech',
      evidenceUrl: validated.evidenceUrl || (validated.evidenceFiles?.[0]?.url || ''),
      evidenceFiles: validated.evidenceFiles || [],
      blockchainTx: blockchainRes.txHash || '',
      verifiedOnChain: Boolean(blockchainRes.success),
    })

    // Also register into MaterialClaims collection for audit
    await MaterialClaim.create({
      claimId,
      batchId: validated.batchId,
      facility: validated.facility,
      inputWeight,
      recoveredWeight: recoveredMaterialWeight,
      validationStatus: finalStatus === 'Reconciled' ? 'VALIDATED' : 'FLAGGED_DUPLICATE',
      conflictClaimId: existingClaim ? existingClaim.claimId : null,
      evidenceHash: recoveryHash,
    })

    // Update batch status
    await Batch.findOneAndUpdate(
      { batchId: validated.batchId },
      {
        status: finalStatus === 'Reconciled' ? 'Processed' : 'Flagged Discrepancy',
      }
    )

    // Update or create Step 4 custody event (Recycler -> Final Audit)
    let step4 = await CustodyEvent.findOne({ batchId: validated.batchId, step: 4 })
    if (!step4) {
      await CustodyEvent.create({
        handoverId: `HO-${validated.batchId}-4`,
        batchId: validated.batchId,
        step: 4,
        sender: validated.facility,
        receiver: 'CPCB Compliance & Regulatory Audit Board',
        stage: 'Recycler → Final Audit',
        dispatchWeight: inputWeight,
        receivedWeight: accountedOutput,
        variance: difference,
        location: validated.facility,
        status: finalStatus === 'Reconciled' ? 'Accepted' : 'Discrepancy Detected',
        verificationStatus: finalStatus === 'Reconciled' ? 'Verified On-Chain' : 'Discrepancy Detected',
        txHash: blockchainRes.txHash || '',
        actorNotes: `Processing complete: ${recoveredMaterialWeight} kg recovered, ${waste} kg residual waste, ${loss} kg explained loss. Yield: ${recoveryYield}%.`,
        discrepancyReason: finalStatus !== 'Reconciled' ? flagReason : null,
        recordedBy: validated.operator || 'Metallurgy Technician',
      })
    } else {
      step4.sender = validated.facility
      step4.dispatchWeight = inputWeight
      step4.receivedWeight = accountedOutput
      step4.variance = difference
      step4.status = finalStatus === 'Reconciled' ? 'Accepted' : 'Discrepancy Detected'
      step4.verificationStatus = finalStatus === 'Reconciled' ? 'Verified On-Chain' : 'Discrepancy Detected'
      step4.txHash = blockchainRes.txHash || step4.txHash
      step4.actorNotes = `Processing complete: ${recoveredMaterialWeight} kg recovered, ${waste} kg residual waste, ${loss} kg explained loss. Yield: ${recoveryYield}%.`
      if (finalStatus !== 'Reconciled') step4.discrepancyReason = flagReason
      await step4.save()
    }

    // Log Audit Event
    await AuditEvent.create({
      eventType: finalStatus === 'Duplicate Claim'
        ? 'DUPLICATE_CLAIM_DETECTED'
        : finalStatus === 'Discrepancy Detected'
        ? 'DISCREPANCY_FLAG_TRIGGERED'
        : 'MASS_BALANCE_RECONCILED',
      batchId: validated.batchId,
      organization: validated.facility,
      actor: validated.operator || 'Metallurgy Technician',
      details: {
        claimId,
        inputWeight,
        recoveredWeight: recoveredMaterialWeight,
        yieldPercent: recoveryYield,
        differenceKg: difference,
        status: finalStatus,
      },
      txHash: blockchainRes.txHash || '',
      blockNumber: blockchainRes.blockNumber || 0,
    })

    return res.status(201).json({
      success: true,
      message: finalStatus === 'Reconciled'
        ? 'Mass-balance reconciled and anchored to cryptographic ledger.'
        : `Attention: ${finalStatus} flagged. ${flagReason}`,
      data: record,
    })
  } catch (err) {
    next(err)
  }
}

export async function getBatchRecovery(req, res, next) {
  try {
    const { batchId } = req.params
    const records = await RecoveryRecord.find({ batchId }).sort({ createdAt: -1 })
    return res.json({
      success: true,
      count: records.length,
      data: records,
    })
  } catch (err) {
    next(err)
  }
}

export async function getRecoveryExceptions(req, res, next) {
  try {
    const exceptions = await RecoveryRecord.find({
      validationStatus: { $in: ['Discrepancy Detected', 'Duplicate Claim', 'Needs Review', 'Discrepancy Found'] },
    }).sort({ createdAt: -1 })

    return res.json({
      success: true,
      count: exceptions.length,
      data: exceptions,
    })
  } catch (err) {
    next(err)
  }
}

export async function verifyRecoveryRecord(req, res, next) {
  try {
    const { claimId } = req.params
    const record = await RecoveryRecord.findOne({ claimId })
    if (!record) {
      return res.status(404).json({ success: false, message: `Claim ${claimId} not found` })
    }

    return res.json({
      success: true,
      data: {
        claimId: record.claimId,
        batchId: record.batchId,
        facility: record.facility,
        validationStatus: record.validationStatus,
        blockchainTx: record.blockchainTx,
        verifiedOnChain: Boolean(record.blockchainTx),
        timestamp: record.createdAt,
      },
    })
  } catch (err) {
    next(err)
  }
}
