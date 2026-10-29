import { Batch } from '../models/Batch.js'
import { Counter } from '../models/Counter.js'
import { CustodyEvent } from '../models/CustodyEvent.js'
import { RecoveryRecord } from '../models/RecoveryRecord.js'
import { AuditEvent } from '../models/AuditEvent.js'
import { batchCreateSchema, sortingBreakdownSchema } from '../validators/schemas.js'
import {
  generateBatchId,
  computeSha256,
  computeCustodyEventHash,
  computeFileSha256,
  computeCanonicalEvidenceDigest,
  areDigestsEqual,
} from '../utils/hashUtils.js'
import { registerBatchOnChain, checkBatchExistsOnChain } from '../services/blockchainService.js'
import { generateBatchQrCode } from '../services/qrService.js'

export async function getBatches(req, res, next) {
  try {
    const { q, category, status } = req.query
    const filter = {}

    if (q) {
      filter.$or = [
        { batchId: { $regex: q, $options: 'i' } },
        { sourceOrg: { $regex: q, $options: 'i' } },
        { collectionFacility: { $regex: q, $options: 'i' } },
        { blockchainHash: { $regex: q, $options: 'i' } },
      ]
    }

    if (category && category !== 'ALL') {
      filter.category = category
    }

    if (status && status !== 'ALL') {
      filter.status = status
    }

    const batches = await Batch.find(filter).sort({ createdAt: -1 }).lean()

    // Attach handovers and processing data to each batch
    const batchIds = batches.map(b => b.batchId)
    const handovers = await CustodyEvent.find({ batchId: { $in: batchIds } }).sort({ step: 1 }).lean()
    const recoveries = await RecoveryRecord.find({ batchId: { $in: batchIds } }).lean()

    const enrichedBatches = batches.map(b => ({
      ...b,
      id: b.batchId, // compatibility with frontend format
      handovers: handovers
        .filter(h => h.batchId === b.batchId)
        .map(h => ({
          ...h,
          id: h.handoverId || h._id.toString(),
        })),
      processingData: recoveries.find(r => r.batchId === b.batchId) || null,
    }))

    return res.json({
      success: true,
      count: enrichedBatches.length,
      data: enrichedBatches,
    })
  } catch (err) {
    next(err)
  }
}

