// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EcoTraceRegistry
 * @dev Immutable on-chain registry for e-waste consignments, custody event hashes,
 * and mass-balance material recovery proofs.
 *
 * Implements access controls, non-repudiation, and tamper-evident event anchoring.
 * Stores only cryptographic digests (SHA-256 / Keccak-256) and block timestamps.
 */
contract EcoTraceRegistry {
    address public owner;

    // Authorized operators (collectors, transporters, recyclers, auditors)
    mapping(address => bool) public authorizedOperators;

    struct BatchRecord {
        bytes32 batchIdHash;
        bytes32 initialEvidenceHash;
        uint256 registeredAt;
        address registeredBy;
        bytes32 recoveryHash;
        uint256 recoveryTimestamp;
        bool exists;
    }

    struct CustodyEventRecord {
        bytes32 eventHash;
        uint256 timestamp;
        address recordedBy;
    }

    // batchIdHash => BatchRecord
    mapping(bytes32 => BatchRecord) private batches;

    // batchIdHash => array of CustodyEventRecord
    mapping(bytes32 => CustodyEventRecord[]) private custodyEvents;

    // Events
    event BatchRegistered(
        bytes32 indexed batchIdHash,
        bytes32 initialEvidenceHash,
        address indexed registeredBy,
        uint256 timestamp
    );

    event CustodyEventRecorded(
        bytes32 indexed batchIdHash,
        bytes32 eventHash,
        address indexed recordedBy,
        uint256 eventIndex,
        uint256 timestamp
    );

    event RecoveryRecorded(
        bytes32 indexed batchIdHash,
        bytes32 recoveryHash,
        address indexed recordedBy,
        uint256 timestamp
    );

    event OperatorAuthorized(address indexed operator, bool status);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "EcoTrace: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedOperators[msg.sender],
            "EcoTrace: caller is not authorized operator"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedOperators[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function setAuthorizedOperator(address operator, bool status) external onlyOwner {
        require(operator != address(0), "EcoTrace: invalid operator address");
        authorizedOperators[operator] = status;
        emit OperatorAuthorized(operator, status);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "EcoTrace: new owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Register a new e-waste batch with its initial evidence hash.
     * @param batchIdHash Keccak256 or SHA256 digest of the batch ID
     * @param evidenceHash SHA-256 digest of initial intake documentation/photo
     */
    function registerBatch(bytes32 batchIdHash, bytes32 evidenceHash) external onlyAuthorized {
        require(batchIdHash != bytes32(0), "EcoTrace: invalid batchIdHash");
        require(evidenceHash != bytes32(0), "EcoTrace: invalid evidenceHash");
        require(!batches[batchIdHash].exists, "EcoTrace: batch already registered");

        batches[batchIdHash] = BatchRecord({
            batchIdHash: batchIdHash,
            initialEvidenceHash: evidenceHash,
            registeredAt: block.timestamp,
            registeredBy: msg.sender,
            recoveryHash: bytes32(0),
            recoveryTimestamp: 0,
            exists: true
        });

        emit BatchRegistered(batchIdHash, evidenceHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Record a custody handover event hash for an active batch.
     * @param batchIdHash Batch identifier hash
     * @param eventHash Cryptographic hash of the handover event payload
     */
    function recordCustodyEvent(bytes32 batchIdHash, bytes32 eventHash) external onlyAuthorized {
        require(batches[batchIdHash].exists, "EcoTrace: batch does not exist");
        require(eventHash != bytes32(0), "EcoTrace: invalid eventHash");

        custodyEvents[batchIdHash].push(CustodyEventRecord({
            eventHash: eventHash,
            timestamp: block.timestamp,
            recordedBy: msg.sender
        }));

        uint256 eventIndex = custodyEvents[batchIdHash].length - 1;
        emit CustodyEventRecorded(batchIdHash, eventHash, msg.sender, eventIndex, block.timestamp);
    }

    /**
     * @notice Anchor validated mass-balance recovery claim digest to ledger.
     * @param batchIdHash Batch identifier hash
     * @param recoveryHash Cryptographic hash of reconciled mass-balance statement
     */
    function recordRecovery(bytes32 batchIdHash, bytes32 recoveryHash) external onlyAuthorized {
        require(batches[batchIdHash].exists, "EcoTrace: batch does not exist");
        require(recoveryHash != bytes32(0), "EcoTrace: invalid recoveryHash");
        require(batches[batchIdHash].recoveryHash == bytes32(0), "EcoTrace: recovery already recorded");

        batches[batchIdHash].recoveryHash = recoveryHash;
        batches[batchIdHash].recoveryTimestamp = block.timestamp;

        emit RecoveryRecorded(batchIdHash, recoveryHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify if an evidence hash matches the on-chain recorded initial hash.
     */
    function verifyEvidence(bytes32 batchIdHash, bytes32 evidenceHash) external view returns (bool) {
        if (!batches[batchIdHash].exists) return false;
        return batches[batchIdHash].initialEvidenceHash == evidenceHash;
    }

    /**
     * @notice Verify if a recovery hash matches the on-chain recorded recovery hash.
     */
    function verifyRecovery(bytes32 batchIdHash, bytes32 recoveryHash) external view returns (bool) {
        if (!batches[batchIdHash].exists) return false;
        return batches[batchIdHash].recoveryHash == recoveryHash;
    }

    /**
     * @notice Fetch summary and state of an audited batch.
     */
    function getBatchSummary(bytes32 batchIdHash) external view returns (
        bytes32 initialEvidenceHash,
        uint256 registeredAt,
        address registeredBy,
        bytes32 recoveryHash,
        uint256 recoveryTimestamp,
        uint256 totalCustodyEvents,
        bool exists
    ) {
        BatchRecord memory b = batches[batchIdHash];
        return (
            b.initialEvidenceHash,
            b.registeredAt,
            b.registeredBy,
            b.recoveryHash,
            b.recoveryTimestamp,
            custodyEvents[batchIdHash].length,
            b.exists
        );
    }

    /**
     * @notice Get custody events count for a batch.
     */
    function getCustodyEventsCount(bytes32 batchIdHash) external view returns (uint256) {
        return custodyEvents[batchIdHash].length;
    }

    /**
     * @notice Get specific custody event record.
     */
    function getCustodyEvent(bytes32 batchIdHash, uint256 index) external view returns (
        bytes32 eventHash,
        uint256 timestamp,
        address recordedBy
    ) {
        require(index < custodyEvents[batchIdHash].length, "EcoTrace: index out of bounds");
        CustodyEventRecord memory ev = custodyEvents[batchIdHash][index];
        return (ev.eventHash, ev.timestamp, ev.recordedBy);
    }
}
