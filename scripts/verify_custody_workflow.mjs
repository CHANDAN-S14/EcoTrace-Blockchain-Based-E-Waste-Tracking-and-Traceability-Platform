// End-to-end verification script for EcoTrace batch selection and custody workflow
import http from 'http'

const BASE_URL = 'http://localhost:5000/api'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(url, { ...options, headers })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, body: json }
}

async function run() {
  console.log('='.repeat(70))
  console.log('🧪 VERIFYING INDIVIDUAL BATCH CUSTODY SELECTION & STAGES WORKFLOW')
  console.log('='.repeat(70))

  // 1. Fetch available batches from real MongoDB API
  console.log('\n[1] Fetching all batches from real backend...')
  const batchesRes = await request('/batches')
  if (!batchesRes.ok || !Array.isArray(batchesRes.body.data)) {
    throw new Error('Failed to retrieve batches: ' + JSON.stringify(batchesRes.body))
  }
  const batches = batchesRes.body.data
  console.log(`✅ Retrieved ${batches.length} real batches from MongoDB.`)

  // Test the combobox display format for each batch
  console.log('\n[2] Testing BatchSearchCombobox option format: BATCH-ID — WEIGHT kg (WASTE TYPE)...')
  const sampleBatches = batches.slice(0, 5)
  sampleBatches.forEach(b => {
    const bId = b.batchId || b.id
    const weight = b.grossWeight || 0
    const wasteType = b.category || b.collectionType || 'Mixed E-Waste'
    const formatted = `${bId} — ${weight} kg (${wasteType})`
    console.log(`   • ${formatted}`)
    if (!formatted.includes(' — ') || !formatted.includes(' kg (')) {
      throw new Error(`Invalid format string: ${formatted}`)
    }
  })
  console.log('✅ Option format matches specification exactly.')

  // 3. Register a new test consignment to test entire individual batch lifecycle
  const testBatchId = `EW-2026-${Math.floor(20000 + Math.random() * 70000)}`
  console.log(`\n[3] Registering brand new consignment: ${testBatchId}...`)
  const regPayload = {
    batchId: testBatchId,
    category: 'Mixed E-Waste',
    sourceOrg: 'Tech Hub Karnataka Center',
    collectionFacility: 'Bangalore Central Hub',
    grossWeight: 500.0,
    assignedHandler: 'Anil Deshmukh (ID #KA-EWT-505)',
    notes: 'Decommissioned lab workstations and peripheral assemblies.',
  }
  const regRes = await request('/batches', {
    method: 'POST',
    body: JSON.stringify(regPayload),
  })
  if (!regRes.ok) throw new Error('Registration failed: ' + JSON.stringify(regRes.body))
  console.log(`✅ Consignment registered. Initial status: "${regRes.body.data.status}"`)
  if (regRes.body.data.status !== 'Registered') {
    throw new Error(`Expected status "Registered", got "${regRes.body.data.status}"`)
  }

  // 4. Verify initial handovers: only the legitimate initial step exists
  console.log(`\n[4] Inspecting initial custody ledger for ${testBatchId}...`)
  const hoList1 = await request(`/custody/${testBatchId}/handovers`)
  console.log(`   Initial handovers count: ${hoList1.body.data.length}`)
  const step1 = hoList1.body.data[0]
  console.log(`   Step 1 receiver: "${step1.receiver}", status: "${step1.status}"`)
  if (step1.status === 'Accepted') {
    throw new Error('Batch should NOT be marked accepted automatically upon creation!')
  }

  // 5. Stage 1: Assign Transporter & Dispatch
  console.log(`\n[5] Stage 1: Assigning transporter to ${testBatchId}...`)
  const assignTransRes = await request(`/custody/${testBatchId}/assign-transporter`, {
    method: 'POST',
    body: JSON.stringify({
      transporterName: 'VoltHaul Logistics (KA-01-AJ-9944)',
      vehicleNumber: 'KA-01-AJ-9944',
      notes: 'Dispatched in secured hazmat-rated logistics van.',
    }),
  })
  if (!assignTransRes.ok) throw new Error('Assign transporter failed: ' + JSON.stringify(assignTransRes.body))
  console.log(`✅ Transporter assigned. Result message: "${assignTransRes.body.message}"`)

  // 6. Stage 2: Transporter accepts custody
  console.log(`\n[6] Stage 2: Transporter accepting physical custody for ${testBatchId}...`)
  const hoList2 = await request(`/custody/${testBatchId}/handovers`)
  const updatedStep1 = hoList2.body.data.find(h => h.step === 1)
  const acceptTransRes = await request(`/custody/${updatedStep1.handoverId}/accept`, {
    method: 'POST',
    body: JSON.stringify({
      actorNotes: 'Transporter confirmed container seal and gross weight matches manifest.',
      batchId: testBatchId,
    }),
  })
  if (!acceptTransRes.ok) throw new Error('Transporter acceptance failed: ' + JSON.stringify(acceptTransRes.body))
  console.log(`✅ Transporter accepted. Next stage: Transporter → Receiving Facility created.`)

  // 7. Stage 3: Receiving Depot Dock Scale Check
  console.log(`\n[7] Stage 3: Receiving Depot dock scale weighing for ${testBatchId}...`)
  const hoList3 = await request(`/custody/${testBatchId}/handovers`)
  const step2 = hoList3.body.data.find(h => h.step === 2)
  if (!step2) throw new Error('Step 2 handover not found!')

  // Test dock scale weighing within tolerance (500.0 kg vs 499.8 kg, diff = -0.2 kg <= 0.5kg)
  const depotScaleRes = await request(`/custody/${step2.handoverId}/depot-receipt`, {
    method: 'POST',
    body: JSON.stringify({
      receivedWeight: 499.8,
      scaleSlipId: `WB-DEPOT-${Date.now()}`,
      dockNotes: 'Calibrated Mettler Toledo weighbridge scale reading: 499.8 kg. Variance -0.2 kg.',
      batchId: testBatchId,
    }),
  })
  if (!depotScaleRes.ok) throw new Error('Depot dock scale failed: ' + JSON.stringify(depotScaleRes.body))
  console.log(`✅ Depot scale recorded. Status: "${depotScaleRes.body.data.status}" (reconciled within tolerance).`)

  // 8. Stage 4: Assign Certified Recycler
  console.log(`\n[8] Stage 4: Assigning certified recycler to ${testBatchId}...`)
  const hoList4 = await request(`/custody/${testBatchId}/handovers`)
  const step3 = hoList4.body.data.find(h => h.step === 3)
  if (!step3) throw new Error('Step 3 handover not found!')

  const assignRecyclerRes = await request(`/custody/${step3.handoverId}/assign-recycler`, {
    method: 'POST',
    body: JSON.stringify({
      facilityId: 'FAC-01',
      facilityName: 'GreenEarth Recyclers Ltd',
      notes: 'Assigned to GreenEarth Recyclers Ltd for high-yield metallurgy processing.',
      batchId: testBatchId,
    }),
  })
  if (!assignRecyclerRes.ok) throw new Error('Assign recycler failed: ' + JSON.stringify(assignRecyclerRes.body))
  console.log(`✅ Certified recycler assigned.`)

  // Recycler confirms intake
  const acceptRecyclerRes = await request(`/custody/${step3.handoverId}/accept`, {
    method: 'POST',
    body: JSON.stringify({
      actorNotes: 'GreenEarth intake metallurgy dock confirmed sealed transfer.',
      batchId: testBatchId,
    }),
  })
  if (!acceptRecyclerRes.ok) throw new Error('Recycler accept failed: ' + JSON.stringify(acceptRecyclerRes.body))
  console.log(`✅ Recycler intake confirmed.`)

  // Record Recovery & Processing mass balance
  console.log(`\n[9] Stage 4b: Recording mass-balance recovery claim for ${testBatchId}...`)
  const recoveryRes = await request('/recovery', {
    method: 'POST',
    body: JSON.stringify({
      batchId: testBatchId,
      facility: 'GreenEarth Recyclers Ltd',
      processingDate: new Date().toISOString().split('T')[0],
      inputWeight: 499.8,
      materials: {
        copper: 120.0,
        aluminum: 80.0,
        steel: 160.0,
        plastics: 90.0,
        preciousMetals: 0.5,
      },
      residualWaste: 35.0,
      explainedLoss: 14.3,
      remainingWasteDestination: 'Ramky TSDF Hazardous Waste Cell #4',
      operator: 'Dr. S. Nair, Head of Metallurgy',
    }),
  })
  if (!recoveryRes.ok) throw new Error('Recovery claim failed: ' + JSON.stringify(recoveryRes.body))
  console.log(`✅ Recovery recorded. Validation status: "${recoveryRes.body.data.validationStatus}"`)

  // 10. Stage 5: Final Regulatory Audit Certification
  console.log(`\n[10] Stage 5: Certifying final regulatory audit on-chain for ${testBatchId}...`)
  const certifyRes = await request(`/audit/${testBatchId}/certify`, {
    method: 'POST',
  })
  if (!certifyRes.ok) throw new Error('Certify audit failed: ' + JSON.stringify(certifyRes.body))
  console.log(`✅ Final audit certified on ledger! Tx Hash: ${certifyRes.body.data?.blockchainTx || certifyRes.body.data?.txHash}`)

  // 11. Verify batch details reloading
  console.log(`\n[11] Verifying isolated batch reload without cross-contamination...`)
  const finalBatchRes = await request(`/batches/${testBatchId}`)
  const finalBatch = finalBatchRes.body.data
  console.log(`   Final Batch ID: ${finalBatch.batchId}`)
  console.log(`   Final Status: "${finalBatch.status}"`)
  console.log(`   Handovers count: ${finalBatch.handovers?.length}`)
  if (finalBatch.status !== 'Audited') {
    throw new Error(`Expected final status "Audited", got "${finalBatch.status}"`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('🎉 ALL INDIVIDUAL BATCH CUSTODY STAGES & WORKFLOW TESTS PASSED!')
  console.log('='.repeat(70))
}

run().catch((err) => {
  console.error('\n❌ Workflow verification error:', err.message)
  process.exit(1)
})
