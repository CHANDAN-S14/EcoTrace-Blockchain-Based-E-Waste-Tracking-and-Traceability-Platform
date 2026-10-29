import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

import { CONFIG } from './config/config.js'
import { isDbConnected } from './config/db.js'
import { getBlockchainStatus } from './services/blockchainService.js'
import { getQCloudStatus } from './services/quantumService.js'
import { Facility } from './models/Facility.js'

import authRoutes from './routes/authRoutes.js'
import batchRoutes from './routes/batchRoutes.js'
import custodyRoutes from './routes/custodyRoutes.js'
import recoveryRoutes from './routes/recoveryRoutes.js'
import claimRoutes from './routes/claimRoutes.js'
import optimizationRoutes from './routes/optimizationRoutes.js'
import quantumRoutes from './routes/quantumRoutes.js'
import blockchainRoutes from './routes/blockchainRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import facilityRoutes from './routes/facilityRoutes.js'
import userRoutes from './routes/userRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.resolve(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

export const app = express()

// 1. Security & Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  CONFIG.FRONTEND_URL,
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(null, true) // Permissive for local development & evaluation
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  })
)

if (CONFIG.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// Serve static upload artifacts
app.use('/uploads', express.static(uploadsDir))

// 2. Health & Diagnostics Endpoints
const healthHandler = (req, res) => {
  const dbUp = isDbConnected()
  const bcStatus = getBlockchainStatus()
  const qStatus = getQCloudStatus()

  res.json({
    status: dbUp ? 'healthy' : 'degraded',
    service: 'EcoTrace Industrial Intelligence API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbUp,
      status: dbUp ? 'Connected to MongoDB Atlas / Local Daemon' : 'Disconnected / Standby',
    },
    blockchain: bcStatus,
    quantum: qStatus,
    optimization: {
      solver: CONFIG.QPIAI_OPT.API_KEY ? 'QpiAI Opt Cloud Engine' : 'Deterministic Classical Linear Optimizer (Greedy/MILP)',
      configured: Boolean(CONFIG.QPIAI_OPT.API_KEY),
    },
  })
}

app.get('/health', healthHandler)
app.get('/api/health', healthHandler)

// 3. API Route Registration
app.use('/api/auth', authRoutes)
app.use('/api/batches', batchRoutes)
app.use('/api/custody', custodyRoutes)
app.use('/api/handovers', custodyRoutes) // Alias for direct handover actions
app.use('/api/recovery', recoveryRoutes)
app.use('/api/claims', claimRoutes)
app.use('/api/optimization', optimizationRoutes)
app.use('/api/dispatch', optimizationRoutes) // Alias for Smart Dispatch
app.use('/api/quantum', quantumRoutes)
app.use('/api/blockchain', blockchainRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/facilities', facilityRoutes)
app.use('/api/users', userRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/upload', uploadRoutes)

// 4. Fallback 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  })
})

// 5. Centralized Error Handling
app.use(errorHandler)

export default app
