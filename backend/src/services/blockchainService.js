import { ethers } from 'ethers'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { CONFIG } from '../config/config.js'
import { computeKeccak256, normalizeBytes32, areDigestsEqual } from '../utils/hashUtils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const artifactPath = path.resolve(__dirname, '../../artifacts/contracts/EcoTraceRegistry.sol/EcoTraceRegistry.json')

let contractABI = []
try {
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
    contractABI = artifact.abi || []
  }
} catch (err) {
  console.warn('[Blockchain] Could not load contract ABI:', err.message)
}

let provider = null
let signer = null
let contract = null
let isConnected = false
let validatedChainId = null
let hasContractBytecode = false
let signerBalanceEth = '0.0'

/**
 * Sanitize an RPC URL to mask API keys and credentials in logs and public responses
 */
export function sanitizeRpcUrl(url) {
  if (!url || typeof url !== 'string') return ''
  try {
    const parsed = new URL(url)
    if (parsed.search) {
      parsed.search = ''
    }
    const pathSegments = parsed.pathname.split('/').filter(Boolean)
    if (pathSegments.length > 0) {
      const lastSeg = pathSegments[pathSegments.length - 1]
      if (lastSeg.length >= 16 || lastSeg.startsWith('alch_') || lastSeg.includes('key')) {
        pathSegments[pathSegments.length - 1] = '***'
      }
      parsed.pathname = '/' + pathSegments.join('/')
    }
    return parsed.toString()
  } catch {
    return url.replace(/([a-zA-Z0-9_-]{16,})/g, '***')
  }
}

/**
 * Validate that the contract ABI contains expected methods
 */
export function validateContractABI(abi) {
  if (!Array.isArray(abi) || abi.length === 0) return false
  const functionNames = abi
    .filter((item) => item && (item.type === 'function' || !item.type))
    .map((item) => item.name)
  return functionNames.includes('registerBatch') && functionNames.includes('getBatchSummary')
}

export async function initBlockchain() {
  if (!CONFIG.BLOCKCHAIN.ENABLED) {
    console.log('[Blockchain] Integration disabled by configuration.')
    return false
  }

  const safeRpcUrl = sanitizeRpcUrl(CONFIG.BLOCKCHAIN.RPC_URL)

  try {
    provider = new ethers.JsonRpcProvider(CONFIG.BLOCKCHAIN.RPC_URL)
    const network = await provider.getNetwork()
    validatedChainId = Number(network.chainId)

    // Pre-flight validation: check chain ID before sending any transactions
    if (CONFIG.BLOCKCHAIN.CHAIN_ID && validatedChainId !== CONFIG.BLOCKCHAIN.CHAIN_ID) {
      console.error(
        `[Blockchain] ❌ Chain ID mismatch: expected ${CONFIG.BLOCKCHAIN.CHAIN_ID} (${CONFIG.BLOCKCHAIN.NETWORK_NAME}), but connected RPC returned ${validatedChainId}.`
      )
      isConnected = false
      contract = null
      hasContractBytecode = false
      return false
    }

    console.log(
      `[Blockchain] Connected to ${CONFIG.BLOCKCHAIN.NETWORK_NAME} RPC: ${safeRpcUrl} (Chain ID: ${validatedChainId})`
    )

    // Verify contract address and bytecode on target network
    const hasValidAddress = Boolean(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS && ethers.isAddress(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS))
    if (hasValidAddress) {
      const code = await provider.getCode(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS)
      hasContractBytecode = Boolean(code && code !== '0x' && code !== '0x0')
      if (!hasContractBytecode) {
        console.warn(
          `[Blockchain] Notice: No deployed contract bytecode found at ${CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS} on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}.`
        )
      } else {
        console.log(`[Blockchain] Verified contract code present at: ${CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS}`)
      }
    } else {
      hasContractBytecode = false
    }

    // Attach signer if private key is provided
    if (CONFIG.BLOCKCHAIN.PRIVATE_KEY) {
      try {
        signer = new ethers.Wallet(CONFIG.BLOCKCHAIN.PRIVATE_KEY, provider)
        const balance = await provider.getBalance(signer.address)
        signerBalanceEth = ethers.formatEther(balance)
        console.log(
          `[Blockchain] Signer active: ${signer.address} (Balance: ${parseFloat(signerBalanceEth).toFixed(4)} ETH)`
        )
      } catch (keyErr) {
        console.warn(`[Blockchain] Signer initialization notice: ${keyErr.message}`)
      }
    }

    // Attach contract instance ONLY after validating address, ABI, and bytecode
    const isAbiValid = validateContractABI(contractABI)
    if (hasValidAddress && isAbiValid && hasContractBytecode) {
      if (signer) {
        contract = new ethers.Contract(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS, contractABI, signer)
      } else if (provider) {
        contract = new ethers.Contract(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS, contractABI, provider)
      }
    } else {
      contract = null
    }

    isConnected = true
    return true
  } catch (err) {
    console.warn(`[Blockchain] RPC at ${safeRpcUrl} is offline: ${err.message}`)
    isConnected = false
    contract = null
    hasContractBytecode = false
    return false
  }
}

