import { Router } from 'express'
import {
  getAllRecoveryRecords,
  submitRecoveryRecord,
  getBatchRecovery,
  getRecoveryExceptions,
  verifyRecoveryRecord,
} from '../controllers/recoveryController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', getAllRecoveryRecords)
router.post('/', authenticate, submitRecoveryRecord)
router.post('/process', authenticate, submitRecoveryRecord)
router.get('/exceptions', getRecoveryExceptions)
router.get('/claims/:claimId/verify', verifyRecoveryRecord)
router.get('/:batchId', getBatchRecovery)

export default router
