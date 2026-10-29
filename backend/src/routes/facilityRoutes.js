import { Router } from 'express'
import {
  getFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  importPublicFacilities,
  getPublicDatasetInfo,
} from '../controllers/facilityController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Public dataset and synchronization routes (defined before /:facilityId)
router.get('/dataset-info', getPublicDatasetInfo)
router.post('/import-public', authenticate, importPublicFacilities)

// Core CRUD routes
router.get('/', getFacilities)
router.post('/', authenticate, createFacility)
router.get('/:facilityId', getFacilityById)
router.patch('/:facilityId', authenticate, updateFacility)
router.put('/:facilityId', authenticate, updateFacility)

export default router
