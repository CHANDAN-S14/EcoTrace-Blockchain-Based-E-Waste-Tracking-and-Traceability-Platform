import mongoose from 'mongoose'

const MaterialClaimSchema = new mongoose.Schema(
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
    inputWeight: {
      type: Number,
      required: true,
    },
    recoveredWeight: {
      type: Number,
      required: true,
    },
    claimDate: {
      type: Date,
      default: Date.now,
    },
    validationStatus: {
      type: String,
      enum: ['VALIDATED', 'FLAGGED_DUPLICATE', 'UNDER_REVIEW', 'REJECTED'],
      default: 'VALIDATED',
      index: true,
    },
    conflictClaimId: {
      type: String,
      default: null,
    },
    evidenceHash: {
      type: String,
      default: '',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

export const MaterialClaim = mongoose.model('MaterialClaim', MaterialClaimSchema)
