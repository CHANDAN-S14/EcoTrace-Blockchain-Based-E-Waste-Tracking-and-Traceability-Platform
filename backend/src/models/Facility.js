import mongoose from 'mongoose'

const FacilitySchema = new mongoose.Schema(
  {
    facilityId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    facilityType: {
      type: String,
      enum: ['COLLECTION_CENTRE', 'RECYCLER', 'DISMANTLER', 'PRODUCER', 'DEPOT'],
      default: 'RECYCLER',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING_VERIFICATION', 'UNVERIFIED'],
      default: 'UNVERIFIED',
      index: true,
    },
    registrationNumber: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    licenceNumber: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    licenceStatus: {
      type: String,
      enum: [
        'Active & Verified',
        'Review Required (Expiring)',
        'Suspended',
        'Unverified',
        'Pending Verification',
        'Not Applicable',
      ],
      default: 'Unverified',
      index: true,
    },
    validityStart: {
      type: Date,
      default: null,
    },
    validityEnd: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      required: true,
    },
    coordinates: {
      type: [Number], // [lat, lng]
      default: [12.9716, 77.5946],
    },
    capacityKgMonth: {
      type: Number,
      default: null,
    },
    currentLoadKg: {
      type: Number,
      default: 0,
    },
    categoriesAccepted: {
      type: [String],
      default: [],
    },
    recoveryYieldAvg: {
      type: Number,
      default: null,
    },
    rating: {
      type: String,
      default: 'Unrated',
    },
    contactEmail: {
      type: String,
      default: '',
    },
    lastVerifiedDate: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: String,
      default: null,
    },
    licenceEvidenceUrl: {
      type: String,
      default: '',
    },
    // Public data source attribution
    dataSource: {
      type: String,
      default: 'Manual Registration',
    },
    sourceId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    sourceUrl: {
      type: String,
      default: '',
    },
    importedAt: {
      type: Date,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
)

export const Facility = mongoose.model('Facility', FacilitySchema)
