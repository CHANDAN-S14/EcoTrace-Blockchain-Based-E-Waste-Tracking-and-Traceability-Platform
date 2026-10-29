import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Scale,
  Recycle,
  GitCommitHorizontal,
  Layers,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Database,
  CheckCircle2,
  Cpu,
  Boxes,
  Lock,
  ExternalLink,
  Atom,
  Server,
  FileText,
  Truck,
  Sparkles,
  ShieldAlert,
  Award,
  Check,
  X,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react'

/**
 * Reusable component for displaying verified real photographs with responsive container,
 * descriptive industrial caption, photographer attribution, lazy loading, and error fallback.
 */
function RealPhoto({
  src,
  alt,
  caption,
  creditName,
  creditUrl,
  aspect = 'aspect-16/9',
  className = '',
}) {
  const [hasError, setHasError] = useState(false)

  return (
    <figure className={`overflow-hidden rounded-2xl border border-[#E3EAE5] bg-[#FAFCFA] shadow-xs group ${className}`}>
      <div className={`relative ${aspect} w-full overflow-hidden bg-gray-100`}>
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-gray-50">
            <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-600">Archival Industrial Image</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-sm">{alt}</p>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 ease-out"
          />
        )}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#003B23]/80 backdrop-blur-md text-[10px] font-semibold text-[#A7F3D0] border border-white/10 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-[#34D399]" />
            Verified Industrial Record
          </span>
        </div>
      </div>
      {(caption || creditName) && (
        <figcaption className="p-3.5 bg-white border-t border-[#F0F4F2] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-gray-600 leading-snug font-normal text-[11px] sm:text-xs">
            {caption}
          </span>
          {creditName && (
            <span className="text-[10px] font-mono text-gray-400 shrink-0 self-start sm:self-auto">
              Photo by{' '}
              {creditUrl ? (
                <a
                  href={creditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-[#176B45] underline decoration-gray-300 hover:decoration-[#176B45]"
                >
                  {creditName}
                </a>
              ) : (
                <span className="text-gray-600">{creditName}</span>
              )}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}

export function AboutPage() {
  // 10-Step Traceability Architecture
  const workflow10Steps = [
    {
      num: 1,
      title: 'Consignment Registration & Tamper-Evident Bag Sealing',
      role: 'Origin Generator / E-Waste Collector',
      evidence: 'Unique Batch ID, category tag, tamper-evident barcode seal',
      desc: 'Initial collection intake recording source facility credentials, waste categorization (Form 2), and affixing tamper-evident serialized bag seals before transit.',
      icon: Boxes,
      badge: 'Genesis Intake',
    },
    {
      num: 2,
      title: 'Origin Weighbridge Verification & Evidence Hashing',
      role: 'Certified Scale Operator & Custodian',
      evidence: 'Digitally signed weighbridge slip, geo-tagged photos, SHA-256 digest',
      desc: 'Consignment is weighed on calibrated industrial weighbridge. Slip PDF and intake photographs are digested into a 32-byte cryptographic SHA-256 fingerprint.',
      icon: Lock,
      badge: 'Cryptographic Digest',
    },
    {
      num: 3,
      title: 'First-Mile Logistics Dispatch & Vehicle Geo-Tagging',
      role: 'Authorized Transporter & Logistics Driver',
      evidence: 'Vehicle registration, driver license, GPS route corridor, dispatch challan',
      desc: 'Transporter signs digital custody receipt, confirms vehicle containment seals, and initiates GPS-tracked corridor transit under state e-manifest rules.',
      icon: Truck,
      badge: 'Corridor Dispatch',
    },
    {
      num: 4,
      title: 'Depot Inward Scale Audit & Transit Variance Checking',
      role: 'Intermediate Hub / Depot Receiving Custodian',
      evidence: 'Inward weighbridge gross/tare record, dual signatures, transit variance proof',
      desc: 'Depot performs immediate secondary weigh-in. System computes transit variance: if deviation exceeds ±1.5%, an automatic Discrepancy Flag locks downstream processing.',
      icon: Scale,
      badge: 'Variance Guard (±1.5%)',
    },
    {
      num: 5,
      title: 'Secondary Consolidation & Smart Dispatch Optimization',
      role: 'Logistics Controller & QpiAI Opt Cloud Solver',
      evidence: 'Optimization job ID, QUBO / classical MILP dispatch formulation, route manifest',
      desc: 'Multi-objective cloud solver matches consolidated batches to authorized secondary dismantlers based on license capacity, transport emissions, and processing capability.',
      icon: Cpu,
      badge: 'QpiAI Optimization',
    },
    {
      num: 6,
      title: 'Authorized Recycler Acceptance & Gatekeeper Inspection',
      role: 'Receiving Recycler Dock Manager',
      evidence: 'Receiving gatekeeper receipt, seal integrity verification, inward weighment',
      desc: 'Recycling facility inspects physical tamper seals, verifies consignment hash against blockchain registry, and dual-signs physical custody takeover.',
      icon: GitCommitHorizontal,
      badge: 'Dual-Party Handover',
    },
    {
      num: 7,
      title: 'Mechanical Dismantling & Material Segregation',
      role: 'Metallurgical Technicians & Shredder Operators',
      evidence: 'Optical sorting fraction logs, PCB lot assignment, hazardous waste manifest',
      desc: 'E-waste undergoes primary shredding, magnetic separation, eddy current sorting, and PCB board extraction, categorizing streams into metals, polymers, and hazardous cells.',
      icon: Recycle,
      badge: 'Dismantling & Sorting',
    },
    {
      num: 8,
      title: 'Mass-Balance Conservation Ledger Reconciliation',
      role: 'Compliance Plant Engineer & Lab Analyst',
      evidence: 'Thermodynamic mass equation proof, moisture loss logs, slag tickets',
      desc: 'System enforces strict conservation of mass: Input Weight = Σ(Recovered Materials) + Process Losses + Residual Slag. Unaccounted variance > 0.5 kg triggers audit escalation.',
      icon: Scale,
      badge: 'Mass Conservation Proof',
    },
    {
      num: 9,
      title: 'Cryptographic Blockchain Consensus Anchoring',
      role: 'EcoTrace Smart Contract Relayer & EVM Node',
      evidence: 'Ethereum Sepolia block number, transaction receipt, contract state root',
      desc: 'Finalized batch lifecycle hashes, custody events, and mass balance checksums are immutably anchored to contract 0xF81819d91d0d23612C888987cfA4EdC09e91B862 on Sepolia.',
      icon: Layers,
      badge: 'Sepolia Consensus',
    },
    {
      num: 10,
      title: 'Statutory CPCB Audit Sign-Off & Transferable EPR Issuance',
      role: 'Accredited Environmental Auditor & State PCB Inspector',
      evidence: 'CPCB Form 6 audit pack, non-repudiation cryptographic stamp, EPR credit ID',
      desc: 'Auditor conducts independent physical and on-chain verification, signing the tamper-evident audit dossier to certify EPR obligations and release auditable compliance credits.',
      icon: FileCheck2,
      badge: 'CPCB Form 6 Certified',
    },
  ]

  // Comparison Table (7 capabilities)
  const comparisonRows = [
    {
      capability: 'Weighbridge-to-Ledger Integration',
      ecotrace: 'Digital scale slip upload with automatic SHA-256 hashing and dual gross/tare verification at origin and receiving docks.',
      erp: 'Manual keyboard entry into ERP forms; tare weights rarely checked against vehicle registrations.',
      paper: 'Handwritten gate challans and paper slips vulnerable to loss, water damage, and transcription error.',
    },
    {
      capability: 'Cryptographic Tamper-Evidence',
      ecotrace: 'Consignment hashes and stage transitions anchored immutably to Ethereum Sepolia (Chain ID 11155111); historical data is non-repudiable.',
      erp: 'Database records can be edited directly by database administrators or via retroactive adjustments without cryptographic proof.',
      paper: 'Zero tamper evidence; physical ink signatures can be forged or carbon copies altered.',
    },
    {
      capability: 'Dual-Signature Custody Handovers',
      ecotrace: 'Cryptographic dual sign-off: carrier confirms vehicle containment; receiver performs independent weighment before release.',
      erp: 'Unilateral status updates ("Dispatched", "Received") with no binding carrier acknowledgement.',
      paper: 'Carbon-copy lorry receipts signed hurriedly with no real-time verification or dispute escalation.',
    },
    {
      capability: 'Mass-Balance Enforcement (±0.5 kg)',
      ecotrace: 'Thermodynamic formula validation: Input = Σ(Recovered) + Process Loss + Slag. Discrepancies > 0.5 kg trigger automated reconciliation conflicts.',
      erp: 'Aggregate monthly reports with loose yield estimates; unaccounted mass discrepancies hidden in generic shrinkage accounts.',
      paper: 'Non-existent; scrap buyers estimate weights visually without material-balance reconciliation.',
    },
    {
      capability: 'Anti-Double Counting Protection',
      ecotrace: 'Cryptographic claim indexing ensures every batch ID and recovery fraction can only be claimed once across all registered facilities.',
      erp: 'Isolated system per enterprise; impossible to detect if another company claimed the same consignment.',
      paper: 'Prevalent EPR fraud: identical recycler invoices photocopied and submitted to multiple brand owners.',
    },
    {
      capability: 'Multi-Transporter Corridors',
      ecotrace: 'Corridor-level tracking across primary freight carriers and secondary consolidation depots with automated ±1.5% transit variance guards.',
      erp: 'Single carrier field with no intermediate depot scale verification or transit discrepancy isolation.',
      paper: 'Complete visibility loss once the vehicle leaves the origin gates until arrival at destination.',
    },
    {
      capability: 'Real-Time Statutory CPCB Reporting',
      ecotrace: 'One-click Form 2 & Form 6 audit dossiers with live Sepolia block receipts, SHA-256 evidence digests, and mass conservation proof.',
      erp: 'Requires weeks of manual data compilation and custom SQL queries for annual environmental filings.',
      paper: 'Boxes of ring binders, physical receipts, and spreadsheets requiring months of painful manual auditing.',
    },
  ]

  // Practical Challenges
  const practicalProblems = [
    {
      title: 'Phantom & Paper-Only EPR Credits',
      desc: 'Unscrupulous recyclers issue Extended Producer Responsibility (EPR) certificates on paper without physically processing scrap, creating artificial compliance for electronics brands while toxic metals end up in open landfills.',
      icon: ShieldAlert,
    },
    {
      title: 'Weighbridge Discrepancies & Moisture Dilution',
      desc: 'Consignments routinely lose or gain mass between origin collection yards and secondary smelters due to deliberate high-value stripping, rain soaking, or uncalibrated gross-tare scales lacking tamper-evident digital records.',
      icon: Scale,
    },
    {
      title: 'Multi-Tier Transporter Blindspots',
      desc: 'E-waste shipments change hands between informal aggregators, regional third-party logistics (3PL) carriers, and consolidation depots with zero unbroken custody records, leaving origin generators legally exposed to illegal dumping.',
      icon: Truck,
    },
    {
      title: 'Downstream Smelter Leakage',
      desc: 'High-value fractions like printed circuit boards and lithium batteries are frequently diverted to unauthorized acid-leaching sheds and open-pit smelters for crude extraction, leaving non-recoverable toxic slag unmonitored.',
      icon: AlertTriangle,
    },
    {
      title: 'Uncalibrated Scales & Inconsistent Units',
      desc: 'Intake is recorded in gross gunny bags, freight in metric tonnes, and recycler recovery in dry kilograms without standard tare deductions or calibration certifications, making physical mass conservation verification impossible.',
      icon: GitCommitHorizontal,
    },
    {
      title: 'Audit Amnesia & Fragmented PDF Archives',
      desc: 'Weighbridge slips, gate photos, and hazardous waste manifests remain trapped across WhatsApp chats, paper binders, and disjointed spreadsheets that collapse during rigorous CPCB or state environmental inspections.',
      icon: FileText,
    },
  ]

  return (
    <div className="space-y-16 pb-20 max-w-6xl mx-auto">
      {/* ========================================================================= */}
      {/* SECTION A: HERO — PURPOSE & STATUTORY MISSION                             */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003B23] via-[#0B4D31] to-[#176B45] text-white p-6 sm:p-10 md:p-12 shadow-lg">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#A7F3D0] text-xs font-semibold border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-[#34D399]" />
              <span>National E-Waste Traceability &amp; Mass Conservation</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight font-heading">
              India&apos;s First Cryptographically Anchored Industrial E-Waste Traceability Platform
            </h1>

            <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
              <strong>EcoTrace</strong> bridges the critical chasm between Central Pollution Control Board (CPCB) Extended Producer Responsibility mandates, certified physical weighbridge measurements, multi-transporter logistics chains, and downstream metallurgical material recovery.
            </p>

            {/* 4 Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] font-mono text-[#A7F3D0] uppercase block">Mass Conservation</span>
                <strong className="text-sm font-bold text-white block mt-0.5">100% Accounted</strong>
                <span className="text-[10px] text-gray-300">±0.5 kg strict threshold</span>
              </div>

              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] font-mono text-[#A7F3D0] uppercase block">Blockchain Consensus</span>
                <strong className="text-sm font-bold text-white block mt-0.5">Ethereum Sepolia</strong>
                <span className="text-[10px] text-gray-300">Immutable 32-byte roots</span>
              </div>

              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] font-mono text-[#A7F3D0] uppercase block">Anti-Fraud Engine</span>
                <strong className="text-sm font-bold text-white block mt-0.5">Zero Duplicates</strong>
                <span className="text-[10px] text-gray-300">Single-claim indexed</span>
              </div>

              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <span className="text-[10px] font-mono text-[#A7F3D0] uppercase block">Custody Integrity</span>
                <strong className="text-sm font-bold text-white block mt-0.5">Dual Sign-Off</strong>
                <span className="text-[10px] text-gray-300">±1.5% variance check</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                to="/batches"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
              >
                <span>Register Intake Consignment</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/custody"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 transition-all backdrop-blur-sm"
              >
                <Truck className="w-4 h-4 text-[#34D399]" />
                <span>Chain of Custody</span>
              </Link>
              <Link
                to="/audit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 transition-all backdrop-blur-sm"
              >
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                <span>CPCB Audit Consensus</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Real Photo 1: Hero PCB Recycling */}
        <RealPhoto
          src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80"
          alt="Printed circuit boards and microchips ready for industrial electronic recycling and metal recovery"
          caption="Printed circuit boards (PCBs) and microchips ready for industrial shredding, hydrometallurgical leaching, and precious metal recovery in an authorized recycling facility."
          creditName="Alexandre Debiève"
          creditUrl="https://unsplash.com/photos/FO7JIlwjOtU"
        />
      </section>

      {/* ========================================================================= */}
      {/* SECTION B: THE PROBLEM — WHY E-WASTE TRACEABILITY FAILS IN PRACTICE       */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            Industrial Reality &amp; Failure Modes
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            Why Conventional E-Waste Traceability Fails
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            E-waste is India&apos;s fastest growing solid waste stream, projected to surpass 5 million tonnes annually. Yet conventional compliance relies on paper invoices and mutable ERP spreadsheets that fail to prevent mass tampering, phantom credits, and illegal acid-bath refining.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {practicalProblems.map((prob, idx) => {
            const Icon = prob.icon
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-[#E3EAE5] shadow-2xs hover:shadow-sm transition-all space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF5E7] text-[#B8741A] flex items-center justify-center shrink-0 border border-[#FAD7A0]">
                    <Icon className="w-5 h-5 text-[#E9A23B]" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 font-heading">
                    {prob.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed font-normal">
                    {prob.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>Risk Vector 0{idx + 1}</span>
                  <span className="text-red-500 font-semibold uppercase text-[10px]">Critical Vulnerability</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Real Photo 2: Mixed Electronic Scrap Heap */}
        <RealPhoto
          src="https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=1200&q=80"
          alt="Mixed industrial electronic waste scrap heap including cables, circuit boards, and appliances awaiting formal intake"
          caption="Mixed electronic waste scrap heap awaiting formal sorting in an industrial collection yard. Without cryptographic custody tracking, high-value components leak into informal acid baths."
          creditName="John Cameron"
          creditUrl="https://unsplash.com/photos/FLLNkSGgBjk"
        />
      </section>

      {/* ========================================================================= */}
      {/* SECTION C: HOW ECOTRACE WORKS — 10-STEP ARCHITECTURE                     */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            End-to-End Pipeline
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            How EcoTrace Works: The 10-Step Traceability Architecture
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            Every consignment follows a strict, unbroken, verifiable 10-stage lifecycle from initial intake bag sealing to thermodynamic mass conservation and statutory CPCB EPR sign-off.
          </p>
        </div>

        {/* 10-Step Numbered Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflow10Steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.num}
                className="bg-white p-5 rounded-2xl border border-[#E3EAE5] shadow-2xs hover:border-[#176B45] transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#E8F5EE] text-[#176B45] font-bold font-mono text-xs flex items-center justify-center border border-[#C2E3D0]">
                        {step.num < 10 ? `0${step.num}` : step.num}
                      </span>
                      <span className="text-xs font-bold text-gray-900 font-heading">
                        {step.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded-full border border-[#C2E3D0] shrink-0">
                      {step.badge}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F0F4F2] space-y-1.5 text-[11px]">
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-gray-700 shrink-0">Responsible Party:</span>
                    <span className="text-gray-600">{step.role}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-[#176B45] shrink-0">Key Evidence:</span>
                    <span className="font-mono text-gray-600 text-[10px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{step.evidence}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION D: MULTI-PARTY CHAIN OF CUSTODY & DUAL-SIGNATURE HANDOVER        */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            Physical Custody Protocols
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            Multi-Party Chain of Custody &amp; Dual-Signature Handover
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            Consignments cannot simply change hands with unilateral checkboxes. EcoTrace enforces mathematical dual-signature verification, vehicle registration locking, and automatic discrepancy thresholds at every physical transfer point.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
            <div className="p-4 rounded-xl bg-white border border-[#E3EAE5] space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#003B23] font-heading">
                <Truck className="w-4 h-4 text-[#176B45]" />
                <span>1. Carrier Custody Binding</span>
              </div>
              <p>
                When a transport provider accepts e-waste, the driver confirms container integrity, verified vehicle license plates, and signs the dispatch manifest with a timestamped cryptographic hash.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E3EAE5] space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#003B23] font-heading">
                <Scale className="w-4 h-4 text-[#176B45]" />
                <span>2. Independent Receiving Weighment</span>
              </div>
              <p>
                The receiving depot or recycler cannot inherit the origin weight blindly. Their local certified scale operator performs an independent gross and tare weighment prior to signing the handover acceptance receipt.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FEF5E7] border border-[#FAD7A0] space-y-2 text-[#8C5205]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#8C5205] font-heading">
                <AlertTriangle className="w-4 h-4 text-[#E9A23B]" />
                <span>3. Automated ±1.5% Discrepancy Quarantine</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                If the transit variance between dispatch gross weight and arrival gross weight exceeds <strong>±1.5%</strong>, the platform immediately flags a Discrepancy Event, freezes downstream allocation, and dispatches an incident report to the compliance directorate.
              </p>
            </div>
          </div>

          {/* Real Photo 3: Logistics Freight Truck */}
          <RealPhoto
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80"
            alt="Commercial heavy freight transport truck arriving at an industrial logistics distribution warehouse"
            caption="Commercial freight transport vehicle at an industrial distribution logistics dock with weighbridge gatekeeping and dual-signature verification."
            creditName="Adrian Sulyok"
            creditUrl="https://unsplash.com/photos/scwhbvQ884k"
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION E: MASS CONSERVATION & THERMODYNAMIC MATERIAL BALANCE             */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            First Law of Thermodynamics
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            Mass Conservation &amp; Material Balance Reconciliation
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            In circular metallurgy, matter cannot be created or destroyed. EcoTrace replaces arbitrary percentage estimates with rigorous physical mass-balance equations governed by strict tolerance limits.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Real Photo 4: Recovered Copper Coils */}
          <RealPhoto
            src="https://images.unsplash.com/photo-1535813547-99c456a41d4a?auto=format&fit=crop&w=1200&q=80"
            alt="Recovered copper wire coils and raw copper spools extracted through mechanical recycling"
            caption="Recovered copper wire coils and raw secondary metal extracted through mechanical granulating and eddy-current separation ready for smelting."
            creditName="Christopher Burns"
            creditUrl="https://unsplash.com/photos/8KfCR12oeUM"
          />

          <div className="space-y-4">
            <div className="bg-[#FAFCFA] p-5 rounded-2xl border border-[#E3EAE5] space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#176B45] font-bold block">
                Statutory Mass Balance Equation
              </span>
              <div className="p-3 bg-white rounded-xl border border-[#C2E3D0] font-mono text-xs sm:text-sm text-[#003B23] font-bold leading-relaxed shadow-2xs">
                M<sub>Gross Input</sub> = &Sigma; M<sub>Recovered</sub> + M<sub>Residual Slag</sub> + M<sub>Process Loss</sub> &plusmn; &Delta;
              </div>
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                Where &Delta; represents the unaccounted mass difference. EcoTrace enforces that &Delta; must equal zero within a strict calibration tolerance of <strong>&plusmn;0.5 kg</strong>.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-[#E3EAE5]">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 block">Moisture Loss Bounds (2.0% - 5.0%)</strong>
                  <span className="text-gray-500">Normal shredding evaporation is capped. Any moisture claim exceeding 5.0% requires laboratory oven dry-weight calibration certificates.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-[#E3EAE5]">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 block">Slag &amp; Hazardous Landfill Tracking</strong>
                  <span className="text-gray-500">Non-recoverable materials (brominated flame retardant plastics, heavy lead glass) must be accompanied by authorized TSDF manifest receipts.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION F: BLOCKCHAIN-BACKED EVIDENCE — ON-CHAIN VS OFF-CHAIN             */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            Architecture Separation of Concerns
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            Blockchain-Backed Evidence: What Is On-Chain vs. Off-Chain
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            Enterprise compliance requires both high-resolution file archiving and tamper-proof legal non-repudiation. EcoTrace enforces an architecturally clean split between operational storage and blockchain state roots.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Off-Chain */}
          <div className="p-5 rounded-2xl bg-white border border-[#E3EAE5] shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 font-heading">
                Off-Chain Operational Data
              </h3>
              <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                MongoDB &amp; Encrypted Blob Storage
              </span>
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                High-resolution intake photos, multi-page PDF weighbridge slips, GPS telematics tracks, driver identity credentials, facility registration details, and detailed sorting line manifests.
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 font-medium">
              High throughput &bull; Fast querying &bull; Private documents
            </div>
          </div>

          {/* Card 2: On-Chain */}
          <div className="p-5 rounded-2xl bg-white border border-[#C2E3D0] shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5EE] text-[#176B45] flex items-center justify-center border border-[#C2E3D0]">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 font-heading">
                On-Chain Cryptographic Consensus
              </h3>
              <span className="text-[10px] font-mono text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded border border-[#C2E3D0] inline-block">
                Ethereum Sepolia (Chain ID 11155111)
              </span>
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                32-byte cryptographic SHA-256 evidence digests, batch status transitions, dual-party custody hashes, and mass-balance checksums anchored to smart contract <code className="font-mono text-[10px] text-[#003B23] bg-[#E8F5EE] px-1 py-0.5 rounded">0xF818...B862</code>.
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 text-[11px] text-[#176B45] font-medium">
              Global immutability &bull; Non-repudiation &bull; Zero gas for viewers
            </div>
          </div>

          {/* Card 3: Physical Reality & Statutory Limits */}
          <div className="p-5 rounded-2xl bg-white border border-[#FAD7A0] shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FEF5E7] text-[#B8741A] flex items-center justify-center border border-[#FAD7A0]">
                <Scale className="w-4 h-4 text-[#E9A23B]" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 font-heading">
                Physical Reality &amp; Truthfulness
              </h3>
              <span className="text-[10px] font-mono text-[#B8741A] bg-[#FEF5E7] px-2 py-0.5 rounded border border-[#FAD7A0] inline-block">
                Legal Metrology &amp; Accredited Inspection
              </span>
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                Blockchain guarantees that recorded hashes cannot be altered retroactively. It does <em>not</em> replace accredited physical scale calibration by state metrology departments or on-site inspections of dismantling facilities.
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 text-[11px] text-[#B8741A] font-medium">
              Legal metrology stamps &bull; On-site calibration &bull; Physical integrity
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION G: RECOVERY-CLAIM INTEGRITY & ANTI-FRAUD ENGINE                   */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            Fraud Mitigation &amp; Market Integrity
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            Recovery-Claim Integrity &amp; Anti-Fraud Engine
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            In Extended Producer Responsibility credit markets, fraudulent double-issuance undermines environmental policy. EcoTrace uses server-side consensus indexing to eliminate duplicate claims.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white border border-[#E3EAE5] space-y-2">
            <div className="flex items-center gap-2 font-bold text-gray-900 font-heading">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              <span>Anti-Double-Counting Guard</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Every Batch ID and secondary material claim is uniquely registered in a state index. Any attempt to submit a duplicate claim for the same physical lot across different recycler accounts is automatically rejected.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E3EAE5] space-y-2">
            <div className="flex items-center gap-2 font-bold text-gray-900 font-heading">
              <Atom className="w-4 h-4 text-[#176B45]" />
              <span>Thermodynamic Purity Bounds</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              The platform maintains physical yield bounds for electronic waste categories (e.g. telecom circuit boards cannot yield more gold or copper than physical metallurgical assays permit), blocking exaggerated recovery claims.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E3EAE5] space-y-2">
            <div className="flex items-center gap-2 font-bold text-gray-900 font-heading">
              <GitCommitHorizontal className="w-4 h-4 text-[#176B45]" />
              <span>Cross-Facility Validation</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              A recovery claim cannot be created in isolation. It requires an unbroken chain of custody linked to an authentic inward transit handover from an authorized licensed transporter.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION H: AUDIT-READY STATUTORY REPORTING (CPCB COMPLIANCE)             */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            Regulatory Readiness
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            Audit-Ready Statutory Reporting: CPCB Form 2 &amp; Form 6
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            During statutory audits by state pollution control boards, EcoTrace produces comprehensive, non-repudiable audit dossiers complete with cryptographic receipts, material breakdowns, and mass balance proofs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
            <p>
              Under the Indian E-Waste (Management) Rules, 2022, producers, refurbishers, and recyclers must maintain detailed manifests for all consignments, their dismantling yields, and final TSDF hazardous slag disposal.
            </p>

            <ul className="space-y-2.5">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span><strong>Instant Full Audit Dossier:</strong> Generates formatted multi-page PDF audit reports containing all 10 statutory sections, dual-signatures, and live Sepolia consensus verification.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span><strong>Cryptographic Evidence Register:</strong> Distinguishes 32-byte SHA-256 evidence digests from Ethereum transaction hashes to prove document integrity without exposing private PII.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span><strong>Statutory Non-Repudiation:</strong> Prevents retrospective modifications to recorded dispatch weights or recycler yield declarations during regulatory review.</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                to="/reports"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B45] hover:underline"
              >
                <span>View Compliance &amp; Reporting Module</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Real Photo 5: Industrial Compliance Auditor */}
          <RealPhoto
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80"
            alt="Environmental compliance officer and quality auditor inspecting industrial equipment"
            caption="Accredited environmental compliance auditor inspecting operational calibration stamps and hazardous material manifests on site."
            creditName="Science in HD"
            creditUrl="https://unsplash.com/photos/4OJvTWdb-84"
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION I: WHAT MAKES ECOTRACE DIFFERENT — FACTUAL COMPARISON TABLE      */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            Comparative Benchmark
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            What Makes EcoTrace Different: Factual Benchmark
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            A side-by-side technical evaluation contrasting EcoTrace against conventional corporate ERP systems and legacy paper/PDF manifests.
          </p>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl border border-[#E3EAE5] shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFCFA] border-b border-[#E3EAE5]">
                <th className="py-3.5 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider w-1/5">
                  Capability
                </th>
                <th className="py-3.5 px-4 text-xs font-bold text-[#003B23] uppercase tracking-wider bg-[#E8F5EE]/60 w-2/5">
                  EcoTrace Industrial Platform
                </th>
                <th className="py-3.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/5">
                  Traditional ERP (SAP/Oracle)
                </th>
                <th className="py-3.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/5">
                  Paper &amp; PDF Workflows
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE5] text-xs">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#FAFCFA] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-gray-900 align-top">
                    {row.capability}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#003B23] bg-[#E8F5EE]/30 leading-relaxed align-top">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                      <span>{row.ecotrace}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 leading-relaxed align-top">
                    {row.erp}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 leading-relaxed align-top">
                    {row.paper}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION J: BUILT FOR INDUSTRIAL COMPLIANCE & CLOSING CTA                 */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#176B45] uppercase tracking-wider">
            Industrial Facility Infrastructure
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 font-heading">
            Engineered for Modern Circular Electronics Facilities
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            EcoTrace provides the digital backbone for responsible recycling infrastructure across India, helping authorized facilities maintain transparent compliance with international R2, e-Stewards, and CPCB statutory guidelines.
          </p>
        </div>

        {/* Real Photo 6: State of the art recycling plant */}
        <RealPhoto
          src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80"
          alt="State-of-the-art modern electronic waste sorting and recycling facility"
          caption="Modern certified material recovery facility featuring optical segregation, mechanical shredding, and zero-effluent water recycling."
          creditName="Alfonso Navarro"
          creditUrl="https://unsplash.com/photos/qAQNPBhdWek"
        />

        {/* Closing Action Banner */}
        <div className="bg-[#E8F5EE] border border-[#C2E3D0] rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-lg sm:text-xl font-bold text-[#003B23] font-heading">
              Ready to verify or inspect e-waste consignments?
            </h3>
            <p className="text-xs sm:text-sm text-[#176B45] leading-relaxed">
              Experience the end-to-end chain of custody, verify live on-chain consensus, or generate a CPCB statutory audit report for any registered consignment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/batches"
              className="px-5 py-2.5 rounded-xl bg-[#176B45] hover:bg-[#003B23] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              Register Consignment
            </Link>
            <Link
              to="/custody"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-[#176B45] text-xs sm:text-sm font-semibold border border-[#C2E3D0] transition-colors shadow-2xs"
            >
              Explore Custody Ledger
            </Link>
            <Link
              to="/audit"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold border border-gray-300 transition-colors shadow-2xs"
            >
              Audit &amp; Consensus
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
