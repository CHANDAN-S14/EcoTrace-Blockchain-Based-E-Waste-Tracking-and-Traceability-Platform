import { Router } from 'express'
import {
  registerBatch,
  anchorBatchById,
  recordCustody,
  recordRecovery,
  verifyEvidence,
  verifyBatchById,
  reAnchorVersionedBatch,
  getStatus,
  getTransactions,
} from '../controllers/blockchainController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/status', getStatus)
router.post('/register-batch', authenticate, registerBatch)
router.post('/anchor/:batchId', authenticate, anchorBatchById)
router.post('/record-custody', authenticate, recordCustody)
router.post('/record-recovery', authenticate, recordRecovery)
router.post('/verify', verifyEvidence)
router.get('/verify/:batchId', verifyBatchById)
router.post('/re-anchor-versioned', reAnchorVersionedBatch)
router.get('/transactions/:batchId', getTransactions)

export default router
