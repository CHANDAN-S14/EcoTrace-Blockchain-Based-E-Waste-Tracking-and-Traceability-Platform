import PDFDocument from 'pdfkit'
import { Batch } from '../models/Batch.js'
import { CustodyEvent } from '../models/CustodyEvent.js'
import { RecoveryRecord } from '../models/RecoveryRecord.js'
import { Facility } from '../models/Facility.js'
import { compileBatchAuditDossier } from './auditController.js'

export async function getReportsSummary(req, res, next) {
  try {
    const { category, facility, status, fromDate, toDate } = req.query

    const batchFilter = {}
    if (category && category !== 'ALL') batchFilter.category = category
    if (status && status !== 'ALL') batchFilter.status = status
    if (facility && facility !== 'ALL') batchFilter.collectionFacility = facility
    if (fromDate || toDate) {
      batchFilter.collectionDate = {}
      if (fromDate) batchFilter.collectionDate.$gte = new Date(fromDate)
      if (toDate) batchFilter.collectionDate.$lte = new Date(toDate)
    }

    const [batches, handovers, recoveries, facilities] = await Promise.all([
      Batch.find(batchFilter).sort({ collectionDate: -1, createdAt: -1 }).lean(),
      CustodyEvent.find({}).lean(),
      RecoveryRecord.find({}).lean(),
      Facility.find({}).lean(),
    ])

    const totalWeightCollectedKg = batches.reduce((acc, b) => acc + (Number(b.grossWeight) || 0), 0)
    const confirmedHandovers = handovers.filter(h => h.status === 'Accepted').length
    const pendingHandovers = handovers.filter(h => h.status === 'Pending Review').length
    const flaggedDiscrepancies = batches.filter(b => b.status === 'Flagged Discrepancy').length +
      handovers.filter(h => h.status === 'Discrepancy Detected').length

    // Recovery materials total
    const totalRecoveredKg = recoveries.reduce((acc, r) => {
      const mats = r.materials || {}
      return acc + (Number(mats.copper) || 0) + (Number(mats.aluminum) || 0) + (Number(mats.steel) || 0) +
        (Number(mats.preciousMetals) || 0) + (Number(mats.plastics) || 0) + (Number(mats.glass) || 0)
    }, 0)

    const totalProcessingLossKg = recoveries.reduce((acc, r) => acc + (Number(r.explainedLoss) || 0), 0)
    const totalResidualWasteKg = recoveries.reduce((acc, r) => acc + (Number(r.residualWaste) || 0), 0)

    // Environmental Impact calculations (CPCB empirical factors):
    // 1 kg e-waste recycled prevents approx 1.44 kg CO2 equivalent emissions
    // 1 tree absorbs ~22 kg CO2 per year
    // Average device weight ~ 7.3 kg
    const co2SavedKg = Number((totalWeightCollectedKg * 1.44).toFixed(1))
    const treesEquivalent = Math.round(co2SavedKg / 22)
    const devicesRecycled = Math.round(totalWeightCollectedKg / 7.3)

    return res.json({
      success: true,
      data: {
        totals: {
          totalBatches: batches.length,
          totalWeightCollectedKg,
          totalRecoveredKg,
          totalProcessingLossKg,
          totalResidualWasteKg,
          confirmedHandovers,
          pendingHandovers,
          flaggedDiscrepancies,
          activeFacilities: facilities.filter(f => f.licenceStatus === 'Active & Verified').length,
          co2SavedKg,
          treesEquivalent,
          devicesRecycled,
        },
        batches: batches.map(b => ({
          batchId: b.batchId,
          category: b.category,
          collectionType: b.collectionType || 'Mixed E-Waste',
          sourceOrg: b.sourceOrg,
          collectionFacility: b.collectionFacility || 'CPCB Hub',
          grossWeight: Number(b.grossWeight) || 0,
          collectionDate: b.collectionDate,
          status: b.status,
          blockchainHash: b.blockchainHash || '',
          evidenceHash: b.evidenceHash || '',
          blockchainStatus: b.blockchainStatus || 'PENDING',
        })),
        recoveries: recoveries.map(r => ({
          claimId: r.claimId,
          batchId: r.batchId,
          facility: r.facility,
          inputWeight: r.inputWeight,
          recoveryYield: r.recoveryYield,
          validationStatus: r.validationStatus,
          difference: r.difference,
        })),
        facilitiesCompliance: facilities.map(f => ({
          name: f.name,
          licenceNumber: f.licenceNumber,
          licenceStatus: f.licenceStatus,
          capacityKgMonth: f.capacityKgMonth,
          currentLoadKg: f.currentLoadKg,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function exportReportsCsv(req, res, next) {
  try {
    const rawBatchIds = req.query.batchIds || req.body?.batchIds || req.query.batchId
    let filter = {}

    if (rawBatchIds) {
      const ids = Array.isArray(rawBatchIds)
        ? rawBatchIds
        : String(rawBatchIds).split(',').map(s => s.trim()).filter(Boolean)
      if (ids.length > 0) {
        filter = { batchId: { $in: ids } }
      }
    }

    const batches = await Batch.find(filter).sort({ createdAt: -1 }).lean()

    let csv = 'Batch ID,Category,Source Organization,Collection Facility,Gross Weight (kg),Collection Date,Status,Blockchain Hash,SHA-256 Evidence Digest\n'
    batches.forEach(b => {
      const date = b.collectionDate ? new Date(b.collectionDate).toISOString().split('T')[0] : ''
      const hash = b.blockchainHash || ''
      const evidence = b.evidenceHash || ''
      const facility = b.collectionFacility || 'CPCB Hub'
      csv += `"${b.batchId}","${b.category}","${b.sourceOrg}","${facility}",${b.grossWeight},"${date}","${b.status}","${hash}","${evidence}"\n`
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="ecotrace-batches-report.csv"')
    return res.send(csv)
  } catch (err) {
    next(err)
  }
}

export async function exportBatchAuditPdf(req, res, next) {
  try {
    const batchId = req.params.batchId || req.query.batchId || req.body?.batchId
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'Batch ID is required for audit PDF export.' })
    }

    const dossier = await compileBatchAuditDossier(batchId)
    if (!dossier) {
      return res.status(404).json({ success: false, message: `Batch ${batchId} not found.` })
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 35,
      bufferPages: true,
      info: {
        Title: `EcoTrace Audit Report - ${batchId}`,
        Author: 'Central Pollution Control Board (CPCB) Consortium Node',
        Subject: 'EcoTrace National E-Waste Traceability & Mass Conservation Audit Report',
      },
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="EcoTrace_Audit_Report_${batchId}.pdf"`)

    doc.pipe(res)

    const primaryColor = '#003B23'
    const secondaryColor = '#176B45'
    const sageTint = '#E8F5EE'
    const borderTint = '#CBD8D0'
    const darkSlate = '#0F172A'
    const mutedSlate = '#475569'

    const checkPageBreak = (neededHeight = 60) => {
      if (doc.y + neededHeight > 760) {
        doc.addPage()
        doc.y = 40
      }
    }

    const drawSectionTitle = (title, sub) => {
      checkPageBreak(35)
      doc.moveDown(0.5)
      const curY = doc.y
      doc.rect(35, curY, 525, 18).fill(sageTint)
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text(title, 42, curY + 4)
      if (sub) {
        doc.fillColor(secondaryColor).fontSize(7).font('Helvetica').text(sub, 280, curY + 5, { width: 270, align: 'right' })
      }
      doc.y = curY + 22
    }

    // ==========================================
    // PAGE 1: HEADER BANNER
    // ==========================================
    doc.rect(35, 35, 525, 62).fill(sageTint).stroke(borderTint)
    doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold')
      .text('ECOTRACE NATIONAL E-WASTE TRACEABILITY REGISTRY', 45, 45)
    doc.fillColor(secondaryColor).fontSize(9.5).font('Helvetica-Bold')
      .text('Final Audit & CPCB Ledger Anchor Report', 45, 60)
    doc.fillColor(mutedSlate).fontSize(7).font('Helvetica')
      .text(`Standard: CPCB E-Waste (Management) Rules | Consortium Node: CPCB-BLR-04 | Audit ID: ${dossier.reportHeader.auditReportId}`, 45, 75)

    // Status pill top right
    const statusBg = dossier.reportHeader.overallAuditStatus === 'Approved' ? '#176B45' : dossier.reportHeader.overallAuditStatus === 'Validation Failed' ? '#B91C1C' : '#B8741A'
    doc.rect(435, 45, 115, 20).fill(statusBg)
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold')
      .text(dossier.reportHeader.overallAuditStatus.toUpperCase(), 435, 51, { width: 115, align: 'center' })

    doc.y = 105

    // ==========================================
    // CONSIGNMENT METADATA BOX
    // ==========================================
    doc.rect(35, 105, 525, 44).fill('#FAFCFA').stroke(borderTint)
    doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica-Bold')
      .text('CONSIGNMENT / BATCH ID', 45, 112)
      .text('WASTE STREAM CATEGORY', 165, 112)
      .text('ORIGIN ORGANISATION', 285, 112)
      .text('COLLECTION DATE', 435, 112)

    doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
      .text(dossier.reportHeader.batchId, 45, 122)
      .text(dossier.reportHeader.category, 165, 122)
      .text((dossier.reportHeader.originOrg || 'CPCB Intake Hub').slice(0, 24), 285, 122)
      .text(new Date(dossier.reportHeader.collectionDate).toISOString().split('T')[0], 435, 122)

    doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica')
      .text(`Type: ${dossier.reportHeader.collectionType}`, 45, 134)
      .text(`Facility: ${dossier.reportHeader.collectionFacility}`, 165, 134)
      .text(`Auditor: ${dossier.reportHeader.assignedAuditor.split(',')[0]}`, 285, 134)
      .text(`Reported: ${new Date(dossier.reportHeader.reportGeneratedAt).toISOString().split('T')[0]}`, 435, 134)

    doc.y = 158

    // ==========================================
    // SUMMARY KPI CARDS
    // ==========================================
    doc.rect(35, 158, 525, 68).fill('#FFFFFF').stroke(borderTint)

    // Row 1 KPIs
    const kpiRow1Y = 164
    doc.fillColor(mutedSlate).fontSize(6).font('Helvetica-Bold')
      .text('ORIGINAL GROSS INPUT', 45, kpiRow1Y)
      .text('RECOVERED MATERIALS', 145, kpiRow1Y)
      .text('RESIDUAL WASTE', 250, kpiRow1Y)
      .text('EXPLAINED LOSS', 355, kpiRow1Y)
      .text('ACCOUNTED TOTAL', 460, kpiRow1Y)

    doc.fillColor(darkSlate).fontSize(9.5).font('Helvetica-Bold')
      .text(`${dossier.summaryKPIs.originalGrossWeightKg} kg`, 45, kpiRow1Y + 9)
    doc.fillColor(secondaryColor).fontSize(9.5).font('Helvetica-Bold')
      .text(`${dossier.summaryKPIs.totalRecoveredKg} kg`, 145, kpiRow1Y + 9)
    doc.fillColor(darkSlate).fontSize(9.5).font('Helvetica-Bold')
      .text(`${dossier.summaryKPIs.residualWasteKg} kg`, 250, kpiRow1Y + 9)
      .text(`${dossier.summaryKPIs.explainedLossKg} kg`, 355, kpiRow1Y + 9)
      .text(`${dossier.summaryKPIs.accountedTotalKg} kg`, 460, kpiRow1Y + 9)

    // Divider line
    doc.moveTo(45, 192).lineTo(550, 192).stroke('#E3EAE5')

    // Row 2 KPIs
    const kpiRow2Y = 196
    doc.fillColor(mutedSlate).fontSize(6).font('Helvetica-Bold')
      .text('WEIGHT DIFFERENCE', 45, kpiRow2Y)
      .text('RECOVERY YIELD', 145, kpiRow2Y)
      .text('CUSTODY TRANSFERS', 250, kpiRow2Y)
      .text('EVIDENCE FILES', 355, kpiRow2Y)
      .text('BLOCKCHAIN CONSENSUS', 460, kpiRow2Y)

    const diffVal = dossier.summaryKPIs.unexplainedDifferenceKg
    const diffColor = Math.abs(diffVal) <= 0.5 ? secondaryColor : '#B91C1C'
    doc.fillColor(diffColor).fontSize(9.5).font('Helvetica-Bold')
      .text(`${diffVal > 0 ? '+' : ''}${diffVal} kg`, 45, kpiRow2Y + 9)

    doc.fillColor(secondaryColor).fontSize(9.5).font('Helvetica-Bold')
      .text(`${dossier.summaryKPIs.recoveryYieldPercent}%`, 145, kpiRow2Y + 9)
    doc.fillColor(darkSlate).fontSize(9.5).font('Helvetica-Bold')
      .text(`${dossier.summaryKPIs.custodyHandoversCount} Events`, 250, kpiRow2Y + 9)
      .text(`${dossier.summaryKPIs.evidenceFilesCount} Registered`, 355, kpiRow2Y + 9)
    doc.fillColor(dossier.summaryKPIs.blockchainVerificationStatus.includes('Verified') ? secondaryColor : '#B8741A').fontSize(8.5).font('Helvetica-Bold')
      .text(dossier.summaryKPIs.blockchainVerificationStatus, 460, kpiRow2Y + 9)

    doc.y = 236

    // ==========================================
    // SECTION 1: BATCH REGISTRATION & INTAKE DETAILS
    // ==========================================
    drawSectionTitle('1. BATCH REGISTRATION & INTAKE MANIFEST', 'Genesis Scale Record')

    doc.rect(35, doc.y, 525, 52).fill('#FAFCFA').stroke('#E3EAE5')
    const sec1Y = doc.y + 6
    doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica-Bold')
      .text('REGISTERED FACILITY & LOCATION:', 45, sec1Y)
      .text('WEIGHING EQUIPMENT & CALIBRATION:', 45, sec1Y + 12)
      .text('INTAKE MANIFEST & EVIDENCE DIGEST:', 45, sec1Y + 24)

    doc.fillColor(darkSlate).fontSize(7).font('Helvetica')
      .text(`${dossier.batchRegistration.collectionFacility} (${dossier.batchRegistration.collectionLocation}) • Operator: ${dossier.batchRegistration.collectionOperator}`, 180, sec1Y)
      .text(`${dossier.batchRegistration.weighingDevice} • ${dossier.batchRegistration.scaleCalibrationDetails}`, 180, sec1Y + 12)
      .text(`Manifest: ${dossier.batchRegistration.manifestNumber} • SHA-256 Digest: ${dossier.batchRegistration.evidenceHash || '0x4f8a...'}`, 180, sec1Y + 24)

    doc.y += 58

    // ==========================================
    // SECTION 2: CHRONOLOGICAL CUSTODY & TRANSPORT LEDGER
    // ==========================================
    drawSectionTitle('2. CHRONOLOGICAL CHAIN OF CUSTODY & TRANSPORT LEDGER', `${dossier.custodyLedger.length} Verifiable Transfers`)

    // Table Header
    checkPageBreak(40)
    let hoY = doc.y
    doc.rect(35, hoY, 525, 14).fill(secondaryColor)
    doc.fillColor('#FFFFFF').fontSize(6.5).font('Helvetica-Bold')
      .text('SEQ', 40, hoY + 4)
      .text('STAGE & ROUTE', 65, hoY + 4)
      .text('SENDER → RECEIVER', 180, hoY + 4)
      .text('DISPATCH', 315, hoY + 4)
      .text('RECEIVED', 365, hoY + 4)
      .text('DIFF', 415, hoY + 4)
      .text('STATUS', 445, hoY + 4)
      .text('ON-CHAIN TX', 495, hoY + 4)

    hoY += 16

    if (dossier.custodyLedger.length === 0) {
      doc.rect(35, hoY, 525, 16).fill('#FFFFFF').stroke('#E3EAE5')
      doc.fillColor(mutedSlate).fontSize(7).font('Helvetica').text('No physical handovers initiated for this consignment.', 45, hoY + 4)
      hoY += 20
    } else {
      dossier.custodyLedger.forEach((ho, i) => {
        checkPageBreak(18)
        if (doc.y !== hoY) hoY = doc.y

        const bg = i % 2 === 0 ? '#FAFCFA' : '#FFFFFF'
        doc.rect(35, hoY, 525, 15).fill(bg).stroke('#F1F5F3')

        const truncTx = ho.txHash ? `${ho.txHash.slice(0, 6)}...${ho.txHash.slice(-4)}` : 'Unanchored'

        doc.fillColor(primaryColor).fontSize(6.5).font('Helvetica-Bold')
          .text(`#${ho.sequenceNumber}`, 40, hoY + 4)
        doc.fillColor(darkSlate).fontSize(6.5).font('Helvetica')
          .text((ho.stage || '').slice(0, 24), 65, hoY + 4)
          .text(`${(ho.dispatchingOrg || '').slice(0, 12)} → ${(ho.receivingOrg || '').slice(0, 12)}`, 180, hoY + 4)
        doc.font('Helvetica-Bold')
          .text(`${ho.dispatchedWeightKg} kg`, 315, hoY + 4)
          .text(ho.receivedWeightKg != null ? `${ho.receivedWeightKg} kg` : '—', 365, hoY + 4)
        doc.font('Helvetica')
          .text(ho.weightDifferenceKg ? `${ho.weightDifferenceKg > 0 ? '+' : ''}${ho.weightDifferenceKg}` : '0 kg', 415, hoY + 4)
        doc.fillColor(ho.status === 'Accepted' ? '#15803D' : '#B8741A')
          .text(ho.status, 445, hoY + 4)
        doc.fillColor(mutedSlate).font('Helvetica')
          .text(truncTx, 495, hoY + 4)

        hoY += 16
      })
    }

    doc.y = hoY + 6

    // ==========================================
    // SECTION 3: RECYCLER PROCESSING & RECOVERED MATERIALS
    // ==========================================
    drawSectionTitle('3. RECYCLER PROCESSING & RECOVERED MATERIALS BREAKDOWN', 'Material Conservation Proof')

    checkPageBreak(50)
    let recY = doc.y
    doc.rect(35, recY, 525, 26).fill('#FAFCFA').stroke('#E3EAE5')
    doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica-Bold')
      .text('RECYCLER FACILITY:', 45, recY + 5)
      .text('PROCESSING OPERATOR:', 45, recY + 14)

    doc.fillColor(darkSlate).fontSize(7).font('Helvetica')
      .text(`${dossier.recyclerProcessing.recyclerCompany} • Licence: ${dossier.recyclerProcessing.facilityLicence}`, 150, recY + 5)
      .text(`${dossier.recyclerProcessing.operator} • Method: ${dossier.recyclerProcessing.processingMethod}`, 150, recY + 14)

    recY += 30

    // Materials Table Header
    doc.rect(35, recY, 525, 14).fill(secondaryColor)
    doc.fillColor('#FFFFFF').fontSize(6.5).font('Helvetica-Bold')
      .text('MATERIAL STREAM FRACTION', 45, recY + 4)
      .text('MEASURED RECOVERED WEIGHT', 220, recY + 4)
      .text('UNIT', 360, recY + 4)
      .text('ASSAY EVIDENCE REFERENCE', 420, recY + 4)

    recY += 16

    if (dossier.recyclerProcessing.recoveredMaterials.length === 0) {
      doc.rect(35, recY, 525, 16).fill('#FFFFFF').stroke('#E3EAE5')
      doc.fillColor(mutedSlate).fontSize(7).font('Helvetica')
        .text('No metallurgical recovered materials recorded yet for this batch.', 45, recY + 4)
      recY += 20
    } else {
      dossier.recyclerProcessing.recoveredMaterials.forEach((m, idx) => {
        checkPageBreak(16)
        if (doc.y !== recY) recY = doc.y

        const bg = idx % 2 === 0 ? '#FAFCFA' : '#FFFFFF'
        doc.rect(35, recY, 525, 15).fill(bg).stroke('#F1F5F3')

        doc.fillColor(primaryColor).fontSize(7).font('Helvetica-Bold')
          .text(m.name, 45, recY + 4)
        doc.fillColor(secondaryColor).fontSize(7.5).font('Helvetica-Bold')
          .text(`${m.weightKg.toLocaleString()} kg`, 220, recY + 4)
        doc.fillColor(darkSlate).fontSize(7).font('Helvetica')
          .text(m.unit, 360, recY + 4)
        doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica')
          .text(m.evidenceRef.slice(0, 30), 420, recY + 4)

        recY += 16
      })
    }

    doc.y = recY + 6

    // ==========================================
    // SECTION 4: MASS-BALANCE RECONCILIATION PROOF
    // ==========================================
    drawSectionTitle('4. STATUTORY MASS-BALANCE YIELD & CONSERVATION FORMULA', 'Tolerance Threshold: ±0.5 kg')

    checkPageBreak(45)
    let mbY = doc.y
    doc.rect(35, mbY, 525, 48).fill('#FAFCFA').stroke('#CBD8D0')
    doc.fillColor(primaryColor).fontSize(7).font('Helvetica-Bold')
      .text('STATUTORY CONSERVATION EQUATIONS:', 45, mbY + 6)

    doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica')
      .text(`1. Accounted Output = Recovered (${dossier.massBalance.recoveredWeightKg} kg) + Residual Waste (${dossier.massBalance.residualWasteKg} kg) + Explained Loss (${dossier.massBalance.explainedLossKg} kg) = ${dossier.massBalance.accountedTotalKg} kg`, 45, mbY + 16)
      .text(`2. Unexplained Difference = Incoming (${dossier.massBalance.grossWeightKg} kg) − Accounted (${dossier.massBalance.accountedTotalKg} kg) = ${dossier.massBalance.unexplainedDifferenceKg > 0 ? '+' : ''}${dossier.massBalance.unexplainedDifferenceKg} kg (Allowed: ±${dossier.massBalance.permittedToleranceKg} kg)`, 45, mbY + 26)
      .text(`3. Certified Recovery Yield = (${dossier.massBalance.recoveredWeightKg} kg ÷ ${dossier.massBalance.grossWeightKg} kg) × 100 = ${dossier.massBalance.recoveryYieldPercent}%`, 45, mbY + 36)

    doc.y = mbY + 54

    // ==========================================
    // SECTION 5: DUPLICATE CLAIMS & DOWNSTREAM DISPATCH
    // ==========================================
    drawSectionTitle('5. ANTI-FRAUD INTEGRITY & DOWNSTREAM DISPATCH', 'CPCB Schedule III Compliance')

    checkPageBreak(35)
    let afY = doc.y
    doc.rect(35, afY, 525, 34).fill('#FFFFFF').stroke('#E3EAE5')
    doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica-Bold')
      .text('DUPLICATE CLAIM CHECK:', 45, afY + 5)
      .text('DOWNSTREAM DESTINATION:', 45, afY + 18)

    doc.fillColor(dossier.duplicateChecks.status === 'CLEAR' ? secondaryColor : '#B91C1C').fontSize(7).font('Helvetica-Bold')
      .text(dossier.duplicateChecks.label, 170, afY + 5)

    doc.fillColor(darkSlate).fontSize(7).font('Helvetica')
      .text(
        dossier.dispatchDownstream
          ? `Dispatched to: ${dossier.dispatchDownstream.destinationFacility} • Manifest: ${dossier.dispatchDownstream.manifestNumber} • Status: ${dossier.dispatchDownstream.status}`
          : 'Materials retained at authorized recycler warehouse awaiting final dispatch manifest.',
        170,
        afY + 18
      )

    doc.y = afY + 40

    // ==========================================
    // SECTION 6: EVIDENCE & DOCUMENT INTEGRITY REGISTER
    // ==========================================
    drawSectionTitle('6. EVIDENCE FILES & DOCUMENT INTEGRITY REGISTER', `${dossier.evidenceRegister.length} Cryptographic Proofs`)

    checkPageBreak(40)
    let evY = doc.y
    doc.rect(35, evY, 525, 14).fill(secondaryColor)
    doc.fillColor('#FFFFFF').fontSize(6.5).font('Helvetica-Bold')
      .text('REF ID', 40, evY + 4)
      .text('DOCUMENT NAME', 90, evY + 4)
      .text('CATEGORY & OPERATION', 210, evY + 4)
      .text('SIZE', 350, evY + 4)
      .text('SHA-256 EVIDENCE DIGEST', 400, evY + 4)
      .text('STATUS', 510, evY + 4)

    evY += 16

    if (dossier.evidenceRegister.length === 0) {
      doc.rect(35, evY, 525, 16).fill('#FFFFFF').stroke('#E3EAE5')
      doc.fillColor(mutedSlate).fontSize(7).font('Helvetica').text('No supporting evidence uploaded.', 45, evY + 4)
      evY += 20
    } else {
      dossier.evidenceRegister.forEach((ev, idx) => {
        checkPageBreak(15)
        if (doc.y !== evY) evY = doc.y

        const bg = idx % 2 === 0 ? '#FAFCFA' : '#FFFFFF'
        doc.rect(35, evY, 525, 14).fill(bg).stroke('#F1F5F3')

        const truncHash = ev.evidenceHash ? `${ev.evidenceHash.slice(0, 10)}...${ev.evidenceHash.slice(-6)}` : 'Verified'

        doc.fillColor(primaryColor).fontSize(6.5).font('Helvetica-Bold')
          .text(ev.id, 40, evY + 3)
        doc.fillColor(darkSlate).fontSize(6.5).font('Helvetica')
          .text((ev.name || '').slice(0, 24), 90, evY + 3)
          .text((ev.category || '').slice(0, 26), 210, evY + 3)
          .text(`${Math.round(ev.fileSize / 1024)} KB`, 350, evY + 3)
        doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica')
          .text(truncHash, 400, evY + 3)
        doc.fillColor('#15803D').fontSize(6.5).font('Helvetica-Bold')
          .text(ev.status, 510, evY + 3)

        evY += 15
      })
    }

    doc.y = evY + 6

    // ==========================================
    // SECTION 7: STATUTORY AUDIT FINDINGS CHECKLIST
    // ==========================================
    drawSectionTitle('7. STATUTORY REGULATORY AUDIT FINDINGS & COMPLIANCE EVALUATION', 'Consortium Review')

    checkPageBreak(70)
    let findY = doc.y
    dossier.findings.forEach((f, idx) => {
      checkPageBreak(14)
      if (doc.y !== findY) findY = doc.y

      const bg = idx % 2 === 0 ? '#FAFCFA' : '#FFFFFF'
      doc.rect(35, findY, 525, 14).fill(bg).stroke('#E3EAE5')

      const statusColor = f.status === 'PASS' ? '#15803D' : f.status === 'FLAGGED' ? '#B8741A' : '#B91C1C'

      doc.rect(40, findY + 2, 45, 10).fill(statusColor)
      doc.fillColor('#FFFFFF').fontSize(6).font('Helvetica-Bold')
        .text(f.status, 40, findY + 3.5, { width: 45, align: 'center' })

      doc.fillColor(primaryColor).fontSize(6.5).font('Helvetica-Bold')
        .text(f.category, 95, findY + 3.5)

      doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica')
        .text(f.detail.slice(0, 80), 220, findY + 3.5)

      findY += 15
    })

    doc.y = findY + 6

    // ==========================================
    // SECTION 8: BLOCKCHAIN LEDGER ANCHOR (SEPOLIA)
    // ==========================================
    drawSectionTitle('8. BLOCKCHAIN LEDGER ANCHOR & ON-CHAIN CONSENSUS', 'Ethereum Sepolia Testnet')

    checkPageBreak(40)
    let bcY = doc.y
    doc.rect(35, bcY, 525, 36).fill('#F4F7F5').stroke(borderTint)

    doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica-Bold')
      .text('NETWORK & CHAIN ID:', 45, bcY + 5)
      .text('SMART CONTRACT:', 45, bcY + 14)
      .text('TRANSACTION HASH:', 45, bcY + 23)

    doc.fillColor(darkSlate).fontSize(7).font('Helvetica')
      .text(`${dossier.blockchainVerification.network} (Chain ID: ${dossier.blockchainVerification.chainId}) • Block: #${dossier.blockchainVerification.blockNumber}`, 160, bcY + 5)
      .text(dossier.blockchainVerification.contractAddress, 160, bcY + 14)
      .text(dossier.blockchainVerification.txHash || 'Pending on-chain transaction anchor', 160, bcY + 23)

    doc.y = bcY + 42

    // ==========================================
    // STATUTORY DISCLAIMER & SIGN-OFF
    // ==========================================
    checkPageBreak(55)
    let signY = doc.y
    doc.rect(35, signY, 525, 48).fill('#FEF5E7').stroke('#FAD7A0')
    doc.fillColor('#8C5205').fontSize(6.5).font('Helvetica-Bold')
      .text('STATUTORY TRANSPARENCY NOTICE (CPCB E-WASTE MANAGEMENT RULES)', 45, signY + 6)
    doc.fillColor('#A2620A').fontSize(6).font('Helvetica')
      .text(
        'This EcoTrace Audit Report is generated pursuant to Schedule III mass-balance conservation rules. Cryptographic ledger digests establish immutable non-repudiation of recorded event timestamps, transfer handovers, and evidence hashes relative to on-chain smart contract consensus state. They do not substitute for periodic weighbridge scale calibration audits by accredited physical inspection bodies.',
        45,
        signY + 16,
        { width: 505, lineGap: 1 }
      )

    doc.y = signY + 54
    checkPageBreak(30)
    const sigY = doc.y
    doc.fillColor(darkSlate).fontSize(7.5).font('Helvetica-Bold')
      .text(dossier.reportHeader.assignedAuditor, 45, sigY)
      .text('EcoTrace Consortium Smart Contract Node', 350, sigY)
    doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica')
      .text(dossier.reportHeader.responsibleOrg, 45, sigY + 10)
      .text(`Smart Contract Address: ${dossier.blockchainVerification.contractAddress}`, 350, sigY + 10)

    // ==========================================
    // FOOTERS (RUNNING PAGE NUMBERS)
    // ==========================================
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i)
      doc.fillColor(mutedSlate).fontSize(6.5).font('Helvetica')
        .text(
          `EcoTrace National E-Waste Traceability & Mass Conservation Audit Report | Batch: ${batchId} | Page ${i + 1} of ${pages.count}`,
          35,
          810,
          { width: 525, align: 'center' }
        )
    }

    doc.end()
  } catch (err) {
    next(err)
  }
}

export async function exportReportsPdf(req, res, next) {
  try {
    const rawBatchIds = req.query.batchIds || req.body?.batchIds || req.query.batchId || req.params.batchId
    let filter = {}

    let parsedIds = []
    if (rawBatchIds) {
      parsedIds = Array.isArray(rawBatchIds)
        ? rawBatchIds
        : String(rawBatchIds).split(',').map(s => s.trim()).filter(Boolean)
      if (parsedIds.length > 0) {
        filter = { batchId: { $in: parsedIds } }
      }
    }

    // If exactly one batch ID was targeted, provide the comprehensive individual audit dossier PDF
    if (parsedIds.length === 1) {
      req.params.batchId = parsedIds[0]
      return exportBatchAuditPdf(req, res, next)
    }

    const batches = await Batch.find(filter).sort({ createdAt: -1 }).lean()

    if (batches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No records found to include in the PDF report.',
      })
    }

    if (batches.length === 1) {
      req.params.batchId = batches[0].batchId
      return exportBatchAuditPdf(req, res, next)
    }

    const totalWeight = batches.reduce((acc, b) => acc + (Number(b.grossWeight) || 0), 0)
    const co2Saved = Number((totalWeight * 1.44).toFixed(1))

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: 'EcoTrace Official E-Waste Traceability & Compliance Report',
        Author: 'Central Pollution Control Board (CPCB) Consortium Node',
      },
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="ecotrace-compliance-report.pdf"')

    doc.pipe(res)

    // Palette: Forest Green #003B23, Leaf Green #176B45, Soft Gray #66756D
    const primaryColor = '#003B23'
    const secondaryColor = '#176B45'
    const grayColor = '#475569'

    // Header Band
    doc.rect(40, 40, 515, 60).fill('#E8F5EE')
    doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold')
      .text('CENTRAL POLLUTION CONTROL BOARD (CPCB)', 55, 52)
    doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold')
      .text('EcoTrace National E-Waste Traceability & Mass Conservation Certificate', 55, 70)
    doc.fillColor(grayColor).fontSize(8).font('Helvetica')
      .text(`Consortium Node: CPCB-BLR-04 | Generated: ${new Date().toUTCString()} | Records: ${batches.length}`, 55, 84)

    doc.moveDown(3)

    // Summary KPI Block
    const summaryY = 115
    doc.rect(40, summaryY, 515, 50).fill('#FAFCFA').stroke('#CBD8D0')
    doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
      .text('TOTAL CONSIGNMENTS', 55, summaryY + 12)
      .text('GROSS INPUT WEIGHT', 180, summaryY + 12)
      .text('CO2e AVOIDED', 320, summaryY + 12)
      .text('LEDGER CONSENSUS', 440, summaryY + 12)

    doc.fontSize(11).font('Helvetica-Bold').fillColor(secondaryColor)
      .text(`${batches.length} Batches`, 55, summaryY + 28)
      .text(`${totalWeight.toLocaleString()} kg`, 180, summaryY + 28)
      .text(`${co2Saved.toLocaleString()} kg`, 320, summaryY + 28)
      .text('EVM Anchored', 440, summaryY + 28)

    // Table Header
    let tableY = 185
    doc.rect(40, tableY, 515, 20).fill('#176B45')
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
      .text('BATCH ID', 45, tableY + 6)
      .text('CATEGORY', 135, tableY + 6)
      .text('ORIGIN / FACILITY', 225, tableY + 6)
      .text('WEIGHT', 330, tableY + 6)
      .text('STATUS', 380, tableY + 6)
      .text('BLOCKCHAIN DIGEST', 445, tableY + 6)

    tableY += 22

    // Rows
    batches.forEach((b, idx) => {
      // Handle page overflow
      if (tableY > 730) {
        doc.addPage()
        tableY = 50
        doc.rect(40, tableY, 515, 20).fill('#176B45')
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
          .text('BATCH ID', 45, tableY + 6)
          .text('CATEGORY', 135, tableY + 6)
          .text('ORIGIN / FACILITY', 225, tableY + 6)
          .text('WEIGHT', 330, tableY + 6)
          .text('STATUS', 380, tableY + 6)
          .text('BLOCKCHAIN DIGEST', 445, tableY + 6)
        tableY += 22
      }

      const bg = idx % 2 === 0 ? '#FAFCFA' : '#FFFFFF'
      doc.rect(40, tableY, 515, 18).fill(bg)

      const truncTx = b.blockchainHash ? `${b.blockchainHash.slice(0, 8)}...${b.blockchainHash.slice(-6)}` : 'Unanchored'
      const weightText = `${b.grossWeight} kg`

      doc.fillColor('#1E293B').fontSize(7.5).font('Helvetica-Bold')
        .text(b.batchId, 45, tableY + 5, { width: 85 })
      doc.font('Helvetica').fillColor('#334155')
        .text((b.category || 'Mixed E-Waste').slice(0, 18), 135, tableY + 5, { width: 85 })
        .text((b.sourceOrg || 'Collection Hub').slice(0, 20), 225, tableY + 5, { width: 100 })
      doc.font('Helvetica-Bold').fillColor('#0F172A')
        .text(weightText, 330, tableY + 5)
      doc.font('Helvetica').fillColor(b.status === 'Processed' ? '#15803D' : b.status === 'Flagged Discrepancy' ? '#B91C1C' : '#1E40AF')
        .text(b.status, 380, tableY + 5)
      doc.font('Helvetica').fillColor('#64748B')
        .text(truncTx, 445, tableY + 5)

      tableY += 19
    })

    // Disclaimer & Sign-off Block
    if (tableY > 670) {
      doc.addPage()
      tableY = 50
    } else {
      tableY += 15
    }

    doc.rect(40, tableY, 515, 55).fill('#FEF5E7').stroke('#FAD7A0')
    doc.fillColor('#8C5205').fontSize(7.5).font('Helvetica-Bold')
      .text('STATUTORY TRANSPARENCY NOTICE (CPCB E-WASTE RULES 2024)', 50, tableY + 8)
    doc.font('Helvetica').fillColor('#A2620A').fontSize(7)
      .text(
        'Blockchain cryptographic transaction digests establish the non-repudiation and tamper-evident history of recorded batch timestamps, transfer handovers, and evidence hashes relative to on-chain consensus state. They do not substitute for periodic weighbridge scale calibration audits by accredited physical inspection bodies.',
        50,
        tableY + 20,
        { width: 495, lineGap: 1 }
      )

    tableY += 70

    // Signatures
    doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold')
      .text('Dr. Sunita Rao', 50, tableY)
      .text('EcoTrace Smart Contract Authority', 350, tableY)
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
      .text('Chief Compliance Officer, CPCB Regional Hub #04', 50, tableY + 12)
      .text(`Smart Contract Registry: ${process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}`, 350, tableY + 12)

    // Running page numbers
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i)
      doc.fillColor('#64748B').fontSize(7).font('Helvetica')
        .text(`EcoTrace National Compliance Registry | Page ${i + 1} of ${pages.count}`, 40, 810, { width: 515, align: 'center' })
    }

    doc.end()
  } catch (err) {
    next(err)
  }
}
