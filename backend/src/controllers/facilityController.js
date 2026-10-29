import { Facility } from '../models/Facility.js'
import { Batch } from '../models/Batch.js'
import { AuditEvent } from '../models/AuditEvent.js'
import {
  importPublicKarnatakaFacilities,
  OPENCITY_DATASET_URL,
  OPENCITY_KML_RESOURCE_URL,
  CPCB_PORTAL_METADATA,
} from '../services/publicFacilityService.js'

export async function getFacilities(req, res, next) {
  try {
    const { status, type, verification, q } = req.query
    const filter = {}

    // Filter by licence status
    if (status && status !== 'ALL') {
      filter.licenceStatus = status
    }

    // Filter by facility type (COLLECTION_CENTRE vs RECYCLER)
    if (type && type !== 'ALL') {
      filter.facilityType = type
    }

    // Filter by verification status (VERIFIED vs UNVERIFIED vs PENDING_VERIFICATION)
    if (verification && verification !== 'ALL') {
      filter.verificationStatus = verification
    }

    // Search by facility name, registration number, licence number, location, or source
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { facilityId: { $regex: q, $options: 'i' } },
        { licenceNumber: { $regex: q, $options: 'i' } },
        { registrationNumber: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { dataSource: { $regex: q, $options: 'i' } },
      ]
    }

    const facilities = await Facility.find(filter).sort({ facilityType: -1, name: 1 }).lean()

    // Aggregate summary statistics across all facilities in MongoDB
    const allFacilities = await Facility.find({}).lean()
    const summary = {
      totalFacilities: allFacilities.length,
      activeLicensed: allFacilities.filter(
        (f) => f.licenceStatus === 'Active & Verified' || f.verificationStatus === 'VERIFIED'
      ).length,
      reviewRequired: allFacilities.filter((f) => (f.licenceStatus || '').includes('Review')).length,
      unverified: allFacilities.filter(
        (f) => f.verificationStatus === 'UNVERIFIED' || f.licenceStatus === 'Unverified'
      ).length,
      collectionCentres: allFacilities.filter((f) => f.facilityType === 'COLLECTION_CENTRE').length,
      recyclers: allFacilities.filter((f) => f.facilityType === 'RECYCLER').length,
      // Calculate monthly capacity strictly from valid, non-null numeric fields
      totalCapacityKgMonth: allFacilities.reduce((sum, f) => {
        return sum + (typeof f.capacityKgMonth === 'number' && f.capacityKgMonth > 0 ? f.capacityKgMonth : 0)
      }, 0),
      facilitiesWithKnownCapacity: allFacilities.filter(
        (f) => typeof f.capacityKgMonth === 'number' && f.capacityKgMonth > 0
      ).length,
    }

    // Enrich with associated batches count and capacity utilization
    const enriched = await Promise.all(
      facilities.map(async (fac) => {
        const batchCount = await Batch.countDocuments({
          $or: [
            { collectionFacility: { $regex: fac.name, $options: 'i' } },
            { assignedFacility: { $regex: fac.name, $options: 'i' } },
            { 'handovers.receiver': { $regex: fac.name, $options: 'i' } },
          ],
        })

        const hasCapacity = typeof fac.capacityKgMonth === 'number' && fac.capacityKgMonth > 0
        const availableCapacity = hasCapacity
          ? Math.max(0, fac.capacityKgMonth - (fac.currentLoadKg || 0))
          : null
        const utilizationPercent = hasCapacity
          ? Number((((fac.currentLoadKg || 0) / fac.capacityKgMonth) * 100).toFixed(1))
          : null

        return {
          ...fac,
          id: fac.facilityId,
          batchCount,
          hasCapacity,
          availableCapacity,
          utilizationPercent,
        }
      })
    )

    return res.json({
      success: true,
      count: enriched.length,
      summary,
      data: enriched,
    })
  } catch (err) {
    next(err)
  }
}

