import { Router } from 'express'
import {
  runOptimization,
  getOptimizationRun,
  approveOptimization,
  getOptimizationHistory,
} from '../controllers/optimizationController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// QpiAI Opt Dispatch and Assignment endpoints
router.post('/dispatch', authenticate, runOptimization)
router.post('/run', authenticate, runOptimization)
router.post('/assign', authenticate, runOptimization) // compatibility alias
router.post('/', authenticate, runOptimization) // direct mount alias (e.g. /api/dispatch)
router.get('/history', getOptimizationHistory)
router.get('/:runId', getOptimizationRun)
router.post('/:runId/approve', authenticate, approveOptimization)

export default router
