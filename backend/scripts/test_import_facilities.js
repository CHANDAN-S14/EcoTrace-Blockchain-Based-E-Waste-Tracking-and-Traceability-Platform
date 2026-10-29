import { connectDB, closeDB } from '../src/config/db.js'
import { Facility } from '../src/models/Facility.js'
import { importPublicKarnatakaFacilities } from '../src/services/publicFacilityService.js'

async function run() {
  await connectDB()
  console.log('--- Initial Facilities Count ---')
  const initialCount = await Facility.countDocuments()
  console.log('Facilities count before import:', initialCount)

  console.log('\n--- Importing Public Karnataka Dataset ---')
  const result1 = await importPublicKarnatakaFacilities('Test Auditor')
  console.log('Import 1 Result:', {
    source: result1.source,
    totalRecords: result1.totalRecords,
    inserted: result1.inserted,
    updated: result1.updated,
  })

  const countAfter1 = await Facility.countDocuments()
  console.log('Facilities count after first import:', countAfter1)

  console.log('\n--- Running Idempotent Duplicate Import Test ---')
  const result2 = await importPublicKarnatakaFacilities('Test Auditor')
  console.log('Import 2 Result:', {
    source: result2.source,
    totalRecords: result2.totalRecords,
    inserted: result2.inserted,
    updated: result2.updated,
  })

  const countAfter2 = await Facility.countDocuments()
  console.log('Facilities count after second import:', countAfter2)
  if (countAfter1 === countAfter2 && result2.inserted === 0 && result2.updated === 13) {
    console.log(' SUCCESS: Deduplication verified! 0 duplicate facilities created.')
  } else {
    console.error('❌ FAILURE: Duplication detected!', { countAfter1, countAfter2 })
  }

  const sample = await Facility.findOne({ sourceId: { $ne: null } }).lean()
  console.log('\nSample Imported Facility:\n', JSON.stringify(sample, null, 2))

  await closeDB()
}

run().catch(console.error)
