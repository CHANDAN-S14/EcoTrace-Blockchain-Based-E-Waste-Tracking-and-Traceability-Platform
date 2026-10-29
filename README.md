# EcoTrace — Industrial E-Waste Intelligence & Traceability Platform
### Full-Stack Architecture: React 19 Frontend + Express.js Backend + Solidity Smart Contracts + QpiAI Opt & QCloud

EcoTrace is an enterprise-grade industrial e-waste tracking, mass-balance recovery reconciliation, and auditable material claims platform. It tracks electronic waste end-to-end from initial collection center intake through transit handovers, certified recycler receipt, metallurgical extraction, and regulatory CPCB audit certification.

---

## 1. System Architecture & Components

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ECOTRACE WEB APPLICATION (React 19)                  │
│       Tailwind CSS 4 • Recharts • Leaflet Maps • Vector QR Passports   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         Vite Dev Proxy / REST API
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    NODE.JS / EXPRESS.JS BACKEND                        │
│          JWT Auth • Multer File Upload • Zod Schema Validation         │
└───┬───────────────────────────────┬───────────────────────────────┬────┘
    │                               │                               │
┌───▼─────────────────┐   ┌─────────▼───────────────┐   ┌───────────▼────────────┐
│   MONGODB ATLAS     │   │   ETHEREUM / HARDHAT    │   │  QPIAI OPT & QCLOUD    │
│  Mongoose Schemas:  │   │  EcoTraceRegistry.sol   │   │  • Multi-Constraint    │
│  • Batches          │   │  • Batch Hash Anchors   │   │    Facility Assignment │
│  • Custody Events   │   │  • Custody Hash Chain   │   │  • 4-Qubit QAOA        │
│  • Recovery Proofs  │   │  • Recovery Proofs      │   │    Combinatorial QUBO  │
│  • Facilities       │   │  • Zero-Hash Protection │   │  • Cryo-CMOS QPU       │
└─────────────────────┘   └─────────────────────────┘   └────────────────────────┘
```

---

## 2. Key Modules & Pages

1. **Executive Dashboard (`/dashboard`)**
   - KPI metrics (Gross Intake, Batches in Transit, Material Recovered, Recovery Yield, Pending Custody Handovers, Flagged Claims).
   - Interactive Recharts data visualizations: Daily Intake vs Recovery Trend line chart, Segregated Material Fractions donut chart, Batch State Distribution bar chart, and Certified Facility Yield comparison.
   - Live Attention Required panel tracking duplicate claims, mass-balance mismatches, and missing handovers.
   - Real-time Immutable Audit Ledger stream.

2. **Batch Registration & Consignment Onboarding (`/batches`)**
   - Form validation powered by **Zod** and **React Hook Form**.
   - Automatic Batch ID sequencing (`BATCH-2026-XXXX`).
   - Authentic photographic evidence integration (real-world camera assets with photographer attribution).
   - Certified tare weighbridge document attachment.
   - Instant vector QR Passport generation with SVG download and copyable verification link.
   - Searchable consignment ledger with category and lifecycle status filters.

3. **Multi-Party Chain of Custody (`/custody`)**
   - 5-stage custody pipeline: *Collection Center → Transporter → Receiving Depot → Certified Recycler → Final Audit*.
   - Scale-to-scale variance reconciliation tracking dispatch weight vs received weight.
   - Interactive **Accept Handover** action (anchors cryptographic transaction on-chain).
   - **Report Discrepancy** workflow for scale variance or damaged seals exceeding certified tolerance.
   - Interactive **OpenStreetMap Leaflet Map** pinning collection hubs, transit corridors, and recycling plants.

4. **Processing & Mass-Balance Reconciliation (`/recovery`)**
   - Authoritative law-of-conservation formula:
     $$\text{Accounted Output} = \text{Recovered Materials} + \text{Residual Waste} + \text{Explained Process Loss}$$
     $$\text{Difference} = \text{Input Weight} - \text{Accounted Output}$$
     $$\text{Recovery Yield} = \frac{\text{Recovered Material}}{\text{Input Weight}} \times 100\%$$
   - Segregated extraction tracking: Copper, Aluminum, Steel, Precious Metals (Au/Ag/Pd), Polymers, and Glass.
   - Automated **Duplicate Claim Detection** alerting auditors when multiple facilities claim recovery credit for the same batch.

5. **Smart Recycler Assignment (`/optimization`)**
   - Powered by **QpiAI Opt** multi-constraint solver engine.
   - Batch selection with category compatibility matching and CPCB license verification.
   - Facility capacity ceiling enforcement.
   - Baseline vs Optimized Cost comparison (demonstrating ~31% logistics cost savings).
   - Mandatory **Human-in-the-Loop Approval** step before dispatches are committed to the ledger.

6. **Quantum Experiment Lab (`/quantum-lab`)**
   - Powered by **QpiAI QCloud** execution workflow.
   - Solves 4-Qubit QAOA Combinatorial Optimization for optimal balanced partition of high-priority consignments.
   - Interactive Quantum Circuit visualizer showing wires, Hadamard ($H$), Phase ($R_z(\gamma)$), Entanglement ($CX$), and Mixer ($R_x(\beta)$) gates.
   - Configurable shots (1024, 2048, 4096), angles ($\gamma, \beta$), and simulator backend.
   - Normalized measurement bitstring probability distribution highlighting ground states $|0110\rangle$ and $|1001\rangle$.

7. **Audit, Compliance & Verification Ledger (`/audit`)**
   - Auditor search engine across batch IDs, SHA-256 evidence digests, and consensus block transaction hashes.
   - Interactive **Audit Certificate Generator** creating printable, formal CPCB compliance certificates.
   - JSON audit data export.
   - Clear statutory transparency disclaimer explaining the cryptographic scope of blockchain proof.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 19 (Pure JavaScript ES6+ & JSX) & Vite 8
- **Styling**: Tailwind CSS 4 (`@tailwindcss/vite`), Custom Design Tokens
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form, Zod, `@hookform/resolvers`
- **QR Engine**: `qrcode.react` (Vector SVG / Canvas)
- **Maps**: Leaflet with OpenStreetMap tiles
- **Fonts**: Space Grotesk (Headings/KPIs), Inter (Body), JetBrains Mono (Technical/Hashes)

### Backend
- **Runtime**: Node.js v22/v25 LTS, Express.js
- **Database**: MongoDB Atlas / Local MongoDB via Mongoose
- **Authentication**: JWT with Role-Based Access Control (`Administrator`, `Auditor`, `Collector`, `Recycler`, `Transporter`)
- **Security**: Helmet, CORS, Rate Limiting (`express-rate-limit`)
- **File Uploads**: Multer for weighing bridge slips and evidence photos

### Blockchain & Smart Contracts
- **Contract Language**: Solidity `0.8.20`
- **Framework**: Hardhat with `@nomicfoundation/hardhat-toolbox`
- **Client**: Ethers.js v6
- **Smart Contract**: `contracts/EcoTraceRegistry.sol`
  - Access control and operator authorization
  - Immutable batch evidence anchoring
  - Cryptographic custody hash-chaining (`previousEventHash -> currentEventHash`)
  - Mass-balance recovery proof storage
  - Tamper verification (`verifyEvidenceHash`)

### Quantum & Optimization Services
- **QpiAI Opt Engine**: Constrained facility allocation solver with cloud API adapter and deterministic classical MILP fallback
- **QpiAI QCloud Lab**: 4-qubit QAOA and 3-qubit VQE quantum optimization workflow with statevector simulation fallback

---

## 4. Quick Start & Execution

### Prerequisites
- Node.js (v20+ recommended)
- MongoDB running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI

### 1. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### 2. Run Test Suites
```bash
# 1. Run Backend API Integration Tests (18 tests)
npm test --prefix backend

