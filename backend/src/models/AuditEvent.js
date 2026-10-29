import mongoose from 'mongoose'

const AuditEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'BATCH_REGISTERED',
        'BATCH_SORTED',
        'BATCH_SORTING_DISCREPANCY',
        'TRANSPORTER_ASSIGNED',
        'CUSTODY_HANDOVER_ACCEPTED',
        'DEPOT_SCALE_VERIFIED',
        'RECYCLER_ASSIGNED',
        'RECYCLER_INTAKE_CONFIRMED',
        'DISCREPANCY_FLAG_TRIGGERED',
        'MASS_BALANCE_RECONCILED',
        'DUPLICATE_CLAIM_DETECTED',
        'OPTIMIZATION_APPROVED',
        'QUANTUM_JOB_COMPLETED',
        'BLOCKCHAIN_ANCHOR_SUCCESS',
        'BLOCKCHAIN_VERIFICATION_SUCCESS',
        'BLOCKCHAIN_VERIFIED',
        'BLOCKCHAIN_REANCHORED',
        'FINAL_REGULATORY_AUDIT_CERTIFIED',
        'FACILITY_ONBOARDED',
        'FACILITY_UPDATED',
        'PUBLIC_FACILITIES_IMPORTED',
      ],
      index: true,
    },
    batchId: {
      type: String,
      default: null,
      index: true,
    },
    organization: {
      type: String,
      default: 'CPCB Consortium',
    },
    actor: {
      type: String,
      default: 'System',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    txHash: {
      type: String,
      default: '',
      index: true,
    },
    blockNumber: {
      type: Number,
      default: 0,
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
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
)

export const AuditEvent = mongoose.model('AuditEvent', AuditEventSchema)
