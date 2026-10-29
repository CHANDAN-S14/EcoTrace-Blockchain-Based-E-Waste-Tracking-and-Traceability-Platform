// Automated End-to-End Batch-to-Final-Audit Lifecycle Verification Script

const BASE_URL = 'http://localhost:5000/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, ok: res.ok, data }
}

async function runLifecycleTest() {
  console.log('='.repeat(70))
  console.log('  🚀 ECOTRACE END-TO-END BATCH-TO-FINAL-AUDIT LIFECYCLE TEST')
  console.log('='.repeat(70))

  const uniqueSuffix = Date.now().toString().slice(-5)
  const batchId = `EW-2026-${uniqueSuffix}`
  const initialWeight = 1000.0

  // -------------------------------------------------------------
  // STAGE 1: Batch Registration
  // -------------------------------------------------------------
  console.log('\n[STAGE 1] Registering fresh e-waste consignment...')
  const regPayload = {
    batchId,
    category: 'Mixed E-Waste',
    collectionType: 'Mixed E-Waste',
    sourceOrg: 'Apex Datacenter Bangalore',
    collectionFacility: 'Bangalore Central Hub',
    collectionLocation: 'Bangalore Central, Karnataka',
    grossWeight: initialWeight,
    assignedHandler: 'Ramesh Kumar (ID #KA-EWT-402)',
    notes: 'Decommissioned rack hardware array B4.',
    evidenceName: 'Weighbridge_Slip_9921.pdf',
    imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea',
  }

  const regRes = await request('/batches', {
    method: 'POST',
    body: JSON.stringify(regPayload),
  })

  if (!regRes.ok) {
    console.error('❌ Failed to register batch:', regRes.data)
    process.exit(1)
  }

  const batch = regRes.data.data
  console.log(`✅ Consignment registered: ${batch.batchId}`)
  console.log(`   Batch status: ${batch.status}`)
  console.log(`   On-chain TxHash: ${batch.blockchainTx}`)

  // Verify initial custody event
  const hRes = await request(`/custody/${batchId}/handovers`)
  const handovers1 = hRes.data.data
  console.log(`   Initial custody events count: ${handovers1.length}`)
  const ho1 = handovers1[0]
  console.log(`   HO-1 Receiver: "${ho1.receiver}"`)
  console.log(`   HO-1 Status: "${ho1.status}"`)
  console.log(`   HO-1 Verification Status: "${ho1.verificationStatus}"`)
  console.log(`   HO-1 Received Weight: ${ho1.receivedWeight}`)

  if (
    batch.status !== 'Registered' ||
    ho1.status !== 'Pending Review' ||
    ho1.verificationStatus !== 'Pending Verification' ||
    ho1.receivedWeight !== null ||
    !ho1.receiver.includes('Pending')
  ) {
    console.error('❌ Stage 1 assertion failed: initial custody event was not pending or was prematurely accepted!')
    process.exit(1)
  }
  console.log('✅ Stage 1 passed: Batch is Registered, Step 1 is Pending Review, receiver is Pending Transporter Assignment.')

  // -------------------------------------------------------------
  // STAGE 2: Assign Transporter & Dispatch
  // -------------------------------------------------------------
  console.log('\n[STAGE 2] Operator assigns authorized transporter & confirms dispatch...')
  const assignTransRes = await request(`/custody/${batchId}/assign-transporter`, {
    method: 'POST',
    body: JSON.stringify({
      transporterName: 'VoltHaul Logistics (KA-01-AJ-8820)',
      vehicleNumber: 'KA-01-AJ-8820',
      notes: 'GPS route locked via Outer Ring Road corridor.',
    }),
  })

  if (!assignTransRes.ok) {
    console.error('❌ Failed to assign transporter:', assignTransRes.data)
    process.exit(1)
  }
  console.log(`✅ Transporter assigned: VoltHaul Logistics (KA-01-AJ-8820)`)
  console.log(`   Batch status updated to: ${assignTransRes.data.data.batch.status}`)

  if (assignTransRes.data.data.batch.status !== 'In Transit') {
    console.error('❌ Stage 2 assertion failed: batch status is not In Transit!')
    process.exit(1)
  }

  // -------------------------------------------------------------
  // STAGE 2 (cont): Transporter Custody Acceptance
  // -------------------------------------------------------------
  console.log('\n[STAGE 2 (cont)] Transporter driver accepts physical custody...')
  const ho1Id = ho1.handoverId
  const acceptTransRes = await request(`/custody/${ho1Id}/accept`, {
    method: 'POST',
    body: JSON.stringify({
      actorNotes: 'Driver confirmed intact tamper seal #KA-SEAL-9014.',
    }),
  })

  if (!acceptTransRes.ok) {
    console.error('❌ Failed to accept transporter custody:', acceptTransRes.data)
    process.exit(1)
  }

  console.log(`✅ Step 1 accepted and anchored on-chain!`)
  console.log(`   Step 1 TxHash: ${acceptTransRes.data.data.txHash}`)
  console.log(`   Step 1 status: ${acceptTransRes.data.data.status}`)
  console.log(`   Next stage activated: Step 2 (${acceptTransRes.data.nextStage?.stage})`)

  // Verify Step 2 exists
  const hRes2 = await request(`/custody/${batchId}/handovers`)
  const ho2 = hRes2.data.data.find(h => h.step === 2)
  if (!ho2 || ho2.status !== 'Pending Review') {
    console.error('❌ Stage 2 assertion failed: Step 2 was not created in Pending Review state!')
    process.exit(1)
  }
  console.log(`✅ Stage 2 passed: Step 1 accepted on-chain, Step 2 active in Pending Review.`)

  // -------------------------------------------------------------
  // STAGE 3: Transporter -> Receiving Depot
  // 3A: Discrepancy Test (|Δ| > 0.5 kg)
  // -------------------------------------------------------------
  console.log('\n[STAGE 3A] Testing Receiving Depot Dock Scale Discrepancy (|Δ| > 0.5 kg)...')
  const discrepantWeight = 1006.5 // +6.5 kg variance
  const ho2Id = ho2.handoverId

  const discRes = await request(`/custody/${ho2Id}/depot-receipt`, {
    method: 'POST',
    body: JSON.stringify({
      receivedWeight: discrepantWeight,
      scaleSlipId: 'SLIP-BLR-DEPOT-TEST-DISC',
      dockNotes: 'Gross dock scale test discrepancy.',
    }),
  })

  console.log(`   Depot response status: ${discRes.status}`)
  console.log(`   Depot response message: ${discRes.data.message}`)
  console.log(`   Handover status: ${discRes.data.data?.status}`)
  console.log(`   Batch status: ${discRes.data.batch?.status}`)

  if (
    discRes.data.data?.status !== 'Discrepancy Detected' ||
    discRes.data.batch?.status !== 'Flagged Discrepancy'
  ) {
    console.error('❌ Stage 3A assertion failed: discrepancy > 0.5 kg was not flagged!')
    process.exit(1)
  }
  console.log('✅ Stage 3A passed: Discrepancy correctly flagged and batch marked as Flagged Discrepancy.')

  // -------------------------------------------------------------
  // 3B: Valid Depot Weighing (Variance <= 0.5 kg)
  // -------------------------------------------------------------
  console.log('\n[STAGE 3B] Submitting calibrated dock scale weight within ±0.5 kg tolerance (1000.2 kg vs 1000.0 kg)...')
  const validWeight = 1000.2 // +0.2 kg variance <= 0.5 kg
  const validScaleRes = await request(`/custody/${ho2Id}/depot-receipt`, {
    method: 'POST',
    body: JSON.stringify({
      receivedWeight: validWeight,
      scaleSlipId: 'SLIP-BLR-DEPOT-VERIFIED-902',
      dockNotes: 'Calibrated digital weighbridge verified. Tare confirmed 0.0 kg.',
    }),
  })

  if (!validScaleRes.ok) {
    console.error('❌ Failed valid depot scale verification:', validScaleRes.data)
    process.exit(1)
  }

  console.log(`✅ Dock scale verified and accepted on-chain!`)
  console.log(`   Step 2 TxHash: ${validScaleRes.data.data.txHash}`)
  console.log(`   Batch status updated to: ${validScaleRes.data.batch?.status}`)
  console.log(`   Next stage activated: Step 3 (${validScaleRes.data.nextStage?.stage})`)

  if (validScaleRes.data.batch?.status !== 'Received') {
    console.error('❌ Stage 3B assertion failed: batch status is not Received!')
    process.exit(1)
  }

  // -------------------------------------------------------------
  // STAGE 4: Receiving Depot -> Certified Recycler
  // 4A: Assign Certified Recycler
  // -------------------------------------------------------------
  console.log('\n[STAGE 4A] Assigning CPCB-certified recycler with capacity validation...')
  const assignRecyclerRes = await request(`/custody/${batchId}/assign-recycler`, {
    method: 'POST',
    body: JSON.stringify({
      facilityId: 'FAC-01',
      facilityName: 'GreenEarth Recyclers Ltd',
      notes: 'Transfer initiated for authorized metallurgy refining.',
    }),
  })

  if (!assignRecyclerRes.ok) {
    console.error('❌ Failed to assign certified recycler:', assignRecyclerRes.data)
    process.exit(1)
  }
  console.log(`✅ Certified Recycler assigned: ${assignRecyclerRes.data.data.facility?.name}`)
  console.log(`   Licence: ${assignRecyclerRes.data.data.facility?.licenceNumber}`)

  // 4B: Recycler confirms physical intake
  console.log('\n[STAGE 4B] Recycler confirms physical intake and custody acceptance...')
  const hRes3 = await request(`/custody/${batchId}/handovers`)
  const ho3 = hRes3.data.data.find(h => h.step === 3)
  const ho3Id = ho3.handoverId

  const acceptRecyclerRes = await request(`/custody/${ho3Id}/accept`, {
    method: 'POST',
    body: JSON.stringify({
      actorNotes: 'Recycler intake facility confirmed physical receipt & seal inspection.',
    }),
  })

  if (!acceptRecyclerRes.ok) {
    console.error('❌ Failed recycler intake acceptance:', acceptRecyclerRes.data)
    process.exit(1)
  }
  console.log(`✅ Step 3 accepted and anchored on-chain!`)
  console.log(`   Step 3 TxHash: ${acceptRecyclerRes.data.data.txHash}`)
  console.log(`   Next stage activated: Step 4 (${acceptRecyclerRes.data.nextStage?.stage})`)

  // -------------------------------------------------------------
  // STAGE 5: Certified Recycler -> Processing & Recovery (Mass Balance Reconciled)
  // -------------------------------------------------------------
  console.log('\n[STAGE 5] Recycler records processing intake & mass balance reconciliation...')
  // inputWeight: 1000.2 kg
  // recovered: copper 250.0 + aluminum 200.0 + steel 300.0 + preciousMetals 1.2 + plastics 150.0 + glass 40.0 = 941.2 kg
  // residualWaste: 40.0 kg
  // explainedLoss: 19.0 kg
  // total = 941.2 + 40.0 + 19.0 = 1000.2 kg (exact match!)
  const recoveryPayload = {
    batchId,
    facility: 'GreenEarth Recyclers Ltd',
    inputWeight: validWeight,
    materialsBreakdown: [
      { name: 'Copper cathode (99.9%)', weightKg: 250.0 },
      { name: 'Aluminum ingots', weightKg: 200.0 },
      { name: 'Steel scrap', weightKg: 300.0 },
      { name: 'Gold / Precious Assay', weightKg: 1.2 },
      { name: 'High-density polymers', weightKg: 150.0 },
      { name: 'Silicate glass cullet', weightKg: 40.0 },
    ],
    materials: {
      copper: 250.0,
      aluminum: 200.0,
      steel: 300.0,
      preciousMetals: 1.2,
      plastics: 150.0,
      glass: 40.0,
    },
    residualWaste: 40.0,
    remainingWaste: 40.0,
    remainingWasteDestination: 'Ramky Hazardous Waste TSDF Facility, Bangalore',
    explainedLoss: 19.0,
    processingReference: `PR-REC-2026-${uniqueSuffix}`,
    operator: 'Dr. Sunita Rao, Head of Metallurgy',
  }

  const recRes = await request('/recovery', {
    method: 'POST',
    body: JSON.stringify(recoveryPayload),
  })

  if (!recRes.ok) {
    console.error('❌ Failed processing recovery submission:', recRes.data)
    process.exit(1)
  }

  const recRecord = recRes.data.data
  console.log(`✅ Mass balance reconciled and anchored on-chain!`)
  console.log(`   Validation status: ${recRecord.validationStatus}`)
  console.log(`   Recovery Yield: ${recRecord.recoveryYield}%`)
  console.log(`   Accounted Output: ${recRecord.accountedOutput} kg`)
  console.log(`   Difference: ${recRecord.difference} kg`)
  console.log(`   On-chain TxHash: ${recRecord.blockchainTx}`)

  // Check batch status
  const bCheckRes = await request(`/batches/${batchId}`)
  console.log(`   Batch status updated to: ${bCheckRes.data.data.status}`)
  if (bCheckRes.data.data.status !== 'Processed') {
    console.error('❌ Stage 5 assertion failed: batch status is not Processed!')
    process.exit(1)
  }

  // -------------------------------------------------------------
  // STAGE 6: Final Regulatory Compliance Audit Certification
  // -------------------------------------------------------------
  console.log('\n[STAGE 6] Performing Final Regulatory Audit Certification...')
  const auditCertRes = await request(`/audit/${batchId}/certify`, {
    method: 'POST',
  })

  if (!auditCertRes.ok) {
    console.error('❌ Failed final audit certification:', auditCertRes.data)
    process.exit(1)
  }

  const certData = auditCertRes.data.data
  console.log(`✅ Consignment successfully certified under CPCB statutory standard!`)
  console.log(`   Official Certificate ID: ${certData.certificateId}`)
  console.log(`   Audit status: ${certData.auditStatus}`)
  console.log(`   Batch status: ${certData.status}`)
  console.log(`   Auditor: ${certData.auditor}`)
  console.log(`   Certified At: ${certData.certifiedAt}`)
  console.log(`   On-chain consensus Tx: ${certData.blockchainTx}`)

  // -------------------------------------------------------------
  // STAGE 7: Verification across Audit & Reports
  // -------------------------------------------------------------
  console.log('\n[STAGE 7] Verifying consignment presence in Audit Dossier and Reports...')
  const auditRecordsRes = await request(`/audit/records?q=${batchId}`)
  const matchedAuditRec = auditRecordsRes.data.records?.find(r => r.batchId === batchId)
  console.log(`   Audit Record Status: ${matchedAuditRec?.auditStatus} (Consignment status: ${matchedAuditRec?.status})`)

  const reportsSummaryRes = await request(`/reports/summary?status=Audited`)
  const matchedReportBatch = reportsSummaryRes.data.data?.batches?.find(b => b.batchId === batchId)
  console.log(`   Reports Summary Match: Batch ${matchedReportBatch?.batchId} found with status "${matchedReportBatch?.status}"`)

  if (!matchedAuditRec || matchedAuditRec.auditStatus !== 'Verified') {
    console.error('❌ Stage 7 assertion failed: consignment not verified in audit records!')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(70))
  console.log('  🎉 COMPLETE BATCH-TO-FINAL-AUDIT LIFECYCLE VERIFIED SUCCESSFULLY!')
  console.log('='.repeat(70))
}

runLifecycleTest().catch((err) => {
  console.error('Unexpected error during test execution:', err)
  process.exit(1)
})