# 2. Run Solidity Smart Contract Tests (10 tests)
npm run test:contracts --prefix backend
```

### 3. Run Backend Server
```bash
cd backend
npm start
# Server listens on http://localhost:5000
```

### 4. Run Frontend Application
```bash
npm run dev
# Frontend runs on http://localhost:5173
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. API Reference Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | System diagnostics, MongoDB, Blockchain & Quantum status |
| `/api/batches` | GET / POST | List batches or register new e-waste consignment |
| `/api/batches/:batchId` | GET | Batch details with QR code and audit log |
| `/api/batches/:batchId/qr` | GET | Direct base64 vector QR passport image |
| `/api/batches/:batchId/handovers` | POST | Append chain-of-custody transfer event |
| `/api/custody/:handoverId/accept` | POST | Accept handover and anchor hash on-chain |
| `/api/custody/:handoverId/discrepancy` | POST | Report weighing scale discrepancy |
| `/api/recovery` | POST | Submit mass-balance recovery claim |
| `/api/recovery/exceptions` | GET | Query flagged reconciliation discrepancies |
| `/api/optimization/run` | POST | Execute QpiAI Opt multi-constraint allocation |
| `/api/optimization/:runId/approve` | POST | Human-in-the-loop approval of assignments |
| `/api/quantum/experiments` | POST | Run 4-Qubit QAOA quantum optimization circuit |
| `/api/quantum/experiments` | GET | Retrieve quantum circuit execution history |
| `/api/quantum/status` | GET | Check quantum backends and simulators |
| `/api/audit/records` | GET | Searchable immutable audit trail |
| `/api/audit/compliance` | GET | CPCB compliance metrics and facility quota |
| `/api/facilities` | GET | Registered CPCB certified recycling facilities |

---

## 6. Regulatory Mass-Balance Formula

Under CPCB E-Waste Management Rules 2022:

$$\text{Gross Dispatched Weight} - \text{Gross Received Weight} = \Delta_{\text{Transit}}$$
$$\text{Tolerance} \le 0.5 \text{ kg (or } 0.5\%)$$
$$\text{Input Weight} = \sum \text{Recovered Fractions} + \text{Hazardous Residue} + \text{Pyrolytic Loss}$$

Discrepancies exceeding $0.5\text{ kg}$ automatically trigger on-chain non-compliance events and flag the batch for statutory review.
