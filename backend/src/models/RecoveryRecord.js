import mongoose from 'mongoose'

const RecoveryRecordSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    facility: {
      type: String,
      required: true,
      index: true,
    },
    facilityId: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    inputWeight: {
      type: Number,
      required: true,
      min: [0.01, 'Input weight must be greater than zero kg'],
    },
    recoveredWeight: {
      type: Number,
      default: 0,
    },
    materials: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    materialsBreakdown: [
      {
        name: { type: String, required: true },
        weightKg: { type: Number, required: true },
      },
    ],
    remainingWaste: {
      type: Number,
      default: 0,
    },
    remainingWasteDestination: {
      type: String,
      default: '',
    },
    explainedLoss: {
      type: Number,
      default: 0,
    },
    accountedOutput: {
      type: Number,
      required: true,
    },
    difference: {
      type: Number,
      required: true,
    },
    recoveryYield: {
      type: Number,
      required: true,
    },
    validationStatus: {
      type: String,
      enum: [
        'Reconciled',
        'Needs Review',
        'Discrepancy Detected',
        'Discrepancy Found',
        'Duplicate Claim',
        'Pending Verification',
        'Verification Failed',
      ],
      default: 'Reconciled',
      index: true,
    },
    flagReason: {
      type: String,
      default: null,
    },
    processingReference: {
      type: String,
      default: '',
    },
    sourceOrg: {
      type: String,
      default: '',
    },
    operator: {
      type: String,
      default: 'Authorized Metallurgy Tech',
    },
    evidenceUrl: {
      type: String,
      default: '',
    },
    evidenceFiles: [
      {
        name: { type: String, default: '' },
        type: { type: String, default: '' },
        url: { type: String, default: '' },
        size: { type: Number, default: 0 },
      },
    ],
    blockchainTx: {
      type: String,
      default: '',
    },
    verifiedOnChain: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

export const RecoveryRecord = mongoose.model('RecoveryRecord', RecoveryRecordSchema)
