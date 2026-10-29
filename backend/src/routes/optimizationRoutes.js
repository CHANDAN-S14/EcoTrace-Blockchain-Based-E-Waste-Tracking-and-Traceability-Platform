import { Router } from 'express'
import {
  runOptimization,
  getOptimizationRun,
  approveOptimization,
  getOptimizationHistory,
} from '../controllers/optimizationController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/run', authenticate, runOptimization)
router.post('/assign', authenticate, runOptimization) // compatibility
router.get('/history', getOptimizationHistory)
router.get('/:runId', getOptimizationRun)
router.post('/:runId/approve', authenticate, approveOptimization)

export default router
