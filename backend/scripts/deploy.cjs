const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=================================================================");
  console.log("  🌿  ECOTRACE REGISTRY SMART CONTRACT DEPLOYMENT ENGINE");
  console.log("=================================================================");

  // 1. Inspect connected network
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  const networkName = network.name;
  console.log(`Target Network: ${networkName} (Chain ID: ${chainId})`);

  // Validate chain ID
  if (networkName === "sepolia" && chainId !== 11155111) {
    throw new Error(`Chain ID mismatch for Sepolia: expected 11155111, but got ${chainId}. Aborting deployment.`);
  }
  if (networkName === "localhost" && chainId !== 31337 && chainId !== 1337) {
    console.warn(`Notice: Local network Chain ID is ${chainId} (standard local is 31337).`);
  }

  // 2. Inspect deployer account
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "No deployer account configured. Please set DEPLOYER_PRIVATE_KEY or BLOCKCHAIN_PRIVATE_KEY in backend/.env"
    );
  }
  const deployer = signers[0];
  console.log(`Deployer Account: ${deployer.address}`);

  // 3. Inspect balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Account Balance:  ${balanceEth} ETH`);

  // Pre-flight check for Sepolia
  const MIN_SEPOLIA_DEPLOY_ETH = 0.005;
  if (chainId === 11155111 && Number(balanceEth) < MIN_SEPOLIA_DEPLOY_ETH) {
    console.error("\n=================================================================");
    console.error("  ❌ DEPLOYMENT STOPPED: INSUFFICIENT SEPOLIA TEST ETH");
    console.error("=================================================================");
    console.error(`Account:          ${deployer.address}`);
    console.error(`Current Balance:  ${balanceEth} Sepolia ETH`);
    console.error(`Required Balance: >= ${MIN_SEPOLIA_DEPLOY_ETH} Sepolia ETH for contract gas`);
    console.error("\nTo acquire free Sepolia testnet ETH for this address:");
    console.error("  • Google Cloud Web3 Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
    console.error("  • Chainlink Sepolia Faucet: https://faucets.chain.link/sepolia");
    console.error("  • Alchemy Sepolia Faucet:   https://sepoliafaucet.com");
    console.error("=================================================================\n");
    process.exit(1);
  }

  // 4. Deploy EcoTraceRegistry
  console.log("\nDeploying EcoTraceRegistry.sol to blockchain...");
  const EcoTraceRegistry = await ethers.getContractFactory("EcoTraceRegistry");
  const registry = await EcoTraceRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  const deployTx = registry.deploymentTransaction();
  const txHash = deployTx ? deployTx.hash : "N/A";
  let blockNumber = 0;

  if (deployTx) {
    console.log(`Transaction submitted: ${txHash}`);
    console.log("Waiting for block confirmation...");
    const receipt = await deployTx.wait(chainId === 11155111 ? 2 : 1);
    blockNumber = Number(receipt.blockNumber);
    console.log(`Confirmed in Block #${blockNumber}`);
  }

  console.log("-----------------------------------------------------------------");
  console.log(`✅ EcoTraceRegistry successfully deployed!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Transaction Hash: ${txHash}`);
  console.log(`Deployment Block: ${blockNumber}`);
  if (chainId === 11155111) {
    console.log(`Etherscan Explorer: https://sepolia.etherscan.io/address/${contractAddress}`);
  }
  console.log("-----------------------------------------------------------------");

  // 5. Save deployment artifacts
  const deploymentInfo = {
    network: networkName,
    chainId,
    contractAddress,
    deployer: deployer.address,
    deploymentTxHash: txHash,
    deploymentBlock: blockNumber,
    etherscanUrl: chainId === 11155111 ? `https://sepolia.etherscan.io/address/${contractAddress}` : null,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkDeploymentPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(networkDeploymentPath, JSON.stringify(deploymentInfo, null, 2));

  const mainDeploymentPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(mainDeploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment metadata recorded to: ${networkDeploymentPath}`);

  // 6. Update backend .env file safely with deployed contract address if Sepolia or localhost
  try {
    const envPath = path.join(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");
      if (chainId === 11155111) {
        if (envContent.includes("SEPOLIA_CONTRACT_ADDRESS=")) {
          envContent = envContent.replace(/SEPOLIA_CONTRACT_ADDRESS=.*(\r?\n|$)/, `SEPOLIA_CONTRACT_ADDRESS=${contractAddress}$1`);
        } else {
          envContent += `\nSEPOLIA_CONTRACT_ADDRESS=${contractAddress}\n`;
        }
      } else {
        if (envContent.includes("BLOCKCHAIN_CONTRACT_ADDRESS=")) {
          envContent = envContent.replace(/BLOCKCHAIN_CONTRACT_ADDRESS=.*(\r?\n|$)/, `BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}$1`);
        }
      }
      fs.writeFileSync(envPath, envContent);
      console.log(`Updated contract address in backend/.env`);
    }
  } catch (envErr) {
    console.warn(`Notice: Could not auto-update .env: ${envErr.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  });
