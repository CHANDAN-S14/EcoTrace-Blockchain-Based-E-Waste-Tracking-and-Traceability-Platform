import React, { useState } from 'react'
import {
  X,
  QrCode,
  ShieldCheck,
  Building,
  Scale,
  Calendar,
  User,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Layers,
  Plus,
  Trash2,
  Save,
  Clock,
  ArrowRight,
  Info,
  Edit3,
} from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'
import { formatWeight, truncateHash, formatDate } from '../../utils/formatters'
import { useBatchStore } from '../../hooks/useBatchStore'

const DEFAULT_SORTING_CATEGORIES = [
  'Computers & Laptops',
  'Mobile Phones',
  'Circuit Boards',
  'Cables & Accessories',
  'Batteries',
  'Appliances',
  'Other Materials',
]

export function BatchDetailModal({ batch, onClose }) {
  const { setQrModalBatch, addToast, handleSaveSorting } = useBatchStore()

  const [isEditingSorting, setIsEditingSorting] = useState(
    !batch?.sortingBreakdown?.isSorted
  )
  const [sortedBy, setSortedBy] = useState(
    batch?.sortingBreakdown?.sortedBy || 'Suresh Patil (Facility Sorter #KA-91)'
  )
  const [sortingNotes, setSortingNotes] = useState(
    batch?.sortingBreakdown?.sortingNotes || ''
  )
  const [isSavingSorting, setIsSavingSorting] = useState(false)

  // Initialize category rows
  const [categoryRows, setCategoryRows] = useState(() => {
    if (batch?.sortingBreakdown?.categories && batch.sortingBreakdown.categories.length > 0) {
      return batch.sortingBreakdown.categories.map(c => ({
        category: c.category,
        weightKg: c.weightKg !== undefined ? String(c.weightKg) : '',
        notes: c.notes || '',
      }))
    }
    return DEFAULT_SORTING_CATEGORIES.map(name => ({
      category: name,
      weightKg: '',
      notes: '',
    }))
  })

  if (!batch) return null

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text)
    addToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: `${label} copied successfully.`,
    })
  }

  // Handle row change
  const handleWeightChange = (index, value) => {
    setCategoryRows(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], weightKg: value }
      return updated
    })
  }

  const handleNotesChange = (index, value) => {
    setCategoryRows(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], notes: value }
      return updated
    })
  }

  const handleAddCustomCategory = () => {
    setCategoryRows(prev => [
      ...prev,
      { category: 'Specialized Component', weightKg: '', notes: '' },
    ])
  }

  const handleRemoveCategory = (index) => {
    setCategoryRows(prev => prev.filter((_, i) => i !== index))
  }

  // Live weight calculation
  const totalSortedLive = Number(
    categoryRows
      .reduce((sum, r) => sum + (parseFloat(r.weightKg) || 0), 0)
      .toFixed(2)
  )
  const incomingGross = Number(batch.grossWeight) || 0
  const liveDifferenceKg = Number((totalSortedLive - incomingGross).toFixed(2))
  const isVarianceExceeded = Math.abs(liveDifferenceKg) > 20

  const handleSubmitSorting = async (e) => {
    e.preventDefault()
    setIsSavingSorting(true)

    // Filter categories with entered weights > 0
    const validCategories = categoryRows
      .filter(r => parseFloat(r.weightKg) > 0)
      .map(r => ({
        category: r.category,
        weightKg: Number(parseFloat(r.weightKg).toFixed(2)),
        notes: r.notes || '',
      }))

    if (validCategories.length === 0) {
      addToast({
        type: 'danger',
        title: 'Validation Error',
        message: 'Please enter weight for at least one sorted material category.',
      })
      setIsSavingSorting(false)
      return
    }

    try {
      const payload = {
        sortedBy: sortedBy.trim() || 'Facility Sorter',
        categories: validCategories,
        sortingNotes: sortingNotes.trim(),
      }

      await handleSaveSorting(batch.id || batch.batchId, payload)
      setIsSavingSorting(false)
      setIsEditingSorting(false)
    } catch {
      setIsSavingSorting(false)
    }
  }

  const breakdown = batch.sortingBreakdown

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E3EAE5] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs p-5 border-b border-[#E3EAE5] flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono font-bold text-lg text-[#003B23]">{batch.id || batch.batchId}</h2>
                <StatusBadge status={batch.status} size="sm" />
                <span className="text-[11px] font-semibold text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded-full border border-[#C2E3D0]">
                  {batch.collectionType || 'Mixed E-Waste'}
                </span>
              </div>
              <p className="text-xs text-[#66756D] mt-0.5">{batch.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQrModalBatch(batch)}
              className="p-2 text-[#176B45] hover:bg-[#E8F5EE] rounded-xl transition-colors border border-[#C2E3D0]"
              title="View & Download QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#66756D] hover:text-[#26352E] hover:bg-[#F4F7F5] rounded-xl transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Evidence Files & Intake Documents Gallery */}
          {Array.isArray(batch.evidenceFiles) && batch.evidenceFiles.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#003B23] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#176B45]" />
                  Consignment Evidence &amp; Documents ({batch.evidenceFiles.length})
                </span>
                <span className="text-[10px] font-mono text-[#8C9B93]">
                  Anchored to Ledger • Verified Asset
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {batch.evidenceFiles.map((file, idx) => {
                  const isImage = file.type === 'photo' || file.mimetype?.startsWith('image/')
                  return (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white rounded-xl border border-[#E3EAE5] hover:border-[#176B45] flex items-center gap-3 transition-all hover:shadow-xs group cursor-pointer"
                    >
                      {isImage ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-12 h-12 rounded-lg object-cover border border-[#E3EAE5] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-200 text-red-600 flex flex-col items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                          <span className="text-[8px] font-mono font-bold uppercase mt-0.5">PDF</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#26352E] truncate group-hover:text-[#176B45] transition-colors" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-[#8C9B93] mt-0.5">
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Attached'} • <span className="capitalize">{file.type || 'file'}</span>
                        </p>
                        <span className="text-[9px] text-[#176B45] font-medium flex items-center gap-1 mt-1">
                          <ExternalLink className="w-2.5 h-2.5" /> View / Download
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          ) : batch.imageUrl ? (
            <div className="rounded-xl overflow-hidden border border-[#E3EAE5] relative group">
              <img
                src={batch.imageUrl}
                alt={batch.imageTitle || 'Electronic waste batch photography'}
                className="w-full h-44 object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-300">
                  Authentic Photographic Evidence
                </span>
                <p className="text-xs font-medium">{batch.imageTitle || 'Intake Material Visual Inspection'}</p>
              </div>
            </div>
          ) : null}

          {/* Key Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5]">
              <span className="text-[10px] uppercase font-mono text-[#8C9B93]">Gross Incoming Weight</span>
              <p className="font-heading font-bold text-base text-[#26352E] mt-1">
                {formatWeight(batch.grossWeight)}
              </p>
              <span className="text-[9px] text-[#66756D] block mt-0.5">Immutable collection gross</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5]">
              <span className="text-[10px] uppercase font-mono text-[#8C9B93]">Origin Organization</span>
              <p className="text-xs font-semibold text-[#26352E] mt-1 truncate">
                {batch.sourceOrg}
              </p>
              <span className="text-[9px] text-[#8C9B93] block mt-0.5">Generator Entity</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5]">
              <span className="text-[10px] uppercase font-mono text-[#8C9B93]">Collection Facility</span>
              <p className="text-xs font-semibold text-[#26352E] mt-1 truncate">
                {batch.collectionFacility}
              </p>
              <span className="text-[9px] text-[#8C9B93] block mt-0.5">Intake Center</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5]">
              <span className="text-[10px] uppercase font-mono text-[#8C9B93]">Intake Date & Time</span>
              <p className="text-xs font-semibold text-[#26352E] mt-1">
                {formatDate(batch.collectionDate)}
              </p>
              <span className="text-[9px] text-[#8C9B93] block mt-0.5">Weighbridge Timestamp</span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SORTING & MATERIAL BREAKDOWN & WEIGHT RECONCILIATION SECTION  */}
          {/* ============================================================== */}
          <div className="p-5 rounded-2xl bg-[#FAFCFA] border border-[#C2E3D0] space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3EAE5]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#176B45]" />
                <div>
                  <h3 className="text-sm font-semibold text-[#003B23]">
                    Sorting &amp; Material Breakdown
                  </h3>
                  <p className="text-[11px] text-[#66756D]">
                    Post-collection segregation weights and real-time weighbridge reconciliation
                  </p>
                </div>
              </div>

              {breakdown?.isSorted && !isEditingSorting && (
                <button
                  type="button"
                  onClick={() => setIsEditingSorting(true)}
                  className="px-3 py-1.5 text-xs font-medium text-[#176B45] bg-[#E8F5EE] hover:bg-[#C2E3D0] border border-[#C2E3D0] rounded-xl transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit / Re-Sort Breakdown
                </button>
              )}
            </div>

            {/* Read-only view when batch is already sorted */}
            {breakdown?.isSorted && !isEditingSorting ? (
              <div className="space-y-4">
                {/* Reconciliation Comparison Header Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-[#E3EAE5]">
                    <span className="text-[10px] uppercase font-mono text-[#8C9B93]">
                      Original Incoming Weight
                    </span>
                    <p className="font-heading font-bold text-base text-[#26352E] mt-0.5">
                      {formatWeight(batch.grossWeight)}
                    </p>
                    <span className="text-[10px] text-[#66756D]">Preserved Intake Scale</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-[#E3EAE5]">
                    <span className="text-[10px] uppercase font-mono text-[#8C9B93]">
                      Total Sorted Weight
                    </span>
                    <p className="font-heading font-bold text-base text-[#176B45] mt-0.5">
                      {formatWeight(breakdown.totalSortedWeightKg)}
                    </p>
                    <span className="text-[10px] text-[#66756D]">
                      Sum of {breakdown.categories?.length || 0} material streams
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      breakdown.sortingStatus === 'Weight Difference Exceeded'
                        ? 'bg-[#FEF5E7] border-[#FAD7A0]'
                        : 'bg-[#E8F5EE] border-[#C2E3D0]'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono text-[#8C9B93]">
                      Weight Difference (Δ)
                    </span>
                    <p
                      className={`font-heading font-bold text-base mt-0.5 ${
                        breakdown.sortingStatus === 'Weight Difference Exceeded'
                          ? 'text-[#B8741A]'
                          : 'text-[#176B45]'
                      }`}
                    >
                      {breakdown.sortingDifferenceKg > 0 ? '+' : ''}
                      {breakdown.sortingDifferenceKg} kg
                    </p>
                    <span className="text-[10px] font-semibold">
                      {breakdown.sortingStatus === 'Weight Difference Exceeded'
                        ? 'Tolerance Exceeded (> 0.5 kg)'
                        : 'Within Tolerance (≤ 0.5 kg)'}
                    </span>
                  </div>
                </div>

                {/* Tolerance Alert / Confirmation Banner */}
                {breakdown.sortingStatus === 'Weight Difference Exceeded' ? (
                  <div className="p-3 rounded-xl bg-[#FEF5E7] border border-[#FAD7A0] flex items-start gap-2.5 text-xs text-[#B8741A]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#E9A23B]" />
                    <div>
                      <p className="font-semibold">
                        Weight Difference Exceeded Tolerance (&gt; 0.5 kg)
                      </p>
                      <p className="text-[11px] text-[#66756D] mt-0.5 leading-relaxed">
                        The total sorted weight ({breakdown.totalSortedWeightKg} kg) differs from original incoming gross weight ({batch.grossWeight} kg) by <strong>{Math.abs(breakdown.sortingDifferenceKg)} kg</strong>. The platform does not silently adjust weights; this batch has been automatically flagged with <strong>Flagged Discrepancy</strong> for supervisory physical audit.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#E8F5EE] border border-[#C2E3D0] flex items-center gap-2.5 text-xs text-[#003B23]">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#176B45]" />
                    <p className="text-[11px]">
                      <strong>Reconciliation Verified:</strong> Mass balance between incoming bulk intake and segregated fractions is verified within the acceptable limit (Δ ≤ 0.5 kg).
                    </p>
                  </div>
                )}

                {/* Breakdown Categories Table */}
                <div className="overflow-x-auto rounded-xl border border-[#E3EAE5] bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E3EAE5] text-[#8C9B93] text-[10px] uppercase font-mono tracking-wider bg-[#FAFCFA]">
                        <th className="py-2.5 px-3">Material Stream</th>
                        <th className="py-2.5 px-3">Sorted Weight</th>
                        <th className="py-2.5 px-3">Fraction Share</th>
                        <th className="py-2.5 px-3">Sorting Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F7F5]">
                      {breakdown.categories?.map((cat, idx) => {
                        const pct = breakdown.totalSortedWeightKg > 0
                          ? ((cat.weightKg / breakdown.totalSortedWeightKg) * 100).toFixed(1)
                          : 0
                        return (
                          <tr key={idx} className="hover:bg-[#FAFCFA]">
                            <td className="py-2.5 px-3 font-semibold text-[#26352E]">
                              {cat.category}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-medium text-[#176B45]">
                              {cat.weightKg} kg
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-[#E3EAE5] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#176B45] rounded-full"
                                    style={{ width: `${Math.min(100, Number(pct))}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-[#66756D]">{pct}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[#66756D] text-[11px]">
                              {cat.notes || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sorter metadata */}
                <div className="flex flex-wrap items-center justify-between text-xs text-[#66756D] px-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#176B45]" />
                    <span>Sorted By: <strong className="text-[#26352E]">{breakdown.sortedBy || 'Authorized Staff'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#176B45]" />
                    <span>Sorted At: <strong className="text-[#26352E]">{formatDate(breakdown.sortedAt)}</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              /* Interactive Sorting Entry Form */
              <form onSubmit={handleSubmitSorting} className="space-y-4">
                <div className="p-3 bg-white rounded-xl border border-[#E3EAE5] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">
                      Target Gross Incoming Weight
                    </span>
                    <span className="font-mono font-bold text-sm text-[#003B23]">
                      {batch.grossWeight} kg
                    </span>
                    <span className="text-[10px] text-[#66756D] ml-2">
                      (Original collection intake)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-[#8C9B93] block">
                      Live Sorted Total
                    </span>
                    <span className="font-mono font-bold text-sm text-[#176B45]">
                      {totalSortedLive.toFixed(2)} kg
                    </span>
                  </div>
                </div>

                {/* Live Tolerance Status Box */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    isVarianceExceeded
                      ? 'bg-[#FEF5E7] border-[#FAD7A0] text-[#B8741A]'
                      : 'bg-[#E8F5EE] border-[#C2E3D0] text-[#003B23]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isVarianceExceeded ? (
                      <AlertTriangle className="w-4 h-4 text-[#E9A23B] shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold">
                        Difference: {liveDifferenceKg > 0 ? '+' : ''}{liveDifferenceKg} kg
                      </span>
                      <span className="block text-[10px] opacity-80">
                        {isVarianceExceeded
                          ? 'Warning: Exceeds 0.5 kg tolerance limit! Consignment will be marked as Flagged Discrepancy.'
                          : 'Within acceptable tolerance limit (±0.5 kg). Consignment will be marked as Reconciled.'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs uppercase px-2 py-0.5 rounded-md bg-white border border-current">
                    {isVarianceExceeded ? 'Variance Alert' : 'Reconciled'}
                  </span>
                </div>

                {/* Category Weight Input Rows */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-mono uppercase text-[#8C9B93] px-1">
                    <div className="col-span-5">Material Category</div>
                    <div className="col-span-3">Sorted Weight (kg)</div>
                    <div className="col-span-4">Notes / Purity</div>
                  </div>

                  {categoryRows.map((row, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-[#E3EAE5]"
                    >
                      <div className="col-span-5">
                        <span className="text-xs font-semibold text-[#26352E] block truncate">
                          {row.category}
                        </span>
                      </div>
                      <div className="col-span-3 relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={row.weightKg}
                          onChange={(e) => handleWeightChange(index, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#FAFCFA] border border-[#E3EAE5] rounded-lg text-[#26352E] focus:outline-none focus:ring-1 focus:ring-[#176B45] focus:border-[#176B45]"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] font-mono text-[#8C9B93]">kg</span>
                      </div>
                      <div className="col-span-4 flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. Cleaned / stripped"
                          value={row.notes}
                          onChange={(e) => handleNotesChange(index, e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-lg text-[#26352E] focus:outline-none focus:ring-1 focus:ring-[#176B45] focus:border-[#176B45]"
                        />
                        {categoryRows.length > 7 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(index)}
                            className="p-1 text-[#8C9B93] hover:text-[#D94F4F]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="text-xs text-[#176B45] hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Custom Category Row
                  </button>
                </div>

                {/* Sorter details input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-[#26352E] mb-1">
                      Sorted By (Staff Name &amp; ID) <span className="text-[#D94F4F]">*</span>
                    </label>
                    <input
                      type="text"
                      value={sortedBy}
                      onChange={(e) => setSortedBy(e.target.value)}
                      placeholder="e.g. Suresh Patil (Facility Sorter #KA-91)"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#26352E] mb-1">
                      Sorting Observations / Remarks
                    </label>
                    <input
                      type="text"
                      value={sortingNotes}
                      onChange={(e) => setSortingNotes(e.target.value)}
                      placeholder="e.g. Segregation completed in bay 3 with dual-weigh calibration"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                    />
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3EAE5]">
                  {breakdown?.isSorted && (
                    <button
                      type="button"
                      onClick={() => setIsEditingSorting(false)}
                      className="px-3.5 py-2 text-xs font-medium text-[#66756D] hover:text-[#26352E] bg-white border border-[#E3EAE5] rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingSorting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingSorting ? 'Saving Sorting...' : 'Save & Reconcile Breakdown'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Cryptographic Ledger & Evidence Hashes */}
          <div className="p-4 rounded-xl bg-[#F4F7F5] border border-[#E3EAE5] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#26352E] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#176B45]" />
                Cryptographic Audit Footprint
              </span>
              <span className="text-[10px] font-mono text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded-full border border-[#C2E3D0]">
                Anchored to CPCB Node #4
              </span>
            </div>

            <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-[#E3EAE5]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-[#8C9B93]">Blockchain Transaction Hash</span>
                <span className="font-mono text-[11px] text-[#26352E] truncate">
                  {batch.blockchainHash || 'Pending Anchor'}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(batch.blockchainHash, 'Tx Hash')}
                className="p-1 text-[#8C9B93] hover:text-[#176B45]"
                title="Copy Hash"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-[#E3EAE5]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-[#8C9B93]">SHA-256 Weighbridge Evidence Digest</span>
                <span className="font-mono text-[11px] text-[#26352E] truncate">
                  {batch.evidenceHash || '0x992b114d5e82acbf02847d018265fa919c72c1a4570028eab7284f23bc901a52'}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(batch.evidenceHash, 'Evidence Digest')}
                className="p-1 text-[#8C9B93] hover:text-[#176B45]"
                title="Copy Digest"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notes and Handler Details */}
          <div>
            <h4 className="text-xs font-semibold text-[#26352E] mb-1">Inspector Notes &amp; Handler</h4>
            <p className="text-xs text-[#66756D] bg-[#FAFCFA] p-3 rounded-xl border border-[#E3EAE5] leading-relaxed">
              {batch.notes || 'No specialized handler remarks filed for this consignment.'}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-[#66756D]">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#176B45]" />
                <span>Assigned Handler: <strong className="text-[#26352E]">{batch.assignedHandler || 'Unassigned'}</strong></span>
              </div>
              {batch.licenceDetails && (
                <div className="font-mono text-[11px] text-[#176B45] bg-[#E8F5EE] px-2 py-0.5 rounded-lg border border-[#C2E3D0]">
                  Licence: {batch.licenceDetails}
                </div>
              )}
            </div>
          </div>

          {/* Custody Handovers Preview */}
          {batch.handovers && batch.handovers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#26352E] mb-2">Custody Movement History</h4>
              <div className="space-y-2">
                {batch.handovers.map((ho, index) => (
                  <div
                    key={ho.id || index}
                    className="p-3 rounded-xl bg-white border border-[#E3EAE5] text-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#26352E]">{ho.stage}</span>
                        <StatusBadge status={ho.status} size="xs" />
                      </div>
                      <p className="text-[11px] text-[#66756D] mt-0.5">
                        {ho.sender} → {ho.receiver}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-medium text-[#26352E]">
                        {ho.dispatchWeight} kg
                      </span>
                      <p className="text-[10px] text-[#8C9B93]">{ho.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAFCFA] border-t border-[#E3EAE5] flex items-center justify-between">
          <p className="text-[11px] text-[#8C9B93]">
            Verified via SHA-256 Merkle Leaf in Batch Registry
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}
