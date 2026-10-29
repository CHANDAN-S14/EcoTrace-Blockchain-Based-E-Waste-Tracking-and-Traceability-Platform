import React from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Building,
  Send,
  Scale,
  Gauge,
  Percent,
  Info,
  Clock,
  Cpu,
  Server,
} from 'lucide-react'
import { formatCurrency, formatWeight } from '../../utils/formatters.js'
import { ErrorBoundary } from '../common/ErrorBoundary.jsx'

export function OptimizationResults({ results, onApprove, isApproving }) {
  if (!results) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs text-center text-xs text-[#66756D]">
        No optimization results available.
      </div>
    )
  }

  // Safely unwrap payload if passed raw or nested
  const payload = (results.summary || results.assignments)
    ? results
    : (results.data?.data || results.data || results)

  const assignments = Array.isArray(payload.assignments) ? payload.assignments : []
  const unassignedBatches = Array.isArray(payload.unassignedBatches) ? payload.unassignedBatches : []
  const summary = payload.summary || payload.metrics || {}
  const facilityUtilization = Array.isArray(payload.facilityUtilization) ? payload.facilityUtilization : []
  const isFeasible = typeof payload.isFeasible === 'boolean'
    ? payload.isFeasible
    : (unassignedBatches.length === 0 && assignments.length > 0)
  const engine = payload.solverEngine || payload.engine || 'Deterministic Classical Optimization Solver'
  const isQpiAiCloud = Boolean(payload.isQpiAiCloud)
  const runId = payload.runId || null
  const executionEvidence = payload.executionEvidence || results.executionEvidence || null
  const objective = summary?.objective || payload.objective || 'MINIMIZE_COST'

  const baselineCostText = summary?.baselineUnoptimizedCost != null
    ? formatCurrency(summary.baselineUnoptimizedCost)
    : 'Not available'

  const optimizedCostText = summary?.totalOptimizedCost != null
    ? formatCurrency(summary.totalOptimizedCost)
    : 'Not available'

  const savingsPercent = summary?.savingsPercent
  const averageYield = summary?.averageExpectedYieldPercent
  const expectedRecoveredKg = summary?.totalExpectedRecoveredKg
  const utilizationSpread = summary?.utilizationSpread
  const averageUtilization = summary?.averageUtilization

  return (
    <ErrorBoundary title="Optimization Results View Error" message="Unable to render the optimization results table.">
      <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs space-y-6 animate-in fade-in duration-200">
        {/* Header and Engine Notice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E3EAE5] gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[#003B23]">
                3. QpiAI Opt Assignment Recommendation
              </h3>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isFeasible
                    ? 'bg-[#E8F5EE] text-[#176B45] border-[#C2E3D0]'
                    : 'bg-[#FEF5E7] text-[#B8741A] border-[#FAD7A0]'
                }`}
              >
                {isFeasible ? 'Feasible Optimal Solution' : 'Partially Constrained'}
              </span>

              {/* Active Objective Pill */}
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#FAFCFA] text-[#26352E] border border-[#E3EAE5]">
                Objective: {summary?.objectiveLabel || (
                  objective === 'MAXIMIZE_YIELD'
                    ? 'Maximize Historical Recovery Yield'
                    : objective === 'BALANCED_CAPACITY'
                    ? 'Balance Recycler Quota Utilization'
                    : 'Minimize Total Transport Cost'
                )}
              </span>
            </div>

            <p className="text-xs text-[#66756D] mt-1 flex flex-wrap items-center gap-1.5">
              <span>Solver Engine:</span>
              <span className="font-mono text-[#26352E] font-medium">{engine}</span>
              {isQpiAiCloud ? (
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  QpiAI Opt Cloud Hybrid Solver
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded-full border border-[#C2E3D0]">
                  Deterministic Classical MILP (Local Fallback)
                </span>
              )}
            </p>
          </div>

          {/* Objective-Specific KPI Card */}
          {objective === 'MINIMIZE_COST' && (
            <div className="flex flex-wrap items-center gap-4 bg-[#FAFCFA] p-3 rounded-xl border border-[#E3EAE5] text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">Baseline Cost</span>
                {summary?.baselineUnoptimizedCost != null ? (
                  <span className="font-mono text-[#66756D] line-through">
                    {baselineCostText}
                  </span>
                ) : (
                  <span className="font-mono text-[#8C9B93] italic text-xs">
                    Not available
                  </span>
                )}
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-[#8C9B93] hidden sm:block" />

              <div>
                <span className="text-[10px] uppercase font-mono text-[#176B45] block font-bold">
                  Optimized Total Cost
                </span>
                <span className="font-mono font-bold text-base text-[#176B45]">
                  {optimizedCostText}
                </span>
              </div>

              <div className="pl-3 border-l border-[#E3EAE5]">
                {savingsPercent != null ? (
                  <div className="text-[#176B45] flex items-center gap-1 font-bold">
                    <TrendingDown className="w-4 h-4" />
                    <span>-{savingsPercent}% Savings</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-[#8C9B93] italic">
                    Savings: Not available
                  </span>
                )}
              </div>
            </div>
          )}

          {objective === 'MAXIMIZE_YIELD' && (
            <div className="flex flex-wrap items-center gap-4 bg-[#FAFCFA] p-3 rounded-xl border border-[#E3EAE5] text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">Expected Recovery</span>
                <span className="font-mono font-bold text-sm text-[#26352E]">
                  {expectedRecoveredKg != null ? formatWeight(expectedRecoveredKg) : 'Not available'}
                </span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-[#8C9B93] hidden sm:block" />

              <div>
                <span className="text-[10px] uppercase font-mono text-[#176B45] block font-bold">
                  Average Expected Yield
                </span>
                <span className="font-mono font-bold text-base text-[#176B45]">
                  {averageYield != null ? `${averageYield}%` : 'Not available'}
                </span>
              </div>

              <div className="pl-3 border-l border-[#E3EAE5]">
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">Transport Fee</span>
                <span className="font-mono font-semibold text-xs text-[#26352E]">
                  {optimizedCostText}
                </span>
              </div>
            </div>
          )}

          {objective === 'BALANCED_CAPACITY' && (
            <div className="flex flex-wrap items-center gap-4 bg-[#FAFCFA] p-3 rounded-xl border border-[#E3EAE5] text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">Post-Assignment Spread</span>
                <span className="font-mono font-bold text-sm text-[#003B23]">
                  {utilizationSpread != null ? `±${utilizationSpread}% Spread` : 'Not available'}
                </span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-[#8C9B93] hidden sm:block" />

              <div>
                <span className="text-[10px] uppercase font-mono text-[#176B45] block font-bold">
                  Average Quota Load
                </span>
                <span className="font-mono font-bold text-base text-[#176B45]">
                  {averageUtilization != null ? `${averageUtilization}%` : 'Not available'}
                </span>
              </div>

              <div className="pl-3 border-l border-[#E3EAE5]">
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">Transport Fee</span>
                <span className="font-mono font-semibold text-xs text-[#26352E]">
                  {optimizedCostText}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Execution Evidence & Cloud Solver Diagnostics Card */}
        {executionEvidence && (
          <div className="p-4 rounded-xl border border-[#E3EAE5] bg-[#FAFCFA] text-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E3EAE5]">
              <div className="flex items-center gap-2">
                <Cpu className={`w-4 h-4 ${isQpiAiCloud ? 'text-purple-600' : 'text-[#176B45]'}`} />
                <span className="font-semibold text-[#003B23]">
                  QpiAI Opt Solver Execution &amp; Traceability Evidence
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className={`px-2 py-0.5 rounded-full font-semibold border ${
                  isQpiAiCloud
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-[#E8F5EE] text-[#176B45] border-[#C2E3D0]'
                }`}>
                  {isQpiAiCloud ? 'Verified Cloud Execution' : 'Local Fallback Engaged'}
                </span>
                <span className="text-[#8C9B93]">Status: {executionEvidence.solverStatus || 'COMPLETED'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded-lg border border-[#E3EAE5]">
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">Platform Endpoint</span>
                <span className="font-mono text-[#26352E] truncate block" title={executionEvidence.endpoint || 'https://opt-server.qpiai.tech/api'}>
                  {executionEvidence.endpoint || 'https://opt-server.qpiai.tech/api'}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-[#E3EAE5]">
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">Authentication Protocol</span>
                <span className="font-mono text-[#26352E] block">
                  {executionEvidence.authType || 'X-Secret-Token / Bearer'}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-[#E3EAE5]">
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">QpiAI Problem ID</span>
                <span className="font-mono text-[#26352E] truncate block" title={executionEvidence.problemId || 'None'}>
                  {executionEvidence.problemId ? `${executionEvidence.problemId.slice(0, 8)}...` : 'Local problem formulation'}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-[#E3EAE5]">
                <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">Cloud Job ID</span>
                <span className="font-mono text-[#26352E] truncate block" title={executionEvidence.jobId || 'N/A'}>
                  {executionEvidence.jobId || 'Local execution (No cloud job)'}
                </span>
              </div>
            </div>

            {/* Cloud Solver Diagnosis / Notice
            {executionEvidence.cloudError && (
              <div className="p-3 bg-[#FEF5E7] rounded-lg border border-[#FAD7A0] text-[11px] text-[#8C5205] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E9A23B] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold">QpiAI Opt Platform Response:</span>
                  <p className="text-[#A2620A] leading-relaxed">
                    {executionEvidence.cloudError}
                  </p>
                  <p className="text-[10px] text-[#B8741A] pt-0.5">
                    <strong>Resolution Guidance:</strong> To execute directly on QpiAI Opt Cloud Hybrid Solvers (QUBO/MILP), allocate compute quota for &apos;QUBO Solver&apos; in the QpiAI Opt platform dashboard or supply an active subscription Bearer token.
                  </p>
                </div>
              </div>
            )} */}
          </div>
        )}

        {/* Assignment Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-[#26352E] uppercase font-mono tracking-wider">
              Recommended Batch Dispatches ({assignments.length})
            </h4>
            <span className="text-[11px] text-[#66756D]">
              Evaluated under: <strong className="text-[#176B45] font-mono">{summary?.objectiveLabel || objective}</strong>
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-[#E3EAE5] bg-[#FAFCFA] text-xs text-[#66756D]">
              <p className="font-semibold text-[#26352E]">No batch assignments recommended for this run.</p>
              <p className="text-[11px] text-[#8C9B93] mt-1">
                The solver could not find eligible facilities satisfying the selected constraints.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E3EAE5] text-[#8C9B93] text-[10px] uppercase font-mono tracking-wider bg-[#FAFCFA]">
                    <th className="py-2.5 px-3">Batch ID &amp; Stream</th>
                    <th className="py-2.5 px-3">Gross Weight</th>
                    <th className="py-2.5 px-3">Assigned Recycler Facility</th>
                    <th className="py-2.5 px-3">CPCB Licence</th>
                    {objective === 'MAXIMIZE_YIELD' && (
                      <th className="py-2.5 px-3 text-right">Expected Yield</th>
                    )}
                    {objective === 'BALANCED_CAPACITY' && (
                      <th className="py-2.5 px-3 text-right">Quota Load Shift</th>
                    )}
                    <th className="py-2.5 px-3 text-right">Transport Fee</th>
                    <th className="py-2.5 px-3">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F7F5]">
                  {assignments.map((item, idx) => {
                    const bId = item.batchId || `BATCH-${idx + 1}`
                    const estCost = item.estimatedCost != null ? formatCurrency(item.estimatedCost) : 'Not available'
                    const unitRate = item.unitRateKg != null ? `(₹${Number(item.unitRateKg).toFixed(1)}/kg)` : ''
                    return (
                      <tr key={bId} className="hover:bg-[#FAFCFA] transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-[#176B45] block">
                            {bId}
                          </span>
                          <span className="text-[11px] text-[#66756D]">
                            {item.batchCategory || 'Mixed E-Waste'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-[#26352E]">
                          {formatWeight(item.batchWeight)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#26352E]">
                          {item.facilityName || 'Unassigned'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#66756D]">
                          {item.licenceNumber || '—'}
                        </td>

                        {/* Objective-specific column */}
                        {objective === 'MAXIMIZE_YIELD' && (
                          <td className="py-3 px-3 text-right font-mono">
                            <span className="font-bold text-[#176B45] block">
                              {item.expectedYieldPercent}%
                            </span>
                            <span className="text-[10px] text-[#8C9B93]">
                              ~{formatWeight(item.expectedRecoveredKg)} output
                            </span>
                          </td>
                        )}

                        {objective === 'BALANCED_CAPACITY' && (
                          <td className="py-3 px-3 text-right font-mono">
                            <span className="font-semibold text-[#26352E] block">
                              {item.facilityUtilizationBefore}% → {item.facilityUtilizationAfter}%
                            </span>
                            <span className="text-[10px] text-[#176B45]">
                              Balanced intake
                            </span>
                          </td>
                        )}

                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-bold text-[#26352E] block">
                            {estCost}
                          </span>
                          {unitRate && (
                            <span className="text-[10px] text-[#8C9B93] block font-mono">
                              {unitRate}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded border border-[#C2E3D0]">
                            <CheckCircle2 className="w-3 h-3" />
                            Quota &amp; Licence Verified
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Unassigned batches alert if any with specific diagnoses */}
        {unassignedBatches && unassignedBatches.length > 0 && (
          <div className="p-3.5 rounded-xl border border-[#FAD7A0] bg-[#FFFBF5] text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#E9A23B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#26352E]">
                  {unassignedBatches.length} Consignments Could Not Be Assigned:
                </span>
                <p className="text-[11px] text-[#8C9B93] mt-0.5">
                  The following constraints prevented feasible assignment for these batches:
                </p>
                <ul className="mt-1.5 space-y-1.5 text-[#66756D]">
                  {unassignedBatches.map((b, idx) => (
                    <li key={b.batchId || idx} className="bg-white p-2 rounded-lg border border-[#FAD7A0]/60">
                      <strong className="font-mono text-[#26352E]">{b.batchId || `Batch #${idx + 1}`}</strong>
                      {b.category ? ` (${b.category})` : ''} — <span className="font-medium text-[#B8741A]">{b.reason || 'No facility met combined constraints'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Facility Utilization Bars */}
        {facilityUtilization.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-[#26352E] uppercase font-mono tracking-wider">
                Facility Monthly Quota Post-Assignment
              </h4>
              <span className="text-[10px] font-mono text-[#66756D]">
                Dynamic utilization recalculated post-assignment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {facilityUtilization.map((u, idx) => {
                const utilPct = Number(u.utilizationAfterAssignment) || 0
                return (
                  <div key={u.id || idx} className="p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5] text-xs">
                    <span className="font-semibold text-[#26352E] block truncate">{u.name || 'Facility'}</span>
                    <div className="flex items-center justify-between text-[11px] text-[#66756D] mt-1.5 mb-1">
                      <span>Post-Run Utilization:</span>
                      <span className="font-mono font-bold text-[#26352E]">
                        {utilPct}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E3EAE5] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          utilPct > 90
                            ? 'bg-[#D94F4F]'
                            : utilPct > 70
                            ? 'bg-[#176B45]'
                            : 'bg-[#239B66]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, utilPct))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#8C9B93] mt-1 block">
                      +{formatWeight(u.newAllocatedKg || 0)} newly routed
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Review & Approve Dispatch Bar */}
        <div className="p-4 rounded-xl bg-[#E8F5EE] border border-[#C2E3D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#176B45] shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-[#003B23]">
                Human-in-the-Loop Dispatch Approval Required
              </h4>
              <p className="text-[11px] text-[#66756D]">
                Confirming will generate digital consignment manifests and mark batches as &quot;In Transit&quot;.
              </p>
            </div>
          </div>

          <button
            onClick={() => onApprove(assignments, runId)}
            disabled={isApproving || assignments.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>Approve &amp; Dispatch {assignments.length} Batches</span>
          </button>
        </div>
      </div>
    </ErrorBoundary>
  )
}
