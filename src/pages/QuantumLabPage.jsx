import React, { useState, useEffect } from 'react'
import {
  Atom,
  Cpu,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  Database,
  ArrowRightCircle,
} from 'lucide-react'
import { QuantumCircuitVisualizer } from '../components/quantum/QuantumCircuitVisualizer'
import { StateDistributionChart } from '../components/quantum/StateDistributionChart'
import { ExperimentConfigPanel } from '../components/quantum/ExperimentConfigPanel'
import { ExperimentHistoryTable } from '../components/quantum/ExperimentHistoryTable'
import {
  PRESET_CIRCUITS,
  SUPPORTED_BACKENDS,
  runQuantumExperiment,
  fetchQuantumStatus,
  fetchQuantumHistory,
} from '../services/quantumService'
import { useBatchStore } from '../hooks/useBatchStore'

export function QuantumLabPage() {
  const { addToast } = useBatchStore()

  const [selectedBackend, setSelectedBackend] = useState(SUPPORTED_BACKENDS[0].id)
  const [selectedCircuit, setSelectedCircuit] = useState(PRESET_CIRCUITS[0].id)
  const [shots, setShots] = useState(2048)
  const [gamma, setGamma] = useState(0.785)
  const [beta, setBeta] = useState(0.392)
  const [isRunning, setIsRunning] = useState(false)
  const [executionError, setExecutionError] = useState(null)

  // Status & history state
  const [statusInfo, setStatusInfo] = useState(null)
  const [availableBackends, setAvailableBackends] = useState(SUPPORTED_BACKENDS)
  const [currentResult, setCurrentResult] = useState(null)
  const [history, setHistory] = useState([])

  const circuitObj = PRESET_CIRCUITS.find(c => c.id === selectedCircuit) || PRESET_CIRCUITS[0]

  // Initial data loading from backend
  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      try {
        const [statusRes, historyRes] = await Promise.all([
          fetchQuantumStatus(),
          fetchQuantumHistory(),
        ])

        if (!isMounted) return

        if (statusRes) {
          setStatusInfo(statusRes)
          if (Array.isArray(statusRes.backends) && statusRes.backends.length > 0) {
            setAvailableBackends(statusRes.backends)
          }
        }

        if (Array.isArray(historyRes) && historyRes.length > 0) {
          setHistory(historyRes)
          // Default to most recent completed run
          setCurrentResult(historyRes[0])
        }
      } catch (err) {
        console.warn('[QuantumLab] Initial load warning:', err.message)
      }
    }

    loadInitialData()
    return () => {
      isMounted = false
    }
  }, [])

  const handleRun = async () => {
    if (isRunning) return // Prevent accidental duplicate submissions

    setIsRunning(true)
    setExecutionError(null)

    try {
      const result = await runQuantumExperiment({
        circuitId: selectedCircuit,
        backendId: selectedBackend,
        shots,
        gamma,
        beta,
      })

      setCurrentResult(result)
      setHistory(prev => [result, ...prev.filter(h => h.experimentId !== result.experimentId)])

      addToast({
        type: 'info',
        title: 'Quantum Execution Finished',
        message: `Experiment ${result.experimentId || result.jobId} completed in ${result.executionTimeMs} ms (${result.executionMode}).`,
      })
    } catch (err) {
      const errorMsg = err.message || 'Could not execute quantum circuit job.'
      const suggestion = err.data?.suggestion || err.data?.data?.suggestion || ''
      const requiresSubscription = Boolean(
        err.data?.requiresSubscription ||
        err.data?.data?.requiresSubscription ||
        errorMsg.toLowerCase().includes('subscription')
      )

      setExecutionError({
        message: errorMsg,
        suggestion,
        requiresSubscription,
      })

      addToast({
        type: 'danger',
        title: 'Quantum Execution Failed',
        message: errorMsg,
      })
    } finally {
      setIsRunning(false)
      try {
        const updatedHistory = await fetchQuantumHistory()
        if (Array.isArray(updatedHistory) && updatedHistory.length > 0) {
          setHistory(updatedHistory)
        }
      } catch {}
    }
  }

  const handleSwitchToLocal = () => {
    setSelectedBackend('QpiAI-QSV-Local')
    setExecutionError(null)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
              QpiAI Lab (QCloud Quantum Workspace)
            </h1>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
              {statusInfo?.authenticated
                ? `QpiAI QCloud SDK v${statusInfo.sdkVersion || '0.7.5'} Connected`
                : 'QpiAI Quantum Python SDK'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Formulate combinatorial e-waste dispatch &amp; transit routes into QAOA/VQE Ising Hamiltonians for statevector simulation and QCloud hardware.
          </p>
        </div>

        {/* Mode pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#176B45] bg-[#E8F5EE] px-3 py-1.5 rounded-xl border border-[#C2E3D0] inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#176B45]" />
            {statusInfo?.authenticated
              ? 'QCloud Credentials Verified'
              : 'Local Statevector Mode Active'}
          </span>
        </div>
      </div>

      {/* Integration Notice & Scientific Scope */}
      <div className="p-4 bg-[#EBF3FB] rounded-2xl border border-[#BEE3F8] text-xs text-[#26352E]">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#3978C5] shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="font-semibold text-[#1E3A8A]">
              Scientific Architecture: QpiAI Opt (Classical Dispatch) vs. QpiAI QCloud (Quantum Exploration)
            </p>
            <div className="text-[11px] text-[#475569] space-y-1 leading-relaxed">
              <p>
                <strong>Operational Dispatch (QpiAI Opt):</strong> Classical Mixed Integer Linear Programming (MILP) and cloud QUBO solvers optimize complete production logistics, enforcing real-world batch weights, CPCB facility capacities, and vehicle payload boundaries.
              </p>
              <p>
                <strong>Quantum Subproblem Exploration (QpiAI QCloud):</strong> Explores variational algorithms (4-qubit QAOA facility partition &amp; 3-qubit VQE hazardous corridor routing) mapping combinatorial subproblems to Ising spin Hamiltonians:
                {' H_C = \\sum_{ij} J_{ij} Z_i Z_j + \\lambda (\\sum x_i - C)^2'}.
              </p>
              <p className="text-[10px] text-[#64748B] pt-0.5">
                <em>Algorithmic Assessment:</em> At 4 qubits, classical MILP solvers remain superior in runtime and optimality. Quantum simulation provides algorithmic validation of Hamiltonian mappings for future fault-tolerant scaling without claiming present quantum supremacy.
              </p>
            </div>
            <p className="text-[10px] font-mono text-[#64748B] pt-0.5">
              Execution Architecture: Official <code className="bg-white/80 px-1 py-0.5 rounded text-[#1E3A8A]">qpiai_quantum</code> Python SDK. Local statevector simulation executes directly on CPU with zero cloud latency or subscription barriers.
            </p>
          </div>
        </div>
      </div>

      {/* Execution Error Banner (if execution failed) */}
      {executionError && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h4 className="font-semibold text-red-800">
                Quantum Job Submission Notice
              </h4>
              <p className="text-xs text-red-700 leading-relaxed font-mono">
                {executionError.message}
              </p>
              {executionError.suggestion && (
                <p className="text-[11px] text-red-800 bg-white/70 p-2.5 rounded-xl border border-red-200">
                  💡 <strong>Recommendation:</strong> {executionError.suggestion}
                </p>
              )}
              {executionError.requiresSubscription && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSwitchToLocal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-lg transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Switch to QpiAI Local Statevector Simulator &amp; Run
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Experiment Controls */}
      <ExperimentConfigPanel
        selectedBackend={selectedBackend}
        setSelectedBackend={setSelectedBackend}
        selectedCircuit={selectedCircuit}
        setSelectedCircuit={setSelectedCircuit}
        shots={shots}
        setShots={setShots}
        gamma={gamma}
        setGamma={setGamma}
        beta={beta}
        setBeta={setBeta}
        onRun={handleRun}
        isRunning={isRunning}
        backends={availableBackends}
        circuits={PRESET_CIRCUITS}
      />

      {/* Circuit Visualizer */}
      <QuantumCircuitVisualizer
        circuit={circuitObj}
        gamma={gamma}
        beta={beta}
      />

      {/* Results Section */}
      {currentResult && currentResult.status === 'REJECTED' && (
        <div className="p-6 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h4 className="font-semibold text-amber-900 text-sm">
                  Quantum Cloud Execution Notice: Remote Compute Quota Required
                </h4>
                <span className="font-mono text-[10px] px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-300 self-start">
                  Job Ref: {currentResult.experimentId}
                </span>
              </div>
              <p className="text-amber-800 text-xs leading-relaxed font-mono bg-white/70 p-2.5 rounded-xl border border-amber-200">
                {currentResult.errorMessage || currentResult.explanation}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-800">
                <span>Target Backend: <strong>{currentResult.backend?.name || 'QpiAI QCloud Remote'}</strong></span>
                <span>•</span>
                <span>Mode: <strong>{currentResult.executionMode}</strong></span>
                <span>•</span>
                <span>Status: <strong className="uppercase">{currentResult.status}</strong></span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSwitchToLocal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-lg transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Switch to QpiAI Local Statevector Simulator &amp; Run Locally
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentResult && currentResult.status !== 'REJECTED' && (
        <div className="space-y-6">
          <StateDistributionChart
            distribution={currentResult.distribution}
            shots={currentResult.shots}
            optimalState={currentResult.optimalState}
          />

          {/* Observed Measurement Analysis & Execution Summary */}
          <div className="p-6 bg-white rounded-2xl border border-[#E3EAE5] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EAE5] gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#176B45]" />
                <div>
                  <h4 className="text-sm font-semibold text-[#003B23]">
                    Observed Measurement Analysis &amp; Eigensystem Results
                  </h4>
                  <p className="text-xs text-[#66756D]">
                    Extracted eigenvalues and ground-state optimal bitstrings
                  </p>
                </div>
              </div>

              {/* Execution Mode Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-full border ${
                    currentResult.isLiveCloud
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-[#E8F5EE] text-[#176B45] border-[#C2E3D0]'
                  }`}
                >
                  {currentResult.executionMode || (currentResult.isLiveCloud ? 'QpiAI QCloud Remote' : 'QpiAI Local Statevector (SDK)')}
                </span>
              </div>
            </div>

            {/* Scientific Explanation */}
            <p className="text-xs text-[#26352E] leading-relaxed">
              {currentResult.explanation}
            </p>

            {/* Comprehensive Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Ground State Energy */}
              <div className="p-3.5 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
                <span className="text-[11px] font-medium text-[#66756D]">Ground State Minimum Energy</span>
                <div className="text-sm font-mono font-bold text-[#176B45]">
                  {currentResult.groundEnergy != null
                    ? `${Number(currentResult.groundEnergy).toFixed(3)} Hartree units`
                    : 'Not available'}
                </div>
                <span className="text-[10px] text-[#8C9B93]">
                  Hamiltonian ground-state eigenvalue λ_min
                </span>
              </div>

              {/* Optimal Bitstring & Probability */}
              <div className="p-3.5 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
                <span className="text-[11px] font-medium text-[#66756D]">Optimal Ground Bitstring</span>
                <div className="text-sm font-mono font-bold text-[#3978C5] flex items-center gap-1.5">
                  <span>{currentResult.optimalState || '|0110⟩'}</span>
                  {currentResult.optimalStateProbability != null && (
                    <span className="text-xs font-normal text-[#2B6CB0]">
                      ({currentResult.optimalStateProbability}%)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#8C9B93]">
                  Highest probability cost-minimizing partition
                </span>
              </div>

              {/* Backend & Hardware Mode */}
              <div className="p-3.5 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
                <span className="text-[11px] font-medium text-[#66756D]">Execution Target</span>
                <div className="text-xs font-semibold text-[#26352E] truncate">
                  {currentResult.backend?.name || currentResult.backendId || 'QpiAI Quantum Simulator'}
                </div>
                <span className="text-[10px] font-mono text-[#8C9B93]">
                  {currentResult.isLiveCloud ? 'Remote Cryogenic/Cloud Hardware' : 'Local Statevector CPU Simulator'}
                </span>
              </div>

              {/* Total Shots Executed */}
              <div className="p-3.5 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
                <span className="text-[11px] font-medium text-[#66756D]">Total Measurement Shots</span>
                <div className="text-sm font-mono font-bold text-[#26352E]">
                  {Number(currentResult.shots || 2048).toLocaleString()} Shots
                </div>
                <span className="text-[10px] text-[#8C9B93]">
                  Statistical sampling repetitions
                </span>
              </div>

              {/* Execution Time */}
              <div className="p-3.5 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
                <span className="text-[11px] font-medium text-[#66756D]">Execution Time</span>
                <div className="text-sm font-mono font-bold text-[#26352E]">
                  {currentResult.executionTimeMs != null
                    ? `${currentResult.executionTimeMs} ms`
                    : '—'}
                </div>
                <span className="text-[10px] text-[#8C9B93]">
                  Total ansatz circuit compile &amp; run latency
                </span>
              </div>

              {/* Job ID / Reference */}
              <div className="p-3.5 bg-[#FAFCFA] rounded-xl border border-[#E3EAE5] space-y-1">
                <span className="text-[11px] font-medium text-[#66756D]">Experiment Job ID</span>
                <div className="text-xs font-mono font-bold text-[#3978C5] truncate">
                  {currentResult.jobId || currentResult.experimentId || '—'}
                </div>
                <span className="text-[10px] font-mono text-[#8C9B93]">
                  Tracked in immutable ledger log
                </span>
              </div>
            </div>

            {/* Top State Amplitudes Quick Table */}
            {Array.isArray(currentResult.distribution) && currentResult.distribution.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-medium text-[#66756D] block mb-2">
                  Top Basis State Measurement Counts:
                </span>
                <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                  {currentResult.distribution.slice(0, 6).map((d, idx) => (
                    <div
                      key={`top-state-${idx}`}
                      className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
                        d.isOptimal
                          ? 'bg-[#E8F5EE] border-[#C2E3D0] text-[#176B45] font-bold'
                          : 'bg-[#FAFCFA] border-[#E3EAE5] text-[#26352E]'
                      }`}
                    >
                      <span>{d.state}</span>
                      <span className="text-[10px] text-[#66756D]">
                        {d.count} ({d.probability}%)
                      </span>
                      {d.isOptimal && <span className="text-[9px] uppercase tracking-wide">★ Ground</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <ExperimentHistoryTable
        history={history}
        onSelectExperiment={(job) => {
          setCurrentResult(job)
          setExecutionError(null)
        }}
      />
    </div>
  )
}
