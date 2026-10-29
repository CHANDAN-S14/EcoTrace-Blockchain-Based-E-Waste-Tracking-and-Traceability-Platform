import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const LOGS_DIR = path.resolve(__dirname, '../../logs')
export const LOG_FILE = path.join(LOGS_DIR, 'qpi-ai-opt.txt')

/**
 * Ensures the logs directory exists safely.
 */
function ensureLogsDir() {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true })
    }
  } catch (err) {
    console.error('[QpiLogger] Failed to create logs directory (non-fatal):', err.message)
  }
}

/**
 * Sanitizes messages to prevent credentials, secrets, and raw tokens from appearing in logs.
 */
export function sanitizeLogMessage(msg) {
  if (msg === null || msg === undefined) return ''
  let text = typeof msg === 'string' ? msg : String(msg)

  // Sanitize JWT bearer tokens
  text = text.replace(/Bearer\s+ey[a-zA-Z0-9_\-\.]+/gi, 'Bearer [MASKED_JWT]')
  // Sanitize X-Secret-Token headers
  text = text.replace(/X-Secret-Token:\s*[a-zA-Z0-9_\-]+/gi, 'X-Secret-Token: [MASKED_TOKEN]')
  // Sanitize sensitive env key patterns
  text = text.replace(/((?:api[_-]?key|secret|password|private[_-]?key)\s*[:=]\s*['"]?)[^'"\s,]+/gi, '$1***')
  // Sanitize RPC URLs containing secrets / keys
  text = text.replace(/https?:\/\/[^/]*alchemy\.com\/v2\/[a-zA-Z0-9_\-]+/gi, 'https://eth-sepolia.g.alchemy.com/v2/***')
  text = text.replace(/https?:\/\/[^/]*infura\.io\/v3\/[a-zA-Z0-9_\-]+/gi, 'https://sepolia.infura.io/v3/***')

  return text
}

/**
 * Appends a sanitized line or block to the log file safely without throwing exceptions.
 */
function appendToFile(content) {
  try {
    ensureLogsDir()
    fs.appendFileSync(LOG_FILE, sanitizeLogMessage(content) + '\n', 'utf8')
  } catch (err) {
    // Non-fatal: Never allow disk write issues to crash the dispatch service
    console.warn('[QpiLogger] Safe file append warning (non-fatal):', err.message)
  }
}

/**
 * QpiAI Opt Execution Logger
 * Synchronously writes execution logs to the terminal and appends to backend/logs/qpi-ai-opt.txt.
 */
export const qpiLogger = {
  /**
   * Appends a generic or raw log line to terminal and log file.
   */
  log(message) {
    const sanitized = sanitizeLogMessage(message)
    console.log(sanitized)
    appendToFile(sanitized)
  },

  /**
   * Logs a standard operational lifecycle stage matching QpiAI Opt format:
   * [YYYY-MM-DDTHH:mm:ss.sssZ] [QPI AI OPT] <stageMsg>
   */
  stage(stageMsg) {
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] [QPI AI OPT] ${sanitizeLogMessage(stageMsg)}`
    console.log(line)
    appendToFile(line)
  },

  /**
   * Logs an informational message with timestamp.
   */
  info(message) {
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] [INFO] [QPI AI OPT] ${sanitizeLogMessage(message)}`
    console.log(line)
    appendToFile(line)
  },

  /**
   * Logs a warning message with timestamp.
   */
  warn(message) {
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] [WARN] [QPI AI OPT] ${sanitizeLogMessage(message)}`
    console.warn(line)
    appendToFile(line)
  },

  /**
   * Logs an error message with optional stack trace.
   */
  error(message, error = null) {
    const timestamp = new Date().toISOString()
    let errDetails = ''
    if (error) {
      errDetails = error.stack
        ? `\nDetails: ${error.stack}`
        : `\nDetails: ${error.message || String(error)}`
    }
    const line = `[${timestamp}] [ERROR] [QPI AI OPT] ${sanitizeLogMessage(message)}${sanitizeLogMessage(errDetails)}`
    console.error(line)
    appendToFile(line)
  },

  /**
   * Logs a prominent visual banner/header with clear separators.
   */
  header(title = 'ECOTRACE | QPIAI OPT DISPATCH') {
    const separator = '============================================================'
    const padding = Math.max(0, Math.floor((separator.length - title.length) / 2))
    const centeredTitle = ' '.repeat(padding) + title
    const block = [
      '',
      separator,
      centeredTitle,
      separator,
    ].join('\n')
    console.log(block)
    appendToFile(block)
  },

  /**
   * Logs a section separator line.
   */
  separator(char = '=', length = 60) {
    const sep = char.repeat(length)
    console.log(sep)
    appendToFile(sep)
  },

  /**
   * Logs multi-line formatted text blocks (e.g. detailed terminal sections).
   */
  raw(content) {
    const sanitized = sanitizeLogMessage(content)
    console.log(sanitized)
    appendToFile(sanitized)
  },

  /**
   * Logs multi-line formatted error blocks to stderr and log file.
   */
  rawError(content) {
    const sanitized = sanitizeLogMessage(content)
    console.error(sanitized)
    appendToFile(sanitized)
  },

  /**
   * Returns the absolute file path of the log file.
   */
  getLogFilePath() {
    return LOG_FILE
  },

  /**
   * Reads all existing log file content safely.
   */
  readLogs() {
    try {
      if (fs.existsSync(LOG_FILE)) {
        return fs.readFileSync(LOG_FILE, 'utf8')
      }
      return ''
    } catch (err) {
      console.warn('[QpiLogger] Failed to read log file (non-fatal):', err.message)
      return ''
    }
  },

  /**
   * Clears the log file safely (primarily used for test resets).
   */
  clearLogs() {
    try {
      ensureLogsDir()
      fs.writeFileSync(LOG_FILE, '', 'utf8')
    } catch (err) {
      console.warn('[QpiLogger] Failed to clear log file (non-fatal):', err.message)
    }
  },
}

export default qpiLogger
