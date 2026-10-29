import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  Plus,
  Trash2,
  Camera,
  Upload,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  X,
  Info,
  Building,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  SwitchCamera,
  Eye,
  ShieldAlert,
  ChevronDown,
  Check,
} from 'lucide-react'
import { calculateMassBalance } from '../../utils/massBalance'
import { formatWeight, formatDate } from '../../utils/formatters'
import { useBatchStore } from '../../hooks/useBatchStore'
import { resolveFileUrl } from '../../services/apiClient'
import { uploadEvidenceFile, uploadCameraSnapshot } from '../../services/recoveryService'

/**
 * Predefined Common E-Waste Recovery Materials
 * Standard statutory fractions under CPCB / international metallurgical recovery guidelines.
 */
export const PREDEFINED_RECOVERY_MATERIALS = [
  'Copper',
  'Aluminium',
  'Iron / Steel',
  'Gold',
  'Silver',
  'Palladium',
  'Printed Circuit Boards (PCBs)',
  'Plastics',
  'Glass',
  'Ferrous Metals',
  'Non-Ferrous Metals',
  'Lithium-Ion Battery Materials',
  'Lead',
  'Other',
]

/**
 * Searchable Autocomplete Combobox for Material Selection
 * Populates only the material name. Leaves the measured weight field completely empty.
 */
