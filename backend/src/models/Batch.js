import mongoose from 'mongoose'

const BatchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    collectionType: {
      type: String,
      enum: ['Mixed E-Waste', 'Pre-Sorted E-Waste'],
      default: 'Mixed E-Waste',
      index: true,
    },
    category: {
      type: String,
      default: 'Mixed E-Waste',
      index: true,
    },
    licenceDetails: {
      type: String,
      default: 'CPCB/KSPCB/E-WASTE/2026/VALID',
    },
    sortingBreakdown: {
      isSorted: { type: Boolean, default: false },
      sortedAt: { type: Date, default: null },
      sortedBy: { type: String, default: null },
      categories: [
        {
          category: { type: String, required: true },
          weightKg: { type: Number, required: true },
          notes: { type: String, default: '' },
        },
      ],
      totalSortedWeightKg: { type: Number, default: 0 },
      sortingDifferenceKg: { type: Number, default: 0 },
      sortingStatus: {
        type: String,
        enum: ['Pending Sorting', 'Reconciled', 'Weight Difference Exceeded'],
        default: 'Pending Sorting',
      },
      sortingNotes: { type: String, default: '' },
    },
    sourceOrg: {
      type: String,
      required: true,
      trim: true,
    },
    collectionFacility: {
      type: String,
      required: true,
      trim: true,
    },
    collectionLocation: {
      type: String,
      default: 'Bangalore, Karnataka',
    },
    grossWeight: {
      type: Number,
      required: true,
      min: [0.01, 'Gross weight must be greater than zero kg'],
    },
    collectionDate: {
      type: Date,
      default: Date.now,
    },
    assignedHandler: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Registered', 'In Transit', 'Received', 'Processed', 'Flagged Discrepancy', 'Audited'],
      default: 'Registered',
      index: true,
    },
    assignedTransporter: {
      type: String,
      default: null,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    imageTitle: {
      type: String,
      default: '',
    },
    evidenceName: {
      type: String,
      default: 'Weighbridge_Digital_Slip.pdf',
    },
    evidenceFiles: [
      {
        name: { type: String, required: true },
        filename: { type: String },
        url: { type: String, required: true },
        size: { type: Number, default: 0 },
        mimetype: { type: String, default: '' },
        sha256: { type: String, default: '' },
        type: { type: String, enum: ['photo', 'document'], default: 'photo' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    evidenceHash: {
      type: String,
      index: true,
      default: '',
    },
    qrCodeData: {
      type: String,
      default: '',
    },
    blockchainHash: {
      type: String,
      default: '',
      index: true,
    },
    blockchainTx: {
      type: String,
      default: '',
    },
    blockchainStatus: {
      type: String,
      enum: ['PENDING', 'ANCHORED', 'FAILED', 'VERIFIED', 'MISMATCH_DETECTED', 'FLAGGED_DISCREPANCY'],
      default: 'PENDING',
    },
    versionedBatchId: {
      type: String,
      default: null,
      index: true,
    },
    mismatchDetails: {
      localEvidenceHash: { type: String, default: '' },
      onChainEvidenceHash: { type: String, default: '' },
      detectedAt: { type: Date, default: null },
      reason: { type: String, default: '' },
    },
    blockchainChainId: {
      type: Number,
      default: 31337,
      index: true,
    },
    blockchainNetwork: {
      type: String,
      default: 'Local Hardhat',
    },
    blockchainContractAddress: {
      type: String,
      default: '',
    },
    blockchainBlockNumber: {
      type: Number,
      default: null,
    },
    blockchainExplorerUrl: {
      type: String,
      default: '',
    },
    blockchainAnchorHistory: [
      {
        network: { type: String, required: true },
        chainId: { type: Number, required: true },
        contractAddress: { type: String, required: true },
        txHash: { type: String, default: '' },
        blockNumber: { type: Number, default: null },
        digest: { type: String, required: true },
        status: { type: String, default: 'ANCHORED' },
        explorerUrl: { type: String, default: '' },
        anchoredAt: { type: Date, default: Date.now },
        anchoredBy: { type: String, default: 'Authorized Operator' },
      },
    ],
    assignedFacility: {
      type: String,
      default: null,
    },
    assignedFacilityId: {
      type: String,
      default: null,
    },
    certificateId: {
      type: String,
      default: '',
      index: true,
    },
    certifiedAt: {
      type: Date,
      default: null,
    },
    auditedBy: {
      type: String,
      default: '',
    },
    finalAudit: {
      type: Object,
      default: null,
    },
    createdBy: {
      type: String,
      default: 'System Administrator',
    },
  },
  { timestamps: true }
)

export const Batch = mongoose.model('Batch', BatchSchema)
