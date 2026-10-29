
import React from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function ExperimentHistoryTable({ history, onSelectExperiment }) {
  if (!Array.isArray(history) || history.length === 0) return null

  // Safely handle incomplete or older experiment records.
  const safeHistory = history.filter(
    (job) => job && typeof job === 'object'
  )

  if (safeHistory.length === 0) return null

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
        <div>
          <h3 className="text-sm font-semibold text-[#003B23]">
            Previous Quantum Experiment Runs ({safeHistory.length})
          </h3>
          <p className="text-xs text-[#66756D]">
            Archived quantum experiment runs and execution details
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E3EAE5] text-[#8C9B93] text-[10px] uppercase font-mono tracking-wider">
              <th className="py-2.5 px-3">Job ID</th>
              <th className="py-2.5 px-3">Ansatz Circuit</th>
              <th className="py-2.5 px-3">Backend</th>
              <th className="py-2.5 px-3">Shots</th>
              <th className="py-2.5 px-3">Optimal Bitstring</th>
              <th className="py-2.5 px-3">Execution Time</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F4F7F5]">
            {safeHistory.map((job, index) => {
              const circuitName =
                job.circuit?.name ??
                job.circuitName ??
                'Unknown circuit'

              const backendName =
                job.backend?.name ??
                job.backendName ??
                'Unknown backend'

              const experimentId =
                job.experimentId ?? job.jobId ?? `experiment-${index}`

              const isCompleted =
                String(job.status ?? 'completed').toLowerCase() === 'completed'

              return (
                <tr
                  key={experimentId}
                  onClick={() =>
                    onSelectExperiment && onSelectExperiment(job)
                  }
                  className="hover:bg-[#FAFCFA] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-3 font-mono font-bold text-[#3978C5]">
                    {experimentId}
                  </td>

                  <td className="py-3 px-3 font-medium text-[#26352E]">
                    {circuitName}
                  </td>

                  <td className="py-3 px-3 text-[#66756D]">
                    {backendName}
                  </td>

                  <td className="py-3 px-3 font-mono text-[#26352E]">
                    {job.shots ?? '—'}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-[#176B45]">
                    {job.optimalState ?? '—'}
                    {job.optimalStateProbability != null
                      ? ` (${job.optimalStateProbability}%)`
                      : ''}
                  </td>

                  <td className="py-3 px-3 font-mono text-[#8C9B93]">
                    {job.executionTimeMs != null
                      ? `${job.executionTimeMs} ms`
                      : '—'}
                  </td>

                  <td className="py-3 px-3">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded border border-[#C2E3D0]">
                        <CheckCircle2 className="w-3 h-3" />
                        {job.isLiveCloud ? 'Completed (Cloud)' : 'Completed (Local SDK)'}
                      </span>
                    ) : String(job.status).toUpperCase() === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertCircle className="w-3 h-3" />
                        Rejected (Cloud Sub)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <AlertCircle className="w-3 h-3" />
                        {job.status ?? 'Failed'}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