function MaterialComboboxInput({
  id,
  value,
  onChange,
  disabled,
  placeholder = 'Select or type material (e.g. Copper)...',
  error,
  isDuplicate,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Filter suggestions based on what user has typed
  const filteredSuggestions = useMemo(() => {
    const term = (value || '').trim().toLowerCase()
    if (!term) return PREDEFINED_RECOVERY_MATERIALS
    return PREDEFINED_RECOVERY_MATERIALS.filter((mat) =>
      mat.toLowerCase().includes(term)
    )
  }, [value])

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectOption = (mat) => {
    if (mat === 'Other') {
      onChange('')
      setIsOpen(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      onChange(mat)
      setIsOpen(false)
    }
  }

  const listId = `material-datalist-${id}`

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          list={listId}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onFocus={() => {
            if (!disabled) setIsOpen(true)
          }}
          onChange={(e) => {
            onChange(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          className={`w-full pr-8 pl-3 py-1.5 text-xs font-medium bg-[#FAFCFA] border rounded-lg text-[#26352E] focus:outline-none focus:ring-1 focus:ring-[#176B45] focus:border-[#176B45] disabled:bg-gray-100 disabled:cursor-not-allowed ${
            isDuplicate
              ? 'border-amber-400 bg-amber-50/20'
              : error
              ? 'border-red-400 bg-red-50/20'
              : 'border-[#E3EAE5]'
          }`}
          autoComplete="off"
        />

        {/* HTML5 datalist for native keyboard suggestions on mobile */}
        <datalist id={listId}>
          {PREDEFINED_RECOVERY_MATERIALS.map((mat) => (
            <option key={mat} value={mat === 'Other' ? '' : mat} label={mat} />
          ))}
        </datalist>

        {/* Chevron Dropdown Toggle Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev)
              inputRef.current?.focus()
            }
          }}
          className="absolute right-1.5 p-1 text-[#8C9B93] hover:text-[#176B45] transition-colors rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Browse common e-waste materials"
          tabIndex={-1}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-[#176B45]' : ''}`} />
        </button>
      </div>

      {/* Styled Interactive Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#C2E3D0] rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-50 py-1 text-xs">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#176B45] font-bold bg-[#FAFCFA] flex items-center justify-between">
            <span>Predefined E-Waste Materials</span>
            <span className="text-gray-400 font-normal">Click to populate</span>
          </div>

          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((mat) => {
              const isSelected = (value || '').trim().toLowerCase() === mat.toLowerCase()
              return (
                <button
                  key={mat}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectOption(mat)}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#E8F5EE] transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#E8F5EE] font-semibold text-[#176B45]' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{mat}</span>
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-[#176B45] shrink-0" />
                  ) : mat === 'Other' ? (
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">Custom</span>
                  ) : null}
                </button>
              )
            })
          ) : (
            <div className="px-3 py-2 text-xs text-gray-400 italic">
              No direct predefined match. Press Tab or Enter to keep custom &quot;{value}&quot;.
            </div>
          )}

          {value.trim() && !PREDEFINED_RECOVERY_MATERIALS.some(m => m.toLowerCase() === value.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-3 py-1.5 bg-[#FAFCFA] hover:bg-[#E8F5EE] text-[#176B45] font-medium flex items-center gap-1 border-t border-gray-100"
            >
              <Plus className="w-3 h-3" />
              <span>Use custom: &quot;{value.trim()}&quot;</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function ProcessingForm({ onComplete }) {
  const { batches, facilities, handleProcessRecovery, addToast } = useBatchStore()

  // Helper: check if a batch has already completed recovery
  const isBatchProcessed = (b) => {
    if (!b) return false
    return (
      b.status === 'Processed' ||
      b.processingData?.validationStatus === 'Reconciled' ||
      Boolean(b.recoveryClaimId)
    )
  }

  // Eligible batches: strictly exclude fully processed / reconciled batches
  const eligibleBatches = useMemo(() => {
    return batches.filter(b => !isBatchProcessed(b))
  }, [batches])

  const processedBatches = useMemo(() => {
    return batches.filter(b => isBatchProcessed(b))
  }, [batches])

  const [searchParams, setSearchParams] = useSearchParams()
  const queryBatchId = searchParams.get('batch') || searchParams.get('batchId') || ''

  // Selected batch state (default to query param if provided, else first eligible batch)
  const [selectedBatchId, setSelectedBatchId] = useState(queryBatchId)

  useEffect(() => {
    if (queryBatchId && queryBatchId !== selectedBatchId) {
      setSelectedBatchId(queryBatchId)
    } else if (!selectedBatchId) {
      if (eligibleBatches.length > 0) {
        setSelectedBatchId(eligibleBatches[0].id || eligibleBatches[0].batchId)
      } else if (batches.length > 0) {
        setSelectedBatchId(batches[0].id || batches[0].batchId)
      }
    }
  }, [queryBatchId, eligibleBatches, batches, selectedBatchId])

  const selectedBatch = useMemo(() => {
    return batches.find(b => (b.id === selectedBatchId || b.batchId === selectedBatchId)) || null
  }, [batches, selectedBatchId])

  // Flag if the currently selected batch was already recovered
  const isCurrentBatchProcessed = useMemo(() => {
    return isBatchProcessed(selectedBatch)
  }, [selectedBatch])

  // Facility selection
  const facilityOptions = useMemo(() => {
    return (facilities || []).filter(
      (f) =>
        (!f.facilityType || f.facilityType === 'RECYCLER') &&
        (f.licenceStatus === 'Active & Verified' || f.verificationStatus === 'VERIFIED')
    )
  }, [facilities])

  const [facility, setFacility] = useState('')

  useEffect(() => {
    if (selectedBatch?.assignedFacility) {
      const match = facilityOptions.find(f => f.name.toLowerCase() === selectedBatch.assignedFacility.toLowerCase())
      if (match) {
        setFacility(match.name)
        return
      }
    }
    if (!facility && facilityOptions.length > 0) {
      setFacility(facilityOptions[0].name)
    }
  }, [selectedBatch, facilityOptions, facility])

  const [processingDate, setProcessingDate] = useState(new Date().toISOString().split('T')[0])
  const [processingReference, setProcessingReference] = useState(() => {
    return `PR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
  })

  // =========================================================================
  // 1. DYNAMIC RECOVERED MATERIALS (MANUAL ENTRY ONLY, STARTS EMPTY)
  // =========================================================================
  const [materialRows, setMaterialRows] = useState([
    { id: Date.now(), name: '', weight: '' }
  ])

  const [remainingWaste, setRemainingWaste] = useState('')
  const [remainingWasteDestination, setRemainingWasteDestination] = useState('Ramky TSDF Hazardous Landfill Unit #3')
  const [explainedLoss, setExplainedLoss] = useState('')
  const [operator, setOperator] = useState('Dr. S. Nair (Head Metallurgist)')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validation discrepancy state (triggered on submit)
  const [submitValidationError, setSubmitValidationError] = useState(null)

  // =========================================================================
  // 2. EVIDENCE & DOCUMENT UPLOAD STATE (CAMERA, PHOTO, DOCUMENT)
  // =========================================================================
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  const videoRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const photoInputRef = useRef(null)
  const docInputRef = useRef(null)

  const originalIncomingWeight = Number(selectedBatch?.grossWeight || 0)

  // Dynamic sum of manual material weights
  const totalRecoveredWeight = useMemo(() => {
    const sum = materialRows.reduce((acc, row) => {
      const num = parseFloat(row.weight)
      return !isNaN(num) && num > 0 ? acc + num : acc
    }, 0)
    return Number(sum.toFixed(2))
  }, [materialRows])

  // Total accounted weight
  const totalAccountedWeight = useMemo(() => {
    const waste = parseFloat(remainingWaste) || 0
    const loss = parseFloat(explainedLoss) || 0
    return Number((totalRecoveredWeight + waste + loss).toFixed(2))
  }, [totalRecoveredWeight, remainingWaste, explainedLoss])

  // Material row handlers
  const handleAddMaterialRow = () => {
    setMaterialRows(prev => [
      ...prev,
      { id: Date.now() + Math.random(), name: '', weight: '' },
    ])
    setSubmitValidationError(null)
  }

  const handleRemoveMaterialRow = (id) => {
    if (materialRows.length === 1) {
      setMaterialRows([{ id: Date.now(), name: '', weight: '' }])
    } else {
      setMaterialRows(prev => prev.filter(r => r.id !== id))
    }
    setSubmitValidationError(null)
  }

  const handleMaterialChange = (id, field, value) => {
    if (field === 'weight' && value !== '' && Number(value) < 0) return // reject negatives
    setMaterialRows(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    )
    setSubmitValidationError(null)
  }

  // Helper to pre-fill from sorting breakdown if operator chooses
  const handlePrefillFromSorting = () => {
    if (!selectedBatch?.sortingBreakdown?.categories?.length) {
      addToast({
        type: 'info',
        title: 'No Sorting Breakdown Found',
        message: 'This batch has not yet been sorted into categories on the Batches page.',
      })
      return
    }

    const categories = selectedBatch.sortingBreakdown.categories
    const newRows = categories.map((cat, idx) => ({
      id: Date.now() + idx,
      name: cat.category,
      weight: String(cat.weightKg),
    }))

    setMaterialRows(newRows)
    setSubmitValidationError(null)
    addToast({
      type: 'success',
      title: 'Populated from Sorting Breakdown',
      message: `Loaded ${categories.length} material fractions from batch inspection record.`,
    })
  }

  // Duplicate material names check (case-insensitive)
  const duplicateMaterialError = useMemo(() => {
    const nameCounts = {}
    for (const row of materialRows) {
      const trimmed = row.name.trim().toLowerCase()
      if (trimmed) {
        nameCounts[trimmed] = (nameCounts[trimmed] || 0) + 1
        if (nameCounts[trimmed] > 1) {
          return `Duplicate material '${row.name.trim()}' detected. Please combine weights or change the material name.`
        }
      }
    }
    return null
  }, [materialRows])

  // Track rows that have duplicate names for inline warnings
  const duplicateRowIds = useMemo(() => {
    const seen = {}
    const dupes = new Set()
    materialRows.forEach((r) => {
      const trimmed = (r.name || '').trim().toLowerCase()
      if (trimmed) {
        if (seen[trimmed] !== undefined) {
          dupes.add(r.id)
          dupes.add(seen[trimmed])
        } else {
          seen[trimmed] = r.id
        }
      }
    })
    return dupes
  }, [materialRows])

  // Map dynamic material rows to calculation inputs
  const materialsMap = useMemo(() => {
    const map = {}
    materialRows.forEach((r, idx) => {
      const numWeight = Number(r.weight)
      if (r.name.trim() && !isNaN(numWeight) && numWeight >= 0) {
        map[`item_${idx}_${r.name.trim().toLowerCase()}`] = numWeight
      }
    })
    return map
  }, [materialRows])

  // =========================================================================
  // CAMERA FUNCTIONS
  // =========================================================================
  const startCamera = async (mode = facingMode) => {
    setCameraError(null)
    setIsCameraOpen(true)

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser. Please use Photo Upload.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err)
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings, or use "Upload Photo".'
          : err.message || 'Unable to open camera on this device. Please use "Upload Photo".'
      )
    }
  }

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    setIsCameraOpen(false)
    setCameraError(null)
  }

  const switchCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  const takeSnapshot = async () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const base64Data = canvas.toDataURL('image/jpeg', 0.85)

    stopCamera()
    setIsUploadingFile(true)

    try {
      const filename = `camera_snapshot_${Date.now()}.jpg`
      const uploaded = await uploadCameraSnapshot(base64Data, filename)
      setEvidenceFiles(prev => [...prev, uploaded])
      addToast({
        type: 'success',
        title: 'Photo Captured',
        message: 'Camera photo attached to processing evidence.',
      })
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Upload Failed',
        message: err.message || 'Failed to save snapshot.',
      })
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingFile(true)
    try {
      const uploaded = await uploadEvidenceFile(file)
      setEvidenceFiles(prev => [...prev, uploaded])
      addToast({
        type: 'success',
        title: 'Photo Attached',
        message: `${file.name} uploaded successfully.`,
      })
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Upload Failed',
        message: err.message || 'Failed to upload photo.',
      })
    } finally {
      setIsUploadingFile(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handleDocFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingFile(true)
    try {
      const uploaded = await uploadEvidenceFile(file)
      setEvidenceFiles(prev => [...prev, uploaded])
      addToast({
        type: 'success',
        title: 'Document Attached',
        message: `${file.name} attached to processing record.`,
      })
    } catch (err) {
      addToast({
        type: 'danger',
        title: 'Upload Failed',
        message: err.message || 'Failed to upload document.',
      })
    } finally {
      setIsUploadingFile(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  const handleRemoveEvidence = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // =========================================================================
  // SUBMISSION & VALIDATION ON SUBMIT
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault()

    // 1. Guard against processed batch
    if (isCurrentBatchProcessed) {
      setSubmitValidationError({
        type: 'ALREADY_RECORDED',
        title: 'Recovery Already Recorded',
        message: 'This batch has already been processed and its recovery record exists. Review the existing recovery record instead of submitting another claim.',
      })
      return
    }

    if (!selectedBatch) {
      addToast({
        type: 'warning',
        title: 'Batch Required',
        message: 'Please select a batch before submitting.',
      })
      return
    }

    // 2. Validate every material row
    if (!materialRows || materialRows.length === 0) {
      setSubmitValidationError({
        type: 'MISSING_MATERIALS',
        title: 'Missing Material Information',
        message: 'Please add at least one recovered material row.',
      })
      return
    }

    for (let i = 0; i < materialRows.length; i++) {
      const row = materialRows[i]
      const rowNum = i + 1

      // A. Material Name Required
      if (!row.name || !row.name.trim()) {
        setSubmitValidationError({
          type: 'MISSING_NAME',
          title: 'Material Name Required',
          message: `Material name is required in row ${rowNum}. Please select a predefined material or type a custom name.`,
        })
        return
      }

      // B. Weight must not be empty
      if (row.weight === '' || row.weight === null || row.weight === undefined) {
        setSubmitValidationError({
          type: 'EMPTY_WEIGHT',
          title: 'Measured Weight Required',
          message: `Please enter an actual measured weight for '${row.name.trim()}' in row ${rowNum}. Empty weights are not accepted.`,
        })
        return
      }

      // C. Weight must be a valid, finite number
      const numWeight = Number(row.weight)
      if (isNaN(numWeight) || !isFinite(numWeight)) {
        setSubmitValidationError({
          type: 'INVALID_WEIGHT',
          title: 'Invalid Numeric Weight',
          message: `Weight for '${row.name.trim()}' in row ${rowNum} must be a valid number.`,
        })
        return
      }

      // D. Weight must not be negative
      if (numWeight < 0) {
        setSubmitValidationError({
          type: 'NEGATIVE_WEIGHT',
          title: 'Negative Weight Not Permitted',
          message: `Weight for '${row.name.trim()}' in row ${rowNum} cannot be negative.`,
        })
        return
      }
    }

    // 3. Validate total positive recovered weight
    const positiveMaterials = materialRows.filter(r => Number(r.weight) > 0)
    if (positiveMaterials.length === 0) {
      setSubmitValidationError({
        type: 'ZERO_TOTAL_WEIGHT',
        title: 'Zero Recovered Weight',
        message: 'Total recovered weight must be greater than zero kg. Please enter measured weights for your recovered fractions.',
      })
      return
    }

    // 4. Validate duplicate material names
    if (duplicateMaterialError) {
      setSubmitValidationError({
        type: 'DUPLICATE_MATERIALS',
        title: 'Duplicate Material Names Found',
        message: duplicateMaterialError,
      })
      return
    }

    // 4. Dynamically compute Accounted Weight and Weight Difference
    const wasteVal = remainingWaste === '' ? 0 : Number(remainingWaste)
    const lossVal = explainedLoss === '' ? 0 : Number(explainedLoss)
    const accountedWeight = Number((totalRecoveredWeight + wasteVal + lossVal).toFixed(2))
    const weightDifference = Number((originalIncomingWeight - accountedWeight).toFixed(2))
    const tolerance = 20

    // If difference exceeds tolerance, REJECT submission with exact alert
    if (Math.abs(weightDifference) > tolerance) {
      const diffFormatted = weightDifference > 0 ? `+${weightDifference}` : `${weightDifference}`
      setSubmitValidationError({
        type: 'DISCREPANCY',
        title: 'Validation Failed — Weight Difference Found',
        message: 'The recorded quantities do not match the original incoming weight. Please review the weights before submitting.',
        details: `Exact Weight Difference: ${diffFormatted} kg (Target: ${originalIncomingWeight} kg | Accounted: ${accountedWeight} kg)`,
      })
      return
    }

    // Clear any previous error
    setSubmitValidationError(null)
    setIsSubmitting(true)

    // Build dynamic material breakdown and map
    const materialsMap = {}
    const materialsBreakdown = materialRows.map((r) => {
      const name = r.name.trim()
      const wt = Number(r.weight)
      if (name && !isNaN(wt)) {
        materialsMap[name] = wt
      }
      return {
        name,
        weightKg: wt,
      }
    })

    const payload = {
      batchId: selectedBatch.id || selectedBatch.batchId,
      facility,
      processingDate,
      processingReference,
      sourceOrg: selectedBatch.sourceOrg || '',
      inputWeight: originalIncomingWeight,
      recoveredWeight: totalRecoveredWeight,
      materials: materialsMap,
      materialsBreakdown,
      remainingWaste: wasteVal,
      residualWaste: wasteVal,
      remainingWasteDestination,
      explainedLoss: lossVal,
      operator,
      evidenceFiles,
      evidenceUrl: evidenceFiles[0]?.url || '',
    }

    try {
      const result = await handleProcessRecovery(payload)
      setIsSubmitting(false)

      // Refresh processing reference
      setProcessingReference(`PR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`)

      // Reset form to empty row
      setMaterialRows([
        { id: Date.now(), name: '', weight: '' }
      ])
      setRemainingWaste('')
      setExplainedLoss('')
      setEvidenceFiles([])
      setSubmitValidationError(null)

      if (onComplete) onComplete(result)
    } catch (err) {
      setIsSubmitting(false)
      if (err.response?.status === 409 || err.message?.includes('already')) {
        setSubmitValidationError({
          type: 'ALREADY_RECORDED',
          title: 'Recovery Already Recorded',
          message: err.response?.data?.message || 'This batch has already been processed and its recovery record exists.',
        })
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#E3EAE5] gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#003B23]">
            Recycler Processing &amp; Weight Reconciliation
          </h2>
          <p className="text-xs text-[#66756D]">
            Record recovered materials, check the total weight, and submit the processing record.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#176B45] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#C2E3D0] inline-flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Allowed Tolerance: ±0.5 kg
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EXPLICIT WARNING: RECOVERY ALREADY RECORDED (REFERENCE IMAGE 2)      */}
      {/* ===================================================================== */}
      {isCurrentBatchProcessed && (
        <div className="p-5 rounded-2xl bg-[#FEF5E7] border-2 border-[#E9A23B] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#7A4B00] animate-in fade-in duration-150 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#E9A23B] shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-[#7A4B00]">
                  Recovery Already Recorded
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-[#E8F5EE] text-[#176B45] border border-[#C2E3D0]">
                  Processed &amp; Reconciled
                </span>
                <span className="font-mono text-xs font-semibold text-[#7A4B00]">
                  [{selectedBatchId}]
                </span>
              </div>
              <p className="text-xs text-[#5C3800] mt-1 leading-relaxed">
                This batch has already been processed and its recovery record exists. Review the existing recovery record instead of submitting another claim.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('mass-balance-claim-ledger')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-3.5 py-2 text-xs font-semibold text-[#176B45] bg-white hover:bg-[#E8F5EE] border border-[#C2E3D0] rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              View Recovery Record
            </button>
            <button
              type="button"
              onClick={() => {
                if (eligibleBatches.length > 0) {
                  setSelectedBatchId(eligibleBatches[0].id || eligibleBatches[0].batchId)
                  setSubmitValidationError(null)
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Return to Available List
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Section: Batch and Facility Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Select Batch ID (excludes processed batches from available list) */}
          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Select Batch ID <span className="text-[#D94F4F]">*</span>
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                const nextId = e.target.value
                setSelectedBatchId(nextId)
                setSubmitValidationError(null)
                if (nextId) {
                  setSearchParams({ batch: nextId })
                } else {
                  setSearchParams({})
                }
              }}
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#003B23] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
            >
              {eligibleBatches.length === 0 && !isCurrentBatchProcessed ? (
                <option value="">No unprocessed batches available</option>
              ) : (
                <>
                  <optgroup label="Available for Processing">
                    {eligibleBatches.map((b) => {
                      const bId = b.id || b.batchId
                      return (
                        <option key={bId} value={bId}>
                          {bId} — {b.grossWeight} kg ({b.collectionType || b.category || 'Consignment'})
                        </option>
                      )
                    })}
                  </optgroup>
                  {isCurrentBatchProcessed && (
                    <optgroup label="Previously Recovered (Read Only)">
                      <option value={selectedBatchId}>
                        {selectedBatchId} — {selectedBatch?.grossWeight} kg (Recovery Recorded)
                      </option>
                    </optgroup>
                  )}
                </>
              )}
            </select>
          </div>

          {/* Original Collection Date (Auto-filled) */}
          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Original Collection Date
            </label>
            <div className="w-full px-3 py-2 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#26352E] flex items-center justify-between">
              <span className="font-mono text-xs">{selectedBatch ? formatDate(selectedBatch.collectionDate) : 'Select a batch'}</span>
              <span className="text-[10px] text-[#8C9B93]">Auto-filled</span>
            </div>
          </div>

          {/* Original Incoming Weight (Auto-filled & Read-only) */}
          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Original Incoming Weight (kg)
            </label>
            <div className="w-full px-3 py-2 text-xs bg-[#E8F5EE] border border-[#C2E3D0] rounded-xl text-[#003B23] flex items-center justify-between">
              <span className="font-mono font-bold text-xs">{formatWeight(originalIncomingWeight)}</span>
              <span className="text-[10px] font-medium text-[#176B45]">Intake Tare Weight</span>
            </div>
          </div>

          {/* Source Organisation (Auto-filled) */}
          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Source Organisation
            </label>
            <div className="w-full px-3 py-2 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#26352E] truncate">
              {selectedBatch?.sourceOrg || '—'}
            </div>
          </div>

          {/* Authorised Recycling Facility */}
          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Authorised Recycling Facility <span className="text-[#D94F4F]">*</span>
            </label>
            <select
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              disabled={isCurrentBatchProcessed}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {facilityOptions.map((f) => (
                <option key={f.id || f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Processing Date */}
          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Processing Date <span className="text-[#D94F4F]">*</span>
            </label>
            <input
              type="date"
              value={processingDate}
              onChange={(e) => setProcessingDate(e.target.value)}
              disabled={isCurrentBatchProcessed}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Processing Reference (Auto-generated) */}
          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Processing Reference
            </label>
            <div className="w-full px-3 py-2 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#176B45] flex items-center justify-between">
              <span className="font-mono font-semibold text-xs">{processingReference}</span>
              <span className="text-[10px] text-[#8C9B93]">Unique Reference</span>
            </div>
          </div>

          {/* Responsible Metallurgist */}
          <div>
            <label className="block text-xs font-medium text-[#26352E] mb-1">
              Responsible Metallurgist / Tech
            </label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              disabled={isCurrentBatchProcessed}
              placeholder="e.g. Dr. S. Nair (Head Metallurgist)"
              className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 1: MANUAL RECOVERED MATERIALS ENTRY                       */}
        {/* ================================================================= */}
        <div className="p-4 rounded-2xl border border-[#E3EAE5] bg-[#FAFCFA] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E3EAE5]">
            <div>
              <h3 className="text-xs font-semibold text-[#003B23] uppercase tracking-wider">
                Recovered Materials
              </h3>
              <p className="text-xs text-[#66756D]">
                Add each material recovered during processing and enter its weight in kilograms.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedBatch?.sortingBreakdown?.categories?.length > 0 && !isCurrentBatchProcessed && (
                <button
                  type="button"
                  onClick={handlePrefillFromSorting}
                  className="px-2.5 py-1 text-xs font-medium text-[#176B45] bg-white hover:bg-[#E8F5EE] border border-[#C2E3D0] rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                  title="Load material fractions from post-intake sorting bay inspection"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#176B45]" />
                  <span>Pre-fill from Sorting</span>
                </button>
              )}

              <span className="text-xs font-semibold text-[#176B45] bg-[#E8F5EE] px-2.5 py-1 rounded-lg border border-[#C2E3D0]">
                Total Recovered Weight: <strong className="font-mono">{formatWeight(totalRecoveredWeight)}</strong>
              </span>
            </div>
          </div>

          {/* Dynamic Rows */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-medium uppercase text-[#8C9B93] px-1">
              <div className="col-span-6 sm:col-span-7">Material Name</div>
              <div className="col-span-5 sm:col-span-4">Recovered Weight (kg)</div>
              <div className="col-span-1 text-right">Remove</div>
            </div>

            {materialRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-[#E3EAE5] hover:border-[#C2E3D0] transition-colors"
              >
                {/* Material Name Field with Autocomplete Dropdown */}
                <div className="col-span-6 sm:col-span-7">
                  <MaterialComboboxInput
                    id={row.id}
                    value={row.name}
                    disabled={isCurrentBatchProcessed}
                    onChange={(val) => handleMaterialChange(row.id, 'name', val)}
                    isDuplicate={duplicateRowIds.has(row.id)}
                  />
                  {duplicateRowIds.has(row.id) && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Duplicate material name entered.</span>
                    </p>
                  )}
                </div>

                {/* Recovered Weight Field */}
                <div className="col-span-5 sm:col-span-4 relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={row.weight}
                    disabled={isCurrentBatchProcessed}
                    onChange={(e) => handleMaterialChange(row.id, 'weight', e.target.value)}
                    className="w-full pr-8 py-1.5 px-3 text-xs font-mono font-bold bg-[#FAFCFA] border border-[#E3EAE5] rounded-lg text-[#26352E] focus:outline-none focus:ring-1 focus:ring-[#176B45] focus:border-[#176B45] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs font-mono text-[#8C9B93]">kg</span>
                </div>

                {/* Remove Button */}
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterialRow(row.id)}
                    disabled={isCurrentBatchProcessed}
                    className="p-1.5 text-[#8C9B93] hover:text-[#D94F4F] hover:bg-[#FDF2F2] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove this material row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Material Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleAddMaterialRow}
              disabled={isCurrentBatchProcessed}
              className="px-3 py-1.5 text-xs font-semibold text-[#176B45] bg-white hover:bg-[#E8F5EE] border border-[#C2E3D0] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Material</span>
            </button>
            <span className="text-xs text-[#8C9B93]">
              Add as many recovered material fractions as required. Weight updates dynamically.
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 2: REMAINING WASTE AND PROCESSING LOSS                    */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Remaining Waste (kg) */}
          <div className="p-4 rounded-2xl border border-[#E3EAE5] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#26352E]">
                2. Remaining Waste (kg)
              </label>
              <span className="text-xs text-[#8C9B93]">Non-Recoverable</span>
            </div>
            <p className="text-xs text-[#66756D] leading-tight">
              Weight of material remaining after processing and not included in recovered quantities.
            </p>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={remainingWaste}
                disabled={isCurrentBatchProcessed}
                onChange={(e) => {
                  if (e.target.value !== '' && Number(e.target.value) < 0) return
                  setRemainingWaste(e.target.value)
                  setSubmitValidationError(null)
                }}
                className="w-full px-3 py-2 text-xs font-mono bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-[#8C9B93]">kg</span>
            </div>

            <div className="pt-1">
              <label className="block text-xs font-medium text-[#66756D] mb-1">
                Waste Disposal Destination / Facility
              </label>
              <input
                type="text"
                value={remainingWasteDestination}
                disabled={isCurrentBatchProcessed}
                onChange={(e) => setRemainingWasteDestination(e.target.value)}
                placeholder="e.g. Ramky TSDF Hazardous Waste Landfill"
                className="w-full px-2.5 py-1.5 text-xs bg-[#FAFCFA] border border-[#E3EAE5] rounded-lg text-[#26352E] focus:outline-none focus:ring-1 focus:ring-[#176B45] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Explained Processing Loss (kg) */}
          <div className="p-4 rounded-2xl border border-[#E3EAE5] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#26352E]">
                3. Explained Processing Loss (kg)
              </label>
              <span className="text-xs text-[#8C9B93]">Measured Deficit</span>
            </div>
            <p className="text-xs text-[#66756D] leading-tight">
              Documented losses that reasonably occur during processing (e.g. moisture evaporation, baghouse dust).
            </p>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={explainedLoss}
                disabled={isCurrentBatchProcessed}
                onChange={(e) => {
                  if (e.target.value !== '' && Number(e.target.value) < 0) return
                  setExplainedLoss(e.target.value)
                  setSubmitValidationError(null)
                }}
                className="w-full px-3 py-2 text-xs font-mono bg-[#FAFCFA] border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-[#8C9B93]">kg</span>
            </div>

            <div className="p-2.5 bg-[#FAFCFA] rounded-lg border border-[#E3EAE5] text-xs text-[#66756D] mt-2 leading-relaxed">
              <strong>Notice:</strong> Documented process losses must be supported by facility scale logs and oven calibration sheets for regulatory auditing.
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 3: EVIDENCE & DOCUMENT UPLOAD SECTION                     */}
        {/* ================================================================= */}
        <div className="p-4 rounded-2xl border border-[#E3EAE5] bg-[#FAFCFA] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E3EAE5]">
            <div>
              <h3 className="text-xs font-semibold text-[#003B23] uppercase tracking-wider">
                Evidence &amp; Document Upload
              </h3>
              <p className="text-xs text-[#66756D]">
                Take a photo or upload a photo or document to support this processing record.
              </p>
            </div>
            <span className="text-xs text-[#8C9B93]">
              Optional • Digital audit verification
            </span>
          </div>

          {/* Three Option Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isCurrentBatchProcessed}
              onClick={() => startCamera(facingMode)}
              className="px-3.5 py-2 text-xs font-medium text-[#176B45] bg-white hover:bg-[#E8F5EE] border border-[#C2E3D0] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-4 h-4 text-[#176B45]" />
              <span>Take Photo</span>
            </button>

            <button
              type="button"
              disabled={isCurrentBatchProcessed}
              onClick={() => photoInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-4 h-4 text-[#66756D]" />
              <span>Upload Photo</span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileChange}
            />

            <button
              type="button"
              disabled={isCurrentBatchProcessed}
              onClick={() => docInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4 text-[#66756D]" />
              <span>Upload Document (PDF/Slip)</span>
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,application/pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleDocFileChange}
            />

            {isUploadingFile && (
              <span className="text-xs text-[#176B45] inline-flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading file...
              </span>
            )}
          </div>

          {/* Interactive Camera Modal / Viewfinder */}
          {isCameraOpen && (
            <div className="p-4 bg-black/90 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-white text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Live Camera Viewfinder ({facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={switchCameraFacing}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Switch camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Close camera"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {cameraError ? (
                <div className="p-4 bg-red-950/80 border border-red-700 rounded-xl text-red-200 text-xs">
                  <p className="font-semibold">{cameraError}</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-72 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={takeSnapshot}
                      className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs inline-flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence Previews List */}
          {evidenceFiles.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-[#26352E] block">
                Attached Evidence Files ({evidenceFiles.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {evidenceFiles.map((file, idx) => {
                  const isImage = file.type === 'photo' || file.mimetype?.startsWith('image/') || file.url?.startsWith('data:image/')
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-[#E3EAE5] text-xs gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isImage ? (
                          <img
                            src={resolveFileUrl(file.url)}
                            alt="Evidence preview"
                            className="w-12 h-12 object-cover rounded-lg border border-[#E3EAE5] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] border border-[#C2E3D0] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#176B45]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[#26352E] truncate text-xs">
                            {file.name || 'Evidence Attachment'}
                          </p>
                          <p className="text-[10px] text-[#8C9B93]">
                            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Attached'} • {isImage ? 'Photo' : 'Document'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(idx)}
                          className="p-1.5 text-[#8C9B93] hover:text-[#D94F4F] hover:bg-[#FDF2F2] rounded-lg transition-colors"
                          title="Remove this file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SECTION 4: WEIGHT RECONCILIATION SUMMARY CARD                     */}
        {/* ================================================================= */}
        <div className="p-5 rounded-2xl bg-[#FAFCFA] border border-[#E3EAE5] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
            <h3 className="text-xs font-semibold text-[#003B23] uppercase tracking-wider">
              Weight Reconciliation Summary
            </h3>
            <span className="text-xs font-medium text-[#176B45]">
              Target: <strong className="font-mono">{formatWeight(originalIncomingWeight)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-2.5 bg-white rounded-xl border border-[#E3EAE5]">
              <span className="text-[11px] uppercase font-medium text-[#8C9B93] block">Incoming Weight</span>
              <p className="font-mono font-bold text-sm text-[#26352E] mt-0.5">
                {formatWeight(originalIncomingWeight)}
              </p>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#E3EAE5]">
              <span className="text-[11px] uppercase font-medium text-[#8C9B93] block">Recovered Materials</span>
              <p className="font-mono font-bold text-sm text-[#176B45] mt-0.5">
                {formatWeight(totalRecoveredWeight)}
              </p>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#E3EAE5]">
              <span className="text-[11px] uppercase font-medium text-[#8C9B93] block">Remaining Waste</span>
              <p className="font-mono font-bold text-sm text-[#26352E] mt-0.5">
                {formatWeight(remainingWaste === '' ? 0 : Number(remainingWaste))}
              </p>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#E3EAE5]">
              <span className="text-[11px] uppercase font-medium text-[#8C9B93] block">Explained Loss</span>
              <p className="font-mono font-bold text-sm text-[#26352E] mt-0.5">
                {formatWeight(explainedLoss === '' ? 0 : Number(explainedLoss))}
              </p>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#E3EAE5]">
              <span className="text-[11px] uppercase font-medium text-[#8C9B93] block">Total Accounted</span>
              <p className="font-mono font-bold text-sm text-[#26352E] mt-0.5">
                {formatWeight(totalAccountedWeight)}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 5: VALIDATION NOTIFICATION BANNER (ON SUBMIT)             */}
        {/* ================================================================= */}
        {submitValidationError && (
          <div className="p-5 rounded-2xl bg-[#FDF2F2] border-2 border-[#D94F4F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#9B1C1C] animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[#D94F4F] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#9B1C1C]">
                  {submitValidationError.title}
                </h4>
                <p className="text-xs text-[#26352E] mt-1 leading-relaxed">
                  {submitValidationError.message}
                </p>
                {submitValidationError.details && (
                  <p className="text-xs font-semibold text-[#D94F4F] mt-2">
                    {submitValidationError.details}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span className="px-3 py-1 text-xs font-bold text-white bg-[#D94F4F] rounded-full uppercase tracking-wider">
                Submission Blocked
              </span>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION 6: SUBMIT ACTION BUTTON                                   */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-[#E3EAE5] gap-3">
          <div className="text-xs text-[#66756D]">
            <span>Digitally certified by: <strong className="text-[#26352E]">{operator}</strong></span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isCurrentBatchProcessed}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white rounded-xl transition-all shadow-xs ${
              isCurrentBatchProcessed
                ? 'bg-gray-300 cursor-not-allowed opacity-60'
                : 'bg-[#176B45] hover:bg-[#003B23] shadow-sm cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Submitting Processing Record...</span>
              </>
            ) : isCurrentBatchProcessed ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Recovery Already Recorded</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Processing Record</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