export function getBlockchainStatus() {
  const isReady = isConnected && Boolean(contract) && hasContractBytecode
  return {
    enabled: CONFIG.BLOCKCHAIN.ENABLED,
    connected: isConnected,
    network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
    networkSlug: CONFIG.BLOCKCHAIN.NETWORK,
    isSepolia: CONFIG.BLOCKCHAIN.IS_SEPOLIA,
    chainId: validatedChainId || CONFIG.BLOCKCHAIN.CHAIN_ID,
    rpcUrl: sanitizeRpcUrl(CONFIG.BLOCKCHAIN.RPC_URL),
    contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
    hasContractCode: hasContractBytecode,
    contractAvailable: Boolean(contract && hasContractBytecode),
    explorerUrl: CONFIG.BLOCKCHAIN.EXPLORER_URL,
    contractExplorerUrl:
      CONFIG.BLOCKCHAIN.EXPLORER_URL && CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS
        ? `${CONFIG.BLOCKCHAIN.EXPLORER_URL}/address/${CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS}`
        : null,
    signerAddress: signer ? signer.address : null,
    signerBalance: signerBalanceEth,
    mode: isReady
      ? `Live ${CONFIG.BLOCKCHAIN.NETWORK_NAME} (Chain ID: ${validatedChainId || CONFIG.BLOCKCHAIN.CHAIN_ID})`
      : isConnected
      ? `RPC Online, Contract Unavailable (${CONFIG.BLOCKCHAIN.NETWORK_NAME})`
      : 'Offline (RPC Node Unreachable)',
  }
}

/**
 * Perform a live real-time network connectivity and contract check
 */
