import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { ethers } from 'ethers'
import {
  initBlockchain,
  getBlockchainStatus,
  getLiveBlockchainStatus,
  verifyEvidenceOnChain,
  sanitizeRpcUrl,
  validateContractABI,
} from '../src/services/blockchainService.js'
import { CONFIG } from '../src/config/config.js'

describe('EcoTrace Blockchain Connectivity, Network Integrity & Verification Suite', () => {
  const originalRpcUrl = CONFIG.BLOCKCHAIN.RPC_URL
  const originalChainId = CONFIG.BLOCKCHAIN.CHAIN_ID
  const originalContractAddress = CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS

  before(async () => {
    await initBlockchain()
  })

  after(async () => {
    CONFIG.BLOCKCHAIN.RPC_URL = originalRpcUrl
    CONFIG.BLOCKCHAIN.CHAIN_ID = originalChainId
    CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS = originalContractAddress
    await initBlockchain()
  })

  // 1. Live RPC & Sepolia Chain ID Validation
  describe('1. Ethereum Sepolia RPC & Chain ID Validation', () => {
    it('Live RPC responds with expected Sepolia chain ID 11155111', async () => {
      const status = await getLiveBlockchainStatus()
      assert.equal(typeof status.connected, 'boolean')
      if (status.connected) {
        assert.equal(status.chainId, 11155111, 'Live Sepolia chain ID must equal 11155111')
        assert.equal(status.isSepolia, true)
        assert.match(status.network, /Sepolia/i)
      }
    })

    it('Sanitizes RPC URLs to ensure API keys or credentials are not exposed in logs or status', () => {
      const testAlchemyUrl = 'https://eth-sepolia.g.alchemy.com/v2/alch_0166VEnia5e9bDzTFlXKd'
      const testInfuraUrl = 'https://sepolia.infura.io/v3/4a1b2c3d4e5f6a7b8c9d0e1f'
      const testQueryUrl = 'https://rpc.sepolia.org/?apikey=secret1234567890abcdef'

      const sanitizedAlchemy = sanitizeRpcUrl(testAlchemyUrl)
      const sanitizedInfura = sanitizeRpcUrl(testInfuraUrl)
      const sanitizedQuery = sanitizeRpcUrl(testQueryUrl)

      assert.doesNotMatch(sanitizedAlchemy, /alch_0166VEnia5e9bDzTFlXKd/, 'Alchemy key must be masked')
      assert.match(sanitizedAlchemy, /\*\*\*/, 'Must contain asterisks mask')

      assert.doesNotMatch(sanitizedInfura, /4a1b2c3d4e5f6a7b8c9d0e1f/, 'Infura key must be masked')
      assert.match(sanitizedInfura, /\*\*\*/, 'Must contain asterisks mask')

      assert.doesNotMatch(sanitizedQuery, /secret1234567890abcdef/, 'Query key must be masked')
    })

    it('Status payload never exposes private key or unmasked RPC credentials', () => {
      const status = getBlockchainStatus()
      const jsonString = JSON.stringify(status)

      if (CONFIG.BLOCKCHAIN.PRIVATE_KEY) {
        assert.equal(
          jsonString.includes(CONFIG.BLOCKCHAIN.PRIVATE_KEY),
          false,
          'Private key must NEVER appear in status output'
        )
      }
      assert.equal(status.privateKey, undefined)
      assert.equal(status.deployerKey, undefined)
      if (status.rpcUrl) {
        assert.doesNotMatch(status.rpcUrl, /alch_[a-zA-Z0-9]+/)
      }
    })

    it('Rejects mismatched chain ID and disables contract execution safely', async () => {
      // Temporarily simulate wrong expected chain ID
      CONFIG.BLOCKCHAIN.CHAIN_ID = 999999
      const initResult = await initBlockchain()
      assert.equal(initResult, false, 'initBlockchain must fail when chain ID does not match')

      const status = getBlockchainStatus()
      assert.equal(status.connected, false, 'connected must be false on chain ID mismatch')
      assert.equal(status.contractAvailable, false, 'contract must NOT be attached on mismatch')

      // Restore chain ID and recover
      CONFIG.BLOCKCHAIN.CHAIN_ID = originalChainId
      const recoverResult = await initBlockchain()
      assert.equal(recoverResult, true, 'Must recover cleanly when correct chain ID is restored')
    })

    it('Handles unreachable RPC failure gracefully without crashing', async () => {
      // Temporarily point to unreachable port
      CONFIG.BLOCKCHAIN.RPC_URL = 'http://127.0.0.1:19999'
      const initResult = await initBlockchain()
      assert.equal(initResult, false, 'initBlockchain must return false for unreachable RPC')

      const status = getBlockchainStatus()
      assert.equal(status.connected, false)
      assert.equal(status.contractAvailable, false)

      const verifyResult = await verifyEvidenceOnChain('EW-2026-00009', '0x2b2f')
      assert.equal(verifyResult.verified, false)
      assert.equal(verifyResult.isLiveRpc, false)
      assert.equal(verifyResult.status, 'RPC_OFFLINE')
      assert.match(verifyResult.message, /offline|unreachable/i)

      // Restore RPC and recover
      CONFIG.BLOCKCHAIN.RPC_URL = originalRpcUrl
      const recoverResult = await initBlockchain()
      assert.equal(recoverResult, true, 'Must recover when valid RPC is restored')
    })
  })

  // 2. Contract Bytecode & ABI Attachment Validation
  describe('2. Contract Address, ABI & Bytecode Verification', () => {
    it('Validates target contract address matches configured Sepolia contract', () => {
      const status = getBlockchainStatus()
      assert.equal(
        status.contractAddress.toLowerCase(),
        '0xF81819d91d0D23612C888987cfA4EdC09e91B862'.toLowerCase()
      )
    })

    it('validateContractABI correctly validates presence of core methods and rejects incomplete ABIs', () => {
      const validABI = [
        { name: 'registerBatch', type: 'function' },
        { name: 'getBatchSummary', type: 'function' },
        { name: 'recordCustodyEvent', type: 'function' },
      ]
      const missingMethodABI = [
        { name: 'registerBatch', type: 'function' },
      ]
      const emptyABI = []
      const invalidType = 'not an array'

      assert.equal(validateContractABI(validABI), true)
      assert.equal(validateContractABI(missingMethodABI), false)
      assert.equal(validateContractABI(emptyABI), false)
      assert.equal(validateContractABI(invalidType), false)
    })

    it('Live contract has deployed bytecode present at 0xF81819d91d0D23612C888987cfA4EdC09e91B862 on Sepolia', async () => {
      const status = await getLiveBlockchainStatus()
      if (status.connected) {
        assert.equal(status.hasContractCode, true, 'Contract bytecode must exist at deployed address')
        assert.equal(status.contractAvailable, true, 'Contract must be marked available')
      }
    })

    it('Detects missing contract code (undeployed address) and returns CONTRACT_UNAVAILABLE without crashing', async () => {
      // Use an un-deployed address with no bytecode
      const unDeployedAddress = '0x0000000000000000000000000000000000000001'
      CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS = unDeployedAddress

      await initBlockchain()
      const status = getBlockchainStatus()
      assert.equal(status.hasContractCode, false, 'hasContractCode must be false for address without bytecode')
      assert.equal(status.contractAvailable, false, 'contractAvailable must be false')

      const verifyResult = await verifyEvidenceOnChain('EW-2026-00009', '0x2b2f')
      assert.equal(verifyResult.verified, false)
      assert.equal(verifyResult.isLiveRpc, true, 'RPC is still live')
      assert.equal(verifyResult.contractAvailable, false)
      assert.equal(verifyResult.status, 'CONTRACT_UNAVAILABLE')
      assert.match(verifyResult.message, /unavailable or not deployed/i)

      // Restore deployed contract address and re-init
      CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS = originalContractAddress
      const recoverResult = await initBlockchain()
      assert.equal(recoverResult, true)
    })
  })

  // 3. Strict Verification & Status Distinction (5 States)
  describe('3. Strict On-Chain Verification & State Differentiation', () => {
    it('State: VERIFIED - Live Sepolia verification of matching consignment EW-2026-00009 succeeds', async () => {
      const knownOnChainHash = '0x2b2f55edee77560b2cdb32a67f682c8590cf50df2facf15933b54df6cbc07108'
      const result = await verifyEvidenceOnChain('EW-2026-00009', knownOnChainHash)

      assert.equal(result.existsOnChain, true)
      assert.equal(result.verified, true)
      assert.equal(result.status, 'VERIFIED')
      assert.equal(result.isLiveRpc, true)
      assert.equal(result.contractAvailable, true)
      assert.match(result.message, /successfully verified/i)
      assert.equal(result.mismatchReason, null)
    })

    it('State: DIGEST_MISMATCH - Consignment EW-2026-00003 strictly detects digest mismatch without falsifying records', async () => {
      const localHash = '0x16c3376e8029d51e043039b08f2f0fc526d2ff3028cb5ce2aaf8f316846f75e9'
      const result = await verifyEvidenceOnChain('EW-2026-00003', localHash)

      assert.equal(result.existsOnChain, true)
      assert.equal(result.verified, false, 'Must strictly return verified: false on digest mismatch')
      assert.equal(result.status, 'DIGEST_MISMATCH')
      assert.equal(result.isLiveRpc, true)
      assert.equal(result.contractAvailable, true)
      assert.equal(result.localEvidenceHash, localHash)
      assert.equal(result.onChainEvidenceHash, '0x32d668bec04e49e61579b8d9c18d4b6bc47316a28916e3cc6c93aeb0135b0eb3')
      assert.match(result.message, /Evidence digest mismatch/i)
      assert.ok(result.mismatchReason, 'Must provide detailed audit explanation for the mismatch')
    })

    it('State: NOT_REGISTERED - Unanchored batch returns existsOnChain: false and verified: false', async () => {
      const nonExistentBatchId = `EW-UNANCHORED-TEST-${Date.now()}`
      const arbitraryHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const result = await verifyEvidenceOnChain(nonExistentBatchId, arbitraryHash)

      assert.equal(result.verified, false, 'Unanchored batch must never be verified: true')
      assert.equal(result.existsOnChain, false)
      assert.equal(result.status, 'NOT_REGISTERED')
      assert.equal(result.isLiveRpc, true)
      assert.equal(result.contractAvailable, true)
      assert.match(result.message, /has not been anchored/i)
    })

    it('No fallback returns verified: true based on hash length or arbitrary formatting', async () => {
      // Test with perfectly valid-looking 66-character hex string that is not registered
      const validLookingHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      const result = await verifyEvidenceOnChain('NON-EXISTENT-BATCH', validLookingHash)

      assert.equal(result.verified, false)
      assert.equal(result.existsOnChain, false)
    })

    it('Requires batchId and rejects empty batchId safely', async () => {
      const result = await verifyEvidenceOnChain('', '0x1234')
      assert.equal(result.verified, false)
      assert.equal(result.status, 'INVALID_REQUEST')
      assert.match(result.message, /Batch ID is required/i)
    })
  })
})
