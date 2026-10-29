import mongoose from 'mongoose'

const CustodyEventSchema = new mongoose.Schema(
  {
    handoverId: {
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
    step: {
      type: Number,
      default: 1,
    },
    sender: {
      type: String,
      required: true,
    },
    receiver: {
      type: String,
      required: true,
    },
    stage: {
      type: String,
      required: true,
      enum: [
        'Collection Center → Transporter',
        'Transporter → Receiving Facility',
        'Transporter → Receiving Depot',
        'Receiving Facility → Recycler',
        'Receiving Depot → Certified Recycler',
        'Recycler → Final Audit',
      ],
    },
    dispatchWeight: {
      type: Number,
      required: true,
    },
    receivedWeight: {
      type: Number,
      default: null,
    },
    variance: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      required: true,
    },
    coordinates: {
      lat: { type: Number, default: 12.9716 },
      lng: { type: Number, default: 77.5946 },
    },
    status: {
      type: String,
      enum: ['Accepted', 'Pending Review', 'Discrepancy Detected', 'Rejected'],
      default: 'Pending Review',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['Verified On-Chain', 'Pending Verification', 'Discrepancy Detected'],
      default: 'Pending Verification',
    },
    evidenceUrl: {
      type: String,
      default: '',
    },
    evidenceName: {
      type: String,
      default: '',
    },
    actorNotes: {
      type: String,
      default: '',
    },
    scaleSlipId: {
      type: String,
      default: '',
    },
    scaleCalibrationDetails: {
      type: String,
      default: '',
    },
    weighingTimestamp: {
      type: Date,
      default: null,
    },
    reconciliationTolerance: {
      type: Number,
      default: 20,
    },
    reconciliationResult: {
      type: String,
      enum: ['Reconciled', 'Discrepancy Detected', 'Pending'],
      default: 'Pending',
    },
    intakeConfirmedBy: {
      type: String,
      default: null,
    },
    intakeConfirmedAt: {
      type: Date,
      default: null,
    },
    discrepancyReason: {
      type: String,
      default: null,
    },
    discrepancyEvidence: {
      type: String,
      default: null,
    },
    txHash: {
      type: String,
      default: '',
    },
    blockNumber: {
      type: Number,
      default: null,
    },
    chainId: {
      type: Number,
      default: 31337,
    },
    network: {
      type: String,
      default: 'Local Hardhat',
    },
    contractAddress: {
      type: String,
      default: '',
    },
    previousEventHash: {
      type: String,
      default: 'GENESIS',
    },
    eventHash: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: String,
      default: 'Authorized Operator',
    },
  },
  { timestamps: true }
)

export const CustodyEvent = mongoose.model('CustodyEvent', CustodyEventSchema)