export async function getLiveBlockchainStatus() {
  if (!CONFIG.BLOCKCHAIN.ENABLED) {
    return {
      enabled: false,
      connected: false,
      network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
      networkSlug: CONFIG.BLOCKCHAIN.NETWORK,
      isSepolia: CONFIG.BLOCKCHAIN.IS_SEPOLIA,
      chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
      contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
      hasContractCode: false,
      contractAvailable: false,
      mode: 'Disabled',
    }
  }

  try {
    if (!provider) {
      await initBlockchain()
    }
    if (!provider) {
      throw new Error('Provider could not be initialized')
    }

    // Ping the live RPC with a timeout
    const networkPromise = provider.getNetwork()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('RPC request timed out after 5000ms')), 5000)
    )
    const network = await Promise.race([networkPromise, timeoutPromise])
    validatedChainId = Number(network.chainId)

    // Verify chain ID matches expected
    if (CONFIG.BLOCKCHAIN.CHAIN_ID && validatedChainId !== CONFIG.BLOCKCHAIN.CHAIN_ID) {
      isConnected = false
      contract = null
      hasContractBytecode = false
      return {
        ...getBlockchainStatus(),
        connected: false,
        contractAvailable: false,
        error: `Chain ID mismatch: expected ${CONFIG.BLOCKCHAIN.CHAIN_ID}, got ${validatedChainId}`,
        mode: `Chain Mismatch (Expected: ${CONFIG.BLOCKCHAIN.CHAIN_ID}, Got: ${validatedChainId})`,
      }
    }

    isConnected = true

    // Re-verify contract bytecode
    const hasValidAddress = Boolean(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS && ethers.isAddress(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS))
    if (hasValidAddress) {
      const code = await provider.getCode(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS)
      hasContractBytecode = Boolean(code && code !== '0x' && code !== '0x0')
    } else {
      hasContractBytecode = false
    }

    // Attach contract only if address, ABI, and bytecode are verified
    const isAbiValid = validateContractABI(contractABI)
    if (hasValidAddress && isAbiValid && hasContractBytecode) {
      if (!contract) {
        contract = signer
          ? new ethers.Contract(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS, contractABI, signer)
          : new ethers.Contract(CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS, contractABI, provider)
      }
    } else {
      contract = null
    }

    // Refresh signer balance if present
    if (signer && provider) {
      try {
        const bal = await provider.getBalance(signer.address)
        signerBalanceEth = ethers.formatEther(bal)
      } catch {}
    }

    return getBlockchainStatus()
  } catch (err) {
    const safeRpcUrl = sanitizeRpcUrl(CONFIG.BLOCKCHAIN.RPC_URL)
    console.warn(`[Blockchain] Live connectivity check to ${safeRpcUrl} failed: ${err.message}`)
    isConnected = false
    contract = null
    hasContractBytecode = false
    return {
      ...getBlockchainStatus(),
      connected: false,
      contractAvailable: false,
      error: `RPC connection error: ${err.message}`,
      mode: 'Offline (RPC Node Unreachable)',
    }
  }
}

function formatBytes32(hashStr) {
  return normalizeBytes32(hashStr)
}

async function executeWithNonce(fn) {
  let attempts = 0
  while (attempts < 3) {
    try {
      const nonce = await signer.getNonce('pending')
      return await fn({ nonce })
    } catch (err) {
      attempts++
      const msg = err.message || ''
      if (
        (err.code === 'NONCE_EXPIRED' ||
          msg.includes('Nonce too low') ||
          msg.includes('nonce') ||
          msg.includes('replacement transaction underpriced')) &&
        attempts < 3
      ) {
        await new Promise((r) => setTimeout(r, 250))
        continue
      }
      throw err
    }
  }
}

/**
 * Validate that connected RPC matches expected chain before transaction execution
 */
async function validateNetworkBeforeTx() {
  if (!provider) {
    await initBlockchain()
  }
  if (!provider) {
    throw new Error(`Blockchain provider is not initialized.`)
  }
  const currentNet = await provider.getNetwork()
  const currentChainId = Number(currentNet.chainId)
  if (currentChainId !== CONFIG.BLOCKCHAIN.CHAIN_ID) {
    throw new Error(
      `Chain ID mismatch guard triggered: configured for ${CONFIG.BLOCKCHAIN.CHAIN_ID} (${CONFIG.BLOCKCHAIN.NETWORK_NAME}), but RPC returned ${currentChainId}.`
    )
  }
  return currentChainId
}

