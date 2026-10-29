import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const requestedNetwork = (process.env.BLOCKCHAIN_NETWORK || '').toLowerCase()
const explicitChainId = Number(process.env.BLOCKCHAIN_CHAIN_ID || 0)
const hasSepoliaConfig = Boolean(process.env.SEPOLIA_CONTRACT_ADDRESS || process.env.SEPOLIA_RPC_URL)
const isSepolia =
  requestedNetwork === 'sepolia' ||
  explicitChainId === 11155111 ||
  (hasSepoliaConfig && requestedNetwork !== 'localhost')

export const CONFIG = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecotrace',
  JWT_SECRET: process.env.JWT_SECRET || 'ecotrace_jwt_super_secret_signing_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Blockchain Configuration
  BLOCKCHAIN: {
    ENABLED: process.env.BLOCKCHAIN_ENABLED !== 'false',
    NETWORK: isSepolia ? 'sepolia' : 'localhost',
    NETWORK_NAME: isSepolia ? 'Ethereum Sepolia' : 'Local Hardhat',
    IS_SEPOLIA: isSepolia,
    CHAIN_ID: isSepolia ? 11155111 : Number(process.env.BLOCKCHAIN_CHAIN_ID || 31337),
    RPC_URL: isSepolia
      ? (process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com')
      : (process.env.LOCAL_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545'),
    PRIVATE_KEY: isSepolia
      ? (process.env.DEPLOYER_PRIVATE_KEY || process.env.BLOCKCHAIN_PRIVATE_KEY || '')
      : (process.env.BLOCKCHAIN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
    CONTRACT_ADDRESS: isSepolia
      ? (process.env.SEPOLIA_CONTRACT_ADDRESS || process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '')
      : (process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F'),
    EXPLORER_URL: isSepolia ? 'https://sepolia.etherscan.io' : null,

    // Standalone network configurations for cross-chain queries
    NETWORKS: {
      localhost: {
        chainId: 31337,
        name: 'Local Hardhat',
        rpcUrl: process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545',
        contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F',
        explorerUrl: null,
      },
      sepolia: {
        chainId: 11155111,
        name: 'Ethereum Sepolia',
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
        contractAddress: process.env.SEPOLIA_CONTRACT_ADDRESS || '',
        explorerUrl: 'https://sepolia.etherscan.io',
      },
    },
  },

  // QpiAI Opt Configuration
  QPIAI_OPT: {
    API_URL: process.env.QPIAI_OPT_API_URL || 'https://opt-server.qpiai.tech/api',
    API_KEY: process.env.QPIAI_OPT_API_KEY || '',
    TIMEOUT_MS: 15000,
  },

  // QpiAI QCloud Quantum Configuration
  QPIAI_QCLOUD: {
    API_URL: process.env.QPIAI_QCLOUD_API_URL || 'https://qcloud.qpiai.tech/api/v1',
    API_KEY: process.env.QPIAI_QCLOUD_API_KEY || '',
    TIMEOUT_MS: 15000,
  },

  // Regulatory Standards
  TOLERANCE_PERCENT: Number(process.env.MASS_BALANCE_TOLERANCE || 20),
}
