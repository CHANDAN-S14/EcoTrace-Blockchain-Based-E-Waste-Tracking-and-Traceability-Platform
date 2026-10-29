import mongoose from 'mongoose'
import { CONFIG } from './config.js'

let isConnected = false

export async function connectDB() {
  if (isConnected) return mongoose.connection

  try {
    const conn = await mongoose.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    })

    isConnected = true
    console.log(`[MongoDB] Connected to database: ${conn.connection.name} @ ${conn.connection.host}:${conn.connection.port}`)
    return conn
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`)
    console.warn(`[MongoDB] Note: Operating in degraded offline-DB state if Mongo is unreachable.`)
    isConnected = false
    return null
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1
}

export async function closeDB() {
  if (isConnected) {
    await mongoose.connection.close()
    isConnected = false
  }
}
