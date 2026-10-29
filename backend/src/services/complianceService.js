import { Facility } from '../models/Facility.js'
import { Batch } from '../models/Batch.js'
import { RecoveryRecord } from '../models/RecoveryRecord.js'

export async function verifyFacilityEligibility(facilityId, category) {
  const facility = await Facility.findOne({ facilityId })
  if (!facility) {
    return { isEligible: false, reason: `Facility ${facilityId} not registered in CPCB system.` }
  }

  if (facility.licenceStatus !== 'Active & Verified') {
    return {
      isEligible: false,
      reason: `Facility ${facility.name} licence status is ${facility.licenceStatus}. CPCB active validation required.`,
    }
  }

  const categoryMatches = facility.categoriesAccepted.some(c =>
    category.toLowerCase().includes(c.toLowerCase()) ||
    c.toLowerCase().includes(category.toLowerCase())
  )

  if (!categoryMatches) {
    return {
      isEligible: false,
      reason: `Facility ${facility.name} is not certified to process category '${category}'. Authorized: ${facility.categoriesAccepted.join(', ')}`,
    }
  }

  const remainingQuota = facility.capacityKgMonth - facility.currentLoadKg
  return {
    isEligible: true,
    facility,
    remainingQuotaKg: remainingQuota,
  }
}

export async function getComplianceOverview() {
  const [facilities, totalBatches, flaggedBatches, processedBatches, reconciledRecoveries] = await Promise.all([
    Facility.find({}).lean(),
    Batch.countDocuments(),
    Batch.countDocuments({ status: 'Flagged Discrepancy' }),
    Batch.countDocuments({ status: 'Processed' }),
    RecoveryRecord.countDocuments({ validationStatus: 'Reconciled' }),
  ])

  const totalMonthlyCapacityKg = facilities.reduce((sum, f) => sum + f.capacityKgMonth, 0)
  const totalCurrentLoadKg = facilities.reduce((sum, f) => sum + f.currentLoadKg, 0)
  const reconciliationRatePct = totalBatches > 0
    ? Number(((reconciledRecoveries / totalBatches) * 100).toFixed(1))
    : 100.0

  return {
    totalFacilities: facilities.length,
    activeVerified: facilities.filter(f => f.licenceStatus === 'Active & Verified').length,
    reviewRequired: facilities.filter(f => f.licenceStatus.includes('Review')).length,
    totalMonthlyCapacityKg,
    totalCurrentLoadKg,
    capacityUtilizationPct: totalMonthlyCapacityKg > 0 ? Number(((totalCurrentLoadKg / totalMonthlyCapacityKg) * 100).toFixed(1)) : 0,
    totalBatches,
    flaggedBatches,
    processedBatches,
    reconciledRecoveries,
    reconciliationRatePct,
    facilities,
    facilitiesCompliance: facilities,
  }
}
