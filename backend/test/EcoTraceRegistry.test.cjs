const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EcoTraceRegistry Smart Contract", function () {
  let EcoTraceRegistry;
  let registry;
  let owner;
  let operator;
  let unauthorized;

  const sampleBatchIdHash = ethers.keccak256(ethers.toUtf8Bytes("BATCH-2026-0001"));
  const sampleEvidenceHash = ethers.keccak256(ethers.toUtf8Bytes("WEIGHBRIDGE-SLIP-SHA256-DIGEST"));
  const sampleCustodyEventHash = ethers.keccak256(ethers.toUtf8Bytes("HANDOVER-EVENT-STAGE-1"));
  const sampleRecoveryHash = ethers.keccak256(ethers.toUtf8Bytes("MASS-BALANCE-RECOVERY-PROOF"));

  beforeEach(async function () {
    [owner, operator, unauthorized] = await ethers.getSigners();
    EcoTraceRegistry = await ethers.getContractFactory("EcoTraceRegistry");
    registry = await EcoTraceRegistry.deploy();
    await registry.waitForDeployment();

    // Authorize operator
    await registry.setAuthorizedOperator(operator.address, true);
  });

  describe("Deployment & Authorization", function () {
    it("Should set deployer as owner and authorized operator", async function () {
      expect(await registry.owner()).to.equal(owner.address);
      expect(await registry.authorizedOperators(owner.address)).to.be.true;
      expect(await registry.authorizedOperators(operator.address)).to.be.true;
      expect(await registry.authorizedOperators(unauthorized.address)).to.be.false;
    });

    it("Should reject non-owner trying to authorize operators", async function () {
      await expect(
        registry.connect(unauthorized).setAuthorizedOperator(unauthorized.address, true)
      ).to.be.revertedWith("EcoTrace: caller is not the owner");
    });
  });

  describe("Batch Registration", function () {
    it("Should allow authorized operator to register a new batch", async function () {
      const tx = await registry.connect(operator).registerBatch(sampleBatchIdHash, sampleEvidenceHash);
      await tx.wait();

      const summary = await registry.getBatchSummary(sampleBatchIdHash);
      expect(summary.exists).to.be.true;
      expect(summary.initialEvidenceHash).to.equal(sampleEvidenceHash);
      expect(summary.registeredBy).to.equal(operator.address);
      expect(summary.totalCustodyEvents).to.equal(0n);
    });

    it("Should reject duplicate batch registration", async function () {
      await registry.registerBatch(sampleBatchIdHash, sampleEvidenceHash);

      await expect(
        registry.registerBatch(sampleBatchIdHash, sampleEvidenceHash)
      ).to.be.revertedWith("EcoTrace: batch already registered");
    });

    it("Should reject zero hash registration", async function () {
      await expect(
        registry.registerBatch(ethers.ZeroHash, sampleEvidenceHash)
      ).to.be.revertedWith("EcoTrace: invalid batchIdHash");

      await expect(
        registry.registerBatch(sampleBatchIdHash, ethers.ZeroHash)
      ).to.be.revertedWith("EcoTrace: invalid evidenceHash");
    });

    it("Should reject unauthorized caller", async function () {
      await expect(
        registry.connect(unauthorized).registerBatch(sampleBatchIdHash, sampleEvidenceHash)
      ).to.be.revertedWith("EcoTrace: caller is not authorized operator");
    });
  });

  describe("Custody Event Anchoring", function () {
    beforeEach(async function () {
      await registry.registerBatch(sampleBatchIdHash, sampleEvidenceHash);
    });

    it("Should record custody events and increment count", async function () {
      await registry.connect(operator).recordCustodyEvent(sampleBatchIdHash, sampleCustodyEventHash);

      expect(await registry.getCustodyEventsCount(sampleBatchIdHash)).to.equal(1n);

      const eventRecord = await registry.getCustodyEvent(sampleBatchIdHash, 0);
      expect(eventRecord.eventHash).to.equal(sampleCustodyEventHash);
      expect(eventRecord.recordedBy).to.equal(operator.address);
    });

    it("Should reject custody event for non-existent batch", async function () {
      const fakeBatchHash = ethers.keccak256(ethers.toUtf8Bytes("NON-EXISTENT"));
      await expect(
        registry.recordCustodyEvent(fakeBatchHash, sampleCustodyEventHash)
      ).to.be.revertedWith("EcoTrace: batch does not exist");
    });
  });

  describe("Recovery Proof & Evidence Verification", function () {
    beforeEach(async function () {
      await registry.registerBatch(sampleBatchIdHash, sampleEvidenceHash);
    });

    it("Should record mass-balance recovery hash", async function () {
      await registry.recordRecovery(sampleBatchIdHash, sampleRecoveryHash);

      const summary = await registry.getBatchSummary(sampleBatchIdHash);
      expect(summary.recoveryHash).to.equal(sampleRecoveryHash);
      expect(await registry.verifyRecovery(sampleBatchIdHash, sampleRecoveryHash)).to.be.true;
    });

    it("Should correctly verify genuine evidence hash and reject mismatched hash", async function () {
      expect(await registry.verifyEvidence(sampleBatchIdHash, sampleEvidenceHash)).to.be.true;

      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("WRONG-EVIDENCE"));
      expect(await registry.verifyEvidence(sampleBatchIdHash, wrongHash)).to.be.false;
    });
  });
});
