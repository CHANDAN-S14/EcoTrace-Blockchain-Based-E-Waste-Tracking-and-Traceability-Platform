import { Router } from 'express'
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  getBatchQr,
  submitBatchSorting,
} from '../controllers/batchController.js'
import {
  createHandover,
  getBatchHandovers,
  assignTransporter,
  assignRecycler,
} from '../controllers/custodyController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const handleBatchUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    upload.array('files', 15)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File size exceeds maximum allowed limit of 10 MB per file' })
        }
        return res.status(400).json({ success: false, message: err.message })
      }
      next()
    })
  } else {
    next()
  }
}

const router = Router()

// Batches
router.get('/', getBatches)
router.post('/', authenticate, requireRole('Administrator', 'Collector'), handleBatchUpload, createBatch)
router.get('/:batchId', getBatchById)
router.patch('/:batchId', authenticate, updateBatch)
router.get('/:batchId/qr', getBatchQr)
router.post('/:batchId/sorting', authenticate, requireRole('Administrator', 'Recycler', 'Collector'), submitBatchSorting)

// Batch-specific Handovers
router.post('/:batchId/handovers', authenticate, createHandover)
router.get('/:batchId/handovers', getBatchHandovers)
router.post('/:batchId/assign-transporter', authenticate, assignTransporter)
router.post('/:batchId/assign-recycler', authenticate, assignRecycler)

export default router