export async function registerBatchOnChain(batchId, evidenceHash) {
  const batchIdHash = computeKeccak256(batchId)
  const formattedEvidenceHash = formatBytes32(evidenceHash)

  if (!isConnected || !contract) {
    await initBlockchain()
  }

  if (isConnected && contract) {
    try {
      const chainId = await validateNetworkBeforeTx()

      // 1. Check if already registered on-chain to prevent duplicate writes
      const summary = await contract.getBatchSummary(batchIdHash)
      if (summary[6]) {
        const registeredAt = Number(summary[1])
        return {
          success: true,
          alreadyRegistered: true,
          onChainEvidenceHash: summary[0],
          registeredAt: registeredAt > 0 ? new Date(registeredAt * 1000).toISOString() : null,
          registeredBy: summary[2],
          chainId,
          network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
          contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
          explorerUrl: CONFIG.BLOCKCHAIN.EXPLORER_URL
            ? `${CONFIG.BLOCKCHAIN.EXPLORER_URL}/address/${CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS}`
            : null,
          isLiveRpc: true,
          message: `Batch ${batchId} is already anchored on ${CONFIG.BLOCKCHAIN.NETWORK_NAME} (immutably registered by ${summary[2]}).`,
        }
      }

      if (!signer) {
        throw new Error(`Signer account is not configured for ${CONFIG.BLOCKCHAIN.NETWORK_NAME}. Cannot submit transaction.`)
      }

      // 2. Submit transaction with automatic nonce management
      const tx = await executeWithNonce((opts) =>
        contract.registerBatch(batchIdHash, formattedEvidenceHash, opts)
      )

      // 3. Wait for confirmation receipt
      const receipt = await tx.wait(CONFIG.BLOCKCHAIN.IS_SEPOLIA ? 1 : 1)
      if (receipt.status !== 1) {
        throw new Error('Transaction execution reverted on-chain.')
      }

      const explorerUrl = CONFIG.BLOCKCHAIN.EXPLORER_URL
        ? `${CONFIG.BLOCKCHAIN.EXPLORER_URL}/tx/${receipt.hash}`
        : null

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        chainId,
        network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
        contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
        explorerUrl,
        isLiveRpc: true,
      }
    } catch (err) {
      console.error(`[Blockchain] registerBatch on ${CONFIG.BLOCKCHAIN.NETWORK_NAME} failed:`, err.message)
      return {
        success: false,
        error: `Smart contract execution on ${CONFIG.BLOCKCHAIN.NETWORK_NAME} failed: ${err.message}`,
        chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
        network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
        isLiveRpc: true,
      }
    }
  }

  return {
    success: false,
    error: `Blockchain node is offline (RPC at ${CONFIG.BLOCKCHAIN.RPC_URL} unreachable for ${CONFIG.BLOCKCHAIN.NETWORK_NAME}). Cannot anchor batch to live ledger.`,
    chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
    network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
    isLiveRpc: false,
  }
}

export async function recordCustodyEventOnChain(batchId, eventHash) {
  const batchIdHash = computeKeccak256(batchId)
  const formattedEventHash = formatBytes32(eventHash)

  if (!isConnected || !contract) {
    await initBlockchain()
  }

  if (isConnected && contract) {
    try {
      const chainId = await validateNetworkBeforeTx()
      if (!signer) {
        throw new Error(`Signer account is not configured for ${CONFIG.BLOCKCHAIN.NETWORK_NAME}.`)
      }

      const tx = await executeWithNonce((opts) =>
        contract.recordCustodyEvent(batchIdHash, formattedEventHash, opts)
      )
      const receipt = await tx.wait(CONFIG.BLOCKCHAIN.IS_SEPOLIA ? 1 : 1)
      if (receipt.status !== 1) {
        throw new Error('Custody transaction reverted on-chain.')
      }

      const explorerUrl = CONFIG.BLOCKCHAIN.EXPLORER_URL
        ? `${CONFIG.BLOCKCHAIN.EXPLORER_URL}/tx/${receipt.hash}`
        : null

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        chainId,
        network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
        contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
        explorerUrl,
        isLiveRpc: true,
      }
    } catch (err) {
      console.error(`[Blockchain] recordCustodyEvent on ${CONFIG.BLOCKCHAIN.NETWORK_NAME} failed:`, err.message)
      return {
        success: false,
        error: `Smart contract custody recording failed on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}: ${err.message}`,
        chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
        network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
        isLiveRpc: true,
      }
    }
  }

  return {
    success: false,
    error: `Blockchain node is offline (${CONFIG.BLOCKCHAIN.NETWORK_NAME}). Handover recorded locally only.`,
    chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
    network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
    isLiveRpc: false,
  }
}

