import http from 'http'
import { app } from './app.js'
import { CONFIG } from './config/config.js'
import { connectDB, closeDB } from './config/db.js'
import { initBlockchain } from './services/blockchainService.js'
import { seedInitialDatabase } from './utils/seedData.js'

async function startServer() {
  console.log('='.repeat(65))
  console.log('  🌿  ECOTRACE INDUSTRIAL INTELLIGENCE & TRACEABILITY PLATFORM')
  console.log('  Backend Services Initializing...')
  console.log('='.repeat(65))

  // 1. Connect Database
  try {
    await connectDB()
    await seedInitialDatabase()
  } catch (err) {
    console.error('[Server] Database initialization failed:', err.message)
  }

  // 2. Initialize Blockchain Anchor
  try {
    await initBlockchain()
  } catch (err) {
    console.warn('[Server] Blockchain connection warning:', err.message)
  }

  // 3. Start HTTP Server
  const server = http.createServer(app)
  const PORT = CONFIG.PORT

  server.listen(PORT, () => {
    console.log(`[EcoTrace] Server active on port ${PORT} [Mode: ${CONFIG.NODE_ENV}]`)
    console.log(`[EcoTrace] Healthcheck URL: http://localhost:${PORT}/api/health`)
    console.log(`[EcoTrace] API Base URL:    http://localhost:${PORT}/api`)
    console.log('='.repeat(65))
  })

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`)
    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections()
    }
    server.close(async () => {
      console.log('[Server] HTTP connections closed.')
      try {
        await closeDB()
        console.log('[Server] Database connection closed.')
      } catch (err) {
        console.error('[Server] Error closing database:', err.message)
      }
      process.exit(0)
    })

    setTimeout(() => {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections()
      }
      console.error('[Server] Forcing shutdown after timeout.')
      process.exit(0)
    }, 5000)
  }

  // Keep event loop firmly alive in Windows background task runner
  const keepAlive = setInterval(() => {}, 1000 * 60 * 60)

  // Keep process alive in Windows background runner
  if (process.stdin.isTTY === false && typeof process.stdin.resume === 'function') {
    try {
      process.stdin.resume()
    } catch {
      // ignore
    }
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGBREAK', () => {
    // Windows background task detach sends SIGBREAK - do not exit
    console.log('[Server] Received SIGBREAK (ignoring to keep server alive in background).')
  })
  process.on('SIGHUP', () => {
    console.log('[Server] Received SIGHUP (ignoring to keep server alive in background).')
  })

  process.on('exit', (code) => {
    console.log(`[Server] Process exit event fired with code: ${code}`)
  })

  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err.stack || err.message || err)
  })

  process.on('unhandledRejection', (reason) => {
    console.error('[Server] Unhandled Promise Rejection:', reason)
  })
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err)
  process.exit(1)
})
