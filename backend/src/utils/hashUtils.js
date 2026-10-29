import crypto from 'crypto'
import fs from 'fs'
import { ethers } from 'ethers'

/**
 * Compute SHA-256 hex string with '0x' prefix (32 bytes = 66 chars with 0x)
 */
export function computeSha256(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data)
  const hash = crypto.createHash('sha256').update(content).digest('hex')
  return '0x' + hash.toLowerCase()
}

/**
 * Compute Ethereum Keccak-256 bytes32 hash
 */
export function computeKeccak256(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data)
  return ethers.keccak256(ethers.toUtf8Bytes(content)).toLowerCase()
}

/**
 * Normalize any 32-byte hash or bytes32 representation to standard '0x' lowercase 66-character string.
 * Strictly prevents double-hashing an already-computed 32-byte digest.
 */
export function normalizeBytes32(hashStr) {
  if (!hashStr || typeof hashStr !== 'string') {
    return ethers.ZeroHash
  }
  let clean = hashStr.trim()
  if (clean.startsWith('0x') || clean.startsWith('0X')) {
    clean = clean.slice(2)
  }
  // Exactly 64 valid hexadecimal characters (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return '0x' + clean.toLowerCase()
  }
  // If not a valid 32-byte hex string, hash the arbitrary text with keccak256
  return computeKeccak256(hashStr.trim())
}

/**
 * Strictly check whether two cryptographic digests are equivalent under 32-byte normalization
 */
export function areDigestsEqual(digestA, digestB) {
  if (!digestA || !digestB) return false
  const normA = normalizeBytes32(digestA)
  const normB = normalizeBytes32(digestB)
  if (normA === ethers.ZeroHash || normB === ethers.ZeroHash) return false
  return normA === normB
}

/**
 * Compute SHA-256 over raw file content (Buffer, file path on disk, or raw string)
 */
export function computeFileSha256(filePathOrBuffer) {
  if (!filePathOrBuffer) return null
  if (Buffer.isBuffer(filePathOrBuffer)) {
    return '0x' + crypto.createHash('sha256').update(filePathOrBuffer).digest('hex').toLowerCase()
  }
  if (typeof filePathOrBuffer === 'string' && fs.existsSync(filePathOrBuffer)) {
    try {
      const fileBuffer = fs.readFileSync(filePathOrBuffer)
      return '0x' + crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase()
    } catch {
      return null
    }
  }
  if (typeof filePathOrBuffer === 'string') {
    return computeSha256(filePathOrBuffer)
  }
  return null
}

/**
 * Shared deterministic canonical hashing strategy for batch intake evidence.
 * Derives a non-repudiable SHA-256 digest from canonical metadata and uploaded file signatures.
 * Pure and deterministic: no ephemeral timestamps or random salts.
 */
export function computeCanonicalEvidenceDigest({
  batchId,
  sourceOrg = '',
  grossWeight = 0,
  collectionFacility = '',
  collectionDate = '',
  evidenceFiles = [],
}) {
  const normBatchId = String(batchId || '').trim()
  const normSource = String(sourceOrg || '').trim()
  const normWeight = Number(grossWeight || 0).toFixed(2)
  const normFacility = String(collectionFacility || '').trim()

  let normDate = ''
  if (collectionDate) {
    try {
      normDate = new Date(collectionDate).toISOString().split('T')[0]
    } catch {
      normDate = String(collectionDate).trim()
    }
  }

  const sortedFiles = Array.isArray(evidenceFiles) ? [...evidenceFiles] : []
  sortedFiles.sort((a, b) =>
    String(a.name || a.filename || '').localeCompare(String(b.name || b.filename || ''))
  )

  const fileSignatures = sortedFiles
    .map((f) => `${f.name || f.filename || 'unnamed'}:${f.size || 0}:${f.sha256 || f.hash || ''}`)
    .join(',')

  const canonicalPayload = `${normBatchId}|${normSource}|${normWeight}|${normFacility}|${normDate}|${fileSignatures}`
  return computeSha256(canonicalPayload)
}

/**
 * Compute chaining integrity hash for a custody handover event
 */
export function computeCustodyEventHash({
  batchId,
  sender,
  receiver,
  dispatchWeight,
  receivedWeight,
  timestamp,
  previousEventHash,
}) {
  const canonicalString = `${batchId}|${sender}|${receiver}|${dispatchWeight}|${receivedWeight}|${timestamp}|${previousEventHash || 'GENESIS'}`
  return computeSha256(canonicalString)
}

/**
 * Generate standardized Batch Consignment ID
 */
export function generateBatchId(seq) {
  const year = new Date().getFullYear()
  if (seq !== undefined && seq !== null) {
    return `EW-${year}-${String(seq).padStart(5, '0')}`
  }
  const random = Math.floor(10000 + Math.random() * 90000)
  return `EW-${year}-${random}`
}
