import { Router } from 'express'
import {
  runQuantumExperiment,
  getQuantumJob,
  getQuantumHistory,
  getQuantumStatus,
} from '../controllers/quantumController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/experiments', authenticate, runQuantumExperiment)
router.post('/run', authenticate, runQuantumExperiment) // compatibility
router.get('/experiments', getQuantumHistory)
router.get('/history', getQuantumHistory) // compatibility alias
router.get('/status', getQuantumStatus)
router.get('/experiments/:experimentId', getQuantumJob)
router.get('/experiments/:experimentId/results', getQuantumJob)

export default router
