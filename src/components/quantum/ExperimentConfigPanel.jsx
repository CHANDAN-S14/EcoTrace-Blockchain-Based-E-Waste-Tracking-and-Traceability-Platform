import React from 'react'
import { Atom, Sliders, Cpu, Play, Loader2, Sparkles } from 'lucide-react'
import { SUPPORTED_BACKENDS, PRESET_CIRCUITS } from '../../services/quantumService'

export function ExperimentConfigPanel({
  selectedBackend,
  setSelectedBackend,
  selectedCircuit,
  setSelectedCircuit,
  shots,
  setShots,
  gamma,
  setGamma,
  beta,
  setBeta,
  onRun,
  isRunning,
  backends = SUPPORTED_BACKENDS,
  circuits = PRESET_CIRCUITS,
}) {
  const activeBackends = Array.isArray(backends) && backends.length > 0 ? backends : SUPPORTED_BACKENDS
  const activeCircuits = Array.isArray(circuits) && circuits.length > 0 ? circuits : PRESET_CIRCUITS

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EAE5] gap-2">
        <div className="flex items-center gap-2">
          <Atom className="w-5 h-5 text-[#3978C5]" />
          <div>
            <h3 className="text-sm font-semibold text-[#003B23]">
              Quantum Execution Engine &amp; Hyperparameters
            </h3>
            <p className="text-xs text-[#66756D]">
              Calibrate variational ansatz parameters for combinatorial assignment QUBO
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-[#2B6CB0] bg-[#EBF3FB] px-2.5 py-1 rounded-full border border-[#BEE3F8]">
          QpiAI QCloud SDK v0.7.5
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Backend Target */}
        <div>
          <label className="block text-xs font-medium text-[#26352E] mb-1">
            Target Execution Backend
          </label>
          <select
            value={selectedBackend}
            onChange={(e) => setSelectedBackend(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#3978C5]/20 focus:border-[#3978C5] disabled:bg-gray-50"
          >
            {activeBackends.map((b) => (
              <option key={b.id || b.deviceName} value={b.id || b.deviceName}>
                {b.name || b.deviceName} ({b.qubits || 32}Q)
              </option>
            ))}
          </select>
        </div>

        {/* Circuit Preset */}
        <div>
          <label className="block text-xs font-medium text-[#26352E] mb-1">
            Ansatz Circuit Workflow
          </label>
          <select
            value={selectedCircuit}
            onChange={(e) => setSelectedCircuit(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#3978C5]/20 focus:border-[#3978C5] disabled:bg-gray-50"
          >
            {activeCircuits.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Execution Shots */}
        <div>
          <label className="block text-xs font-medium text-[#26352E] mb-1">
            Execution Shots (Repetitions)
          </label>
          <select
            value={shots}
            onChange={(e) => setShots(Number(e.target.value))}
            disabled={isRunning}
            className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#3978C5]/20 focus:border-[#3978C5] disabled:bg-gray-50"
          >
            <option value={1024}>1,024 Shots</option>
            <option value={2048}>2,048 Shots (Standard)</option>
            <option value={4096}>4,096 Shots (High-Precision)</option>
          </select>
        </div>

        {/* Run CTA */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#3978C5] hover:bg-[#2B6CB0] rounded-xl transition-all shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Quantum Job...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Quantum Experiment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Variational Angle Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F4F7F5] text-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[#26352E]">Problem Phase Angle γ (gamma)</span>
            <span className="font-mono text-[#3978C5] font-bold">{gamma.toFixed(3)} rad</span>
          </div>
          <input
            type="range"
            min="0"
            max="3.1415"
            step="0.05"
            value={gamma}
            disabled={isRunning}
            onChange={(e) => setGamma(Number(e.target.value))}
            className="w-full accent-[#3978C5] disabled:opacity-50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[#26352E]">Mixer Rotation Angle β (beta)</span>
            <span className="font-mono text-[#176B45] font-bold">{beta.toFixed(3)} rad</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5707"
            step="0.02"
            value={beta}
            disabled={isRunning}
            onChange={(e) => setBeta(Number(e.target.value))}
            className="w-full accent-[#176B45] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )
}
