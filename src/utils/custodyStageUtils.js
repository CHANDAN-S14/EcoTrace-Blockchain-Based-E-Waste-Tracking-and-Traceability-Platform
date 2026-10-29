/**
 * Custody Stage and Workflow Transition Utilities
 * Defines strict five-stage pipeline progression according to CPCB-EWM standards
 */

export const CUSTODY_STAGES = [
  { step: 1, id: 'COLLECTION_CENTER', name: 'Collection Center', desc: 'Intake registration & weighing' },
  { step: 2, id: 'TRANSPORTER', name: 'Transporter', desc: 'GPS manifest & transit custody' },
  { step: 3, id: 'RECEIVING_DEPOT', name: 'Receiving Depot', desc: 'Dock scale reconciliation (±0.5kg)' },
  { step: 4, id: 'CERTIFIED_RECYCLER', name: 'Certified Recycler', desc: 'Intake receipt & metallurgy recovery' },
  { step: 5, id: 'FINAL_AUDIT', name: 'Final Audit', desc: 'Regulatory verification & ledger certification' },
]

/**
 * Calculates current custody step (1..5, or 6 if fully audited) and metadata for a batch
 */
export function getBatchCustodyStage(batch) {
  if (!batch) {
    return {
      step: 1,
      name: 'Collection Center',
      label: 'Intake & Registration',
      isDiscrepancy: false,
      isCompleted: false,
    }
  }

  const handovers = Array.isArray(batch.handovers) ? batch.handovers : []
  const hasDiscrepancy = batch.status === 'Flagged Discrepancy' ||
    handovers.some(h => h.status === 'Discrepancy Detected')

  if (batch.status === 'Audited') {
    return {
      step: 6,
      name: 'Final Audit',
      label: 'Certified On-Chain',
      isDiscrepancy: false,
      isCompleted: true,
      canCertify: false,
    }
  }

  if (batch.status === 'Processed') {
    return {
      step: 5,
      name: 'Final Audit',
      label: 'Awaiting Final Audit Certification',
      isDiscrepancy: hasDiscrepancy,
      isCompleted: false,
      canCertify: !hasDiscrepancy,
    }
  }

  if (batch.status === 'Received') {
    return {
      step: 4,
      name: 'Certified Recycler',
      label: 'Received at Facility — Awaiting Metallurgy Recovery',
      isDiscrepancy: hasDiscrepancy,
      isCompleted: false,
    }
  }

  // Look through handovers to determine exact step
  const hoStep3 = handovers.find(h => h.step === 3 || h.stage?.includes('Receiving Depot →') || h.stage?.includes('Depot →'))
  const hoStep2 = handovers.find(h => h.step === 2 || h.stage?.includes('Transporter →'))
  const hoStep1 = handovers.find(h => h.step === 1 || h.stage?.includes('Collection Center →') || h.stage?.includes('Collection →'))

  if (hoStep3) {
    if (hoStep3.status === 'Accepted' || hoStep3.receivedWeight != null) {
      return {
        step: 4,
        name: 'Certified Recycler',
        label: 'Depot Scaled — Awaiting Recycler Intake',
        isDiscrepancy: hasDiscrepancy,
        isCompleted: false,
      }
    }
    return {
      step: 4,
      name: 'Certified Recycler',
      label: hoStep3.receiver && !hoStep3.receiver.includes('Pending')
        ? 'Pending Recycler Confirmation'
        : 'Assign Recycler Required',
      isDiscrepancy: hasDiscrepancy,
      isCompleted: false,
    }
  }

  if (hoStep2) {
    if (hoStep2.status === 'Pending Review' || hoStep2.status === 'Pending') {
      return {
        step: 3,
        name: 'Receiving Depot',
        label: 'Arrived at Depot — Scale Weighing Required',
        isDiscrepancy: hasDiscrepancy,
        isCompleted: false,
      }
    }
    if (hoStep2.status === 'Accepted') {
      return {
        step: 4,
        name: 'Certified Recycler',
        label: 'Depot Verified — Ready for Recycler',
        isDiscrepancy: hasDiscrepancy,
        isCompleted: false,
      }
    }
  }

  if (hoStep1) {
    if (hoStep1.status === 'Pending Review' || hoStep1.status === 'Pending') {
      const needsTransporter = !hoStep1.receiver || hoStep1.receiver.includes('Pending')
      if (needsTransporter) {
        return {
          step: 1,
          name: 'Collection Center',
          label: 'Pending Transporter Assignment',
          isDiscrepancy: hasDiscrepancy,
          isCompleted: false,
        }
      }
      return {
        step: 2,
        name: 'Transporter',
        label: 'Transporter Assigned — Awaiting Custody Acceptance',
        isDiscrepancy: hasDiscrepancy,
        isCompleted: false,
      }
    }
    if (hoStep1.status === 'Accepted') {
      return {
        step: 3,
        name: 'Receiving Depot',
        label: 'In Transit — Awaiting Depot Arrival',
        isDiscrepancy: hasDiscrepancy,
        isCompleted: false,
      }
    }
  }

  // Baseline registered batch
  return {
    step: 1,
    name: 'Collection Center',
    label: 'Registered at Center — Awaiting Transporter',
    isDiscrepancy: hasDiscrepancy,
    isCompleted: false,
  }
}

