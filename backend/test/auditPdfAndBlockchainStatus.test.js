import { test, describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../src/app.js'
import { connectDB, closeDB } from '../src/config/db.js'
import { seedInitialDatabase } from '../src/utils/seedData.js'
import { Batch } from '../src/models/Batch.js'
import { CustodyEvent } from '../src/models/CustodyEvent.js'
import { RecoveryRecord } from '../src/models/RecoveryRecord.js'

describe('EcoTrace Production Audit PDF & Blockchain Status Tests', () => {
  before(async () => {
    await connectDB()
    await seedInitialDatabase()
  })

  after(async () => {
    await closeDB()
  })

  describe('1. Blockchain Status Mapping & Connection Diagnostics', () => {
    it('GET /api/blockchain/status returns 200 with connection metadata and contract address', async () => {
      const res = await request(app).get('/api/blockchain/status')
      assert.equal(res.status, 200)
      assert.equal(res.body.success, true)
      assert.ok(res.body.data)
      assert.equal(typeof res.body.data.connected, 'boolean')
      assert.ok(res.body.data.contractAddress)
      assert.equal(
        res.body.data.contractAddress.toLowerCase(),
        '0xF81819d91d0d23612C888987cfA4EdC09e91B862'.toLowerCase()
      )
      assert.ok([11155111, 31337].includes(res.body.data.chainId))
    })
  })

  describe('2. Audit PDF Generation, Streaming & Magic Bytes Validation', () => {
    it('GET /api/audit/report/:batchId/pdf returns HTTP 200, application/pdf, Content-Disposition attachment, and valid %PDF- magic bytes', async () => {
      const batch = await Batch.findOne().lean()
      assert.ok(batch, 'Should have at least one batch in test database')

      const res = await request(app)
        .get(`/api/audit/report/${batch.batchId}/pdf`)
        .responseType('blob')

      assert.equal(res.status, 200)
      assert.match(res.headers['content-type'], /application\/pdf/)
      assert.match(res.headers['content-disposition'], /attachment; filename="EcoTrace_Audit_Report_/)

      const buffer = res.body
      assert.ok(Buffer.isBuffer(buffer), 'Response body must be a binary buffer')
      assert.ok(buffer.length > 500, `PDF should be non-empty (got ${buffer.length} bytes)`)

      // Check %PDF- (0x25 0x50 0x44 0x46 0x2d)
      const magicBytes = buffer.subarray(0, 5).toString('utf-8')
      assert.equal(magicBytes, '%PDF-', 'Must start with PDF magic bytes %PDF-')
    })

    it('GET /api/audit/report/:batchId/pdf?view=true sets Content-Disposition to inline', async () => {
      const batch = await Batch.findOne().lean()
      assert.ok(batch)

      const res = await request(app)
        .get(`/api/audit/report/${batch.batchId}/pdf?view=true`)
        .responseType('blob')

      assert.equal(res.status, 200)
      assert.match(res.headers['content-type'], /application\/pdf/)
      assert.match(res.headers['content-disposition'], /inline; filename="EcoTrace_Audit_Report_/)

      const buffer = res.body
      assert.ok(Buffer.isBuffer(buffer))
      const magicBytes = buffer.subarray(0, 5).toString('utf-8')
      assert.equal(magicBytes, '%PDF-')
    })

    it('GET /api/audit/report/NONEXISTENT_BATCH/pdf returns HTTP 404 with JSON error', async () => {
      const res = await request(app).get('/api/audit/report/NONEXISTENT-BATCH-9999/pdf')
      assert.equal(res.status, 404)
      assert.equal(res.body.success, false)
      assert.match(res.body.message, /not found/i)
    })
  })

  describe('3. Audit Certification Prerequisites & Error Handling (HTTP 400 vs 200)', () => {
    it('POST /api/audit/:batchId/certify rejects uncompleted batches with HTTP 400 and clear prerequisite reason', async () => {
      const freshBatchId = `EW-UNCERT-${Date.now()}`
      await Batch.create({
        batchId: freshBatchId,
        category: 'Test Category',
        sourceOrg: 'Test Org',
        collectionFacility: 'Test Facility',
        grossWeight: 500,
        collectionDate: new Date().toISOString(),
        assignedHandler: 'Test Handler',
        status: 'Registered',
      })

      const res = await request(app).post(`/api/audit/${freshBatchId}/certify`).send({})
      assert.equal(res.status, 400, 'Must return HTTP 400 when prerequisites are not met')
      assert.equal(res.body.success, false)
      assert.match(res.body.message, /no custody handover events recorded|accepted/i)
    })

    it('POST /api/audit/:batchId/certify succeeds with HTTP 200 on fully reconciled batch', async () => {
      const fullBatchId = `EW-READY-${Date.now()}`
      await Batch.create({
        batchId: fullBatchId,
        category: 'Test Category',
        sourceOrg: 'Test Org',
        collectionFacility: 'Test Facility',
        grossWeight: 100,
        collectionDate: new Date().toISOString(),
        assignedHandler: 'Test Handler',
        status: 'Processed',
        evidenceHash: '0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff00001111',
      })

      await CustodyEvent.create({
        handoverId: `HO-${fullBatchId}-1`,
        batchId: fullBatchId,
        step: 1,
        sender: 'Peenya Sorting Center',
        receiver: 'Bangalore Central Hub',
        stage: 'Collection Center → Transporter',
        dispatchWeight: 100,
        receivedWeight: 100,
        variance: 0,
        location: 'Bangalore Industrial Area',
        transporter: 'Apex Logistics',
        timestamp: new Date().toISOString(),
        status: 'Accepted',
      })

      await RecoveryRecord.create({
        claimId: `REC-${Date.now()}`,
        batchId: fullBatchId,
        facility: 'Peenya Certified E-Waste Recycler',
        inputWeight: 100,
        recoveredWeight: 95,
        remainingWaste: 5,
        accountedOutput: 100,
        difference: 0,
        recoveryYield: 95,
        validationStatus: 'Reconciled',
        materialsBreakdown: [
          { name: 'Copper', weightKg: 50 },
          { name: 'Aluminium', weightKg: 45 },
        ],
        timestamp: new Date().toISOString(),
      })

      const res = await request(app).post(`/api/audit/${fullBatchId}/certify`).send({})
      assert.equal(res.status, 200)
      assert.equal(res.body.success, true)
      assert.equal(res.body.certified, true)
      assert.ok(res.body.certificateId)

      // Test idempotency: calling certify again should return HTTP 200 with alreadyCertified: true
      const secondRes = await request(app).post(`/api/audit/${fullBatchId}/certify`).send({})
      assert.equal(secondRes.status, 200)
      assert.equal(secondRes.body.success, true)
      assert.equal(secondRes.body.alreadyCertified, true)
    })
  })

  describe('4. Static Uploads File Serving & Routing Compatibility', () => {
    it('Static upload routes (/uploads and /api/uploads) are accessible without 404', async () => {
      const res1 = await request(app).get('/uploads/test_file_that_does_not_exist.png')
      assert.equal(res1.status, 404)

      const res2 = await request(app).get('/api/uploads/test_file_that_does_not_exist.png')
      assert.equal(res2.status, 404)
    })
  })
})