export async function recordRecoveryOnChain(batchId, recoveryHash) {
  const batchIdHash = computeKeccak256(batchId)
  const formattedRecoveryHash = formatBytes32(recoveryHash)

  if (!isConnected || !contract) {
    await initBlockchain()
  }

  if (isConnected && contract) {
    try {
      const chainId = await validateNetworkBeforeTx()
      if (!signer) {
        throw new Error(`Signer account is not configured for ${CONFIG.BLOCKCHAIN.NETWORK_NAME}.`)
      }

      const tx = await executeWithNonce((opts) =>
        contract.recordRecovery(batchIdHash, formattedRecoveryHash, opts)
      )
      const receipt = await tx.wait(CONFIG.BLOCKCHAIN.IS_SEPOLIA ? 1 : 1)
      if (receipt.status !== 1) {
        throw new Error('Recovery transaction reverted on-chain.')
      }

      const explorerUrl = CONFIG.BLOCKCHAIN.EXPLORER_URL
        ? `${CONFIG.BLOCKCHAIN.EXPLORER_URL}/tx/${receipt.hash}`
        : null

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        chainId,
        network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
        contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
        explorerUrl,
        isLiveRpc: true,
      }
    } catch (err) {
      console.error(`[Blockchain] recordRecovery on ${CONFIG.BLOCKCHAIN.NETWORK_NAME} failed:`, err.message)
      return {
        success: false,
        error: `Smart contract recovery recording failed on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}: ${err.message}`,
        chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
        network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
        isLiveRpc: true,
      }
    }
  }

  return {
    success: false,
    error: `Blockchain node is offline (${CONFIG.BLOCKCHAIN.NETWORK_NAME}). Recovery claim recorded locally only.`,
    chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
    network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
    isLiveRpc: false,
  }
}

export async function checkBatchExistsOnChain(batchId) {
  if (!batchId) return { exists: false }
  try {
    if (!isConnected || !contract) {
      await initBlockchain()
    }
    if (isConnected && contract) {
      const batchIdHash = computeKeccak256(batchId)
      const summary = await contract.getBatchSummary(batchIdHash)
      const exists = Boolean(summary[6])
      const registeredAt = Number(summary[1])
      return {
        exists,
        onChainEvidenceHash: exists ? normalizeBytes32(summary[0]) : null,
        registeredAt: registeredAt > 0 ? new Date(registeredAt * 1000).toISOString() : null,
        registeredBy: exists ? summary[2] : null,
        chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
        network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
      }
    }
  } catch (err) {
    console.warn(`[Blockchain] checkBatchExistsOnChain for ${batchId} failed:`, err.message)
  }
  return { exists: false }
}

