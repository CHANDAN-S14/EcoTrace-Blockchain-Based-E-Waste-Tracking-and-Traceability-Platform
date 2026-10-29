/**
 * Cryptographic Hash utilities for Blockchain Evidence & Verification
 */

export async function computeSHA256(message) {
  try {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback pseudo-hash
    let hash = 0
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0')
  }
}

export function generateBatchId() {
  const year = new Date().getFullYear()
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `BATCH-${year}-${randomNum}`
}

export function generateTxHash() {
  const chars = '0123456789abcdef'
  let result = '0x'
  for (let i = 0; i < 64; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}
