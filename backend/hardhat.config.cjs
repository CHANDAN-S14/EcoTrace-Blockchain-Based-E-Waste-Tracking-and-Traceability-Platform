require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

function getSepoliaAccounts() {
  const key = process.env.DEPLOYER_PRIVATE_KEY || process.env.BLOCKCHAIN_PRIVATE_KEY;
  if (!key) return [];
  const cleanKey = key.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
    return [cleanKey];
  }
  if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    return [`0x${cleanKey}`];
  }
  return [];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: getSepoliaAccounts(),
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