export async function verifyEvidenceOnChain(batchId, evidenceHash) {
  if (!batchId) {
    return {
      verified: false,
      isLiveRpc: false,
      contractAvailable: false,
      existsOnChain: false,
      status: 'INVALID_REQUEST',
      message: 'Batch ID is required for on-chain verification.',
    }
  }

  const batchIdHash = computeKeccak256(batchId)
  const normalizedLocalEvidenceHash = normalizeBytes32(evidenceHash)

  if (!isConnected || !contract) {
    await initBlockchain()
  }

  // 1. RPC node is offline
  if (!isConnected) {
    return {
      verified: false,
      isLiveRpc: false,
      contractAvailable: false,
      existsOnChain: false,
      status: 'RPC_OFFLINE',
      network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
      chainId: CONFIG.BLOCKCHAIN.CHAIN_ID,
      localEvidenceHash: normalizedLocalEvidenceHash,
      message: `Blockchain node is offline (${CONFIG.BLOCKCHAIN.NETWORK_NAME} RPC unreachable). Verification cannot be performed against the live ledger.`,
    }
  }

  // 2. RPC is online, but smart contract is not available / deployed / missing bytecode
  if (!contract || !hasContractBytecode) {
    return {
      verified: false,
      isLiveRpc: true,
      contractAvailable: false,
      existsOnChain: false,
      status: 'CONTRACT_UNAVAILABLE',
      network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
      chainId: validatedChainId || CONFIG.BLOCKCHAIN.CHAIN_ID,
      contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
      localEvidenceHash: normalizedLocalEvidenceHash,
      message: `Smart contract is unavailable or not deployed at ${CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS || 'unconfigured address'} on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}.`,
    }
  }

  try {
    const summary = await contract.getBatchSummary(batchIdHash)
    const exists = Boolean(summary[6])
    const onChainEvidenceHash = normalizeBytes32(summary[0])
    const registeredAt = Number(summary[1])
    const registeredBy = summary[2]
    const recoveryHash = summary[3]
    const totalCustodyEvents = Number(summary[5])

    const contractExplorerUrl = CONFIG.BLOCKCHAIN.EXPLORER_URL
      ? `${CONFIG.BLOCKCHAIN.EXPLORER_URL}/address/${CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS}`
      : null

    // 3. Batch not registered on-chain
    if (!exists) {
      return {
        verified: false,
        isLiveRpc: true,
        contractAvailable: true,
        existsOnChain: false,
        status: 'NOT_REGISTERED',
        network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
        chainId: validatedChainId || CONFIG.BLOCKCHAIN.CHAIN_ID,
        contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
        contractExplorerUrl,
        localEvidenceHash: normalizedLocalEvidenceHash,
        onChainEvidenceHash: null,
        message: `Batch ${batchId} has not been anchored to the EcoTraceRegistry smart contract on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}.`,
      }
    }

    // Strict cryptographic verification against immutable on-chain consensus digest
    const isMatch = areDigestsEqual(onChainEvidenceHash, normalizedLocalEvidenceHash)

    // 4 & 5. Evidence digest mismatch vs Verified consensus match
    return {
      verified: isMatch,
      isLiveRpc: true,
      contractAvailable: true,
      existsOnChain: true,
      status: isMatch ? 'VERIFIED' : 'DIGEST_MISMATCH',
      network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
      chainId: validatedChainId || CONFIG.BLOCKCHAIN.CHAIN_ID,
      contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
      contractExplorerUrl,
      localEvidenceHash: normalizedLocalEvidenceHash,
      onChainEvidenceHash,
      registeredAt: registeredAt > 0 ? new Date(registeredAt * 1000).toISOString() : null,
      registeredBy,
      recoveryHash: recoveryHash !== ethers.ZeroHash ? recoveryHash : null,
      totalCustodyEvents,
      mismatchReason: !isMatch
        ? `Consignment intake metadata or evidence files do not match the on-chain consensus digest recorded on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}. The on-chain registration belongs to an intake under this identifier with different data, or the local documentation has been modified.`
        : null,
      message: isMatch
        ? `Cryptographic evidence digest successfully verified against ${CONFIG.BLOCKCHAIN.NETWORK_NAME} consensus state.`
        : `Evidence digest mismatch: provided digest does not match the immutably anchored digest on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}.`,
    }
  } catch (err) {
    console.error(`[Blockchain] verifyEvidence error on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}:`, err.message)
    return {
      verified: false,
      isLiveRpc: true,
      contractAvailable: true,
      network: CONFIG.BLOCKCHAIN.NETWORK_NAME,
      chainId: validatedChainId || CONFIG.BLOCKCHAIN.CHAIN_ID,
      contractAddress: CONFIG.BLOCKCHAIN.CONTRACT_ADDRESS,
      localEvidenceHash: normalizedLocalEvidenceHash,
      message: `On-chain verification query failed on ${CONFIG.BLOCKCHAIN.NETWORK_NAME}: ${err.message}`,
    }
  }
}
