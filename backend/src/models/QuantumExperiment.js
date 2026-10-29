import mongoose from 'mongoose'

const QuantumExperimentSchema = new mongoose.Schema(
  {
    experimentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    jobId: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'REJECTED'],
      default: 'COMPLETED',
    },
    circuit: {
      id: { type: String, default: 'circ-qaoa-4q' },
      name: { type: String, default: '4-Qubit QAOA E-Waste Dispatch' },
      qubits: { type: Number, default: 4 },
      depth: { type: Number, default: 6 },
    },
    backend: {
      id: { type: String, default: 'qpiai-sim-sv' },
      name: { type: String, default: 'QpiAI Local Statevector Simulator' },
      qubits: { type: Number, default: 4 },
      noiseModel: { type: String, default: 'Ideal (Noiseless)' },
      isLiveCloud: { type: Boolean, default: false },
    },
    shots: {
      type: Number,
      default: 2048,
    },
    parameters: {
      gamma: { type: Number, default: 0.785 },
      beta: { type: Number, default: 0.392 },
    },
    executionTimeMs: {
      type: Number,
      default: 0,
    },
    executionMode: {
      type: String,
      default: 'Local Statevector Simulator (QpiAI Python SDK)',
    },
    isLiveCloud: {
      type: Boolean,
      default: false,
    },
    optimalState: {
      type: String,
      default: '|0110⟩',
    },
    optimalStateProbability: {
      type: Number,
      default: 0,
    },
    groundEnergy: {
      type: Number,
      default: -4.32,
    },
    groundStateEnergy: {
      type: Number,
      default: -4.32,
    },
    expectationEnergy: {
      type: Number,
      default: -2.1,
    },
    distribution: [
      {
        state: String,
        rawState: String,
        count: Number,
        probability: Number,
        costEnergy: Number,
        isOptimal: Boolean,
      },
    ],
    rawCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    explanation: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const QuantumExperiment = mongoose.model('QuantumExperiment', QuantumExperimentSchema)
