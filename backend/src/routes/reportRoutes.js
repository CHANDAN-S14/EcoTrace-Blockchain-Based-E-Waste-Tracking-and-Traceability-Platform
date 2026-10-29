import { Router } from 'express'
import {
  getReportsSummary,
  exportReportsCsv,
  exportReportsPdf,
  exportBatchAuditPdf,
} from '../controllers/reportController.js'
import { getBatchFullAuditReport } from '../controllers/auditController.js'

const router = Router()

router.get('/summary', getReportsSummary)
router.get('/export', exportReportsCsv)
router.post('/export/csv', exportReportsCsv)
router.get('/export/pdf', exportReportsPdf)
router.post('/export/pdf', exportReportsPdf)

// Individual consignment comprehensive audit report & PDF
router.all('/audit/:batchId/pdf', exportBatchAuditPdf)
router.all('/:batchId/pdf', exportBatchAuditPdf)
router.all('/report/:batchId/pdf', exportBatchAuditPdf)
router.get('/audit/:batchId', getBatchFullAuditReport)
router.get('/:batchId', getBatchFullAuditReport)

export default router
