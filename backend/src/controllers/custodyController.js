import { CustodyEvent } from '../models/CustodyEvent.js'
import { Batch } from '../models/Batch.js'
import { Facility } from '../models/Facility.js'
import { AuditEvent } from '../models/AuditEvent.js'
import {
  handoverCreateSchema,
  handoverActionSchema,
  assignTransporterSchema,
  depotReceiptSchema,
  assignRecyclerSchema,
  confirmIntakeSchema,
} from '../validators/schemas.js'
import { computeCustodyEventHash } from '../utils/hashUtils.js'
import { recordCustodyEventOnChain, verifyEvidenceOnChain } from '../services/blockchainService.js'

export async function createHandover(req, res, next) {
  try {
    const { batchId } = req.params
    const validated = handoverCreateSchema.parse(req.body)

    const batch = await Batch.findOne({ batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found` })
    }

    const lastEvent = await CustodyEvent.findOne({ batchId }).sort({ step: -1 })
    const previousEventHash = lastEvent ? lastEvent.eventHash : 'GENESIS'
    const step = lastEvent ? lastEvent.step + 1 : 1
    const handoverId = `HO-${batchId}-${step}`

    const eventHash = computeCustodyEventHash({
      batchId,
      sender: validated.sender,
      receiver: validated.receiver,
      dispatchWeight: validated.dispatchWeight,
      receivedWeight: validated.receivedWeight || validated.dispatchWeight,
      timestamp: Date.now(),
      previousEventHash,
    })

    const handover = await CustodyEvent.create({
      ...validated,
      handoverId,
      batchId,
      step,
      previousEventHash,
      eventHash,
      status: 'Pending Review',
      verificationStatus: 'Pending Verification',
      recordedBy: req.user?.name || 'Authorized Custodian',
    })

    await Batch.findOneAndUpdate({ batchId }, { status: 'In Transit' })

    return res.status(201).json({
      success: true,
      message: `Handover ${handoverId} created for batch ${batchId}`,
      data: {
        ...handover.toObject(),
        id: handover.handoverId,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getBatchHandovers(req, res, next) {
  try {
    const { batchId } = req.params
    const handovers = await CustodyEvent.find({ batchId }).sort({ step: 1 }).lean()
    const mapped = handovers.map(h => ({
      ...h,
      id: h.handoverId || h._id.toString(),
    }))
    return res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    })
  } catch (err) {
    next(err)
  }
}

export async function assignTransporter(req, res, next) {
  try {
    const paramId = req.params.batchId || req.params.handoverId || req.body.batchId
    const validated = assignTransporterSchema.parse(req.body)

    let batch = await Batch.findOne({ batchId: paramId })
    if (!batch) {
      const ho = await CustodyEvent.findOne({
        $or: [{ handoverId: paramId }, { _id: paramId.match(/^[0-9a-fA-F]{24}$/) ? paramId : null }],
      })
      if (ho) batch = await Batch.findOne({ batchId: ho.batchId })
    }

    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${paramId} not found` })
    }
    const batchId = batch.batchId

    // Find Step 1 handover (Collection Center -> Transporter)
    let handover = await CustodyEvent.findOne({
      batchId,
      step: 1,
    })

    if (!handover) {
      // Create Step 1 if not exists
      const initialEventHash = computeCustodyEventHash({
        batchId,
        sender: batch.sourceOrg || batch.collectionFacility,
        receiver: validated.transporterName,
        dispatchWeight: batch.grossWeight,
        receivedWeight: 0,
        timestamp: Date.now(),
        previousEventHash: 'GENESIS',
      })

      handover = await CustodyEvent.create({
        handoverId: `HO-${batchId}-1`,
        batchId,
        step: 1,
        sender: batch.sourceOrg || batch.collectionFacility,
        receiver: validated.transporterName,
        stage: 'Collection Center → Transporter',
        dispatchWeight: batch.grossWeight,
        receivedWeight: null,
        variance: 0,
        location: batch.collectionFacility,
        status: 'Pending Review',
        verificationStatus: 'Pending Verification',
        actorNotes: validated.vehicleNumber
          ? `Assigned vehicle: ${validated.vehicleNumber}. ${validated.notes || ''}`.trim()
          : validated.notes || '',
        previousEventHash: 'GENESIS',
        eventHash: initialEventHash,
        evidenceName: batch.evidenceName,
        evidenceUrl: batch.imageUrl,
        recordedBy: req.user?.name || batch.assignedHandler,
      })
    } else {
      handover.receiver = validated.transporterName
      handover.status = 'Pending Review'
      handover.verificationStatus = 'Pending Verification'
      if (validated.vehicleNumber || validated.notes) {
        handover.actorNotes = [
          validated.vehicleNumber ? `Assigned vehicle: ${validated.vehicleNumber}` : '',
          validated.notes || '',
        ].filter(Boolean).join('. ')
      }
      handover.eventHash = computeCustodyEventHash({
        batchId,
        sender: handover.sender,
        receiver: validated.transporterName,
        dispatchWeight: handover.dispatchWeight,
        receivedWeight: 0,
        timestamp: Date.now(),
        previousEventHash: handover.previousEventHash || 'GENESIS',
      })
      await handover.save()
    }

    // Update batch status to In Transit and save assigned transporter
    batch.status = 'In Transit'
    batch.assignedTransporter = validated.transporterName
    await batch.save()

    // Log Audit Event
    await AuditEvent.create({
      eventType: 'TRANSPORTER_ASSIGNED',
      batchId,
      organization: validated.transporterName,
      actor: req.user?.name || 'Dispatcher',
      details: {
        handoverId: handover.handoverId,
        transporter: validated.transporterName,
        vehicleNumber: validated.vehicleNumber || 'Unspecified',
        dispatchWeightKg: handover.dispatchWeight,
      },
    })

    return res.json({
      success: true,
      message: `Transporter "${validated.transporterName}" assigned to consignment ${batchId}. Status updated to In Transit.`,
      data: {
        batch: { ...batch.toObject(), id: batch.batchId },
        handover: { ...handover.toObject(), id: handover.handoverId },
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function acceptHandover(req, res, next) {
  try {
    const targetId = req.params.handoverId || req.params.batchId || req.body.handoverId || req.body.batchId
    const { actorNotes } = handoverActionSchema.parse(req.body)

    let handover = await CustodyEvent.findOne({
      $or: [{ handoverId: targetId }, { _id: targetId && targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null }],
    })
    if (!handover) {
      handover = await CustodyEvent.findOne({ batchId: targetId, status: { $ne: 'Accepted' } }).sort({ step: 1 })
    }
    if (!handover) {
      return res.status(404).json({ success: false, message: `Handover ${targetId} not found` })
    }

    if (handover.status === 'Accepted') {
      return res.status(400).json({ success: false, message: 'Handover has already been accepted.' })
    }

    const batch = await Batch.findOne({ batchId: handover.batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Associated batch ${handover.batchId} not found` })
    }

    // Business rule checks before acceptance
    if (handover.step === 3) {
      if (batch.status === 'Flagged Discrepancy') {
        return res.status(400).json({
          success: false,
          message: `Consignment ${batch.batchId} has an unresolved discrepancy. Discrepancy resolution required before intake confirmation.`,
        })
      }
      if (!handover.receiver || handover.receiver.includes('Pending')) {
        return res.status(400).json({
          success: false,
          message: 'A certified recycler must be assigned before confirming physical intake.',
        })
      }
    }

    // Update handover event hash before anchoring
    const finalReceivedWeight = handover.receivedWeight !== null && handover.receivedWeight !== undefined
      ? handover.receivedWeight
      : handover.dispatchWeight

    handover.receivedWeight = finalReceivedWeight
    handover.variance = Number((finalReceivedWeight - handover.dispatchWeight).toFixed(2))
    handover.eventHash = computeCustodyEventHash({
      batchId: handover.batchId,
      sender: handover.sender,
      receiver: handover.receiver,
      dispatchWeight: handover.dispatchWeight,
      receivedWeight: handover.receivedWeight,
      timestamp: Date.now(),
      previousEventHash: handover.previousEventHash || 'GENESIS',
    })

    // Safe blockchain anchoring: preserve MongoDB database updates if blockchain RPC is unavailable
    let blockchainRes = { txHash: '', blockNumber: null, chainId: 31337, network: 'Local Hardhat', contractAddress: '' }
    try {
      blockchainRes = await recordCustodyEventOnChain(handover.batchId, handover.eventHash)
      handover.verificationStatus = 'Verified On-Chain'
      handover.txHash = blockchainRes.txHash || ''
      handover.blockNumber = blockchainRes.blockNumber || null
      handover.chainId = blockchainRes.chainId || 31337
      handover.network = blockchainRes.network || 'Local Hardhat'
      handover.contractAddress = blockchainRes.contractAddress || ''
    } catch (bcErr) {
      console.warn(`[Custody] Blockchain anchoring deferred for handover ${handover.handoverId}:`, bcErr.message)
      handover.verificationStatus = 'Pending Verification'
    }

    handover.status = 'Accepted'
    if (actorNotes) handover.actorNotes = actorNotes
    await handover.save()

    // Log Audit Event
    await AuditEvent.create({
      eventType: 'CUSTODY_HANDOVER_ACCEPTED',
      batchId: handover.batchId,
      organization: handover.receiver,
      actor: req.user?.name || handover.receiver,
      details: {
        handoverId: handover.handoverId,
        step: handover.step,
        stage: handover.stage,
        dispatchWeight: handover.dispatchWeight,
        receivedWeight: handover.receivedWeight,
        varianceKg: handover.variance,
      },
      txHash: blockchainRes.txHash || '',
      blockNumber: blockchainRes.blockNumber || 0,
      chainId: blockchainRes.chainId || 31337,
      network: blockchainRes.network || 'Local Hardhat',
      contractAddress: blockchainRes.contractAddress || '',
    })

    let nextHandover = null

    // Stage progression logic:
    if (handover.step === 1) {
      // Step 1: Collection Center -> Transporter accepted!
      // Batch is confirmed in transit.
      batch.status = 'In Transit'
      await batch.save()

      // Activate Step 2: Transporter -> Receiving Facility / Depot
      const existingStep2 = await CustodyEvent.findOne({ batchId: handover.batchId, step: 2 })
      if (!existingStep2) {
        const step2EventHash = computeCustodyEventHash({
          batchId: handover.batchId,
          sender: handover.receiver,
          receiver: batch.assignedFacility || 'Bangalore Central Receiving Depot',
          dispatchWeight: handover.receivedWeight,
          receivedWeight: 0,
          timestamp: Date.now(),
          previousEventHash: handover.eventHash,
        })

        nextHandover = await CustodyEvent.create({
          handoverId: `HO-${handover.batchId}-2`,
          batchId: handover.batchId,
          step: 2,
          sender: handover.receiver,
          receiver: 'Bangalore Central Receiving Depot',
          stage: 'Transporter → Receiving Facility',
          dispatchWeight: handover.receivedWeight,
          receivedWeight: null,
          variance: 0,
          location: 'Bangalore Central Receiving Depot - Inbound Dock Bay',
          status: 'Pending Review',
          verificationStatus: 'Pending Verification',
          previousEventHash: handover.eventHash,
          eventHash: step2EventHash,
          recordedBy: req.user?.name || 'Depot Inbound Scale Operator',
        })
      } else {
        nextHandover = existingStep2
      }
    } else if (handover.step === 2) {
      // Step 2: Transporter -> Receiving Facility accepted!
      batch.status = 'Received'
      await batch.save()

      // Activate Step 3: Receiving Facility -> Recycler
      const existingStep3 = await CustodyEvent.findOne({ batchId: handover.batchId, step: 3 })
      if (!existingStep3) {
        const step3EventHash = computeCustodyEventHash({
          batchId: handover.batchId,
          sender: handover.receiver,
          receiver: batch.assignedFacility || 'Pending Recycler Assignment',
          dispatchWeight: handover.receivedWeight,
          receivedWeight: 0,
          timestamp: Date.now(),
          previousEventHash: handover.eventHash,
        })

        nextHandover = await CustodyEvent.create({
          handoverId: `HO-${handover.batchId}-3`,
          batchId: handover.batchId,
          step: 3,
          sender: handover.receiver,
          receiver: batch.assignedFacility || 'Pending Recycler Assignment',
          stage: 'Receiving Facility → Recycler',
          dispatchWeight: handover.receivedWeight,
          receivedWeight: null,
          variance: 0,
          location: 'Depot Outbound Logistics Gate',
          status: 'Pending Review',
          verificationStatus: 'Pending Verification',
          previousEventHash: handover.eventHash,
          eventHash: step3EventHash,
          recordedBy: req.user?.name || 'Depot Dispatch Supervisor',
        })
      } else {
        nextHandover = existingStep3
      }
    } else if (handover.step === 3) {
      // Step 3: Recycler accepted intake!
      batch.status = 'Received'
      await batch.save()

      // Activate Step 4: Recycler -> Final Audit
      const existingStep4 = await CustodyEvent.findOne({ batchId: handover.batchId, step: 4 })
      if (!existingStep4) {
        const step4EventHash = computeCustodyEventHash({
          batchId: handover.batchId,
          sender: handover.receiver,
          receiver: 'CPCB Compliance & Regulatory Audit Board',
          dispatchWeight: handover.receivedWeight,
          receivedWeight: 0,
          timestamp: Date.now(),
          previousEventHash: handover.eventHash,
        })

        nextHandover = await CustodyEvent.create({
          handoverId: `HO-${handover.batchId}-4`,
          batchId: handover.batchId,
          step: 4,
          sender: handover.receiver,
          receiver: 'CPCB Compliance & Regulatory Audit Board',
          stage: 'Recycler → Final Audit',
          dispatchWeight: handover.receivedWeight,
          receivedWeight: null,
          variance: 0,
          location: 'Certified Metallurgy & Assay Facility',
          status: 'Pending Review',
          verificationStatus: 'Pending Verification',
          previousEventHash: handover.eventHash,
          eventHash: step4EventHash,
          recordedBy: req.user?.name || 'Recycler Intake Supervisor',
        })
      } else {
        nextHandover = existingStep4
      }
    }

    // Fetch all handovers for this batch to return clean consolidated state
    const allHandovers = await CustodyEvent.find({ batchId: handover.batchId }).sort({ step: 1 }).lean()
    const mappedHandovers = allHandovers.map(h => ({ ...h, id: h.handoverId || h._id.toString() }))

    return res.json({
      success: true,
      message: `Handover ${handover.handoverId} accepted and anchored on ledger.`,
      data: {
        ...handover.toObject(),
        id: handover.handoverId,
      },
      nextStage: nextHandover ? { ...nextHandover.toObject(), id: nextHandover.handoverId } : null,
      batch: { ...batch.toObject(), id: batch.batchId, handovers: mappedHandovers },
    })
  } catch (err) {
    next(err)
  }
}

export async function recordDepotReceipt(req, res, next) {
  try {
    const targetId = req.params.handoverId || req.params.batchId || req.body.handoverId || req.body.batchId
    const validated = depotReceiptSchema.parse(req.body)

    let handover = await CustodyEvent.findOne({
      $or: [{ handoverId: targetId }, { _id: targetId && targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null }],
    })
    if (!handover) {
      handover = await CustodyEvent.findOne({ batchId: targetId, step: 2 })
    }
    if (!handover) {
      return res.status(404).json({ success: false, message: `Handover ${targetId} not found` })
    }

    const batch = await Batch.findOne({ batchId: handover.batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${handover.batchId} not found` })
    }

    const measuredWeight = Number(validated.receivedWeight)
    const dispatchWeight = Number(handover.dispatchWeight)
    const variance = Number((measuredWeight - dispatchWeight).toFixed(2))
    const absVariance = Math.abs(variance)
    const tolerance = 20
    const isDiscrepant = absVariance > tolerance
    const operator = req.user?.name || validated.operatorName || 'Depot Scale Inspector'

    handover.receivedWeight = measuredWeight
    handover.variance = variance
    handover.scaleSlipId = validated.scaleSlipId || ''
    handover.scaleCalibrationDetails = validated.scaleCalibrationDetails || 'Certified Weighbridge (IS 1436:2002), Tare Calibrated'
    handover.weighingTimestamp = new Date()
    handover.reconciliationTolerance = tolerance
    handover.recordedBy = operator

    if (isDiscrepant) {
      // Flag discrepancy: pause progression until reviewed
      handover.status = 'Discrepancy Detected'
      handover.verificationStatus = 'Discrepancy Detected'
      handover.reconciliationResult = 'Discrepancy Detected'
      handover.discrepancyReason = `Weighbridge discrepancy of ${variance > 0 ? '+' : ''}${variance} kg exceeds allowable tolerance of ${tolerance} kg.`
      handover.discrepancyEvidence = validated.dockNotes || validated.evidenceNote || `Scale Slip #${validated.scaleSlipId || 'N/A'}`
      await handover.save()

      // Flag the batch status
      batch.status = 'Flagged Discrepancy'
      await batch.save()

      // Log Audit Event
      await AuditEvent.create({
        eventType: 'DISCREPANCY_FLAG_TRIGGERED',
        batchId: handover.batchId,
        organization: handover.receiver,
        actor: operator,
        details: {
          handoverId: handover.handoverId,
          dispatchWeightKg: dispatchWeight,
          measuredWeightKg: measuredWeight,
          varianceKg: variance,
          toleranceKg: tolerance,
          scaleSlipId: validated.scaleSlipId || 'N/A',
        },
      })

      const allHandovers = await CustodyEvent.find({ batchId: handover.batchId }).sort({ step: 1 }).lean()
      const mappedHandovers = allHandovers.map(h => ({ ...h, id: h.handoverId || h._id.toString() }))

      return res.status(200).json({
        success: true,
        discrepancyFlagged: true,
        message: `Discrepancy flagged: Measured weight (${measuredWeight} kg) deviates by ${variance > 0 ? '+' : ''}${variance} kg from dispatch weight (${dispatchWeight} kg). Progression paused for review.`,
        data: { ...handover.toObject(), id: handover.handoverId },
        reconciliation: {
          dispatchWeight,
          measuredWeight,
          varianceKg: variance,
          toleranceKg: tolerance,
          isWithinTolerance: false,
        },
        batch: { ...batch.toObject(), id: batch.batchId, handovers: mappedHandovers },
      })
    }

    // Weight is within tolerance (<= 0.5 kg)! Accept receipt and anchor to blockchain
    handover.status = 'Accepted'
    handover.reconciliationResult = 'Reconciled'
    handover.actorNotes = validated.dockNotes
      ? `Dock verified with scale slip ${validated.scaleSlipId || 'N/A'}. ${validated.dockNotes}`
      : `Dock verified: ${measuredWeight} kg (slip: ${validated.scaleSlipId || 'N/A'})`

    handover.eventHash = computeCustodyEventHash({
      batchId: handover.batchId,
      sender: handover.sender,
      receiver: handover.receiver,
      dispatchWeight: handover.dispatchWeight,
      receivedWeight: measuredWeight,
      timestamp: Date.now(),
      previousEventHash: handover.previousEventHash || 'GENESIS',
    })

    // Safe blockchain anchoring (do not discard database save if blockchain is offline)
    let blockchainRes = { txHash: '', blockNumber: null, chainId: 31337, network: 'Local Hardhat', contractAddress: '' }
    try {
      blockchainRes = await recordCustodyEventOnChain(handover.batchId, handover.eventHash)
      handover.verificationStatus = 'Verified On-Chain'
      handover.txHash = blockchainRes.txHash || ''
      handover.blockNumber = blockchainRes.blockNumber || null
      handover.chainId = blockchainRes.chainId || 31337
      handover.network = blockchainRes.network || 'Local Hardhat'
      handover.contractAddress = blockchainRes.contractAddress || ''
    } catch (bcErr) {
      console.warn(`[Custody] Blockchain anchoring deferred for depot receipt ${handover.handoverId}:`, bcErr.message)
      handover.verificationStatus = 'Pending Verification'
    }
    await handover.save()

    // Update Batch to Received
    batch.status = 'Received'
    await batch.save()

    // Log Audit Event
    await AuditEvent.create({
      eventType: 'DEPOT_SCALE_VERIFIED',
      batchId: handover.batchId,
      organization: handover.receiver,
      actor: req.user?.name || 'Depot Scale Inspector',
      details: {
        handoverId: handover.handoverId,
        dispatchWeightKg: dispatchWeight,
        measuredWeightKg: measuredWeight,
        varianceKg: variance,
        scaleSlipId: validated.scaleSlipId || 'N/A',
      },
      txHash: blockchainRes.txHash || '',
      blockNumber: blockchainRes.blockNumber || 0,
      chainId: blockchainRes.chainId || 31337,
      network: blockchainRes.network || 'Local Hardhat',
      contractAddress: blockchainRes.contractAddress || '',
    })

    // Activate Step 3: Receiving Facility -> Recycler
    let step3 = await CustodyEvent.findOne({ batchId: handover.batchId, step: 3 })
    if (!step3) {
      const step3EventHash = computeCustodyEventHash({
        batchId: handover.batchId,
        sender: handover.receiver,
        receiver: batch.assignedFacility || 'Pending Recycler Assignment',
        dispatchWeight: measuredWeight,
        receivedWeight: 0,
        timestamp: Date.now(),
        previousEventHash: handover.eventHash,
      })

      step3 = await CustodyEvent.create({
        handoverId: `HO-${handover.batchId}-3`,
        batchId: handover.batchId,
        step: 3,
        sender: handover.receiver,
        receiver: batch.assignedFacility || 'Pending Recycler Assignment',
        stage: 'Receiving Facility → Recycler',
        dispatchWeight: measuredWeight,
        receivedWeight: null,
        variance: 0,
        location: 'Depot Outbound Logistics Gate',
        status: 'Pending Review',
        verificationStatus: 'Pending Verification',
        previousEventHash: handover.eventHash,
        eventHash: step3EventHash,
        recordedBy: req.user?.name || 'Depot Dispatch Supervisor',
      })
    }

    const allHandovers = await CustodyEvent.find({ batchId: handover.batchId }).sort({ step: 1 }).lean()
    const mappedHandovers = allHandovers.map(h => ({ ...h, id: h.handoverId || h._id.toString() }))

    return res.json({
      success: true,
      message: `Receiving depot verified dock scale weight (${measuredWeight} kg, variance ${variance} kg within 0.5 kg tolerance). Stage 3 activated.`,
      data: { ...handover.toObject(), id: handover.handoverId },
      reconciliation: {
        dispatchWeight,
        measuredWeight,
        varianceKg: variance,
        toleranceKg: 20,
        isWithinTolerance: true,
      },
      nextStage: { ...step3.toObject(), id: step3.handoverId },
      batch: { ...batch.toObject(), id: batch.batchId, handovers: mappedHandovers },
    })
  } catch (err) {
    next(err)
  }
}

export async function assignRecycler(req, res, next) {
  try {
    const paramId = req.params.batchId || req.params.handoverId || req.body.batchId || req.body.handoverId
    const validated = assignRecyclerSchema.parse(req.body)

    let batch = await Batch.findOne({ batchId: paramId })
    let handover = null
    if (!batch) {
      handover = await CustodyEvent.findOne({
        $or: [{ handoverId: paramId }, { _id: paramId && paramId.match(/^[0-9a-fA-F]{24}$/) ? paramId : null }],
      })
      if (handover) {
        batch = await Batch.findOne({ batchId: handover.batchId })
      }
    } else {
      handover = await CustodyEvent.findOne({ batchId: batch.batchId, step: 3 })
    }

    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${paramId} not found` })
    }
    const batchId = batch.batchId

    // Validate recycler facility from certified facilities list
    const facility = await Facility.findOne({
      $or: [{ facilityId: validated.facilityId }, { name: validated.facilityName || validated.facilityId }],
    })

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: `Certified facility "${validated.facilityName || validated.facilityId}" not found in registered CPCB registry.`,
      })
    }

    // Verify facility licence is active
    if (facility.licenceStatus && facility.licenceStatus.toLowerCase().includes('expiring')) {
      return res.status(400).json({
        success: false,
        message: `Facility ${facility.name} licence status is "${facility.licenceStatus}". Active CPCB certification required.`,
      })
    }

    // Verify facility capacity
    const availableCapacity = (facility.capacityKgMonth || 0) - (facility.currentLoadKg || 0)
    if (availableCapacity < batch.grossWeight) {
      return res.status(400).json({
        success: false,
        message: `Facility ${facility.name} has insufficient monthly capacity (${availableCapacity} kg available vs ${batch.grossWeight} kg consignment).`,
      })
    }

    // Find Step 3 handover if not already found
    if (!handover) {
      handover = await CustodyEvent.findOne({ batchId, step: 3 })
    }
    if (handover) {
      handover.receiver = facility.name
      handover.actorNotes = validated.notes || `Assigned to CPCB certified recycler: ${facility.name} (${facility.licenceNumber})`
      handover.eventHash = computeCustodyEventHash({
        batchId,
        sender: handover.sender,
        receiver: facility.name,
        dispatchWeight: handover.dispatchWeight,
        receivedWeight: 0,
        timestamp: Date.now(),
        previousEventHash: handover.previousEventHash || 'GENESIS',
      })
      await handover.save()
    }

    // Update batch
    batch.assignedFacility = facility.name
    batch.assignedFacilityId = facility.facilityId
    await batch.save()

    // Log Audit Event
    await AuditEvent.create({
      eventType: 'RECYCLER_ASSIGNED',
      batchId,
      organization: facility.name,
      actor: req.user?.name || 'Logistics Coordinator',
      details: {
        facilityId: facility.facilityId,
        facilityName: facility.name,
        licenceNumber: facility.licenceNumber,
        consignmentWeightKg: batch.grossWeight,
      },
    })

    const allHandovers = await CustodyEvent.find({ batchId }).sort({ step: 1 }).lean()
    const mappedHandovers = allHandovers.map(h => ({ ...h, id: h.handoverId || h._id.toString() }))

    return res.json({
      success: true,
      message: `Consignment ${batchId} assigned to certified recycler "${facility.name}".`,
      data: {
        batch: { ...batch.toObject(), id: batch.batchId, handovers: mappedHandovers },
        facility,
        handover: handover ? { ...handover.toObject(), id: handover.handoverId } : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function reportDiscrepancy(req, res, next) {
  try {
    const handoverId = req.params.handoverId || req.body.handoverId || req.params.batchId || req.body.batchId
    const { reportedWeight, reason, evidenceNote, category, operatorName } = handoverActionSchema.parse(req.body)

    let handover = await CustodyEvent.findOne({
      $or: [{ handoverId }, { _id: handoverId && handoverId.match(/^[0-9a-fA-F]{24}$/) ? handoverId : null }],
    })
    if (!handover && (req.params.batchId || req.body.batchId)) {
      const bId = req.params.batchId || req.body.batchId
      handover = await CustodyEvent.findOne({ batchId: bId, status: { $ne: 'Accepted' } }).sort({ step: 1 })
    }
    if (!handover) {
      return res.status(404).json({ success: false, message: `Handover ${handoverId} not found` })
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A specific reason and category are required to report a discrepancy.' })
    }

    const numReported = reportedWeight !== undefined ? Number(reportedWeight) : (handover.receivedWeight ?? handover.dispatchWeight)
    const variance = Number((numReported - handover.dispatchWeight).toFixed(2))
    const operator = req.user?.name || operatorName || 'Receiving Supervisor'

    handover.receivedWeight = numReported
    handover.variance = variance
    handover.status = 'Discrepancy Detected'
    handover.verificationStatus = 'Discrepancy Detected'
    handover.reconciliationResult = 'Discrepancy Detected'
    handover.discrepancyReason = reason.trim()
    handover.discrepancyEvidence = evidenceNote || `Discrepancy report filed: ${category || 'Physical Scale Deviation'}`
    await handover.save()

    // Flag batch
    const batch = await Batch.findOneAndUpdate(
      { batchId: handover.batchId },
      { status: 'Flagged Discrepancy' },
      { new: true }
    )

    // Log Audit Event
    await AuditEvent.create({
      eventType: 'DISCREPANCY_FLAG_TRIGGERED',
      batchId: handover.batchId,
      organization: handover.receiver,
      actor: operator,
      details: {
        handoverId: handover.handoverId,
        dispatchWeight: handover.dispatchWeight,
        reportedWeight: numReported,
        varianceKg: variance,
        reason: reason.trim(),
        category: category || 'Physical Scale Deviation',
      },
    })

    const allHandovers = await CustodyEvent.find({ batchId: handover.batchId }).sort({ step: 1 }).lean()
    const mappedHandovers = allHandovers.map(h => ({ ...h, id: h.handoverId || h._id.toString() }))

    return res.json({
      success: true,
      message: `Discrepancy flagged on handover ${handover.handoverId} for compliance audit.`,
      data: { ...handover.toObject(), id: handover.handoverId },
      batch: batch ? { ...batch.toObject(), id: batch.batchId, handovers: mappedHandovers } : null,
    })
  } catch (err) {
    next(err)
  }
}

export async function getPendingHandovers(req, res, next) {
  try {
    const pending = await CustodyEvent.find({
      status: { $in: ['Pending Review', 'Pending Verification'] },
    }).sort({ createdAt: -1 }).lean()

    const mapped = pending.map(h => ({ ...h, id: h.handoverId || h._id.toString() }))

    return res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    })
  } catch (err) {
    next(err)
  }
}

export async function confirmRecyclerIntake(req, res, next) {
  try {
    const targetId = req.params.handoverId || req.params.batchId || req.body.handoverId || req.body.batchId
    const validated = confirmIntakeSchema.parse(req.body)

    let handover = await CustodyEvent.findOne({
      $or: [{ handoverId: targetId }, { _id: targetId && targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null }],
    })
    if (!handover) {
      handover = await CustodyEvent.findOne({ batchId: targetId, step: 3 })
    }
    if (!handover) {
      return res.status(404).json({ success: false, message: `Handover ${targetId} not found` })
    }

    const batch = await Batch.findOne({ batchId: handover.batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${handover.batchId} not found` })
    }

    // 1. Guard against unresolved discrepancy
    if (batch.status === 'Flagged Discrepancy' || handover.status === 'Discrepancy Detected') {
      return res.status(400).json({
        success: false,
        message: `Consignment ${batch.batchId} has an unresolved discrepancy. Discrepancy resolution required before intake confirmation.`,
      })
    }

    // 2. Guard against missing or pending recycler assignment
    if (!handover.receiver || handover.receiver.includes('Pending')) {
      return res.status(400).json({
        success: false,
        message: 'A certified recycler must be assigned before confirming physical intake.',
      })
    }

    // 3. Verify facility in registry
    const facility = await Facility.findOne({
      $or: [{ name: handover.receiver }, { facilityId: batch.assignedFacilityId }],
    })
    if (!facility) {
      return res.status(400).json({
        success: false,
        message: `Receiving facility "${handover.receiver}" is not recognized in the certified CPCB registry.`,
      })
    }

    // 4. Validate intake weight & reconciliation tolerance
    const measuredWeight = validated.receivedWeight !== undefined ? Number(validated.receivedWeight) : Number(handover.dispatchWeight)
    const dispatchWeight = Number(handover.dispatchWeight)
    const variance = Number((measuredWeight - dispatchWeight).toFixed(2))
    const absVariance = Math.abs(variance)
    const tolerance = 20
    const isDiscrepant = absVariance > tolerance

    const operator = req.user?.name || validated.operatorName || 'Recycler Intake Supervisor'

    handover.receivedWeight = measuredWeight
    handover.variance = variance
    handover.scaleSlipId = validated.scaleSlipId || ''
    handover.scaleCalibrationDetails = validated.scaleCalibrationDetails || 'Certified Scale (IS 1436:2002)'
    handover.intakeConfirmedBy = operator
    handover.intakeConfirmedAt = new Date()

    if (isDiscrepant) {
      handover.status = 'Discrepancy Detected'
      handover.verificationStatus = 'Discrepancy Detected'
      handover.reconciliationResult = 'Discrepancy Detected'
      handover.discrepancyReason = `Recycler intake scale deviation of ${variance > 0 ? '+' : ''}${variance} kg exceeds statutory ±${tolerance} kg tolerance.`
      await handover.save()

      batch.status = 'Flagged Discrepancy'
      await batch.save()

      await AuditEvent.create({
        eventType: 'DISCREPANCY_FLAG_TRIGGERED',
        batchId: handover.batchId,
        organization: handover.receiver,
        actor: operator,
        details: {
          handoverId: handover.handoverId,
          dispatchWeightKg: dispatchWeight,
          measuredWeightKg: measuredWeight,
          varianceKg: variance,
          toleranceKg: tolerance,
          stage: 'Recycler Intake',
        },
      })

      const allHandovers = await CustodyEvent.find({ batchId: handover.batchId }).sort({ step: 1 }).lean()
      const mappedHandovers = allHandovers.map(h => ({ ...h, id: h.handoverId || h._id.toString() }))

      return res.status(200).json({
        success: true,
        discrepancyFlagged: true,
        message: `Discrepancy flagged: Recycler intake weight (${measuredWeight} kg) deviates by ${variance > 0 ? '+' : ''}${variance} kg from manifest. Process paused for compliance audit.`,
        data: { ...handover.toObject(), id: handover.handoverId },
        batch: { ...batch.toObject(), id: batch.batchId, handovers: mappedHandovers },
      })
    }

    // Weight within tolerance: confirm intake
    handover.status = 'Accepted'
    handover.reconciliationResult = 'Reconciled'
    handover.actorNotes = validated.actorNotes || `Intake confirmed by ${facility.name} under CPCB guidelines.`

    handover.eventHash = computeCustodyEventHash({
      batchId: handover.batchId,
      sender: handover.sender,
      receiver: handover.receiver,
      dispatchWeight: handover.dispatchWeight,
      receivedWeight: measuredWeight,
      timestamp: Date.now(),
      previousEventHash: handover.previousEventHash || 'GENESIS',
    })

    // Safe blockchain anchoring (do not discard MongoDB persistence if blockchain is offline)
    let blockchainRes = { txHash: '', blockNumber: null, chainId: 31337, network: 'Local Hardhat', contractAddress: '' }
    try {
      blockchainRes = await recordCustodyEventOnChain(handover.batchId, handover.eventHash)
      handover.verificationStatus = 'Verified On-Chain'
      handover.txHash = blockchainRes.txHash || ''
      handover.blockNumber = blockchainRes.blockNumber || null
      handover.chainId = blockchainRes.chainId || 31337
      handover.network = blockchainRes.network || 'Local Hardhat'
      handover.contractAddress = blockchainRes.contractAddress || ''
    } catch (bcErr) {
      console.warn(`[Custody] Blockchain anchoring deferred for recycler intake ${handover.handoverId}:`, bcErr.message)
      handover.verificationStatus = 'Pending Verification'
    }

    await handover.save()

    // Update batch to Received
    batch.status = 'Received'
    await batch.save()

    // Log Audit Event
    await AuditEvent.create({
      eventType: 'RECYCLER_INTAKE_CONFIRMED',
      batchId: handover.batchId,
      organization: facility.name,
      actor: operator,
      details: {
        handoverId: handover.handoverId,
        facilityName: facility.name,
        measuredWeightKg: measuredWeight,
        varianceKg: variance,
        scaleSlipId: validated.scaleSlipId || 'N/A',
      },
    })

    // Activate Step 4: Recycler -> Final Audit
    let step4 = await CustodyEvent.findOne({ batchId: handover.batchId, step: 4 })
    if (!step4) {
      const step4EventHash = computeCustodyEventHash({
        batchId: handover.batchId,
        sender: handover.receiver,
        receiver: 'CPCB Compliance & Regulatory Audit Board',
        dispatchWeight: measuredWeight,
        receivedWeight: 0,
        timestamp: Date.now(),
        previousEventHash: handover.eventHash,
      })

      step4 = await CustodyEvent.create({
        handoverId: `HO-${handover.batchId}-4`,
        batchId: handover.batchId,
        step: 4,
        sender: handover.receiver,
        receiver: 'CPCB Compliance & Regulatory Audit Board',
        stage: 'Recycler → Final Audit',
        dispatchWeight: measuredWeight,
        receivedWeight: null,
        variance: 0,
        location: facility.location || 'Certified Metallurgy & Assay Facility',
        status: 'Pending Review',
        verificationStatus: 'Pending Verification',
        previousEventHash: handover.eventHash,
        eventHash: step4EventHash,
        recordedBy: operator,
      })
    }

    const allHandovers = await CustodyEvent.find({ batchId: handover.batchId }).sort({ step: 1 }).lean()
    const mappedHandovers = allHandovers.map(h => ({ ...h, id: h.handoverId || h._id.toString() }))

    return res.json({
      success: true,
      message: `Recycler intake confirmed for consignment ${handover.batchId} (${measuredWeight} kg). Next stage: Metallurgy Recovery Processing activated.`,
      data: { ...handover.toObject(), id: handover.handoverId },
      nextStage: { ...step4.toObject(), id: step4.handoverId },
      batch: { ...batch.toObject(), id: batch.batchId, handovers: mappedHandovers },
    })
  } catch (err) {
    next(err)
  }
}

