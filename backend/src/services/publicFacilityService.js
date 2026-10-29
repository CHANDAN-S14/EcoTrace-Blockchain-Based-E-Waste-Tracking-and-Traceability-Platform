import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Facility } from '../models/Facility.js'
import { AuditEvent } from '../models/AuditEvent.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const OPENCITY_DATASET_URL =
  'https://data.opencity.in/dataset/karnataka-waste-collection-recycling-and-processing-centres'
export const OPENCITY_KML_RESOURCE_URL =
  'https://data.opencity.in/dataset/51aa4fcb-a82b-4174-a6ea-419db3ab5575/resource/2bf27ea0-ffd5-4b33-952f-8ff07a893e7a/download/55fde997-260d-46a6-9e89-6a3d198cd11b.kml'

export const CPCB_PORTAL_METADATA = {
  portalName: 'CPCB E-Waste Management System (EPR Portal)',
  portalUrl: 'https://eprewaste.cpcb.gov.in/',
  hasOpenPublicAPI: false,
  accessType: 'Protected Regulatory Portal (Requires Captcha & Authenticated Session)',
  compliancePolicy:
    'Adheres strictly to regulatory IT guidelines: no unauthorized scraping or session hijacking. Recycler verification is handled via certified regulatory manifests and authorized auditor verification.',
}

/**
 * Fetch the KML content from the live OpenCity published URL,
 * with deterministic fallback to the validated local dataset file.
 */
export async function fetchKarnatakaKML() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const res = await fetch(OPENCITY_KML_RESOURCE_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EcoTrace-Industrial-Agent/1.0' },
    })
    clearTimeout(timeout)

    if (res.ok) {
      const text = await res.text()
      if (text.includes('<kml') && text.includes('ka_ewaste_collection_centres')) {
        return { text, source: 'LIVE_OPENCITY_API' }
      }
    }
  } catch (err) {
    console.warn('[PublicFacilityService] Live OpenCity fetch notice:', err.message)
  }

  // Fallback to verified local copy
  const localPath = path.resolve(__dirname, '../data/karnataka_ewaste_collection_centres.kml')
  if (fs.existsSync(localPath)) {
    const text = fs.readFileSync(localPath, 'utf8')
    return { text, source: 'LOCAL_DATASET_CACHE' }
  }

  throw new Error('Unable to retrieve Karnataka E-Waste Collection Centres KML resource.')
}

/**
 * Parse Placemark entries from Karnataka Collection Centres KML
 */
export function parseKMLPlacemarks(kmlText) {
  const placemarks = []
  const matches = [...kmlText.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)]

  for (const m of matches) {
    const raw = m[1]

    const getField = (name) => {
      const re = new RegExp(`<SimpleData name="${name}">([^<]+)<\\/SimpleData>`)
      const match = raw.match(re)
      return match ? match[1].trim() : null
    }

    const objectid = getField('OBJECTID')
    const kgisCode = getField('KGISCode')
    const deptCode = getField('DepartmentCode')
    const kgisEwccId = getField('KGISEWCCID')
    const ewccName = getField('EWCCName')
    const villageId = getField('KGISVillageID')
    const wardId = getField('KGISWardID')

    // Parse coordinates <coordinates>lng,lat</coordinates>
    let coordinates = [12.9716, 77.5946]
    const coordsMatch = raw.match(/<coordinates>([^<]+)<\/coordinates>/)
    if (coordsMatch) {
      const [lngStr, latStr] = coordsMatch[1].trim().split(',')
      const lng = parseFloat(lngStr)
      const lat = parseFloat(latStr)
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates = [lat, lng]
      }
    }

    if (ewccName && (kgisCode || objectid)) {
      placemarks.push({
        objectid: objectid || String(placemarks.length + 1),
        kgisCode: kgisCode || `KGIS-${objectid}`,
        deptCode,
        kgisEwccId,
        name: ewccName,
        villageId,
        wardId,
        coordinates,
      })
    }
  }

  return placemarks
}

/**
 * Infer city/district location cleanly from facility name
 */
function inferLocation(name) {
  if (!name) return 'Karnataka, India'
  if (/bengaluru rural/i.test(name)) return 'Bengaluru Rural, Karnataka'
  if (/bengaluru|bangalore/i.test(name)) return 'Bengaluru, Karnataka'
  if (/belagavi|belgaum/i.test(name)) return 'Belagavi, Karnataka'
  if (/haveri/i.test(name)) return 'Haveri, Karnataka'
  if (/mysore|mysuru/i.test(name)) return 'Mysuru, Karnataka'
  if (/hubli|dharwad/i.test(name)) return 'Hubballi-Dharwad, Karnataka'
  return 'Karnataka, India'
}

