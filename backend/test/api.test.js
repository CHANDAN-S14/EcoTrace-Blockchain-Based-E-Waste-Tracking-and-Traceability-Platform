import test, { describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../src/app.js'
import { connectDB, closeDB } from '../src/config/db.js'
import { seedInitialDatabase } from '../src/utils/seedData.js'

describe('EcoTrace Industrial API Integration Tests', () => {
  before(async () => {
    await connectDB()
    await seedInitialDatabase()
  })

  after(async () => {
    await closeDB()
  })

  // 1. Healthcheck & System Diagnostics
  describe('Health & Diagnostics API', () => {
    test('GET /api/health should return system status and subsystems readiness', async () => {
      const res = await request(app).get('/api/health')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.service, 'EcoTrace Industrial Intelligence API')
      assert.ok(res.body.database)
      assert.ok(res.body.blockchain)
      assert.ok(res.body.quantum)
      assert.ok(res.body.optimization)
    })
  })

  // 2. Batch Lifecycle & Registry
  describe('Batch Lifecycle API', () => {
    let createdBatchId = ''

    test('GET /api/batches should return seeded batches array', async () => {
      const res = await request(app).get('/api/batches')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(Array.isArray(res.body.data))
      assert.ok(res.body.data.length >= 0)
    })

    test('POST /api/batches should register a new e-waste consignment', async () => {
      const payload = {
        batchId: `BATCH-TEST-${Date.now()}`,
        category: 'PCBs & Circuit Boards',
        sourceOrg: 'Apex Datacenters Test Hub',
        collectionFacility: 'Bangalore Central Hub',
        grossWeight: 750.5,
        collectionDate: new Date().toISOString(),
        assignedHandler: 'Kiran Rao (#KA-EWT-901)',
        notes: 'High-density decommissioned server blade motherboards.',
      }

      const res = await request(app).post('/api/batches').send(payload)
      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.batchId, payload.batchId)
      assert.ok(res.body.data.blockchainHash)
      assert.ok(res.body.data.evidenceHash)
      createdBatchId = payload.batchId
    })

    test('GET /api/batches/:batchId should return the created batch with QR details', async () => {
      const res = await request(app).get(`/api/batches/${createdBatchId}`)
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.batchId, createdBatchId)
      assert.ok(res.body.data.qr)
      assert.ok(res.body.data.qr.qrDataUrl.startsWith('data:image/png;base64,'))
    })

    test('GET /api/batches/:batchId/qr should return direct QR image data', async () => {
      const res = await request(app).get(`/api/batches/${createdBatchId}/qr`)
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.qrDataUrl)
      assert.ok(res.body.data.verificationUrl)
    })

    test('POST /api/batches without batchId should automatically generate sequential EW-YYYY-XXXXX format', async () => {
      const res = await request(app).post('/api/batches').send({
        collectionType: 'Mixed E-Waste',
        sourceOrg: 'Bangalore Municipal Corp',
        collectionFacility: 'Peenya Sorting Center',
        grossWeight: 500.0,
        assignedHandler: 'Ramesh Kumar',
        licenceDetails: 'CPCB/REG/2026/099',
      })
      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      assert.match(res.body.data.batchId, /^EW-\d{4}-\d{5}$/)
      assert.equal(res.body.data.collectionType, 'Mixed E-Waste')
      assert.equal(res.body.data.grossWeight, 500.0)
    })

    test('POST /api/batches/:batchId/sorting should reconcile mixed batch breakdown within tolerance', async () => {
      const createRes = await request(app).post('/api/batches').send({
        collectionType: 'Mixed E-Waste',
        sourceOrg: 'Tech Park IT Hub',
        collectionFacility: 'Whitefield Depot',
        grossWeight: 100.0,
        assignedHandler: 'Ramesh Kumar',
      })
      const id = createRes.body.data.batchId

      const sortRes = await request(app).post(`/api/batches/${id}/sorting`).send({
        sortedBy: 'Lead Sorter Suresh',
        categories: [
          { category: 'Computers & Laptops', weightKg: 40.0 },
          { category: 'Mobile Phones', weightKg: 20.0 },
          { category: 'Circuit Boards', weightKg: 25.0 },
          { category: 'Cables & Accessories', weightKg: 15.0 },
        ],
        sortingNotes: 'Accurate segregation, gross matches sum within 0.0kg.',
      })
      assert.equal(sortRes.status, 200)
      assert.equal(sortRes.body.success, true)
      assert.equal(sortRes.body.data.sortingBreakdown.isSorted, true)
      assert.equal(sortRes.body.data.sortingBreakdown.totalSortedWeightKg, 100.0)
      assert.equal(sortRes.body.data.sortingBreakdown.sortingDifferenceKg, 0)
      assert.equal(sortRes.body.data.sortingBreakdown.sortingStatus, 'Reconciled')
    })

    test('POST /api/batches/:batchId/sorting should flag discrepancy if weight difference > 0.5kg', async () => {
      const createRes = await request(app).post('/api/batches').send({
        collectionType: 'Mixed E-Waste',
        sourceOrg: 'Tech Park IT Hub',
        collectionFacility: 'Whitefield Depot',
        grossWeight: 100.0,
        assignedHandler: 'Ramesh Kumar',
      })
      const id = createRes.body.data.batchId

      const sortRes = await request(app).post(`/api/batches/${id}/sorting`).send({
        sortedBy: 'Lead Sorter Suresh',
        categories: [
          { category: 'Computers & Laptops', weightKg: 40.0 },
          { category: 'Mobile Phones', weightKg: 20.0 },
          { category: 'Circuit Boards', weightKg: 25.0 },
          { category: 'Cables & Accessories', weightKg: 10.0 },
        ],
        sortingNotes: 'Unaccounted loss of 5.0kg during segregation.',
      })
      assert.equal(sortRes.status, 200)
      assert.equal(sortRes.body.success, true)
      assert.equal(sortRes.body.data.sortingBreakdown.totalSortedWeightKg, 95.0)
      assert.equal(sortRes.body.data.sortingBreakdown.sortingDifferenceKg, -5.0)
      assert.equal(sortRes.body.data.sortingBreakdown.sortingStatus, 'Weight Difference Exceeded')
      assert.equal(sortRes.body.data.status, 'Flagged Discrepancy')
    })
  })

  // 3. Chain of Custody & Handover Ledger
  describe('Chain of Custody Handover API', () => {
    let testBatchId = ''
    let testHandoverId = ''

    before(async () => {
      testBatchId = `BATCH-HO-TEST-${Date.now()}`
      await request(app).post('/api/batches').send({
        batchId: testBatchId,
        category: 'Lithium Batteries',
        sourceOrg: 'Metro Fleet Services',
        collectionFacility: 'Whitefield E-Depot',
        grossWeight: 1200.0,
        collectionDate: new Date().toISOString(),
        assignedHandler: 'Praveen K',
      })
    })

    test('POST /api/batches/:batchId/handovers should append custody step with hash chain', async () => {
      const res = await request(app)
        .post(`/api/batches/${testBatchId}/handovers`)
        .send({
          sender: 'Metro Fleet Services',
          receiver: 'TransChem Haulage Ltd',
          stage: 'Collection Center → Transporter',
          dispatchWeight: 1200.0,
          location: 'Whitefield Depot Bay 1',
        })

      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      testHandoverId = res.body.data.handoverId
      assert.ok(testHandoverId)
      assert.ok(res.body.data.eventHash)
      assert.ok(res.body.data.previousEventHash)
    })

    test('POST /api/custody/:handoverId/accept should accept handover and anchor to on-chain ledger', async () => {
      const res = await request(app)
        .post(`/api/custody/${testHandoverId}/accept`)
        .send({ actorNotes: 'Seal intact and weight verified at dispatch gate.' })

      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.status, 'Accepted')
      assert.equal(res.body.data.verificationStatus, 'Verified On-Chain')
      assert.ok(res.body.data.txHash)
    })

    test('POST /api/custody/:handoverId/discrepancy should report scale variance and flag batch', async () => {
      // Create second handover step
      const step2Res = await request(app)
        .post(`/api/batches/${testBatchId}/handovers`)
        .send({
          sender: 'TransChem Haulage Ltd',
          receiver: 'CleanTech E-Solutions Hub',
          stage: 'Transporter → Receiving Facility',
          dispatchWeight: 1200.0,
          location: 'CleanTech Receiving Bay',
        })
      const ho2Id = step2Res.body.data.handoverId

      const res = await request(app)
        .post(`/api/custody/${ho2Id}/discrepancy`)
        .send({
          reportedWeight: 1165.0,
          reason: '35 kg transit loss detected at dock scale calibration.',
          evidenceNote: 'Digital Weighbridge Receipt #WB-8812',
        })

      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.status, 'Discrepancy Detected')
      assert.equal(res.body.data.variance, -35)

      // Verify batch status is flagged
      const batchRes = await request(app).get(`/api/batches/${testBatchId}`)
      assert.equal(batchRes.body.data.status, 'Flagged Discrepancy')
    })
  })

  // 4. Processing & Mass-Balance Reconciliation
  describe('Mass Balance & Recovery Yield API', () => {
    let testBatchId = ''

    before(async () => {
      testBatchId = `BATCH-REC-${Date.now()}`
      await request(app).post('/api/batches').send({
        batchId: testBatchId,
        category: 'Consumer Electronics',
        sourceOrg: 'City Recyclers Union',
        collectionFacility: 'Central Hub',
        grossWeight: 1000.0,
        collectionDate: new Date().toISOString(),
        assignedHandler: 'Rohan Gupta',
      })
    })

    test('POST /api/recovery should reconcile mass balance: input = recovered + waste + loss', async () => {
      const payload = {
        claimId: `CLM-REC-${Date.now()}`,
        batchId: testBatchId,
        facility: 'GreenEarth Recyclers Ltd',
        date: new Date().toISOString().split('T')[0],
        inputWeight: 1000.0,
        materials: {
          copper: 200.0,
          aluminum: 150.0,
          steel: 250.0,
          preciousMetals: 1.5,
          plastics: 200.0,
          glass: 50.0,
        },
        residualWaste: 110.0,
        explainedLoss: 38.5,
        operator: 'Dr. S. Nair, Head Metallurgist',
      }
      // Sum = 200 + 150 + 250 + 1.5 + 200 + 50 + 110 + 38.5 = 1000.0 (Difference = 0)

      const res = await request(app).post('/api/recovery').send(payload)
      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.validationStatus, 'Reconciled')
      assert.equal(res.body.data.difference, 0)
      assert.ok(res.body.data.recoveryYield > 80)
      assert.ok(res.body.data.blockchainTx)
    })

    test('POST /api/recovery should reject duplicate completed batch recovery with HTTP 409', async () => {
      const duplicatePayload = {
        claimId: `CLM-REC-DUP-${Date.now()}`,
        batchId: testBatchId,
        facility: 'GreenEarth Recyclers Ltd',
        date: new Date().toISOString().split('T')[0],
        inputWeight: 1000.0,
        materials: { copper: 1000.0 },
        residualWaste: 0,
        explainedLoss: 0,
      }
      const res = await request(app).post('/api/recovery').send(duplicatePayload)
      assert.equal(res.status, 409)
      assert.equal(res.body.success, false)
      assert.equal(res.body.code, 'RECOVERY_ALREADY_RECORDED')
      assert.ok(res.body.message.includes('Recovery already recorded'))
    })

    test('POST /api/recovery should detect discrepancy when mass balance is off by > 0.5kg', async () => {
      const discBatchId = `BATCH-DISC-${Date.now()}`
      await request(app).post('/api/batches').send({
        batchId: discBatchId,
        category: 'Consumer Electronics',
        sourceOrg: 'City Recyclers Union',
        collectionFacility: 'Central Hub',
        grossWeight: 1000.0,
        collectionDate: new Date().toISOString(),
        assignedHandler: 'Rohan Gupta',
      })

      const payload = {
        claimId: `CLM-REC-DISC-${Date.now()}`,
        batchId: discBatchId,
        facility: 'GreenEarth Recyclers Ltd',
        date: new Date().toISOString().split('T')[0],
        inputWeight: 1000.0,
        materials: {
          copper: 200.0,
          aluminum: 100.0,
          steel: 200.0,
          preciousMetals: 1.0,
          plastics: 100.0,
          glass: 50.0,
        },
        residualWaste: 50.0,
        explainedLoss: 20.0,
        // Sum = 721.0 -> deficit of 279.0 kg
        operator: 'R. Sharma',
      }

      const res = await request(app).post('/api/recovery').send(payload)
      assert.equal(res.status, 201)
      assert.equal(res.body.data.validationStatus, 'Discrepancy Detected')
      assert.ok(res.body.data.difference > 0.5)
      assert.ok(res.body.data.flagReason)
    })

    test('GET /api/recovery/exceptions should return flagged discrepancies', async () => {
      const res = await request(app).get('/api/recovery/exceptions')
      assert.ok([200, 201].includes(res.status))
      assert.ok(Array.isArray(res.body.data))
      assert.ok(res.body.data.length >= 1)
    })

    test('GET /api/recovery should return list of all mass-balance claims', async () => {
      const res = await request(app).get('/api/recovery')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(Array.isArray(res.body.data))
      assert.ok(res.body.data.length >= 1)
    })

    test('POST /api/recovery should reject duplicate material names ignoring case', async () => {
      const res = await request(app).post('/api/recovery').send({
        batchId: testBatchId,
        facility: 'GreenEarth Recyclers Ltd',
        inputWeight: 1000.0,
        materialsBreakdown: [
          { name: 'Copper', weightKg: 100.0 },
          { name: 'copper', weightKg: 50.0 },
        ],
        remainingWaste: 800.0,
        explainedLoss: 50.0,
      })
      assert.equal(res.status, 400)
      assert.equal(res.body.success, false)
      assert.ok(res.body.message.includes('Duplicate material'))
    })

    test('POST /api/upload/base64 should save camera snapshot', async () => {
      const res = await request(app).post('/api/upload/base64').send({
        base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
        filename: 'weighbridge_snapshot.jpg',
      })
      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.url)
    })
  })

  // 5. QpiAI Opt Recycler Assignment
  describe('QpiAI Opt Recycler Assignment Engine', () => {
    test('POST /api/optimization/run with MINIMIZE_COST should optimize facility allocation for cost', async () => {
      const res = await request(app)
        .post('/api/optimization/run')
        .send({
          objective: 'MINIMIZE_COST',
          enforceCapacity: true,
          enforceLicence: true,
        })

      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.assignments)
      assert.ok(res.body.data.metrics)
      assert.equal(res.body.data.metrics.objective, 'MINIMIZE_COST')
      assert.equal(res.body.data.metrics.objectiveMetricLabel, 'Total Transport Cost')
      assert.ok(res.body.data.metrics.totalOptimizedCost > 0)
      assert.ok(res.body.data.metrics.solverEngine)
    })

    test('POST /api/optimization/run with MAXIMIZE_YIELD should prioritize high recovery yield facilities', async () => {
      const res = await request(app)
        .post('/api/optimization/run')
        .send({
          objective: 'MAXIMIZE_YIELD',
          enforceCapacity: true,
          enforceLicence: true,
        })

      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.metrics.objective, 'MAXIMIZE_YIELD')
      assert.equal(res.body.data.metrics.objectiveMetricLabel, 'Average Expected Recovery Yield')
      assert.ok(res.body.data.metrics.averageExpectedYieldPercent > 70)
      // Confirm that assigned facilities prioritize highest yield (e.g. CleanTech 81%)
      if (res.body.data.assignments.length > 0) {
        assert.ok(res.body.data.assignments[0].expectedYieldPercent >= 70)
      }
    })

    test('POST /api/optimization/run with BALANCED_CAPACITY should calculate quota spread and balance loads', async () => {
      const res = await request(app)
        .post('/api/optimization/run')
        .send({
          objective: 'BALANCED_CAPACITY',
          enforceCapacity: true,
          enforceLicence: true,
        })

      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.metrics.objective, 'BALANCED_CAPACITY')
      assert.equal(res.body.data.metrics.objectiveMetricLabel, 'Post-Assignment Quota Spread')
      assert.ok(res.body.data.metrics.utilizationSpread >= 0)
      assert.ok(res.body.data.metrics.averageUtilization > 0)
    })
  })

  // 6. QpiAI QCloud Quantum Lab
  describe('QpiAI QCloud Quantum Lab API', () => {
    test('GET /api/quantum/status should return quantum simulator status and hardware backends', async () => {
      const res = await request(app).get('/api/quantum/status')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.backends)
      assert.ok(res.body.data.backends.length >= 3)
    })

    test('POST /api/quantum/experiments should run 4-Qubit QAOA optimization circuit simulation', async () => {
      const res = await request(app)
        .post('/api/quantum/experiments')
        .send({
          circuitId: 'circ-qaoa-4q',
          backendId: 'qpiai-sim-sv',
          shots: 1024,
          gamma: 0.785,
          beta: 0.392,
        })

      assert.equal(res.status, 201)
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.results)
      assert.ok(res.body.data.results.distribution)
      assert.ok(res.body.data.results.distribution.length >= 8)
      assert.ok(res.body.data.results.optimalBitstring)
      assert.ok(res.body.data.results.stateFidelity > 0.9)
    })

    test('GET /api/quantum/experiments should retrieve history of executed quantum circuits', async () => {
      const res = await request(app).get('/api/quantum/experiments')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(Array.isArray(res.body.data))
      assert.ok(res.body.data.length >= 1)
    })
  })

  // 7. Audit & Regulatory Compliance
  describe('Audit & Regulatory Compliance API', () => {
    test('GET /api/audit/records should return complete auditable records trail', async () => {
      const res = await request(app).get('/api/audit/records')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(Array.isArray(res.body.data))
    })

    test('GET /api/audit/compliance should return CPCB compliance analytics and facility status', async () => {
      const res = await request(app).get('/api/audit/compliance')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.totalBatches >= 0)
      assert.ok(res.body.data.reconciliationRatePct !== undefined)
      assert.ok(Array.isArray(res.body.data.facilitiesCompliance))
    })

    test('GET /api/facilities should list all registered recycling facilities with summary statistics', async () => {
      const res = await request(app).get('/api/facilities')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.length >= 4)
      assert.ok(res.body.summary !== undefined)
      assert.ok(res.body.summary.totalFacilities >= 4)
      assert.ok(typeof res.body.summary.totalCapacityKgMonth === 'number')
    })

    test('GET /api/facilities/dataset-info should return OpenCity dataset metadata and CPCB policy', async () => {
      const res = await request(app).get('/api/facilities/dataset-info')
      assert.ok([200, 201].includes(res.status))
      assert.equal(res.body.success, true)
      assert.ok(res.body.openCityDataset.datasetUrl.includes('opencity.in'))
      assert.equal(res.body.cpcbEprPortal.hasOpenPublicAPI, false)
    })

    test('POST /api/facilities/import-public should safely import and deduplicate Karnataka collection centres', async () => {
      const res1 = await request(app).post('/api/facilities/import-public')
      assert.ok([200, 201].includes(res1.status))
      assert.equal(res1.body.success, true)
      assert.equal(res1.body.totalRecords, 13)

      // Re-run import to prove idempotency and duplicate prevention
      const res2 = await request(app).post('/api/facilities/import-public')
      assert.ok([200, 201].includes(res2.status))
      assert.equal(res2.body.success, true)
      assert.equal(res2.body.inserted, 0)
      assert.equal(res2.body.updated, 13)
    })

    test('GET /api/facilities with filters should distinguish public collection centres from licensed recyclers', async () => {
      const resCentres = await request(app).get('/api/facilities?type=COLLECTION_CENTRE')
      assert.ok([200, 201].includes(resCentres.status))
      assert.equal(resCentres.body.success, true)
      assert.ok(resCentres.body.data.length >= 13)
      // Check that imported collection centres are UNVERIFIED with null capacity
      const sample = resCentres.body.data[0]
      assert.equal(sample.facilityType, 'COLLECTION_CENTRE')
      assert.equal(sample.verificationStatus, 'UNVERIFIED')
      assert.equal(sample.capacityKgMonth, null)
      assert.ok(sample.dataSource.includes('OpenCity'))

      const resRecyclers = await request(app).get('/api/facilities?type=RECYCLER')
      assert.ok([200, 201].includes(resRecyclers.status))
      assert.ok(resRecyclers.body.data.length >= 4)
    })
  })
})
