import React, { useState, useMemo } from 'react'
import {
  Boxes,
  Scale,
  Building2,
  Truck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Award,
  Recycle,
} from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'
import { formatWeight, formatDate } from '../../utils/formatters'
import { getBatchCustodyStage, getBatchAvailableAction } from '../../utils/custodyStageUtils'

export function BatchCustodyTable({
  batches = [],
  onSelectBatch,
  onExecuteAction,
  searchQuery = '',
  isLoading = false,
}) {
  const [stageFilter, setStageFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const bId = (b.batchId || b.id || '').toLowerCase()
      const source = (b.sourceOrg || '').toLowerCase()
      const facility = (b.collectionFacility || '').toLowerCase()
      const category = (b.category || b.collectionType || '').toLowerCase()
      const status = b.status || ''
      const stage = getBatchCustodyStage(b)

      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        bId.includes(query) ||
        source.includes(query) ||
        facility.includes(query) ||
        category.includes(query) ||
        stage.name.toLowerCase().includes(query) ||
        stage.label.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'ALL' || status === statusFilter

      const matchesStage =
        stageFilter === 'ALL' || String(stage.step) === stageFilter

      return matchesSearch && matchesStatus && matchesStage
    })
  }, [batches, searchQuery, stageFilter, statusFilter])

  // Reset to page 1 on filter change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, stageFilter, statusFilter])

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / pageSize))
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredBatches.slice(start, start + pageSize)
  }, [filteredBatches, currentPage, pageSize])

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-[#E3EAE5] text-center">
        <div className="w-8 h-8 border-3 border-[#176B45] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-gray-700">Loading consignments from ledger...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E3EAE5] shadow-xs overflow-hidden flex flex-col">
      {/* Table Subheader & Filter Controls */}
      <div className="p-4 border-b border-[#F0F4F2] bg-[#FAFCFA] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-[#003B23] flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-[#176B45]" />
            Consignment Directory
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5EE] text-[#176B45] border border-[#C2E3D0]">
            {filteredBatches.length} of {batches.length} Batches
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Stage Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#E3EAE5] rounded-lg text-gray-700 text-xs focus:outline-none focus:ring-1 focus:ring-[#176B45]"
            >
              <option value="ALL">All Custody Stages</option>
              <option value="1">Step 01: Collection Center</option>
              <option value="2">Step 02: Transporter Transit</option>
              <option value="3">Step 03: Receiving Depot</option>
              <option value="4">Step 04: Certified Recycler</option>
              <option value="5">Step 05: Final Audit</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#E3EAE5] rounded-lg text-gray-700 text-xs focus:outline-none focus:ring-1 focus:ring-[#176B45]"
          >
            <option value="ALL">All Statuses</option>
            <option value="Registered">Registered</option>
            <option value="In Transit">In Transit</option>
            <option value="Received">Received</option>
            <option value="Processed">Processed</option>
            <option value="Audited">Audited</option>
            <option value="Flagged Discrepancy">Flagged Discrepancy</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {filteredBatches.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Boxes className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 text-sm">No consignments match the selected filters</p>
            <p className="text-xs text-gray-400 mt-1">Adjust your search term or stage filters to view batches.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAFCFA] border-b border-[#F0F4F2] text-[#66756D] font-medium text-[11px]">
                <th className="py-3 px-4 font-semibold">Batch ID</th>
                <th className="py-3 px-4 font-semibold">Source Organization</th>
                <th className="py-3 px-4 font-semibold">Waste Type</th>
                <th className="py-3 px-4 font-semibold">Weight</th>
                <th className="py-3 px-4 font-semibold">Current Custody Stage</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Available Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F7F5]">
              {paginatedBatches.map((batch) => {
                const bId = batch.batchId || batch.id
                const stage = getBatchCustodyStage(batch)
                const action = getBatchAvailableAction(batch)

                return (
                  <tr
                    key={bId}
                    onClick={() => onSelectBatch(bId)}
                    className="hover:bg-[#F9FCFA] transition-colors cursor-pointer group"
                  >
                    {/* Batch ID */}
                    <td className="py-3 px-4 font-mono font-bold text-[#176B45] group-hover:underline">
                      {bId}
                    </td>

                    {/* Source Organization */}
                    <td className="py-3 px-4 text-gray-800">
                      <div className="font-medium truncate max-w-[180px]">{batch.sourceOrg || 'Origin Generator'}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[180px]">{batch.collectionFacility || 'Central Depot'}</div>
                    </td>

                    {/* Waste Type */}
                    <td className="py-3 px-4 text-gray-600 truncate max-w-[150px]">
                      {batch.category || batch.collectionType || 'Mixed E-Waste'}
                    </td>

                    {/* Weight */}
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800 whitespace-nowrap">
                      {formatWeight(batch.grossWeight)}
                    </td>

                    {/* Current Custody Stage */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          stage.isDiscrepancy
                            ? 'bg-red-100 text-red-700'
                            : stage.step === 6
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#E8F5EE] text-[#176B45]'
                        }`}>
                          Step 0{stage.step > 5 ? 5 : stage.step}
                        </span>
                        <span className="text-gray-700 font-medium truncate max-w-[180px]">
                          {stage.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[220px] mt-0.5">
                        {stage.label}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={batch.status} size="xs" />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {action ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onExecuteAction) {
                              onExecuteAction(batch, action)
                            } else {
                              onSelectBatch(bId)
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                            action.variant === 'danger'
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              : action.variant === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-[#176B45] text-white hover:bg-[#003B23]'
                          }`}
                        >
                          {action.type === 'CERTIFY_AUDIT' && <Award className="w-3.5 h-3.5" />}
                          {action.type === 'RECORD_DEPOT_SCALE' && <Scale className="w-3.5 h-3.5" />}
                          {action.type === 'ASSIGN_TRANSPORTER' && <Truck className="w-3.5 h-3.5" />}
                          {action.type === 'ASSIGN_RECYCLER' && <Recycle className="w-3.5 h-3.5" />}
                          {action.type === 'DISCREPANCY_FLAGGED' && <AlertTriangle className="w-3.5 h-3.5" />}
                          <span>{action.label}</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">View</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredBatches.length > pageSize && (
        <div className="p-3 bg-[#FAFCFA] border-t border-[#F0F4F2] flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <strong className="font-mono text-gray-800">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="font-mono text-gray-800">
              {Math.min(currentPage * pageSize, filteredBatches.length)}
            </strong>{' '}
            of <strong className="font-mono text-gray-800">{filteredBatches.length}</strong> consignments
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#E3EAE5] bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono px-2 text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#E3EAE5] bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