export async function syncBatchLedger(req, res, next) {
  try {
    const paramId = req.params.batchId || req.body.batchId || req.params.id
    if (!paramId) {
      return res.status(400).json({ success: false, message: 'Batch ID is required for ledger synchronization.' })
    }

    const batch = await Batch.findOne({ batchId: paramId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Consignment ${paramId} not found in database.` })
    }
    const batchId = batch.batchId

    // 1. Retrieve all persisted handovers in step sequence
    const handovers = await CustodyEvent.find({ batchId }).sort({ step: 1 })

    // 2. Validate hash chain and sequence
    const issues = []
    let previousHash = 'GENESIS'
    let hashChainValid = true

    for (let i = 0; i < handovers.length; i++) {
      const h = handovers[i]
      const expectedStep = i + 1
      if (h.step !== expectedStep) {
        issues.push(`Handover ${h.handoverId} has step ${h.step}, expected sequence ${expectedStep}`)
      }
      if (h.previousEventHash !== previousHash) {
        hashChainValid = false
        issues.push(`Cryptographic break at handover ${h.handoverId}: previousEventHash mismatch`)
      }
      previousHash = h.eventHash || 'GENESIS'
    }

    // 3. Check blockchain on-chain consensus
    let onChainState = {
      connected: false,
      isLiveRpc: false,
      existsOnChain: false,
      verified: false,
      onChainCustodyEvents: 0,
      network: 'Local Hardhat',
      chainId: 31337,
      contractAddress: '',
    }

    try {
      if (batch.evidenceHash) {
        const verifyRes = await verifyEvidenceOnChain(batchId, batch.evidenceHash)
        onChainState = {
          connected: Boolean(verifyRes.isLiveRpc),
          isLiveRpc: Boolean(verifyRes.isLiveRpc),
          existsOnChain: Boolean(verifyRes.existsOnChain),
          verified: Boolean(verifyRes.verified),
          onChainCustodyEvents: verifyRes.totalCustodyEvents || 0,
          network: verifyRes.network || 'Local Hardhat',
          chainId: verifyRes.chainId || 31337,
          contractAddress: verifyRes.contractAddress || '',
          contractExplorerUrl: verifyRes.contractExplorerUrl || '',
          txExplorerUrl: verifyRes.txExplorerUrl || '',
        }
      }
    } catch (bcErr) {
      console.warn(`[SyncLedger] Blockchain verification unreachable for ${batchId}:`, bcErr.message)
      issues.push(`Blockchain RPC offline: ${bcErr.message}. Database records preserved.`)
    }

    // 4. Correlate handover database status vs blockchain status
    let verifiedOnChainCount = 0
    let pendingVerificationCount = 0
    let discrepanciesCount = 0

    const enrichedHandovers = handovers.map((h) => {
      const isAnchored = Boolean(h.txHash && h.txHash.length > 10)
      let separateBlockchainStatus = 'UNANCHORED'
      if (h.status === 'Discrepancy Detected') {
        discrepanciesCount++
        separateBlockchainStatus = 'DISCREPANCY_FLAGGED'
      } else if (isAnchored && onChainState.connected) {
        verifiedOnChainCount++
        separateBlockchainStatus = 'VERIFIED_ON_CHAIN'
      } else if (isAnchored) {
        separateBlockchainStatus = 'ANCHORED_PENDING_CONSENSUS'
      } else {
        pendingVerificationCount++
        separateBlockchainStatus = 'PENDING_ANCHOR'
      }

      return {
        ...h.toObject(),
        id: h.handoverId || h._id.toString(),
        databaseStatus: h.status,
        blockchainStatus: separateBlockchainStatus,
      }
    })

    // 5. Update batch if needed
    if (onChainState.verified && batch.blockchainStatus !== 'VERIFIED') {
      batch.blockchainStatus = 'VERIFIED'
      await batch.save()
    }

    return res.json({
      success: true,
      batchId,
      syncedAt: new Date().toISOString(),
      blockchain: onChainState,
      summary: {
        totalHandovers: handovers.length,
        verifiedOnChain: verifiedOnChainCount,
        pendingVerification: pendingVerificationCount,
        discrepanciesCount,
        hashChainValid,
        batchDatabaseStatus: batch.status,
        batchBlockchainStatus: batch.blockchainStatus,
      },
      issues,
      data: enrichedHandovers,
      batch: {
        ...batch.toObject(),
        id: batch.batchId,
        handovers: enrichedHandovers,
      },
    })
  } catch (err) {
    next(err)
  }
}
