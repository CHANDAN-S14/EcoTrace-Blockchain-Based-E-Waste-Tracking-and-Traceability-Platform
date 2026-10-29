
import React, { useState } from 'react'
import {
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react'

import { BatchSelector } from '../components/optimization/BatchSelector'
import { OptimizationControls } from '../components/optimization/OptimizationControls'
import { OptimizationResults } from '../components/optimization/OptimizationResults'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import {
  runQpiAiOptimization,
  approveAndDispatchAssignment,
} from '../services/optimizationService'
import { useBatchStore } from '../hooks/useBatchStore'

export function RecyclerAssignmentPage() {
  const {
    batches,
    facilities,
    handleApproveAssignments,
    addToast,
  } = useBatchStore()

  // Batches currently eligible for dispatch selection
  const pendingBatches = batches.filter(
    (batch) =>
      batch.status === 'Registered' ||
      batch.status === 'In Transit'
  )

  const [selectedBatchIds, setSelectedBatchIds] = useState(
    () =>
      pendingBatches
        .slice(0, 3)
        .map((batch) => batch.id || batch.batchId)
        .filter(Boolean)
  )

  const [objective, setObjective] = useState('MINIMIZE_COST')
  const [enforceCapacity, setEnforceCapacity] = useState(true)
  const [enforceLicence, setEnforceLicence] = useState(true)
  const [isSolving, setIsSolving] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState(null)
  const [optimizationError, setOptimizationError] = useState(null)

  const clearPreviousResult = () => {
    setOptimizationResult(null)
    setOptimizationError(null)
  }

  const toggleBatch = (id) => {
    setSelectedBatchIds((previousIds) =>
      previousIds.includes(id)
        ? previousIds.filter((item) => item !== id)
        : [...previousIds, id]
    )

    clearPreviousResult()
  }

  const selectAll = () => {
    if (selectedBatchIds.length === pendingBatches.length) {
      setSelectedBatchIds([])
    } else {
      setSelectedBatchIds(
        pendingBatches
          .map((batch) => batch.id || batch.batchId)
          .filter(Boolean)
      )
    }

    clearPreviousResult()
  }

  const handleObjectiveChange = (newObjective) => {
    setObjective(newObjective)
    clearPreviousResult()
  }

  const handleEnforceCapacityChange = (checked) => {
    setEnforceCapacity(checked)
    clearPreviousResult()
  }

  const handleEnforceLicenceChange = (checked) => {
    setEnforceLicence(checked)
    clearPreviousResult()
  }

  const handleRunOptimization = async () => {
    if (selectedBatchIds.length === 0) {
      setOptimizationError(
        'Please select at least one batch before running optimization.'
      )
      setOptimizationResult(null)
      return
    }

    setIsSolving(true)
    setOptimizationError(null)
    setOptimizationResult(null)

    try {
      const result = await runQpiAiOptimization({
        selectedBatchIds,
        batches: pendingBatches,
        facilities,
        objective,
        enforceCapacity,
        enforceLicence,
      })

      if (!result || typeof result !== 'object') {
        throw new Error(
          'The optimization service returned an empty or invalid result.'
        )
      }

      setOptimizationResult(result)

      const summary = result.summary ?? {}
      let resultMessage = 'Dispatch allocation calculated'

      if (objective === 'MINIMIZE_COST') {
        if (summary.savingsPercent != null) {
          resultMessage =
            `${summary.savingsPercent}% transport cost savings`
        } else if (summary.totalOptimizedCost != null) {
          resultMessage =
            `₹${summary.totalOptimizedCost} optimized transport cost`
        } else {
          resultMessage = 'Transport cost result received'
        }
      } else if (objective === 'MAXIMIZE_YIELD') {
        if (summary.averageExpectedYieldPercent != null) {
          resultMessage =
            `${summary.averageExpectedYieldPercent}% expected recovery yield`
        } else {
          resultMessage = 'Recovery yield result received'
        }
      } else if (objective === 'BALANCED_CAPACITY') {
        if (summary.utilizationSpread != null) {
          resultMessage =
            `Facility utilization spread of ${summary.utilizationSpread}%`
        } else {
          resultMessage = 'Recycler capacity balancing result received'
        }
      }

      addToast({
        type: 'success',
        title: 'Optimization Result Received',
        message: resultMessage,
      })
    } catch (error) {
      const errorMessage =
        error?.message ||
        'An unexpected error occurred during optimization.'

      setOptimizationResult(null)
      setOptimizationError(errorMessage)

      addToast({
        type: 'danger',
        title: 'Optimization Error',
        message: errorMessage,
      })
    } finally {
      setIsSolving(false)
    }
  }

  const handleApprove = async (assignments, runId) => {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      addToast({
        type: 'danger',
        title: 'Approval Error',
        message: 'There are no valid assignments to approve.',
      })
      return
    }

    setIsApproving(true)

    try {
      await approveAndDispatchAssignment(assignments, runId)

      handleApproveAssignments(assignments)
      setOptimizationResult(null)
      setOptimizationError(null)
      setSelectedBatchIds([])

      addToast({
        type: 'success',
        title: 'Dispatch Manifests Generated',
        message:
          `${assignments.length} consignments successfully dispatched to authorized recyclers.`,
      })
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Approval Error',
        message:
          error?.message || 'Could not record dispatch manifests.',
      })
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
              Smart Dispatch (QpiAI Opt)
            </h1>

            <span className="text-xs font-mono font-bold text-[#16A34A] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              QpiAI Opt
            </span>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Assign collection and transport tasks to suitable
            vehicles, transporters, and recycling facilities based
            on capacity and distance.
          </p>
        </div>
      </div>

      {/* Pending batch selection */}
      <BatchSelector
        batches={pendingBatches}
        selectedIds={selectedBatchIds}
        onToggleBatch={toggleBatch}
        onSelectAll={selectAll}
      />

      {/* Optimization settings */}
      <OptimizationControls
        objective={objective}
        setObjective={handleObjectiveChange}
        enforceCapacity={enforceCapacity}
        setEnforceCapacity={handleEnforceCapacityChange}
        enforceLicence={enforceLicence}
        setEnforceLicence={handleEnforceLicenceChange}
        onRunOptimization={handleRunOptimization}
        isLoading={isSolving}
        selectedCount={selectedBatchIds.length}
      />

      {/* Optimization results and status */}
      <ErrorBoundary
        title="Optimization Display Area"
        message="An unexpected error occurred in the optimization section."
      >
        {isSolving ? (
          <div className="bg-white rounded-2xl p-8 border border-[#E3EAE5] shadow-xs text-center space-y-3 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] text-[#176B45] flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#003B23]">
                Running Optimization...
              </h3>

              <p className="text-xs text-[#66756D] max-w-md mx-auto mt-1">
                Evaluating batch assignments, vehicle capacities,
                facility eligibility, and the selected objective
                across {selectedBatchIds.length} consignments.
              </p>
            </div>
          </div>
        ) : optimizationError ? (
          <div className="bg-[#FDF2F2] rounded-2xl p-6 border-2 border-[#D94F4F] shadow-xs space-y-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D94F4F] shrink-0 mt-0.5" />

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#9B1C1C]">
                  Optimization Request Failed
                </h3>

                <p className="text-[#26352E] font-medium">
                  {optimizationError}
                </p>

                <p className="text-[#66756D] text-[11px] mt-0.5">
                  Check your selected batches, network connection,
                  and server status before trying again.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F8B4B4]">
              <button
                type="button"
                onClick={() => setOptimizationError(null)}
                className="px-3 py-1.5 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>

              <button
                type="button"
                onClick={handleRunOptimization}
                disabled={isSolving}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#D94F4F] hover:bg-[#9B1C1C] rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Optimization</span>
              </button>
            </div>
          </div>
        ) : optimizationResult ? (
          <OptimizationResults
            results={optimizationResult}
            onApprove={handleApprove}
            isApproving={isApproving}
          />
        ) : (
          <div className="bg-[#FAFCFA] rounded-2xl p-8 border border-dashed border-[#E3EAE5] text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E3EAE5] text-[#176B45] flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3 className="text-xs font-semibold text-[#003B23] uppercase font-mono tracking-wider">
              Ready for Optimization
            </h3>

            <p className="text-xs text-[#66756D] max-w-md mx-auto">
              Select pending batches above and click "Run QpiAI
              Optimization" to generate a dispatch plan using the
              selected objective and configured constraints.
            </p>
          </div>
        )}
      </ErrorBoundary>
    </div>
  )
}