/**
 * Import and synchronize public Karnataka e-waste collection centre records into MongoDB
 */
export async function importPublicKarnatakaFacilities(actor = 'System Auditor') {
  const { text: kmlText, source } = await fetchKarnatakaKML()
  const rawRecords = parseKMLPlacemarks(kmlText)

  if (rawRecords.length === 0) {
    throw new Error('No valid collection centre records found in the KML resource.')
  }

  let insertedCount = 0
  let updatedCount = 0
  const processedRecords = []

  const now = new Date()

  for (const raw of rawRecords) {
    const facilityId = `FAC-KSPCB-${String(raw.objectid).padStart(4, '0')}`
    const location = inferLocation(raw.name)

    // Deduplication check: by sourceId (KGISCode) or facilityId
    const existing = await Facility.findOne({
      $or: [
        { sourceId: raw.kgisCode },
        { registrationNumber: raw.kgisCode },
        { facilityId },
      ],
    })

    if (existing) {
      // Update existing record safely without overriding verified auditor details
      existing.name = raw.name
      existing.location = location
      existing.coordinates = raw.coordinates
      existing.lastSyncedAt = now
      existing.dataSource = 'OpenCity / KSPCB (KSRSAC)'
      existing.sourceUrl = OPENCITY_DATASET_URL
      existing.sourceId = raw.kgisCode
      existing.registrationNumber = raw.kgisCode
      existing.facilityType = existing.facilityType || 'COLLECTION_CENTRE'
      // Preserve capacity and licence status if already verified by auditor, otherwise keep unverified
      if (!existing.verificationStatus) {
        existing.verificationStatus = 'UNVERIFIED'
      }
      existing.metadata = {
        objectId: raw.objectid,
        departmentCode: raw.deptCode,
        villageId: raw.villageId,
        wardId: raw.wardId,
        rawKgisCode: raw.kgisCode,
      }
      await existing.save()
      updatedCount++
      processedRecords.push(existing)
    } else {
      // Insert new public collection centre
      const newFac = await Facility.create({
        facilityId,
        name: raw.name,
        facilityType: 'COLLECTION_CENTRE',
        verificationStatus: 'UNVERIFIED',
        registrationNumber: raw.kgisCode,
        licenceNumber: null, // Null - not an industrial smelting/recycler licence
        licenceStatus: 'Unverified',
        location,
        coordinates: raw.coordinates,
        capacityKgMonth: null, // Do not invent capacity
        currentLoadKg: 0,
        categoriesAccepted: ['E-Waste Collection', 'Consumer Electronics'],
        rating: 'Public Collection Centre',
        contactEmail: '',
        dataSource: 'OpenCity / KSPCB (KSRSAC)',
        sourceId: raw.kgisCode,
        sourceUrl: OPENCITY_DATASET_URL,
        importedAt: now,
        lastSyncedAt: now,
        metadata: {
          objectId: raw.objectid,
          departmentCode: raw.deptCode,
          villageId: raw.villageId,
          wardId: raw.wardId,
          rawKgisCode: raw.kgisCode,
        },
      })
      insertedCount++
      processedRecords.push(newFac)
    }
  }

  // Audit event trail
  await AuditEvent.create({
    eventType: 'PUBLIC_FACILITIES_IMPORTED',
    organization: 'Karnataka State Pollution Control Board',
    actor,
    details: {
      source,
      sourceUrl: OPENCITY_DATASET_URL,
      kmlResourceUrl: OPENCITY_KML_RESOURCE_URL,
      totalParsed: rawRecords.length,
      inserted: insertedCount,
      updated: updatedCount,
    },
  })

  return {
    success: true,
    source,
    sourceName: 'Karnataka State Pollution Control Board (KSPCB) / OpenCity (KSRSAC)',
    datasetUrl: OPENCITY_DATASET_URL,
    totalRecords: rawRecords.length,
    inserted: insertedCount,
    updated: updatedCount,
    duplicatePrevention: 'Idempotent key matching on KGISCode and OBJECTID',
    regulatoryNotice:
      'Public collection centres are mapped intake hubs. Because public datasets do not establish certified processing capacity or industrial recycling authorizations, imported centres are recorded with verificationStatus: UNVERIFIED and capacity: null. Metallurgical recycling requires verified CPCB/SPCB consent.',
    cpcbPortalStatus: CPCB_PORTAL_METADATA,
    facilities: processedRecords,
  }
}
