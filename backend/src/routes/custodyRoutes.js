import { Router } from 'express'
import {
  acceptHandover,
  reportDiscrepancy,
  getPendingHandovers,
  assignTransporter,
  recordDepotReceipt,
  assignRecycler,
  confirmRecyclerIntake,
  syncBatchLedger,
  getBatchHandovers,
} from '../controllers/custodyController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Pending handovers
router.get('/pending', getPendingHandovers)

// Batch handovers list
router.get('/:batchId/handovers', getBatchHandovers)
router.get('/:batchId', getBatchHandovers)

// Stage 1 & 2: Assign Transporter
router.post('/:batchId/assign-transporter', authenticate, assignTransporter)
router.post('/assign-transporter/:batchId', authenticate, assignTransporter)

// Stage 2: Accept Handover (Transporter or Recycler acceptance)
router.post('/:handoverId/accept', authenticate, acceptHandover)
router.post('/:batchId/handovers/:handoverId/accept', authenticate, acceptHandover)

// Stage 3: Receiving Depot Dock Scale Weighing
router.post('/:handoverId/depot-receipt', authenticate, recordDepotReceipt)
router.post('/:batchId/handovers/:handoverId/depot-receipt', authenticate, recordDepotReceipt)

// Stage 4: Assign Certified Recycler
router.post('/:handoverId/assign-recycler', authenticate, assignRecycler)
router.post('/:batchId/assign-recycler', authenticate, assignRecycler)

// Stage 3 & 4: Confirm Recycler Intake
router.post('/:handoverId/confirm-intake', authenticate, confirmRecyclerIntake)
router.post('/:batchId/handovers/:handoverId/confirm-intake', authenticate, confirmRecyclerIntake)
router.post('/:batchId/confirm-intake', authenticate, confirmRecyclerIntake)

// Ledger Synchronization & Hash Chain Verification
router.post('/:batchId/sync', syncBatchLedger)
router.post('/sync/:batchId', syncBatchLedger)
router.get('/:batchId/sync', syncBatchLedger)

// Discrepancy & Rejection
router.post('/:handoverId/discrepancy', authenticate, reportDiscrepancy)
router.post('/:batchId/handovers/:handoverId/discrepancy', authenticate, reportDiscrepancy)
router.post('/:handoverId/reject', authenticate, reportDiscrepancy)

export default router
