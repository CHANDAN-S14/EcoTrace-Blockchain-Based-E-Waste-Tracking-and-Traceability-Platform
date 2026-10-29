import mongoose from 'mongoose'

const RecyclerAssignmentSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    selectedBatchIds: [{ type: String }],
    objective: {
      type: String,
      default: 'MINIMIZE_COST',
    },
    constraints: {
      enforceCapacity: { type: Boolean, default: true },
      enforceLicence: { type: Boolean, default: true },
    },
    solverEngine: {
      type: String,
      default: 'QpiAI Opt Engine',
    },
    isQpiAiCloud: {
      type: Boolean,
      default: false,
    },
    assignments: [
      {
        batchId: { type: String, required: true },
        batchCategory: { type: String },
        batchWeight: { type: Number },
        facilityId: { type: String, required: true },
        facilityName: { type: String },
        licenceNumber: { type: String },
        estimatedCost: { type: Number },
        unitRateKg: { type: Number },
        expectedYieldPercent: { type: Number },
        expectedRecoveredKg: { type: Number },
        facilityUtilizationBefore: { type: Number },
        facilityUtilizationAfter: { type: Number },
        assignmentObjective: { type: String },
        status: { type: String, default: 'Feasible & Optimized' },
      },
    ],
    unassignedBatches: [
      {
        batchId: { type: String },
        batchWeight: { type: Number },
        category: { type: String },
        reason: { type: String },
      },
    ],
    summary: {
      objective: { type: String },
      objectiveLabel: { type: String },
      objectiveScore: { type: Number },
      objectiveMetricLabel: { type: String },
      objectiveMetricValue: { type: String },
      totalBatches: { type: Number },
      assignedCount: { type: Number },
      unassignedCount: { type: Number },
      totalWeightKg: { type: Number },
      totalAllocatedKg: { type: Number },
      totalOptimizedCost: { type: Number },
      baselineUnoptimizedCost: { type: Number },
      costSavings: { type: Number },
      savingsPercent: { type: Number },
      totalExpectedRecoveredKg: { type: Number },
      averageExpectedYieldPercent: { type: Number },
      minUtilization: { type: Number },
      maxUtilization: { type: Number },
      utilizationSpread: { type: Number },
      averageUtilization: { type: Number },
      solverEngine: { type: String },
    },
    executionEvidence: {
      problemId: { type: String, default: null },
      jobId: { type: String, default: null },
      solverStatus: { type: String, default: null },
      endpoint: { type: String, default: null },
      authType: { type: String, default: null },
      cloudAttempted: { type: Boolean, default: false },
      cloudSuccess: { type: Boolean, default: false },
      cloudError: { type: String, default: null },
      fallbackReason: { type: String, default: null },
      submittedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      durationMs: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['RECOMMENDED', 'APPROVED', 'REJECTED'],
      default: 'RECOMMENDED',
      index: true,
    },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: null },
  },
  { timestamps: true }
)

export const RecyclerAssignment = mongoose.model('RecyclerAssignment', RecyclerAssignmentSchema)
