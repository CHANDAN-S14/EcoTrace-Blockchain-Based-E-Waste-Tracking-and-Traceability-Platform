import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import request from 'supertest'
import { app } from '../src/app.js'
import { connectDB, closeDB } from '../src/config/db.js'
import { Batch } from '../src/models/Batch.js'
import { Facility } from '../src/models/Facility.js'
import {
  getChemistryDescriptor,
  buildQuboFormulation,
  checkFacilityEligibility,
} from '../src/services/optimizationService.js'
import { qpiLogger, LOG_FILE, sanitizeLogMessage } from '../src/utils/qpiLogger.js'

describe('QpiAI Opt QUBO Facility Dispatch & Terminal Logs Protocol', () => {
  before(async () => {
    await connectDB()
    await Batch.findOneAndUpdate(
      { batchId: 'EW-2026-00001' },
      {
        batchId: 'EW-2026-00001',
        category: 'PCBs & Circuit Boards',
        sourceOrg: 'Apex Datacenters Hub',
        collectionFacility: 'Bangalore Central Hub',
        grossWeight: 2450.0,
        status: 'Registered',
        assignedHandler: 'Logistics Dispatcher',
      },
      { upsert: true, new: true }
    )
    await Batch.findOneAndUpdate(
      { batchId: 'EW-2026-00002' },
      {
        batchId: 'EW-2026-00002',
        category: 'Consumer Electronics',
        sourceOrg: 'Apex Datacenters Hub',
        collectionFacility: 'Bangalore Central Hub',
        grossWeight: 1800.0,
        status: 'Registered',
        assignedHandler: 'Logistics Dispatcher',
      },
      { upsert: true, new: true }
    )
  })

  after(async () => {
    await closeDB()
  })

  // 1. Chemistry & QUBO Formulation Unit Tests
  describe('QUBO Problem & Stream Compatibility Unit Verification', () => {
    test('getChemistryDescriptor returns accurate metallurgical and chemical profiles', () => {
      assert.match(getChemistryDescriptor('PCBs & Circuit Boards'), /Precious & Base Metallics/)
      assert.match(getChemistryDescriptor('Lithium Batteries'), /Li-Ion \/ Cobalt-Nickel/)
      assert.match(getChemistryDescriptor('IT & Telecom Servers'), /High-Density Integrated Systems/)
      assert.match(getChemistryDescriptor('Large Appliances'), /Ferrous \/ Steel Alloy/)
      assert.match(getChemistryDescriptor('Consumer Electronics'), /Mixed Multi-Polymer/)
      assert.match(getChemistryDescriptor('Unknown Waste'), /Heterogeneous E-Waste Matrix/)
    })

    test('buildQuboFormulation builds valid QUBO matrix and Ising penalty factors', () => {
      const mockBatches = [
        { batchId: 'EW-TEST-001', grossWeight: 1500, category: 'PCBs & Circuit Boards' },
      ]
      const mockFacilities = [
        { facilityId: 'FAC-01', name: 'Fac 1', capacityKgMonth: 10000, currentLoadKg: 2000, categoriesAccepted: ['PCBs & Circuit Boards'], licenceStatus: 'Active & Verified' },
        { facilityId: 'FAC-02', name: 'Fac 2', capacityKgMonth: 10000, currentLoadKg: 3000, categoriesAccepted: ['PCBs & Circuit Boards'], licenceStatus: 'Active & Verified' },
      ]

      const { quboDict, problemPayload, quboMetadata } = buildQuboFormulation({
        batches: mockBatches,
        facilities: mockFacilities,
        objective: 'MINIMIZE_COST',
        enforceCapacity: true,
        enforceLicence: true,
      })

      assert.ok(quboDict)
      assert.equal(problemPayload.method, 'QUBO')
      assert.equal(problemPayload.num_variables, 2)
      assert.equal(quboMetadata.B, 1)
      assert.equal(quboMetadata.F, 2)
      assert.equal(quboMetadata.numVariables, 2)
      assert.equal(quboMetadata.P_assign, 50000.0)
      assert.equal(quboMetadata.P_ineligible, 100000.0)
      assert.equal(quboMetadata.P_capacity, 80000.0)
      // Check quadratic mutual exclusion penalty exists between x_00 and x_01
      assert.ok(quboDict['0,1'] > 0)
    })
  })

  // 2. POST /api/qubo/dispatch Endpoint & Output Verification
  describe('POST /api/qubo/dispatch Endpoint & Terminal Logs Output', () => {
    test('POST /api/qubo/dispatch with single batchId generates all 5 terminal log sections and returns consistent result', async () => {
      // Capture console output during dispatch execution
      const capturedLogs = []
      const originalLog = console.log
      console.log = (...args) => {
        capturedLogs.push(args.join(' '))
        originalLog(...args)
      }

      let res
      try {
        res = await request(app)
          .post('/api/qubo/dispatch')
          .send({
            batchId: 'EW-2026-00001',
            objective: 'MINIMIZE_COST',
            enforceCapacity: true,
            enforceLicence: true,
          })
      } finally {
        console.log = originalLog
      }

      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      assert.ok(res.body.data)
      assert.ok(res.body.data.selectedFacility, 'selectedFacility must be present in response data')
      assert.ok(res.body.data.selectedFacilityId, 'selectedFacilityId must be present in response data')
      assert.equal(res.body.data.selectedBatchId, 'EW-2026-00001')
      assert.ok(res.body.data.assignments.length >= 1)
      assert.equal(res.body.data.assignments[0].facilityName, res.body.data.selectedFacility)
      assert.ok(res.body.data.metrics)
      assert.ok(res.body.data.executionEvidence)

      const fullLogOutput = capturedLogs.join('\n')

      // Verify all 5 terminal sections were printed
      assert.match(fullLogOutput, />>> \[1\/5\] QPIAI OPT DISPATCH REQUEST/)
      assert.match(fullLogOutput, />>> \[2\/5\] QUBO PROBLEM INITIALIZATION & ISING FORMULATION/)
      assert.match(fullLogOutput, />>> \[3\/5\] CONSTRAINT PREPARATION & FACILITY SCREENING/)
      assert.match(fullLogOutput, />>> \[4\/5\] SOLVER EXECUTION & COMPUTE STATUS/)
      assert.match(fullLogOutput, />>> \[5\/5\] FINAL DISPATCH & ALLOCATION RESULT/)

      // Verify detailed required operational logging items:
      assert.match(fullLogOutput, /Batch ID\s*:\s*EW-2026-00001/, 'Must log batch ID')
      assert.match(fullLogOutput, /Chemistry\s*:/, 'Must log chemistry compatibility stream')
      assert.match(fullLogOutput, /CPCB Licence Check/, 'Must log licence validation check')
      assert.match(fullLogOutput, /Available Capacity/, 'Must log available capacity headroom')
      assert.match(fullLogOutput, /Transport Factor/, 'Must log transport cost factor')
      assert.match(fullLogOutput, /SOLVER DISPATCH MODE/, 'Must clearly distinguish solver mode')
      assert.match(fullLogOutput, /SELECTED FACILITY\s*:\s*.+/, 'Must log selected facility derived from solver')

      // Verify credentials sanitization (no secret tokens or keys in output)
      assert.doesNotMatch(fullLogOutput, /sk-[a-zA-Z0-9]{20,}/, 'Must never log raw secret keys')
      assert.doesNotMatch(fullLogOutput, /Bearer ey[a-zA-Z0-9_-]{30,}/, 'Must never log raw JWT credentials')
    })

    test('POST /api/qubo/dispatch with MAXIMIZE_YIELD optimizes for metallurgical recovery rate', async () => {
      const res = await request(app)
        .post('/api/qubo/dispatch')
        .send({
          batchId: 'EW-2026-00001',
          objective: 'MAXIMIZE_YIELD',
          enforceCapacity: true,
          enforceLicence: true,
        })

      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.metrics.objective, 'MAXIMIZE_YIELD')
      assert.equal(res.body.data.metrics.objectiveMetricLabel, 'Average Expected Recovery Yield')
      assert.ok(res.body.data.metrics.averageExpectedYieldPercent > 0)
      assert.ok(res.body.data.selectedFacility)
    })

    test('POST /api/qubo/dispatch with BALANCED_CAPACITY balances recycler quota distribution', async () => {
      const res = await request(app)
        .post('/api/qubo/dispatch')
        .send({
          batchIds: ['EW-2026-00001', 'EW-2026-00002'],
          objective: 'BALANCED_CAPACITY',
          enforceCapacity: true,
          enforceLicence: true,
        })

      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.metrics.objective, 'BALANCED_CAPACITY')
      assert.equal(res.body.data.metrics.objectiveMetricLabel, 'Post-Assignment Quota Spread')
      assert.ok(res.body.data.metrics.utilizationSpread >= 0)
    })

    test('Route aliases POST /api/optimization/dispatch and POST /api/dispatch behave identically', async () => {
      const res1 = await request(app)
        .post('/api/optimization/dispatch')
        .send({
          batchId: 'EW-2026-00001',
          objective: 'MINIMIZE_COST',
        })
      assert.equal(res1.status, 201)
      assert.equal(res1.body.success, true)

      const res2 = await request(app)
        .post('/api/dispatch')
        .send({
          batchId: 'EW-2026-00001',
          objective: 'MINIMIZE_COST',
        })
      assert.equal(res2.status, 201)
      assert.equal(res2.body.success, true)
    })
  })

  // 3. Structured Error Handling & Logging
  describe('Structured Error Logging for Invalid Inputs & Infeasible Problems', () => {
    test('POST /api/qubo/dispatch with invalid objective returns HTTP 400 and logs structured error', async () => {
      const capturedErrors = []
      const originalErr = console.error
      console.error = (...args) => {
        capturedErrors.push(args.join(' '))
        originalErr(...args)
      }

      let res
      try {
        res = await request(app)
          .post('/api/qubo/dispatch')
          .send({
            objective: 'INVALID_OBJECTIVE_XYZ',
          })
      } finally {
        console.error = originalErr
      }

      assert.equal(res.status, 400)
      assert.equal(res.body.success, false)
      assert.match(res.body.message, /Invalid optimization dispatch parameters/)

      const errorOutput = capturedErrors.join('\n')
      assert.match(errorOutput, /QPIAI OPT DISPATCH ERROR/)
      assert.match(errorOutput, /INVALID_INPUT_PAYLOAD/)
    })

    test('POST /api/qubo/dispatch with non-existent batchId returns HTTP 404 and logs structured error', async () => {
      const capturedErrors = []
      const originalErr = console.error
      console.error = (...args) => {
        capturedErrors.push(args.join(' '))
        originalErr(...args)
      }

      let res
      try {
        res = await request(app)
          .post('/api/qubo/dispatch')
          .send({
            batchId: 'EW-NON-EXISTENT-99999',
          })
      } finally {
        console.error = originalErr
      }

      assert.equal(res.status, 404)
      assert.equal(res.body.success, false)
      assert.match(res.body.message, /No consignments found matching batch ID/)

      const errorOutput = capturedErrors.join('\n')
      assert.match(errorOutput, /QPIAI OPT DISPATCH ERROR/)
      assert.match(errorOutput, /CONSIGNMENTS_NOT_FOUND/)
    })
  })

  // 4. Automatic File Logging & Resilience Suite
  describe('Automatic File Logging to backend/logs/qpi-ai-opt.txt & Resilience Protocol', () => {
    test('Logs directory and qpi-ai-opt.txt are created automatically and populate execution log', async () => {
      // Clear logs first to test clean generation
      qpiLogger.clearLogs()

      const res = await request(app)
        .post('/api/qubo/dispatch')
        .send({
          batchId: 'EW-2026-00001',
          objective: 'MINIMIZE_COST',
          enforceCapacity: true,
          enforceLicence: true,
        })

      assert.equal(res.status, 201)
      assert.ok(fs.existsSync(LOG_FILE), 'Log file backend/logs/qpi-ai-opt.txt must exist')

      const logContent = fs.readFileSync(LOG_FILE, 'utf8')
      assert.ok(logContent.length > 500, 'Log file must have recorded substantial log output')

      // Verify header and 5-section execution report are present in the text file
      assert.match(logContent, /ECOTRACE \| QPIAI OPT DISPATCH/)
      assert.match(logContent, />>> \[1\/5\] QPIAI OPT DISPATCH REQUEST/)
      assert.match(logContent, />>> \[2\/5\] QUBO PROBLEM INITIALIZATION & ISING FORMULATION/)
      assert.match(logContent, />>> \[3\/5\] CONSTRAINT PREPARATION & FACILITY SCREENING/)
      assert.match(logContent, />>> \[4\/5\] SOLVER EXECUTION & COMPUTE STATUS/)
      assert.match(logContent, />>> \[5\/5\] FINAL DISPATCH & ALLOCATION RESULT/)

      // Verify all 12 operational lifecycle stages in the log file
      assert.match(logContent, /\[QPI AI OPT\] Received dispatch request from UI\.\.\./)
      assert.match(logContent, /\[QPI AI OPT\] Batch ID:\s*EW-2026-00001/)
      assert.match(logContent, /\[QPI AI OPT\] Initializing Facility Dispatch QUBO\.\.\./)
      assert.match(logContent, /\[QPI AI OPT\] Loading eligible facilities\.\.\./)
      assert.match(logContent, /\[QPI AI OPT\] Applying capacity constraints\.\.\./)
      assert.match(logContent, /\[QPI AI OPT\] Applying chemistry compatibility penalties\.\.\./)
      assert.match(logContent, /\[QPI AI OPT\] Applying transportation cost factors\.\.\./)
      assert.match(logContent, /\[QPI AI OPT\] Submitting optimization problem to QpiAI Opt\.\.\./)
      assert.match(logContent, /\[QPI AI OPT\] Solver Status:\s*(?:COMPLETED|FEASIBLE_OPTIMAL|PARTIALLY_CONSTRAINED)/)
      assert.match(logContent, /\[QPI AI OPT\] Selected Facility:\s*.+/)
      assert.match(logContent, /\[QPI AI OPT\] Objective Value:\s*.+/)
      assert.match(logContent, /\[QPI AI OPT\] Optimization completed\./)
    })

    test('Consecutive optimization runs append to the log file without overwriting past history', async () => {
      assert.ok(fs.existsSync(LOG_FILE))
      const initialContent = fs.readFileSync(LOG_FILE, 'utf8')
      const initialSize = fs.statSync(LOG_FILE).size

      // Second dispatch with MAXIMIZE_YIELD
      const res = await request(app)
        .post('/api/qubo/dispatch')
        .send({
          batchId: 'EW-2026-00002',
          objective: 'MAXIMIZE_YIELD',
          enforceCapacity: true,
          enforceLicence: true,
        })

      assert.equal(res.status, 201)
      const updatedSize = fs.statSync(LOG_FILE).size
      const updatedContent = fs.readFileSync(LOG_FILE, 'utf8')

      // Assert size increased (appended)
      assert.ok(updatedSize > initialSize, `File size must increase after append: ${updatedSize} > ${initialSize}`)
      // Assert both batch IDs are recorded in the same file
      assert.match(updatedContent, /EW-2026-00001/)
      assert.match(updatedContent, /EW-2026-00002/)
      // Assert both objectives are present
      assert.match(updatedContent, /MINIMIZE_COST/)
      assert.match(updatedContent, /MAXIMIZE_YIELD/)
    })

    test('File write errors never crash or abort the optimization dispatch pipeline', async () => {
      // Temporarily mock appendFileSync to simulate an IO / permission / disk-full exception
      const originalAppend = fs.appendFileSync
      let appendFailed = false

      fs.appendFileSync = () => {
        appendFailed = true
        throw new Error('ENOSPC: no space left on device, write')
      }

      try {
        const res = await request(app)
          .post('/api/qubo/dispatch')
          .send({
            batchId: 'EW-2026-00001',
            objective: 'MINIMIZE_COST',
          })

        // Endpoint MUST succeed despite file logging failure
        assert.equal(res.status, 201)
        assert.equal(res.body.success, true)
        assert.ok(res.body.data.selectedFacility)
        assert.ok(appendFailed, 'appendFileSync mock should have been called and thrown')
      } finally {
        fs.appendFileSync = originalAppend
      }
    })

    test('sanitizeLogMessage strips JWTs, X-Secret-Token, private keys, and RPC keys from log output', () => {
      const sensitiveInput = [
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M',
        'X-Secret-Token: qpiai_opt_secret_key_999888777',
        'private_key: 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
        'RPC URL: https://eth-sepolia.g.alchemy.com/v2/alch_super_secret_key_123',
        'Infura URL: https://sepolia.infura.io/v3/infura_secret_key_456',
      ].join('\n')

      const sanitized = sanitizeLogMessage(sensitiveInput)

      assert.doesNotMatch(sanitized, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/)
      assert.match(sanitized, /Bearer \[MASKED_JWT\]/)
      assert.doesNotMatch(sanitized, /qpiai_opt_secret_key_999888777/)
      assert.match(sanitized, /X-Secret-Token: \[MASKED_TOKEN\]/)
      assert.doesNotMatch(sanitized, /0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d/)
      assert.doesNotMatch(sanitized, /alch_super_secret_key_123/)
      assert.doesNotMatch(sanitized, /infura_secret_key_456/)
    })
  })
})
