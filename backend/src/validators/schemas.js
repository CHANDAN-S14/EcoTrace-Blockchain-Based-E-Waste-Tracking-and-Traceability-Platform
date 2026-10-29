import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Administrator', 'Collector', 'Transporter', 'Recycler', 'Auditor']),
  organization: z.string().min(2, 'Organization is required'),
})

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
})

export const batchCreateSchema = z.object({
  batchId: z.string().optional(),
  collectionType: z.enum(['Mixed E-Waste', 'Pre-Sorted E-Waste']).default('Mixed E-Waste'),
  category: z.string().optional().default('Mixed E-Waste'),
  licenceDetails: z.string().optional().default('CPCB/KSPCB/E-WASTE/2026/VALID'),
  sourceOrg: z.string().min(2, 'Source organization is required'),
  collectionFacility: z.string().min(2, 'Collection facility is required'),
  collectionLocation: z.string().optional().default('Bangalore, Karnataka'),
  grossWeight: z.coerce.number().positive('Gross weight must be greater than zero kg'),
  collectionDate: z.string().optional(),
  assignedHandler: z.string().min(2, 'Assigned handler is required'),
  notes: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  imageTitle: z.string().optional().default(''),
  evidenceName: z.string().optional().default('Weighbridge_Digital_Slip.pdf'),
  evidenceFiles: z.union([z.string(), z.array(z.any())]).optional(),
})

export const sortingBreakdownSchema = z.object({
  categories: z.array(
    z.object({
      category: z.string().min(1, 'Category name is required'),
      weightKg: z.coerce.number().positive('Sorted weight must be greater than zero kg'),
      notes: z.string().optional().default(''),
    })
  ).min(1, 'At least one material category breakdown is required'),
  sortedBy: z.string().optional().default('Authorized Sorting Personnel'),
  sortingNotes: z.string().optional().default(''),
})

export const handoverCreateSchema = z.object({
  step: z.number().int().positive().optional().default(1),
  sender: z.string().min(2, 'Sender entity is required'),
  receiver: z.string().min(2, 'Receiver entity is required'),
  stage: z.string().min(2, 'Stage is required'),
  dispatchWeight: z.coerce.number().positive('Dispatch weight must be positive'),
  receivedWeight: z.coerce.number().positive().optional(),
  location: z.string().min(2, 'Location is required'),
  actorNotes: z.string().optional().default(''),
  evidenceUrl: z.string().optional().default(''),
  evidenceName: z.string().optional().default(''),
})

export const handoverActionSchema = z.object({
  reportedWeight: z.coerce.number().positive().optional(),
  receivedWeight: z.coerce.number().positive().optional(),
  reason: z.string().optional(),
  category: z.string().optional().default('WEIGHT_MISMATCH'),
  evidenceNote: z.string().optional(),
  actorNotes: z.string().optional(),
  operatorName: z.string().optional(),
})

export const assignTransporterSchema = z.object({
  transporterName: z.string().min(2, 'Transporter name is required'),
  vehicleNumber: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export const depotReceiptSchema = z.object({
  receivedWeight: z.coerce.number().positive('Measured dock scale weight must be greater than zero kg'),
  scaleSlipId: z.string().optional().default(''),
  scaleCalibrationDetails: z.string().optional().default(''),
  dockNotes: z.string().optional().default(''),
  evidenceNote: z.string().optional().default(''),
  operatorName: z.string().optional().default(''),
})

export const confirmIntakeSchema = z.object({
  receivedWeight: z.coerce.number().positive('Measured intake weight must be positive').optional(),
  scaleSlipId: z.string().optional().default(''),
  scaleCalibrationDetails: z.string().optional().default(''),
  actorNotes: z.string().optional().default(''),
  operatorName: z.string().optional().default(''),
  acknowledgement: z.boolean().optional().default(true),
})

export const assignRecyclerSchema = z.object({
  facilityId: z.string().min(2, 'Facility ID is required'),
  facilityName: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export const recoverySchema = z.object({
  batchId: z.string().min(3, 'Batch ID is required'),
  facility: z.string().min(2, 'Facility name is required'),
  inputWeight: z.coerce.number().positive('Input weight must be positive kg'),
  recoveredWeight: z.coerce.number().min(0).optional(),
  materials: z.record(z.string(), z.coerce.number().min(0)).default({}),
  materialsBreakdown: z.array(
    z.object({
      name: z.string(),
      weightKg: z.coerce.number().min(0),
    })
  ).optional().default([]),
  remainingWaste: z.coerce.number().min(0).optional(),
  residualWaste: z.coerce.number().min(0).optional(),
  remainingWasteDestination: z.string().optional().default(''),
  explainedLoss: z.coerce.number().min(0).default(0),
  processingReference: z.string().optional(),
  sourceOrg: z.string().optional().default(''),
  operator: z.string().optional().default('Authorized Metallurgy Tech'),
  processingDate: z.string().optional(),
  evidenceUrl: z.string().optional().default(''),
  evidenceFiles: z.array(
    z.object({
      name: z.string().optional().default(''),
      type: z.string().optional().default(''),
      url: z.string().optional().default(''),
      size: z.coerce.number().optional().default(0),
    })
  ).optional().default([]),
})

export const optimizationRunSchema = z.object({
  batchIds: z.array(z.string()).optional().default([]),
  objective: z.enum(['MINIMIZE_COST', 'MAXIMIZE_YIELD', 'BALANCED_CAPACITY']).default('MINIMIZE_COST'),
  enforceCapacity: z.boolean().default(true),
  enforceLicence: z.boolean().default(true),
})

export const quantumExperimentSchema = z.object({
  experimentId: z.string().optional(),
  circuitId: z.string().default('circ-qaoa-4q'),
  backendId: z.string().default('qpiai-sim-sv'),
  shots: z.coerce.number().int().min(100).max(10000).default(2048),
  gamma: z.coerce.number().min(0).max(3.1416).default(0.785),
  beta: z.coerce.number().min(0).max(1.5708).default(0.392),
})