export async function getBatchById(req, res, next) {
  try {
    const { batchId } = req.params
    const batch = await Batch.findOne({ batchId }).lean()
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found` })
    }

    const handovers = await CustodyEvent.find({ batchId }).sort({ step: 1 }).lean()
    const mappedHandovers = handovers.map(h => ({
      ...h,
      id: h.handoverId || h._id.toString(),
    }))
    const recovery = await RecoveryRecord.findOne({ batchId }).lean()
    const auditLogs = await AuditEvent.find({ batchId }).sort({ timestamp: -1 }).lean()
    const qrInfo = await generateBatchQrCode(batch)

    return res.json({
      success: true,
      data: {
        ...batch,
        id: batch.batchId,
        handovers: mappedHandovers,
        processingData: recovery,
        auditLogs,
        qr: qrInfo,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function createBatch(req, res, next) {
  try {
    const validated = batchCreateSchema.parse(req.body)

    let batchId = validated.batchId
    if (!batchId) {
      const year = new Date().getFullYear()
      let counter = await Counter.findByIdAndUpdate(
        { _id: `batch_counter_${year}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      )
      batchId = generateBatchId(counter.seq)
      // Guard: Ensure generated ID is unique in local MongoDB AND not already occupied on-chain
      let onChain = await checkBatchExistsOnChain(batchId)
      while ((await Batch.findOne({ batchId })) || onChain.exists) {
        counter = await Counter.findByIdAndUpdate(
          { _id: `batch_counter_${year}` },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        )
        batchId = generateBatchId(counter.seq)
        onChain = await checkBatchExistsOnChain(batchId)
      }
    } else {
      const existing = await Batch.findOne({ batchId })
      if (existing) {
        return res.status(409).json({ success: false, message: `Batch ID ${batchId} is already registered` })
      }
    }

    // Parse any existing evidenceFiles passed in body
    let existingEvidence = []
    if (req.body.evidenceFiles) {
      try {
        existingEvidence = typeof req.body.evidenceFiles === 'string'
          ? JSON.parse(req.body.evidenceFiles)
          : (Array.isArray(req.body.evidenceFiles) ? req.body.evidenceFiles : [])
      } catch {}
    }

    // Process files uploaded in multipart/form-data with raw byte SHA-256 calculation
    const uploadedFiles = (req.files || []).map((f) => {
      const isImage = f.mimetype.startsWith('image/')
      const fileSha256 = f.path
        ? computeFileSha256(f.path)
        : (f.buffer ? computeFileSha256(f.buffer) : '')
      return {
        name: f.originalname,
        filename: f.filename,
        url: `/uploads/${f.filename}`,
        size: f.size,
        mimetype: f.mimetype,
        sha256: fileSha256 || '',
        type: isImage ? 'photo' : 'document',
        uploadedAt: new Date(),
      }
    })

    const allEvidenceFiles = [...existingEvidence, ...uploadedFiles]

    // Set primary imageUrl and evidenceName for backward compatibility
    let imageUrl = validated.imageUrl || ''
    let imageTitle = validated.imageTitle || ''
    let evidenceName = validated.evidenceName || 'Weighbridge_Digital_Slip.pdf'

    const primaryPhoto = allEvidenceFiles.find(e => e.type === 'photo' || e.mimetype?.startsWith('image/'))
    if (primaryPhoto) {
      imageUrl = primaryPhoto.url
      imageTitle = primaryPhoto.name
    }

    const primaryDoc = allEvidenceFiles.find(e => e.type === 'document' || e.mimetype === 'application/pdf')
    if (primaryDoc) {
      evidenceName = primaryDoc.name
    } else if (allEvidenceFiles.length > 0 && !primaryPhoto) {
      evidenceName = allEvidenceFiles[0].name
    }

    // Compute deterministic canonical SHA-256 evidence digest (pure & reproducible)
    const evidenceHash = computeCanonicalEvidenceDigest({
      batchId,
      sourceOrg: validated.sourceOrg,
      grossWeight: validated.grossWeight,
      collectionFacility: validated.collectionFacility,
      collectionDate: validated.collectionDate || new Date().toISOString().split('T')[0],
      evidenceFiles: allEvidenceFiles,
    })

    // Anchor to blockchain
    const blockchainResult = await registerBatchOnChain(batchId, evidenceHash)

    let initialBlockchainStatus = 'PENDING'
    let mismatchDetails = null
    if (blockchainResult.success) {
      if (blockchainResult.alreadyRegistered) {
        const isMatch = areDigestsEqual(blockchainResult.onChainEvidenceHash, evidenceHash)
        if (isMatch) {
          initialBlockchainStatus = 'VERIFIED'
        } else {
          initialBlockchainStatus = 'MISMATCH_DETECTED'
          mismatchDetails = {
            localEvidenceHash: evidenceHash,
            onChainEvidenceHash: blockchainResult.onChainEvidenceHash,
            detectedAt: new Date(),
            reason: `Batch ${batchId} was previously anchored on-chain with a different consensus digest (${blockchainResult.onChainEvidenceHash}). Local intake digest is ${evidenceHash}.`,
          }
        }
      } else {
        initialBlockchainStatus = 'ANCHORED'
      }
    }

    const batch = await Batch.create({
      ...validated,
      batchId,
      collectionType: validated.collectionType || 'Mixed E-Waste',
      licenceDetails: validated.licenceDetails || '',
      imageUrl,
      imageTitle,
      evidenceName,
      evidenceFiles: allEvidenceFiles,
      sortingBreakdown: {
        isSorted: false,
        sortedAt: null,
        sortedBy: '',
        categories: [],
        totalSortedWeightKg: 0,
        sortingDifferenceKg: 0,
        sortingStatus: 'Pending Sorting',
        sortingNotes: '',
      },
      evidenceHash,
      blockchainHash: blockchainResult.txHash || '',
      blockchainTx: blockchainResult.txHash || '',
      blockchainStatus: initialBlockchainStatus,
      mismatchDetails,
      blockchainChainId: blockchainResult.chainId || 31337,
      blockchainNetwork: blockchainResult.network || 'Local Hardhat',
      blockchainContractAddress: blockchainResult.contractAddress || '',
      blockchainBlockNumber: blockchainResult.blockNumber || null,
      blockchainExplorerUrl: blockchainResult.explorerUrl || '',
      blockchainAnchorHistory: blockchainResult.success
        ? [
            {
              network: blockchainResult.network || 'Local Hardhat',
              chainId: blockchainResult.chainId || 31337,
              contractAddress: blockchainResult.contractAddress || '',
              txHash: blockchainResult.txHash || '',
              blockNumber: blockchainResult.blockNumber || null,
              digest: evidenceHash,
              status: 'ANCHORED',
              explorerUrl: blockchainResult.explorerUrl || '',
              anchoredAt: new Date(),
              anchoredBy: req.user?.name || 'Authorized Collector',
            },
          ]
        : [],
      createdBy: req.user?.name || 'Authorized Collector',
    })

    // Create Initial Step 1 Custody Event (Collection Center -> Transporter)
    const initialEventHash = computeCustodyEventHash({
      batchId,
      sender: validated.sourceOrg,
      receiver: 'Pending Transporter Assignment',
      dispatchWeight: validated.grossWeight,
      receivedWeight: 0,
      timestamp: Date.now(),
      previousEventHash: 'GENESIS',
    })

    const initialHandover = await CustodyEvent.create({
      handoverId: `HO-${batchId}-1`,
      batchId,
      step: 1,
      sender: validated.sourceOrg,
      receiver: 'Pending Transporter Assignment',
      stage: 'Collection Center → Transporter',
      dispatchWeight: validated.grossWeight,
      receivedWeight: null,
      variance: 0,
      location: validated.collectionFacility,
      status: 'Pending Review',
      verificationStatus: 'Pending Verification',
      txHash: '',
      previousEventHash: 'GENESIS',
      eventHash: initialEventHash,
      evidenceName: validated.evidenceName,
      evidenceUrl: validated.imageUrl,
      recordedBy: req.user?.name || validated.assignedHandler,
    })

    // Log Audit Event
    await AuditEvent.create({
      eventType: 'BATCH_REGISTERED',
      batchId,
      organization: validated.sourceOrg,
      actor: req.user?.name || 'Collector',
      details: {
        weightKg: validated.grossWeight,
        category: validated.category,
        collectionFacility: validated.collectionFacility,
      },
      txHash: blockchainResult.txHash,
      blockNumber: blockchainResult.blockNumber || 0,
    })

    const qrData = await generateBatchQrCode(batch)

    return res.status(201).json({
      success: true,
      message: `Batch ${batchId} registered and anchored to blockchain ledger`,
      data: {
        ...batch.toObject(),
        id: batch.batchId,
        handovers: [initialHandover],
        qr: qrData,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function updateBatch(req, res, next) {
  try {
    const { batchId } = req.params
    const updated = await Batch.findOneAndUpdate({ batchId }, req.body, { new: true })
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Batch not found' })
    }

    return res.json({
      success: true,
      message: 'Batch updated successfully',
      data: updated,
    })
  } catch (err) {
    next(err)
  }
}

export async function getBatchQr(req, res, next) {
  try {
    const { batchId } = req.params
    const batch = await Batch.findOne({ batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' })
    }

    const qrInfo = await generateBatchQrCode(batch)
    return res.json({
      success: true,
      data: qrInfo,
    })
  } catch (err) {
    next(err)
  }
}

export async function submitBatchSorting(req, res, next) {
  try {
    const { batchId } = req.params
    const validated = sortingBreakdownSchema.parse(req.body)

    const batch = await Batch.findOne({ batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found` })
    }

    // Calculate total sorted weight
    const totalSortedWeightKg = Number(
      validated.categories.reduce((acc, cat) => acc + (Number(cat.weightKg) || 0), 0).toFixed(2)
    )

    // Original gross weight remains intact
    const originalGross = Number(batch.grossWeight)
    const differenceKg = Number((totalSortedWeightKg - originalGross).toFixed(2))
    const absDifference = Math.abs(differenceKg)

    // Check threshold (0.5 kg standard tolerance for physical sorting)
    const toleranceKg = 0.5
    const isDiscrepancy = absDifference > toleranceKg
    const sortingStatus = isDiscrepancy ? 'Weight Difference Exceeded' : 'Reconciled'

    if (isDiscrepancy) {
      batch.status = 'Flagged Discrepancy'
    } else if (batch.status === 'Flagged Discrepancy' && batch.sortingBreakdown?.sortingStatus === 'Weight Difference Exceeded') {
      batch.status = 'Registered'
    }

    batch.sortingBreakdown = {
      isSorted: true,
      sortedAt: new Date(),
      sortedBy: validated.sortedBy || req.user?.name || 'Authorized Sorting Staff',
      categories: validated.categories,
      totalSortedWeightKg,
      sortingDifferenceKg: differenceKg,
      sortingStatus,
      sortingNotes: validated.sortingNotes || '',
    }

    await batch.save()

    // Log audit event
    await AuditEvent.create({
      eventType: 'BATCH_SORTED',
      batchId,
      organization: batch.sourceOrg,
      actor: validated.sortedBy || req.user?.name || 'Sorting Technician',
      details: {
        originalGrossWeightKg: originalGross,
        totalSortedWeightKg,
        differenceKg,
        sortingStatus,
        categoriesCount: validated.categories.length,
      },
      timestamp: new Date(),
    })

    return res.json({
      success: true,
      message: isDiscrepancy
        ? `Sorting recorded with weight variance warning: difference of ${differenceKg > 0 ? '+' : ''}${differenceKg} kg exceeds 0.5 kg threshold`
        : 'Sorting and material breakdown reconciled successfully',
      data: {
        ...batch.toObject(),
        id: batch.batchId,
      },
    })
  } catch (err) {
    next(err)
  }
}
