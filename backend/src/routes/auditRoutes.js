import { Router } from 'express'
import {
  getAuditRecords,
  getComplianceStats,
  certifyBatchAudit,
  getBatchFullAuditReport,
} from '../controllers/auditController.js'
import { exportBatchAuditPdf } from '../controllers/reportController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/records', getAuditRecords)
router.get('/compliance', getComplianceStats)

// Full Comprehensive Consignment Audit Report Dossier & PDF
router.get('/report/:batchId/pdf', exportBatchAuditPdf)
router.get('/:batchId/report/pdf', exportBatchAuditPdf)
router.get('/report/:batchId', getBatchFullAuditReport)
router.get('/:batchId/report', getBatchFullAuditReport)

// Final Regulatory Audit Certification
router.post('/:batchId/certify', authenticate, certifyBatchAudit)
router.post('/certify/:batchId', authenticate, certifyBatchAudit)

export default router
