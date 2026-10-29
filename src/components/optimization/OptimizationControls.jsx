import React from 'react'
import { Sparkles, Sliders, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'

export function OptimizationControls({
  objective,
  setObjective,
  enforceCapacity,
  setEnforceCapacity,
  enforceLicence,
  setEnforceLicence,
  onRunOptimization,
  isLoading,
  selectedCount,
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#176B45]" />
          <h3 className="text-sm font-semibold text-[#003B23]">
            2. Optimization Solver Controls (QpiAI Opt Engine)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#2B6CB0] bg-[#EBF3FB] px-2.5 py-1 rounded-full border border-[#BEE3F8]">
          Algorithm: MILP Simplex / Hybrid
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Objective */}
        <div>
          <label className="block text-xs font-medium text-[#26352E] mb-1">
            Optimization Objective
          </label>
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
          >
            <option value="MINIMIZE_COST">Minimize Total Transport Cost (₹)</option>
            <option value="MAXIMIZE_YIELD">Maximize Historical Recovery Yield</option>
            <option value="BALANCED_CAPACITY">Balance Recycler Quota Utilization</option>
          </select>
        </div>

        {/* Capacity Constraints */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5]">
          <input
            type="checkbox"
            id="cap-constraint"
            checked={enforceCapacity}
            onChange={(e) => setEnforceCapacity(e.target.checked)}
            className="rounded text-[#176B45] focus:ring-[#176B45] h-4 w-4"
          />
          <label htmlFor="cap-constraint" className="cursor-pointer">
            <span className="font-semibold text-[#26352E] block">Strict Capacity Limit</span>
            <span className="text-[11px] text-[#66756D]">Do not exceed monthly quota</span>
          </label>
        </div>

        {/* Licence Verification */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5]">
          <input
            type="checkbox"
            id="lic-constraint"
            checked={enforceLicence}
            onChange={(e) => setEnforceLicence(e.target.checked)}
            className="rounded text-[#176B45] focus:ring-[#176B45] h-4 w-4"
          />
          <label htmlFor="lic-constraint" className="cursor-pointer">
            <span className="font-semibold text-[#26352E] block">CPCB Licence Active</span>
            <span className="text-[11px] text-[#66756D]">Exclude expired/under-review</span>
          </label>
        </div>

        {/* Run Button */}
        <div className="flex items-end">
          <button
            onClick={onRunOptimization}
            disabled={isLoading || selectedCount === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-all shadow-xs hover:shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Solving Assignment...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#E8F5EE]" />
                <span>Run QpiAI Optimization ({selectedCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
