import React from 'react'
import { Atom, Cpu, Sparkles, Layers } from 'lucide-react'

export function QuantumCircuitVisualizer({ circuit, gamma = 0.785, beta = 0.392 }) {
  const qubits = [0, 1, 2, 3]

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3EAE5]">
        <div>
          <h3 className="text-sm font-semibold text-[#26352E] flex items-center gap-2">
            <Atom className="w-4 h-4 text-[#3978C5]" />
            Quantum Circuit Architecture: {circuit.name}
          </h3>
          <p className="text-xs text-[#66756D]">{circuit.description}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-[#EBF3FB] text-[#2B6CB0] border border-[#BEE3F8]">
            {circuit.qubits} Qubits
          </span>
          <span className="px-2 py-0.5 rounded bg-[#F4F7F5] text-[#66756D] border border-[#E3EAE5]">
            Depth: {circuit.depth}
          </span>
        </div>
      </div>

      {/* Visual Quantum Register Schematic */}
      <div className="bg-[#FAFCFA] p-4 rounded-xl border border-[#E3EAE5] overflow-x-auto">
        <div className="min-w-[560px] space-y-4 font-mono text-xs">
          {qubits.map((q) => (
            <div key={q} className="flex items-center gap-2 relative">
              {/* Qubit label */}
              <span className="w-10 text-right font-bold text-[#2B6CB0] shrink-0">
                |q_{q}⟩
              </span>

              {/* Wire line */}
              <div className="flex-1 h-0.5 bg-[#CBD8D0] relative flex items-center justify-around px-2">
                {/* Gate 1: Hadamard */}
                <div className="w-8 h-8 rounded-lg bg-[#3978C5] text-white flex items-center justify-center font-bold text-xs shadow-xs z-10" title="Hadamard Superposition Gate">
                  H
                </div>

                {/* Gate 2: Rz(gamma) */}
                <div className="px-2 h-7 rounded-lg bg-[#EBF3FB] border border-[#3978C5] text-[#2B6CB0] flex items-center justify-center font-bold text-[10px] z-10" title="Problem Hamiltonian Phase Rotation">
                  Rz({gamma.toFixed(2)})
                </div>

                {/* Gate 3: Entanglement CNOT */}
                {q % 2 === 0 ? (
                  <div className="w-4 h-4 rounded-full bg-[#176B45] text-white flex items-center justify-center text-[10px] font-bold z-10" title="Control Qubit">
                    •
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-[#176B45] bg-white text-[#176B45] flex items-center justify-center text-xs font-bold z-10" title="Target Qubit">
                    ⊕
                  </div>
                )}

                {/* Gate 4: Rx(beta) */}
                <div className="px-2 h-7 rounded-lg bg-[#E8F5EE] border border-[#176B45] text-[#176B45] flex items-center justify-center font-bold text-[10px] z-10" title="Mixer Hamiltonian Transverse Rotation">
                  Rx({beta.toFixed(2)})
                </div>

                {/* Measurement Gate */}
                <div className="w-8 h-7 rounded-lg bg-[#26352E] text-white flex items-center justify-center font-bold text-[10px] z-10" title="Computational Basis Measurement">
                  [M]
                </div>
              </div>

              {/* Classical output bit */}
              <span className="w-8 text-left text-[11px] text-[#8C9B93] shrink-0">
                c[{q}]
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Problem Hamiltonian Description */}
      <div className="p-3 bg-[#EBF3FB] rounded-xl border border-[#BEE3F8] text-xs">
        <span className="text-[10px] uppercase font-mono text-[#2B6CB0] block font-bold">
          Ising Cost Hamiltonian (QUBO Formulation)
        </span>
        <code className="text-[11px] font-mono text-[#26352E] block mt-1 break-all bg-white/70 p-2 rounded-lg">
          {circuit.problemHamiltonian}
        </code>
      </div>
    </div>
  )
}