/**
 * Returns the single immediate actionable custody task for a batch
 */
export function getBatchAvailableAction(batch) {
  if (!batch) return null

  const stage = getBatchCustodyStage(batch)
  const handovers = Array.isArray(batch.handovers) ? batch.handovers : []

  if (stage.isDiscrepancy) {
    const discHo = handovers.slice().reverse().find(h => h.status === 'Discrepancy Detected')
    return {
      type: 'DISCREPANCY_FLAGGED',
      label: 'Investigate Discrepancy',
      variant: 'danger',
      step: stage.step,
      targetHandover: discHo || null,
      description: discHo?.discrepancyReason || 'Weight variance exceeded statutory ±0.5kg tolerance threshold.',
    }
  }

  if (batch.status === 'Audited') {
    return {
      type: 'AUDIT_COMPLETE',
      label: 'View Regulatory Dossier',
      variant: 'verified',
      step: 5,
      description: 'Consignment certified on immutable blockchain registry.',
    }
  }

  if (batch.status === 'Processed') {
    return {
      type: 'CERTIFY_AUDIT',
      label: 'Certify Final Regulatory Audit',
      variant: 'primary',
      step: 5,
      description: 'Reconciled recovery claim ready for CPCB final sign-off.',
    }
  }

  if (batch.status === 'Received') {
    return {
      type: 'NAVIGATE_RECOVERY',
      label: 'Record Recovery & Processing',
      variant: 'secondary',
      step: 4,
      description: 'Consignment received at facility dock. Record metallurgy mass-balance.',
    }
  }

  // Check Step 1: Assign Transporter
  const hoStep1 = handovers.find(h => h.step === 1 || h.stage?.includes('Collection Center →'))
  if (!hoStep1 || !hoStep1.receiver || hoStep1.receiver.includes('Pending')) {
    return {
      type: 'ASSIGN_TRANSPORTER',
      label: 'Assign Transporter & Dispatch',
      variant: 'primary',
      step: 1,
      targetHandover: hoStep1 || null,
      description: 'Assign authorized carrier vehicle and generate digital transit manifest.',
    }
  }

  // Step 2: Transporter Acceptance
  if (hoStep1.status === 'Pending Review' || hoStep1.status === 'Pending') {
    return {
      type: 'ACCEPT_TRANSPORTER',
      label: 'Accept Transporter Custody',
      variant: 'primary',
      step: 2,
      targetHandover: hoStep1,
      description: 'Transporter signs off on consignment physical custody and dispatch weight.',
    }
  }

  // Step 3: Depot Scale Weighing
  const hoStep2 = handovers.find(h => h.step === 2 || h.stage?.includes('Transporter →'))
  if (hoStep2 && (hoStep2.status === 'Pending Review' || hoStep2.status === 'Pending')) {
    return {
      type: 'RECORD_DEPOT_SCALE',
      label: 'Record Dock Scale Weight',
      variant: 'primary',
      step: 3,
      targetHandover: hoStep2,
      description: 'Weigh incoming carrier on calibrated dock scale (±0.5kg reconciliation).',
    }
  }

  // Step 4: Recycler Assignment & Intake
  const hoStep3 = handovers.find(h => h.step === 3 || h.stage?.includes('Receiving Depot →'))
  if (hoStep3) {
    if (!hoStep3.receiver || hoStep3.receiver.includes('Pending')) {
      return {
        type: 'ASSIGN_RECYCLER',
        label: 'Assign Certified Recycler',
        variant: 'primary',
        step: 4,
        targetHandover: hoStep3,
        description: 'Designate CPCB-authorized e-waste recycler for processing.',
      }
    }
    if (hoStep3.status === 'Pending Review' || hoStep3.status === 'Pending') {
      return {
        type: 'ACCEPT_RECYCLER',
        label: 'Confirm Recycler Intake',
        variant: 'primary',
        step: 4,
        targetHandover: hoStep3,
        description: 'Recycler intake facility confirms consignment receipt.',
      }
    }
  }

  return {
    type: 'VIEW_DETAILS',
    label: 'View Custody Details',
    variant: 'secondary',
    step: stage.step,
    description: 'Track ongoing transit progress.',
  }
}
