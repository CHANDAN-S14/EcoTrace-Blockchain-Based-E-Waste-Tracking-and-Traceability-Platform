import { connectDB, closeDB } from '../src/config/db.js'
import { Facility } from '../src/models/Facility.js'

async function check() {
  await connectDB()
  const indexes = await Facility.collection.indexes()
  console.log('Current Facility Indexes:', JSON.stringify(indexes, null, 2))
  await closeDB()
}

check()
