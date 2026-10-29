import { Router } from 'express'
import {
  createClaim,
  getClaimById,
  validateClaim,
  getClaimExceptions,
} from '../controllers/claimController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.post('/', authenticate, createClaim)
router.get('/exceptions', getClaimExceptions)
router.get('/:claimId', getClaimById)
router.post('/:claimId/validate', authenticate, requireRole('Administrator', 'Auditor'), validateClaim)

export default router