export async function getFacilityById(req, res, next) {
  try {
    const { facilityId } = req.params
    const fac = await Facility.findOne({ facilityId }).lean()
    if (!fac) {
      return res.status(404).json({ success: false, message: `Facility ${facilityId} not found` })
    }

    const associatedBatches = await Batch.find({
      $or: [
        { collectionFacility: { $regex: fac.name, $options: 'i' } },
        { assignedFacility: { $regex: fac.name, $options: 'i' } },
        { 'handovers.receiver': { $regex: fac.name, $options: 'i' } },
      ],
    })
      .limit(10)
      .lean()

    const hasCapacity = typeof fac.capacityKgMonth === 'number' && fac.capacityKgMonth > 0
    const availableCapacity = hasCapacity
      ? Math.max(0, fac.capacityKgMonth - (fac.currentLoadKg || 0))
      : null
    const utilizationPercent = hasCapacity
      ? Number((((fac.currentLoadKg || 0) / fac.capacityKgMonth) * 100).toFixed(1))
      : null

    return res.json({
      success: true,
      data: {
        ...fac,
        id: fac.facilityId,
        hasCapacity,
        availableCapacity,
        utilizationPercent,
        associatedBatches,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function createFacility(req, res, next) {
  try {
    const {
      name,
      licenceNumber,
      facilityType,
      verificationStatus,
      location,
      capacityKgMonth,
      categoriesAccepted,
      contactEmail,
      coordinates,
    } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Facility name is required.',
      })
    }

    const facilityCount = await Facility.countDocuments()
    const facilityId = `FAC-${String(facilityCount + 1).padStart(2, '0')}`

    const parsedCapacity =
      capacityKgMonth !== undefined && capacityKgMonth !== null && capacityKgMonth !== ''
        ? Number(capacityKgMonth)
        : null

    const newFac = await Facility.create({
      facilityId,
      name,
      facilityType: facilityType || 'RECYCLER',
      verificationStatus: verificationStatus || 'VERIFIED',
      licenceNumber: licenceNumber || null,
      registrationNumber: licenceNumber || `REG-${facilityId}`,
      licenceStatus: licenceNumber ? 'Active & Verified' : 'Unverified',
      location: location || 'Bangalore Industrial Corridor',
      coordinates: Array.isArray(coordinates) && coordinates.length === 2 ? coordinates : [12.9716, 77.5946],
      capacityKgMonth: parsedCapacity,
      currentLoadKg: 0,
      categoriesAccepted: Array.isArray(categoriesAccepted)
        ? categoriesAccepted
        : ['PCBs & Circuit Boards', 'Consumer Electronics'],
      contactEmail: contactEmail || '',
      rating: 'Certified Operator',
      dataSource: 'Manual Regulatory Registration',
      verifiedBy: req.user?.name || 'CPCB Auditor',
      lastVerifiedDate: new Date(),
    })

    await AuditEvent.create({
      eventType: 'FACILITY_ONBOARDED',
      organization: name,
      actor: req.user?.name || 'CPCB Regulator',
      details: { facilityId, licenceNumber, capacityKgMonth: parsedCapacity },
    })

    return res.status(201).json({
      success: true,
      message: `Facility ${name} (${facilityId}) registered successfully.`,
      data: newFac,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateFacility(req, res, next) {
  try {
    const { facilityId } = req.params
    const fac = await Facility.findOneAndUpdate({ facilityId }, req.body, { new: true })
    if (!fac) {
      return res.status(404).json({ success: false, message: 'Facility not found' })
    }

    return res.json({
      success: true,
      message: `Facility ${fac.name} updated successfully.`,
      data: fac,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Synchronize authentic Karnataka E-Waste Collection Centres from OpenCity KML
 */
export async function importPublicFacilities(req, res, next) {
  try {
    const actor = req.user?.name || req.body?.actor || 'CPCB / SPCB Authorized Auditor'
    const result = await importPublicKarnatakaFacilities(actor)
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * Public dataset metadata & CPCB integration notice
 */
export async function getPublicDatasetInfo(req, res, next) {
  try {
    return res.json({
      success: true,
      openCityDataset: {
        title: 'Karnataka - Waste Collection, Recycling and Processing Centres',
        datasetUrl: OPENCITY_DATASET_URL,
        resourceUrl: OPENCITY_KML_RESOURCE_URL,
        format: 'KML (Geospatial Placemarks)',
        license: 'Public Domain (Other-PD)',
        sourceAgency: 'Karnataka State Remote Sensing Applications Centre (KSRSAC) / KSPCB',
      },
      cpcbEprPortal: CPCB_PORTAL_METADATA,
    })
  } catch (err) {
    next(err)
  }
}
