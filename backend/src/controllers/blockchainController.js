import {
  registerBatchOnChain,
  recordCustodyEventOnChain,
  recordRecoveryOnChain,
  verifyEvidenceOnChain,
  checkBatchExistsOnChain,
  getBlockchainStatus,
} from '../services/blockchainService.js'
import { AuditEvent } from '../models/AuditEvent.js'
import { Batch } from '../models/Batch.js'

export async function registerBatch(req, res, next) {
  try {
    const { batchId, evidenceHash } = req.body
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' })
    }

    const batch = await Batch.findOne({ batchId })
    const hashToAnchor =
      evidenceHash || batch?.evidenceHash || '0x0000000000000000000000000000000000000000000000000000000000000000'

    const result = await registerBatchOnChain(batchId, hashToAnchor)

    if (!result.success) {
      return res.status(503).json({
        success: false,
        message: result.error || 'Failed to anchor batch to blockchain',
        data: result,
      })
    }

    if (batch) {
      batch.blockchainHash = result.txHash || batch.blockchainHash
      batch.blockchainTx = result.txHash || batch.blockchainTx
      batch.blockchainStatus = 'ANCHORED'
      batch.blockchainChainId = result.chainId || batch.blockchainChainId
      batch.blockchainNetwork = result.network || batch.blockchainNetwork
      batch.blockchainContractAddress = result.contractAddress || batch.blockchainContractAddress
      batch.blockchainBlockNumber = result.blockNumber || batch.blockchainBlockNumber
      batch.blockchainExplorerUrl = result.explorerUrl || batch.blockchainExplorerUrl || ''

      // Record in anchor history without deleting historical chain events
      if (!Array.isArray(batch.blockchainAnchorHistory)) {
        batch.blockchainAnchorHistory = []
      }
      batch.blockchainAnchorHistory.push({
        network: result.network,
        chainId: result.chainId,
        contractAddress: result.contractAddress,
        txHash: result.txHash || batch.blockchainHash,
        blockNumber: result.blockNumber || batch.blockchainBlockNumber,
        digest: hashToAnchor,
        status: 'ANCHORED',
        explorerUrl: result.explorerUrl || '',
        anchoredAt: new Date(),
        anchoredBy: req.user?.name || 'Smart Contract Relay',
      })
      await batch.save()
    }

    await AuditEvent.create({
      eventType: 'BLOCKCHAIN_ANCHOR_SUCCESS',
      batchId,
      organization: `${result.network} Node`,
      actor: req.user?.name || 'Smart Contract Relay',
      txHash: result.txHash || '',
      blockNumber: result.blockNumber || 0,
      chainId: result.chainId,
      network: result.network,
      contractAddress: result.contractAddress,
      details: {
        gasUsed: result.gasUsed,
        contractAddress: result.contractAddress,
        explorerUrl: result.explorerUrl,
        alreadyRegistered: result.alreadyRegistered || false,
      },
    })

    return res.json({
      success: true,
      message: `Batch ${batchId} successfully anchored to ${result.network} smart contract registry.`,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

export async function anchorBatchById(req, res, next) {
  try {
    const { batchId } = req.params
    const batch = await Batch.findOne({ batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found in database` })
    }

    const result = await registerBatchOnChain(batchId, batch.evidenceHash)
    if (!result.success) {
      return res.status(503).json({
        success: false,
        message: result.error || 'Failed to anchor batch to blockchain',
        data: result,
      })
    }

    batch.blockchainHash = result.txHash || batch.blockchainHash
    batch.blockchainTx = result.txHash || batch.blockchainTx
    batch.blockchainStatus = 'ANCHORED'
    batch.blockchainChainId = result.chainId || batch.blockchainChainId
    batch.blockchainNetwork = result.network || batch.blockchainNetwork
    batch.blockchainContractAddress = result.contractAddress || batch.blockchainContractAddress
    batch.blockchainBlockNumber = result.blockNumber || batch.blockchainBlockNumber
    batch.blockchainExplorerUrl = result.explorerUrl || batch.blockchainExplorerUrl || ''

    if (!Array.isArray(batch.blockchainAnchorHistory)) {
      batch.blockchainAnchorHistory = []
    }
    batch.blockchainAnchorHistory.push({
      network: result.network,
      chainId: result.chainId,
      contractAddress: result.contractAddress,
      txHash: result.txHash || batch.blockchainHash,
      blockNumber: result.blockNumber || batch.blockchainBlockNumber,
      digest: batch.evidenceHash,
      status: 'ANCHORED',
      explorerUrl: result.explorerUrl || '',
      anchoredAt: new Date(),
      anchoredBy: req.user?.name || 'Authorized Auditor',
    })
    await batch.save()

    await AuditEvent.create({
      eventType: 'BLOCKCHAIN_ANCHOR_SUCCESS',
      batchId,
      organization: `${result.network} Node`,
      actor: req.user?.name || 'Authorized Auditor',
      txHash: result.txHash || '',
      blockNumber: result.blockNumber || 0,
      chainId: result.chainId,
      network: result.network,
      contractAddress: result.contractAddress,
      details: {
        gasUsed: result.gasUsed,
        contractAddress: result.contractAddress,
        explorerUrl: result.explorerUrl,
      },
    })

    return res.json({
      success: true,
      message: `Batch ${batchId} anchored to ${result.network} (Block #${result.blockNumber})`,
      data: {
        ...result,
        batchId,
        evidenceHash: batch.evidenceHash,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function verifyEvidence(req, res, next) {
  try {
    const batchId = req.body.batchId || req.query.batchId || req.params.batchId
    let evidenceHash = req.body.evidenceHash || req.query.evidenceHash

    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' })
    }

    const batch = await Batch.findOne({ batchId })
    if (batch && !evidenceHash) {
      evidenceHash = batch.evidenceHash
    }

    const result = await verifyEvidenceOnChain(batchId, evidenceHash)

    // Persist verified or mismatch status directly in batch document
    if (batch) {
      if (result.verified) {
        batch.blockchainStatus = 'VERIFIED'
        batch.mismatchDetails = null
        batch.blockchainChainId = result.chainId || batch.blockchainChainId
        batch.blockchainNetwork = result.network || batch.blockchainNetwork
        batch.blockchainContractAddress = result.contractAddress || batch.blockchainContractAddress
        await batch.save()

        try {
          await AuditEvent.create({
            eventType: 'BLOCKCHAIN_VERIFICATION_SUCCESS',
            batchId,
            organization: `${result.network} Node`,
            actor: req.user?.name || 'Authorized Auditor',
            chainId: result.chainId,
            network: result.network,
            contractAddress: result.contractAddress,
            details: {
              contractAddress: result.contractAddress,
              registeredAt: result.registeredAt,
              registeredBy: result.registeredBy,
              evidenceHash: result.onChainEvidenceHash,
            },
          })
        } catch (logErr) {
          console.warn('[Blockchain] AuditEvent log warning:', logErr.message)
        }
      } else if (result.existsOnChain) {
        batch.blockchainStatus = 'MISMATCH_DETECTED'
        batch.mismatchDetails = {
          localEvidenceHash: result.localEvidenceHash,
          onChainEvidenceHash: result.onChainEvidenceHash,
          detectedAt: new Date(),
          reason: result.mismatchReason || 'Local intake evidence digest does not match on-chain consensus digest',
        }
        batch.blockchainChainId = result.chainId || batch.blockchainChainId
        batch.blockchainNetwork = result.network || batch.blockchainNetwork
        batch.blockchainContractAddress = result.contractAddress || batch.blockchainContractAddress
        await batch.save()

        try {
          await AuditEvent.create({
            eventType: 'BLOCKCHAIN_VERIFICATION_MISMATCH',
            batchId,
            organization: `${result.network} Node`,
            actor: req.user?.name || 'Authorized Auditor',
            chainId: result.chainId,
            network: result.network,
            contractAddress: result.contractAddress,
            details: {
              contractAddress: result.contractAddress,
              localEvidenceHash: result.localEvidenceHash,
              onChainEvidenceHash: result.onChainEvidenceHash,
              mismatchReason: result.mismatchReason,
            },
          })
        } catch (logErr) {
          console.warn('[Blockchain] AuditEvent log warning:', logErr.message)
        }
      }
    }

    return res.json({
      success: true,
      data: {
        ...result,
        batchId,
        evidenceHash,
        batchStatus: batch?.status || 'Unknown',
        blockchainHash: batch?.blockchainHash || null,
        blockchainStatus: batch?.blockchainStatus || (result.verified ? 'VERIFIED' : result.existsOnChain ? 'MISMATCH_DETECTED' : 'PENDING'),
        blockchainChainId: batch?.blockchainChainId || result.chainId,
        blockchainNetwork: batch?.blockchainNetwork || result.network,
        blockchainContractAddress: batch?.blockchainContractAddress || result.contractAddress,
        blockchainAnchorHistory: batch?.blockchainAnchorHistory || [],
        mismatchDetails: batch?.mismatchDetails || null,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function verifyBatchById(req, res, next) {
  try {
    const { batchId } = req.params
    const batch = await Batch.findOne({ batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found` })
    }

    const result = await verifyEvidenceOnChain(batchId, batch.evidenceHash)

    if (result.verified) {
      batch.blockchainStatus = 'VERIFIED'
      batch.mismatchDetails = null
      batch.blockchainChainId = result.chainId || batch.blockchainChainId
      batch.blockchainNetwork = result.network || batch.blockchainNetwork
      await batch.save()
    } else if (result.existsOnChain) {
      batch.blockchainStatus = 'MISMATCH_DETECTED'
      batch.mismatchDetails = {
        localEvidenceHash: result.localEvidenceHash,
        onChainEvidenceHash: result.onChainEvidenceHash,
        detectedAt: new Date(),
        reason: result.mismatchReason || 'Local intake evidence digest does not match on-chain consensus digest',
      }
      batch.blockchainChainId = result.chainId || batch.blockchainChainId
      batch.blockchainNetwork = result.network || batch.blockchainNetwork
      await batch.save()
    }

    return res.json({
      success: true,
      data: {
        ...result,
        batchId,
        evidenceHash: batch.evidenceHash,
        grossWeight: batch.grossWeight,
        category: batch.category,
        batchStatus: batch.status,
        blockchainHash: batch.blockchainHash,
        blockchainStatus: batch.blockchainStatus,
        blockchainChainId: batch.blockchainChainId || result.chainId,
        blockchainNetwork: batch.blockchainNetwork || result.network,
        blockchainContractAddress: batch.blockchainContractAddress || result.contractAddress,
        blockchainAnchorHistory: batch.blockchainAnchorHistory || [],
        mismatchDetails: batch.mismatchDetails || null,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function recordCustody(req, res, next) {
  try {
    const { batchId, eventHash } = req.body
    if (!batchId || !eventHash) {
      return res.status(400).json({ success: false, message: 'batchId and eventHash are required' })
    }

    const result = await recordCustodyEventOnChain(batchId, eventHash)
    return res.json({
      success: true,
      message: `Custody event anchored on ${result.network || 'blockchain'}`,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

export async function recordRecovery(req, res, next) {
  try {
    const { batchId, recoveryHash } = req.body
    if (!batchId || !recoveryHash) {
      return res.status(400).json({ success: false, message: 'batchId and recoveryHash are required' })
    }

    const result = await recordRecoveryOnChain(batchId, recoveryHash)
    return res.json({
      success: true,
      message: `Recovery proof anchored on ${result.network || 'blockchain'}`,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

export async function getStatus(req, res) {
  const status = getBlockchainStatus()
  return res.json({
    success: true,
    data: status,
  })
}

export async function getTransactions(req, res, next) {
  try {
    const { batchId } = req.params
    const events = await AuditEvent.find({ batchId }).sort({ timestamp: -1 }).lean()
    return res.json({
      success: true,
      count: events.length,
      data: events,
    })
  } catch (err) {
    next(err)
  }
}

export async function reAnchorVersionedBatch(req, res, next) {
  try {
    const { batchId, reason } = req.body
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' })
    }

    const batch = await Batch.findOne({ batchId })
    if (!batch) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found in database` })
    }

    if (!batch.evidenceHash) {
      return res.status(400).json({ success: false, message: `Batch ${batchId} has no evidence hash to anchor` })
    }

    // Derive deterministic versioned identifier (e.g., EW-2026-00003-V2)
    const baseId = batchId.replace(/-V\d+$/i, '')
    let versionNum = 2
    let versionedId = `${baseId}-V${versionNum}`
    let onChain = await checkBatchExistsOnChain(versionedId)
    while (onChain.exists || (await Batch.findOne({ batchId: versionedId }))) {
      versionNum++
      versionedId = `${baseId}-V${versionNum}`
      onChain = await checkBatchExistsOnChain(versionedId)
    }

    // Anchor the versioned identifier on-chain with the verified local evidence digest
    const result = await registerBatchOnChain(versionedId, batch.evidenceHash)
    if (!result.success) {
      return res.status(503).json({
        success: false,
        message: result.error || 'Failed to anchor versioned consignment to blockchain',
      })
    }

    batch.versionedBatchId = versionedId
    batch.blockchainHash = result.txHash || batch.blockchainHash
    batch.blockchainTx = result.txHash || batch.blockchainTx
    batch.blockchainStatus = 'VERIFIED'
    batch.blockchainChainId = result.chainId || batch.blockchainChainId
    batch.blockchainNetwork = result.network || batch.blockchainNetwork
    batch.blockchainContractAddress = result.contractAddress || batch.blockchainContractAddress
    batch.blockchainBlockNumber = result.blockNumber || batch.blockchainBlockNumber
    batch.blockchainExplorerUrl = result.explorerUrl || batch.blockchainExplorerUrl || ''
    batch.mismatchDetails = null

    if (!Array.isArray(batch.blockchainAnchorHistory)) {
      batch.blockchainAnchorHistory = []
    }
    batch.blockchainAnchorHistory.push({
      network: result.network,
      chainId: result.chainId,
      contractAddress: result.contractAddress,
      txHash: result.txHash || batch.blockchainHash,
      blockNumber: result.blockNumber || batch.blockchainBlockNumber,
      digest: batch.evidenceHash,
      status: 'VERIFIED_VERSIONED',
      explorerUrl: result.explorerUrl || '',
      anchoredAt: new Date(),
      anchoredBy: req.user?.name || 'Regulatory Compliance Auditor',
      version: `V${versionNum}`,
      versionedBatchId: versionedId,
      reason: reason || 'Amended consignment manifest anchored under immutable versioned audit identifier',
    })
    await batch.save()

    await AuditEvent.create({
      eventType: 'BLOCKCHAIN_VERSIONED_REANCHOR',
      batchId,
      organization: `${result.network} Node`,
      actor: req.user?.name || 'Regulatory Compliance Auditor',
      txHash: result.txHash || '',
      blockNumber: result.blockNumber || 0,
      chainId: result.chainId,
      network: result.network,
      contractAddress: result.contractAddress,
      details: {
        originalBatchId: batchId,
        versionedBatchId: versionedId,
        digest: batch.evidenceHash,
        reason: reason || 'Amended manifest anchored under versioned identifier',
      },
    })

    return res.json({
      success: true,
      message: `Consignment ${batchId} successfully versioned and anchored on ${result.network} as ${versionedId}.`,
      data: {
        batchId,
        versionedBatchId: versionedId,
        evidenceHash: batch.evidenceHash,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        network: result.network,
        chainId: result.chainId,
        explorerUrl: result.explorerUrl,
      },
    })
  } catch (err) {
    next(err)
  }
}
