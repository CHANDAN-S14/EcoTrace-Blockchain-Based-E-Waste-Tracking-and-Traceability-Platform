import { MaterialClaim } from '../models/MaterialClaim.js'
import { Batch } from '../models/Batch.js'

export async function createClaim(req, res, next) {
  try {
    const { batchId, facility, inputWeight, recoveredWeight, evidenceHash, notes } = req.body

    const batch = await Batch.findOne({ batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found` })
    }

    // Check duplicate claims
    const existingForBatch = await MaterialClaim.findOne({ batchId })
    const isDuplicate = Boolean(existingForBatch)

    const claimId = `CLM-${Math.floor(1000 + Math.random() * 9000)}`
    const claim = await MaterialClaim.create({
      claimId,
      batchId,
      facility,
      inputWeight: Number(inputWeight),
      recoveredWeight: Number(recoveredWeight),
      validationStatus: isDuplicate ? 'FLAGGED_DUPLICATE' : 'VALIDATED',
      conflictClaimId: existingForBatch ? existingForBatch.claimId : null,
      evidenceHash: evidenceHash || '',
      notes: notes || '',
    })

    return res.status(201).json({
      success: true,
      message: isDuplicate ? 'Warning: Duplicate claim flagged' : 'Material claim registered',
      data: claim,
    })
  } catch (err) {
    next(err)
  }
}

export async function getClaimById(req, res, next) {
  try {
    const { claimId } = req.params
    const claim = await MaterialClaim.findOne({ claimId })
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' })
    }
    return res.json({ success: true, data: claim })
  } catch (err) {
    next(err)
  }
}

export async function validateClaim(req, res, next) {
  try {
    const { claimId } = req.params
    const { status, notes } = req.body

    const claim = await MaterialClaim.findOneAndUpdate(
      { claimId },
      { validationStatus: status, notes },
      { new: true }
    )

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' })
    }

    return res.json({
      success: true,
      message: `Claim ${claimId} status updated to ${status}`,
      data: claim,
    })
  } catch (err) {
    next(err)
  }
}

export async function getClaimExceptions(req, res, next) {
  try {
    const exceptions = await MaterialClaim.find({
      validationStatus: { $in: ['FLAGGED_DUPLICATE', 'UNDER_REVIEW'] },
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
