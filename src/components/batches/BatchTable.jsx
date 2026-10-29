import React, { useState } from 'react'
import {
  Search,
  Filter,
  QrCode,
  Eye,
  ArrowUpDown,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'
import { SearchBar } from '../common/SearchBar'
import { EmptyState } from '../common/EmptyState'
import { formatWeight, formatDate, truncateHash } from '../../utils/formatters'
import { useBatchStore } from '../../hooks/useBatchStore'

export function BatchTable({ onSelectBatch }) {
  const { batches, setQrModalBatch, setSelectedBatchForModal } = useBatchStore()

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  const filteredBatches = batches.filter((batch) => {
    const batchId = batch.id || batch.batchId || ''
    const sourceOrg = batch.sourceOrg || ''
    const facility = batch.collectionFacility || ''
    const collectionType = batch.collectionType || 'Mixed E-Waste'

    const matchesSearch =
      search === '' ||
      batchId.toLowerCase().includes(search.toLowerCase()) ||
      sourceOrg.toLowerCase().includes(search.toLowerCase()) ||
      facility.toLowerCase().includes(search.toLowerCase()) ||
      collectionType.toLowerCase().includes(search.toLowerCase())

    const matchesType =
      selectedType === 'ALL' || collectionType === selectedType

    const matchesCategory =
      selectedCategory === 'ALL' || batch.category === selectedCategory

    const matchesStatus =
      selectedStatus === 'ALL' || batch.status === selectedStatus

    return matchesSearch && matchesType && matchesCategory && matchesStatus
  })

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#003B23]">Registered Consignments Ledger</h3>
          <p className="text-xs text-[#66756D]">
            Search, filter, and inspect verified e-waste custody batches ({filteredBatches.length} records)
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Intake Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#26352E] font-medium focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
          >
            <option value="ALL">All Intake Types</option>
            <option value="Mixed E-Waste">Mixed E-Waste</option>
            <option value="Pre-Sorted E-Waste">Pre-Sorted E-Waste</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
          >
            <option value="ALL">All Streams</option>
            <option value="PCBs & Circuit Boards">PCBs &amp; Circuit Boards</option>
            <option value="Consumer Electronics">Consumer Electronics</option>
            <option value="IT & Telecom Servers">IT &amp; Telecom Servers</option>
            <option value="Lithium Batteries">Lithium Batteries</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
          >
            <option value="ALL">All Statuses</option>
            <option value="Registered">Registered</option>
            <option value="In Transit">In Transit</option>
            <option value="Processed">Processed</option>
            <option value="Flagged Discrepancy">Flagged Discrepancy</option>
          </select>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Filter by batch ID (e.g. EW-2026-00001), intake type, organization..."
      />

      {filteredBatches.length === 0 ? (
        <EmptyState
          title="No batches match filter"
          description="Try clearing your intake type or status filter to see all active consignments."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('')
            setSelectedType('ALL')
            setSelectedCategory('ALL')
            setSelectedStatus('ALL')
          }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3EAE5] text-[#8C9B93] text-[10px] uppercase font-mono tracking-wider">
                <th className="py-3 px-3">Batch ID</th>
                <th className="py-3 px-3">Intake Type &amp; Category</th>
                <th className="py-3 px-3">Gross Weight</th>
                <th className="py-3 px-3">Source &amp; Facility</th>
                <th className="py-3 px-3">Sorting Reconciliation</th>
                <th className="py-3 px-3">Consignment Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F7F5]">
              {filteredBatches.map((batch) => {
                const batchId = batch.id || batch.batchId
                const breakdown = batch.sortingBreakdown
                const isSorted = breakdown?.isSorted
                const isExceeded = breakdown?.sortingStatus === 'Weight Difference Exceeded'

                return (
                  <tr key={batchId} className="hover:bg-[#FAFCFA] transition-colors group">
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => setSelectedBatchForModal(batch)}
                        className="font-mono font-bold text-[#176B45] hover:underline flex items-center gap-1.5"
                      >
                        <span>{batchId}</span>
                      </button>
                      <span className="font-mono text-[9px] text-[#8C9B93] block">
                        {truncateHash(batch.blockchainHash, 6, 4)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#26352E]">
                          {batch.collectionType || 'Mixed E-Waste'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#66756D] block">
                        {batch.category || 'General Bulk'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-[#26352E]">
                      {formatWeight(batch.grossWeight)}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-[#26352E]">{batch.sourceOrg}</div>
                      <div className="text-[11px] text-[#66756D]">{batch.collectionFacility}</div>
                    </td>

                    {/* Sorting Reconciliation Column */}
                    <td className="py-3.5 px-3">
                      {isSorted ? (
                        isExceeded ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF5E7] text-[#B8741A] border border-[#FAD7A0] text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3 text-[#E9A23B]" />
                            <span>Variance {breakdown.sortingDifferenceKg > 0 ? '+' : ''}{breakdown.sortingDifferenceKg} kg</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#176B45] border border-[#C2E3D0] text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3 text-[#176B45]" />
                            <span>Reconciled ({breakdown.totalSortedWeightKg} kg)</span>
                          </div>
                        )
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F7F5] text-[#66756D] border border-[#E3EAE5] text-[11px]">
                          <Layers className="w-3 h-3 text-[#8C9B93]" />
                          <span>{batch.collectionType === 'Pre-Sorted E-Waste' ? 'Pre-Sorted' : 'Pending Sorting'}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <StatusBadge status={batch.status} size="xs" />
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setQrModalBatch(batch)}
                          className="p-1.5 text-[#176B45] hover:bg-[#E8F5EE] rounded-lg transition-colors border border-transparent hover:border-[#C2E3D0]"
                          title="View QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedBatchForModal(batch)}
                          className="p-1.5 text-[#66756D] hover:text-[#176B45] hover:bg-[#F4F7F5] rounded-lg transition-colors"
                          title="View Full Consignment Dossier & Sorting"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
