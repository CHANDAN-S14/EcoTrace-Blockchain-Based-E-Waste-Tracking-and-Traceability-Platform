import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import {
  computeSha256,
  computeKeccak256,
  normalizeBytes32,
  areDigestsEqual,
  computeFileSha256,
  computeCanonicalEvidenceDigest,
  generateBatchId,
} from '../src/utils/hashUtils.js'
import { verifyEvidenceOnChain, initBlockchain } from '../src/services/blockchainService.js'

describe('EcoTrace Canonical Evidence Digest Protocol', () => {
  const sampleConsignment = {
    batchId: 'EW-2026-00099',
    sourceOrg: 'EcoRecycle Karnataka Hub',
    grossWeight: 1250.5,
    collectionFacility: 'Peenya Sorting Center',
    collectionDate: '2026-10-30',
    evidenceFiles: [
      { name: 'weighbridge_slip.pdf', size: 1048576, sha256: '0xaaaa111122223333444455556666777788889999aaaabbbbccccddddeeeeffff' },
      { name: 'consignment_photo.jpg', size: 2097152, sha256: '0xbbbb111122223333444455556666777788889999aaaabbbbccccddddeeeeffff' },
    ],
  }

  it('Requirement 1: Exact same consignment metadata and files produce 100% identical deterministic digests across multiple runs', () => {
    const digestA = computeCanonicalEvidenceDigest(sampleConsignment)
    const digestB = computeCanonicalEvidenceDigest(sampleConsignment)
    const digestC = computeCanonicalEvidenceDigest({ ...sampleConsignment })

    assert.equal(digestA, digestB)
    assert.equal(digestA, digestC)
    assert.match(digestA, /^0x[0-9a-f]{64}$/, 'Must be a 66-character lowercase hex string with 0x prefix')
  })

  it('Requirement 2: Changing 1 byte of a file or 0.1 kg of consignment weight changes digest completely', () => {
    const originalDigest = computeCanonicalEvidenceDigest(sampleConsignment)

    // Alter weight by 0.1 kg
    const alteredWeightConsignment = {
      ...sampleConsignment,
      grossWeight: 1250.6,
    }
    const alteredWeightDigest = computeCanonicalEvidenceDigest(alteredWeightConsignment)
    assert.notEqual(originalDigest, alteredWeightDigest, 'Changing gross weight must alter the evidence digest')

    // Alter 1 byte of file signature
    const alteredFileConsignment = {
      ...sampleConsignment,
      evidenceFiles: [
        { name: 'weighbridge_slip.pdf', size: 1048577, sha256: '0xaaaa111122223333444455556666777788889999aaaabbbbccccddddeeeeffff' },
        sampleConsignment.evidenceFiles[1],
      ],
    }
    const alteredFileDigest = computeCanonicalEvidenceDigest(alteredFileConsignment)
    assert.notEqual(originalDigest, alteredFileDigest, 'Modifying file size or byte checksum must alter the evidence digest')
  })

  it('Requirement 3: Different file array ordering produces identical canonical digest (order-independent protocol)', () => {
    const reorderedConsignment = {
      ...sampleConsignment,
      evidenceFiles: [
        sampleConsignment.evidenceFiles[1],
        sampleConsignment.evidenceFiles[0],
      ],
    }
    const originalDigest = computeCanonicalEvidenceDigest(sampleConsignment)
    const reorderedDigest = computeCanonicalEvidenceDigest(reorderedConsignment)

    assert.equal(originalDigest, reorderedDigest, 'Alphabetical canonical sorting must make digest independent of file upload order')
  })

  it('Requirement 4: normalizeBytes32 handles prefixes, casing, and prevents double-hashing', () => {
    const rawSha256 = '16c3376e8029d51e043039b08f2f0fc526d2ff3028cb5ce2aaf8f316846f75e9'
    const withLower0x = '0x' + rawSha256
    const withUpper0X = '0X' + rawSha256.toUpperCase()
    const allUpperNoPrefix = rawSha256.toUpperCase()

    const norm1 = normalizeBytes32(withLower0x)
    const norm2 = normalizeBytes32(withUpper0X)
    const norm3 = normalizeBytes32(allUpperNoPrefix)
    const norm4 = normalizeBytes32(rawSha256)

    assert.equal(norm1, withLower0x.toLowerCase())
    assert.equal(norm2, withLower0x.toLowerCase())
    assert.equal(norm3, withLower0x.toLowerCase())
    assert.equal(norm4, withLower0x.toLowerCase())

    // Crucial: Must NOT hash an existing 32-byte digest again with keccak256
    assert.notEqual(norm1, computeKeccak256(norm1))
  })

  it('Requirement 5: areDigestsEqual strictly verifies equality and rejects mismatches', () => {
    const hashA = '0x16c3376e8029d51e043039b08f2f0fc526d2ff3028cb5ce2aaf8f316846f75e9'
    const hashAUpper = '0X16C3376E8029D51E043039B08F2F0FC526D2FF3028CB5CE2AAF8F316846F75E9'
    const hashB = '0x32d668bec04e49e61579b8d9c18d4b6bc47316a28916e3cc6c93aeb0135b0eb3'

    assert.equal(areDigestsEqual(hashA, hashAUpper), true, 'Case-insensitive byte match must succeed')
    assert.equal(areDigestsEqual(hashA, hashB), false, 'Different digests must strictly return false')
    assert.equal(areDigestsEqual(hashA, null), false, 'Null comparison must fail safely')
    assert.equal(areDigestsEqual(hashA, ''), false, 'Empty comparison must fail safely')
  })

  it('Requirement 6: computeFileSha256 produces valid SHA-256 over raw buffers and text', () => {
    const testBuffer = Buffer.from('EcoTrace CPCB Compliance File 2026')
    const fileHash = computeFileSha256(testBuffer)
    const expected = '0x' + crypto.createHash('sha256').update(testBuffer).digest('hex')

    assert.equal(fileHash, expected)
    assert.equal(fileHash.length, 66)
  })

  it('Requirement 7: Live Sepolia verification of matching consignment EW-2026-00009 succeeds', async () => {
    await initBlockchain()
    const knownOnChainHash = '0x2b2f55edee77560b2cdb32a67f682c8590cf50df2facf15933b54df6cbc07108'
    const result = await verifyEvidenceOnChain('EW-2026-00009', knownOnChainHash)

    assert.equal(result.existsOnChain, true)
    assert.equal(result.verified, true)
    assert.equal(result.chainId, 11155111)
    assert.equal(result.network, 'Ethereum Sepolia')
    assert.match(result.message, /successfully verified/i)
  })

  it('Requirement 8: Live Sepolia verification of EW-2026-00003 strictly detects digest mismatch without falsifying records', async () => {
    await initBlockchain()
    const localHash = '0x16c3376e8029d51e043039b08f2f0fc526d2ff3028cb5ce2aaf8f316846f75e9'
    const result = await verifyEvidenceOnChain('EW-2026-00003', localHash)

    assert.equal(result.existsOnChain, true)
    assert.equal(result.verified, false, 'Must strictly return verified: false on mismatch')
    assert.equal(result.localEvidenceHash, localHash)
    assert.equal(result.onChainEvidenceHash, '0x32d668bec04e49e61579b8d9c18d4b6bc47316a28916e3cc6c93aeb0135b0eb3')
    assert.match(result.message, /Evidence digest mismatch/i)
    assert.ok(result.mismatchReason, 'Must provide detailed audit explanation for the mismatch')
  })
})
