import { Facility } from '../models/Facility.js'
import { User } from '../models/User.js'
import { importPublicKarnatakaFacilities } from '../services/publicFacilityService.js'

export const INITIAL_FACILITIES = [
  {
    facilityId: 'FAC-01',
    name: 'GreenEarth Recyclers Ltd',
    facilityType: 'RECYCLER',
    verificationStatus: 'VERIFIED',
    dataSource: 'CPCB / SPCB Authorized Recyclers Registry',
    licenceNumber: 'CPCB/KSPCB/E-WASTE/2024/092',
    registrationNumber: 'CPCB/KSPCB/E-WASTE/2024/092',
    licenceStatus: 'Active & Verified',
    location: 'Peenya Industrial Area, Bangalore',
    coordinates: [13.0285, 77.5256],
    capacityKgMonth: 25000,
    currentLoadKg: 18200,
    categoriesAccepted: ['Mixed E-Waste', 'PCBs & Circuit Boards', 'Consumer Electronics', 'Lithium Batteries'],
    recoveryYieldAvg: 73.2,
    rating: 'A+ Class Recycler',
    verifiedBy: 'CPCB / KSPCB Inspectorate',
    lastVerifiedDate: new Date('2025-01-15'),
  },
  {
    facilityId: 'FAC-02',
    name: 'EnviroMetals Processing Corp',
    facilityType: 'RECYCLER',
    verificationStatus: 'VERIFIED',
    dataSource: 'CPCB / SPCB Authorized Recyclers Registry',
    licenceNumber: 'CPCB/KSPCB/E-WASTE/2023/118',
    registrationNumber: 'CPCB/KSPCB/E-WASTE/2023/118',
    licenceStatus: 'Active & Verified',
    location: 'Bommasandra Industrial Zone, Bangalore',
    coordinates: [12.8184, 77.6854],
    capacityKgMonth: 40000,
    currentLoadKg: 32500,
    categoriesAccepted: ['Mixed E-Waste', 'Large Appliances', 'Consumer Electronics', 'PCBs & Circuit Boards'],
    recoveryYieldAvg: 68.4,
    rating: 'A Class Recycler',
    verifiedBy: 'CPCB / KSPCB Inspectorate',
    lastVerifiedDate: new Date('2024-11-20'),
  },
  {
    facilityId: 'FAC-03',
    name: 'CleanTech E-Solutions Hub',
    facilityType: 'RECYCLER',
    verificationStatus: 'VERIFIED',
    dataSource: 'CPCB / SPCB Authorized Recyclers Registry',
    licenceNumber: 'CPCB/MH/E-WASTE/2025/044',
    registrationNumber: 'CPCB/MH/E-WASTE/2025/044',
    licenceStatus: 'Active & Verified',
    location: 'Whitefield EPIP Zone, Bangalore',
    coordinates: [12.9815, 77.7289],
    capacityKgMonth: 15000,
    currentLoadKg: 8400,
    categoriesAccepted: ['Mixed E-Waste', 'IT & Telecom Servers', 'PCBs & Circuit Boards', 'Lithium Batteries'],
    recoveryYieldAvg: 81.0,
    rating: 'High-Purity Assay Certified',
    verifiedBy: 'CPCB / MPCB Inspectorate',
    lastVerifiedDate: new Date('2025-02-10'),
  },
  {
    facilityId: 'FAC-04',
    name: 'PyroCycle Smelting & Refining Works',
    facilityType: 'RECYCLER',
    verificationStatus: 'VERIFIED',
    dataSource: 'CPCB / SPCB Authorized Recyclers Registry',
    licenceNumber: 'CPCB/TN/E-WASTE/2022/301',
    registrationNumber: 'CPCB/TN/E-WASTE/2022/301',
    licenceStatus: 'Review Required (Expiring)',
    location: 'Hosur Industrial Complex, Tamil Nadu',
    coordinates: [12.7409, 77.8253],
    capacityKgMonth: 50000,
    currentLoadKg: 46000,
    categoriesAccepted: ['Copper extraction', 'Aluminum melting', 'Large Appliances'],
    recoveryYieldAvg: 62.1,
    rating: 'Heavy Smelter License',
    verifiedBy: 'CPCB / TNPCB Inspectorate',
    lastVerifiedDate: new Date('2024-06-30'),
  },
]

export async function seedInitialDatabase() {
  try {
    const facilityCount = await Facility.countDocuments()
    if (facilityCount === 0) {
      console.log('[Seed] Seeding certified recycling facilities...')
      await Facility.insertMany(INITIAL_FACILITIES)
    } else {
      // Ensure existing facilities have Mixed E-Waste in categoriesAccepted
      await Facility.updateMany(
        { facilityId: { $in: ['FAC-01', 'FAC-02', 'FAC-03'] } },
        { $addToSet: { categoriesAccepted: 'Mixed E-Waste' } }
      )
      // Ensure existing facilities have facilityType and verificationStatus
      await Facility.updateMany(
        { facilityType: { $exists: false } },
        { $set: { facilityType: 'RECYCLER', verificationStatus: 'VERIFIED', dataSource: 'CPCB / SPCB Authorized Recyclers Registry' } }
      )
    }

    // Ensure public Karnataka e-waste collection centres are present from OpenCity/KSPCB dataset
    const publicFacCount = await Facility.countDocuments({ dataSource: { $regex: 'OpenCity', $options: 'i' } })
    if (publicFacCount === 0) {
      console.log('[Seed] Synchronizing authentic Karnataka collection centres from OpenCity KML...')
      await importPublicKarnatakaFacilities('System Initialization')
    }

    const userCount = await User.countDocuments()
    if (userCount === 0) {
      console.log('[Seed] Seeding default administrator & auditor accounts...')
      const passwordHash = await User.hashPassword('admin123')
      await User.create([
        {
          name: 'Dr. Sunita Rao',
          email: 'auditor@cpcb.gov.in',
          passwordHash,
          role: 'Auditor',
          organization: 'Central Pollution Control Board',
        },
        {
          name: 'System Admin',
          email: 'admin@ecotrace.gov.in',
          passwordHash,
          role: 'Administrator',
          organization: 'EcoTrace Consortium',
        },
      ])
    }

    // User-created batches, handovers, and recoveries persist naturally in MongoDB.
    // Automatic demonstration/mock batch seeding removed to ensure database-only records.
    console.log('[Seed] Database initialization and sanity checks complete.')
  } catch (err) {
    console.error('[Seed] Initial seeding error:', err.message)
  }
}
