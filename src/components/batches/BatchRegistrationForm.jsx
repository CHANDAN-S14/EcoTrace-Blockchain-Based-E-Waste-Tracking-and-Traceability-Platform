import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QRCodeSVG } from 'qrcode.react'
import {
  Upload,
  QrCode,
  Save,
  CheckCircle2,
  FileText,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Copy,
  Download,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Layers,
  Scale,
  Trash2,
  X,
  FileUp,
} from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB per file limit

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const batchSchema = z.object({
  collectionType: z.enum(['Mixed E-Waste', 'Pre-Sorted E-Waste']).default('Mixed E-Waste'),
  category: z.string().optional(),
  sourceOrg: z.string().min(2, 'Source organization name is required'),
  collectionFacility: z.string().min(2, 'Collection facility is required'),
  collectionLocation: z.string().min(2, 'Location is required'),
  grossWeight: z.coerce.number().positive('Total incoming gross weight must be greater than 0 kg'),
  collectionDate: z.string().min(1, 'Collection date & time is required'),
  assignedHandler: z.string().min(2, 'Handler name & ID is required'),
  licenceDetails: z.string().min(2, 'Collector licence details are required'),
  notes: z.string().optional(),
})

const CATEGORIES = [
  'PCBs & Circuit Boards',
  'Consumer Electronics',
  'IT & Telecom Servers',
  'Lithium Batteries',
  'Large Appliances',
  'Small Appliances',
  'Display Panels & CRT Glass',
]

const FACILITIES = [
  'Bangalore Central Hub',
  'Whitefield E-Depot',
  'Peenya Sorting Center',
  'Electronic City Yard',
  'Mysore Municipal Depot',
]

export function BatchRegistrationForm({ onSuccess }) {
  const { facilities, registerNewBatch, setSelectedBatchForModal, setQrModalBatch, addToast } = useBatchStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdBatch, setCreatedBatch] = useState(null)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Real collection centres and facilities dynamically loaded from MongoDB
  const availableFacilities = useMemo(() => {
    if (Array.isArray(facilities) && facilities.length > 0) {
      return facilities.map((f) => f.name)
    }
    return [
      'EWaste Collection Centre, Play’ n’ Speak, Bengaluru',
      'EWaste Collection Centre, Saahas Zero Waste Solutions LLP, Bengaluru',
      'EWaste Collection Centre, Vans Chemistry Pvt Limited, Bengaluru',
      'EWaste Collection Centre, Town Municipal Council, Haveri',
      'EWaste Collection Centre, Belgaum Municpal Corporation, Belagavi',
      'GreenEarth Recyclers Ltd',
      'CleanTech E-Solutions Hub',
    ]
  }, [facilities])

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      })
    }
  }, [uploadedFiles])

  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) return

    const errors = []
    const validFiles = []

    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop().toLowerCase()
      const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext)
      const isAllowedMime = ALLOWED_MIMES.includes(file.type)

      if (!isAllowedExt && !isAllowedMime) {
        errors.push(`"${file.name}": Unsupported format. Allowed formats: JPG, JPEG, PNG, WEBP, and PDF.`)
        return
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}": Exceeds the 10 MB size limit (${formatFileSize(file.size)}).`)
        return
      }

      // Avoid duplicate file entries
      const isDuplicate = uploadedFiles.some(f => f.name === file.name && f.size === file.size)
      if (isDuplicate) return

      const isImage = file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
      validFiles.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: isImage ? 'photo' : 'document',
        mimetype: file.type || (isImage ? 'image/jpeg' : 'application/pdf'),
        previewUrl: isImage ? URL.createObjectURL(file) : null,
        status: 'Ready for submission',
      })
    })

    if (errors.length > 0) {
      setValidationErrors(prev => [...prev, ...errors])
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer?.files) {
      handleFilesSelected(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFilesSelected(e.target.files)
      e.target.value = ''
    }
  }

  const handleRemoveFile = (id) => {
    setUploadedFiles(prev => {
      const target = prev.find(f => f.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      collectionType: 'Mixed E-Waste',
      category: 'PCBs & Circuit Boards',
      sourceOrg: 'Apex Cloud Datacenter Ltd',
      collectionFacility: 'Bangalore Central Hub',
      collectionLocation: 'Bangalore, Karnataka (12.9716° N, 77.5946° E)',
      grossWeight: 1450.0,
      collectionDate: new Date().toISOString().slice(0, 16),
      assignedHandler: 'Ramesh Kumar (Lic #KA-EWT-402)',
      licenceDetails: 'CPCB/KSPCB/E-WASTE/2026/044',
      notes: 'Mixed decommissioning intake: server chassis, motherboards, cabling, and power supplies.',
    },
  })

  const collectionType = watch('collectionType')

  const handleSaveDraft = () => {
    const values = watch()
    localStorage.setItem('ecotrace_batch_draft', JSON.stringify(values))
    addToast({
      type: 'info',
      title: 'Draft Saved Locally',
      message: 'Batch registration draft preserved in local storage.',
    })
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text)
    addToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: `${label} copied to clipboard.`,
    })
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('collectionType', data.collectionType)
      formData.append('category', data.collectionType === 'Mixed E-Waste' ? 'Mixed E-Waste Bulk Consignment' : (data.category || 'Pre-Sorted E-Waste'))
      formData.append('sourceOrg', data.sourceOrg)
      formData.append('collectionFacility', data.collectionFacility)
      formData.append('collectionLocation', data.collectionLocation)
      formData.append('grossWeight', String(data.grossWeight))
      formData.append('collectionDate', data.collectionDate)
      formData.append('assignedHandler', data.assignedHandler)
      formData.append('licenceDetails', data.licenceDetails)
      formData.append('notes', data.notes || '')

      // Append all selected evidence files (photos & PDFs)
      uploadedFiles.forEach((item) => {
        if (item.file) {
          formData.append('files', item.file)
        }
      })

      const savedBatch = await registerNewBatch(formData)
      setIsSubmitting(false)
      setCreatedBatch(savedBatch)

      if (onSuccess) onSuccess(savedBatch)
    } catch {
      setIsSubmitting(false)
    }
  }

  const handleRegisterAnother = () => {
    uploadedFiles.forEach(f => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
    setUploadedFiles([])
    setValidationErrors([])
    setCreatedBatch(null)
    reset({
      collectionType: 'Mixed E-Waste',
      category: 'PCBs & Circuit Boards',
      sourceOrg: '',
      collectionFacility: 'Bangalore Central Hub',
      collectionLocation: 'Bangalore, Karnataka',
      grossWeight: '',
      collectionDate: new Date().toISOString().slice(0, 16),
      assignedHandler: 'Ramesh Kumar (Lic #KA-EWT-402)',
      licenceDetails: 'CPCB/KSPCB/E-WASTE/2026/044',
      notes: '',
    })
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs">
      {/* Success Modal / Banner when batch is created */}
      {createdBatch ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 rounded-2xl bg-[#E8F5EE] border border-[#C2E3D0] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#C2E3D0] text-xs font-semibold text-[#176B45]">
                <CheckCircle2 className="w-4 h-4 text-[#176B45]" />
                Batch Registered & Anchored to Ledger
              </div>
              <h3 className="text-2xl font-bold font-mono text-[#003B23] tracking-tight">
                {createdBatch.id || createdBatch.batchId}
              </h3>
              <p className="text-xs text-[#26352E] max-w-md">
                Consignment successfully registered with atomic sequence allocation. QR verification passport has been generated and evidence digest anchored to blockchain.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-xs font-semibold text-[#003B23] bg-white px-2.5 py-1 rounded-lg border border-[#C2E3D0]">
                  Type: {createdBatch.collectionType || 'Mixed E-Waste'}
                </span>
                <span className="text-xs font-mono font-bold text-[#003B23] bg-white px-2.5 py-1 rounded-lg border border-[#C2E3D0]">
                  Gross Weight: {createdBatch.grossWeight} kg
                </span>
                <span className="text-xs text-[#66756D] bg-white px-2.5 py-1 rounded-lg border border-[#C2E3D0]">
                  Facility: {createdBatch.collectionFacility}
                </span>
              </div>
            </div>

            {/* QR Code Passport Box */}
            <div className="flex flex-col items-center bg-white p-4 rounded-2xl border border-[#C2E3D0] shadow-xs shrink-0">
              <QRCodeSVG
                value={createdBatch.qrCodeData || createdBatch.qr?.verificationUrl || `https://ecotrace.system/verify/${createdBatch.id || createdBatch.batchId}`}
                size={140}
                level="H"
                fgColor="#003B23"
                bgColor="#FFFFFF"
              />
              <span className="font-mono text-[11px] font-bold text-[#003B23] mt-2">
                {createdBatch.id || createdBatch.batchId}
              </span>
              <span className="text-[10px] text-[#66756D]">Traceability Passport</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(createdBatch.id || createdBatch.batchId, 'Batch ID')}
                className="px-3.5 py-2 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] border border-[#E3EAE5] rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-[#66756D]" />
                Copy ID
              </button>
              <button
                type="button"
                onClick={() => setQrModalBatch(createdBatch)}
                className="px-3.5 py-2 text-xs font-medium text-[#176B45] bg-[#E8F5EE] hover:bg-[#C2E3D0] border border-[#C2E3D0] rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                Enlarge QR Code
              </button>
              <button
                type="button"
                onClick={() => setSelectedBatchForModal(createdBatch)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                View Batch & Sorting Breakdown
              </button>
            </div>

            <button
              type="button"
              onClick={handleRegisterAnother}
              className="px-4 py-2 text-xs font-medium text-[#26352E] hover:text-[#176B45] hover:bg-[#F4F7F5] rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Register Another Consignment
            </button>
          </div>
        </div>
      ) : (
        /* Batch Intake Form */
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#E3EAE5] gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#003B23]">Consignment Intake Registration</h2>
              <p className="text-xs text-[#66756D]">
                Onboard incoming mixed or pre-sorted e-waste consignments with automated sequential ID generation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-3 py-1.5 text-xs font-medium text-[#26352E] bg-white hover:bg-[#F4F7F5] rounded-xl transition-colors border border-[#E3EAE5] inline-flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-[#66756D]" />
                Save Draft
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Automatic Batch ID Notice Banner */}
            <div className="p-3 bg-[#E8F5EE] rounded-xl border border-[#C2E3D0] flex items-center justify-between gap-3 text-xs text-[#003B23]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#176B45] shrink-0" />
                <span>
                  <strong>Automatic Batch ID:</strong> Generated securely by the backend in sequential format (e.g., <code className="font-mono font-bold">EW-2026-00001</code>) to prevent duplicate IDs during concurrent operations.
                </span>
              </div>
              <span className="shrink-0 text-[10px] font-mono font-semibold bg-white text-[#176B45] px-2 py-0.5 rounded-full border border-[#C2E3D0]">
                Auto Sequence
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Collection Type (Replaced mandatory single category) */}
              <div>
                <label className="block text-xs font-medium text-[#26352E] mb-1">
                  Collection Type <span className="text-[#D94F4F]">*</span>
                </label>
                <select
                  {...register('collectionType')}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] font-medium focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                >
                  <option value="Mixed E-Waste">Mixed E-Waste (Sorting at Facility)</option>
                  <option value="Pre-Sorted E-Waste">Pre-Sorted E-Waste (Single Stream)</option>
                </select>
                {errors.collectionType && (
                  <p className="text-[11px] text-[#D94F4F] mt-1">{errors.collectionType.message}</p>
                )}
              </div>

              {/* Conditional Stream Category (only if Pre-Sorted) */}
              {collectionType === 'Pre-Sorted E-Waste' ? (
                <div>
                  <label className="block text-xs font-medium text-[#26352E] mb-1">
                    Pre-Sorted Category <span className="text-[#D94F4F]">*</span>
                  </label>
                  <select
                    {...register('category')}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#FAFCFA] border border-[#E3EAE5] flex flex-col justify-center">
                  <span className="text-[11px] font-medium text-[#176B45] flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Mixed Consignment Mode
                  </span>
                  <span className="text-[10px] text-[#66756D] mt-0.5">
                    Categorization & weights recorded post-intake in facility sorting bay.
                  </span>
                </div>
              )}

              {/* Total Incoming Gross Weight */}
              <div>
                <label className="block text-xs font-medium text-[#26352E] mb-1">
                  Total Incoming Weight (kg) <span className="text-[#D94F4F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1450.0"
                    {...register('grossWeight')}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono text-[#8C9B93]">kg</span>
                </div>
                {errors.grossWeight && (
                  <p className="text-[11px] text-[#D94F4F] mt-1">{errors.grossWeight.message}</p>
                )}
              </div>

              {/* Source Organization */}
              <div>
                <label className="block text-xs font-medium text-[#26352E] mb-1">
                  Source Organization <span className="text-[#D94F4F]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Cloud Datacenter Ltd"
                  {...register('sourceOrg')}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                />
                {errors.sourceOrg && (
                  <p className="text-[11px] text-[#D94F4F] mt-1">{errors.sourceOrg.message}</p>
                )}
              </div>

              {/* Collection Facility */}
              <div>
                <label className="block text-xs font-medium text-[#26352E] mb-1">
                  Collection Facility <span className="text-[#D94F4F]">*</span>
                </label>
                <select
                  {...register('collectionFacility')}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                >
                  {availableFacilities.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collection Date & Time */}
              <div>
                <label className="block text-xs font-medium text-[#26352E] mb-1">
                  Collection Date &amp; Time <span className="text-[#D94F4F]">*</span>
                </label>
                <input
                  type="datetime-local"
                  {...register('collectionDate')}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                />
                {errors.collectionDate && (
                  <p className="text-[11px] text-[#D94F4F] mt-1">{errors.collectionDate.message}</p>
                )}
              </div>

              {/* Collection Location */}
              <div>
                <label className="block text-xs font-medium text-[#26352E] mb-1">
                  Geographic Location <span className="text-[#D94F4F]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore, Karnataka (12.9716° N, 77.5946° E)"
                  {...register('collectionLocation')}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                />
                {errors.collectionLocation && (
                  <p className="text-[11px] text-[#D94F4F] mt-1">{errors.collectionLocation.message}</p>
                )}
              </div>

              {/* Assigned Handler */}
              <div>
                <label className="block text-xs font-medium text-[#26352E] mb-1">
                  Assigned Handler <span className="text-[#D94F4F]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar (Lic #KA-EWT-402)"
                  {...register('assignedHandler')}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                />
                {errors.assignedHandler && (
                  <p className="text-[11px] text-[#D94F4F] mt-1">{errors.assignedHandler.message}</p>
                )}
              </div>

              {/* Licence Details */}
              <div>
                <label className="block text-xs font-medium text-[#26352E] mb-1">
                  Licence Details <span className="text-[#D94F4F]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CPCB/KSPCB/E-WASTE/2026/044"
                  {...register('licenceDetails')}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
                />
                {errors.licenceDetails && (
                  <p className="text-[11px] text-[#D94F4F] mt-1">{errors.licenceDetails.message}</p>
                )}
              </div>
            </div>

            {/* Unified Evidence Upload & Verification Section */}
            <div className="p-5 rounded-2xl border border-[#E3EAE5] bg-[#FAFCFA] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3EAE5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E8F5EE] text-[#176B45]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#003B23]">
                      Evidence Upload &amp; Verification
                    </h3>
                    <p className="text-xs text-[#66756D]">
                      Upload intake photos (JPG, PNG, WEBP) and certified digital weighbridge slips (PDF)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#8C9B93]">
                  <span>Max 10 MB / file</span>
                  {uploadedFiles.length > 0 && (
                    <span className="font-semibold text-[#176B45] bg-[#E8F5EE] px-2.5 py-0.5 rounded-full border border-[#C2E3D0]">
                      {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'} attached
                    </span>
                  )}
                </div>
              </div>

              {/* Validation Errors Notice */}
              {validationErrors.length > 0 && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>File Validation Notice</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValidationErrors([])}
                      className="text-red-500 hover:text-red-700 p-0.5 rounded cursor-pointer"
                      aria-label="Dismiss errors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-red-700 pl-1 font-mono">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all text-center flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-[#176B45] bg-[#E8F5EE]/60 scale-[0.99]'
                    : 'border-[#C2E3D0] hover:border-[#176B45] bg-white hover:bg-[#FAFCFA]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] text-[#176B45] flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#26352E]">
                    Drag and drop photos or PDF documents here, or click to browse
                  </p>
                  <p className="text-[11px] text-[#8C9B93] mt-0.5">
                    Supports JPG, JPEG, PNG, WEBP, and PDF (Up to 10 MB per file)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="mt-1 px-4 py-1.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Files</span>
                </button>
              </div>

              {/* Uploaded Files Unified Preview Area */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-medium text-[#26352E]">
                    <span className="flex items-center gap-1.5">
                      <FileUp className="w-3.5 h-3.5 text-[#176B45]" />
                      Selected Intake Evidence ({uploadedFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        uploadedFiles.forEach(f => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
                        setUploadedFiles([])
                      }}
                      className="text-[11px] text-[#8C9B93] hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Remove all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="bg-white rounded-xl border border-[#E3EAE5] p-3 flex items-center gap-3 relative group hover:border-[#C2E3D0] transition-colors shadow-2xs"
                      >
                        {/* Thumbnail for Photos / PDF badge for Documents */}
                        {file.type === 'photo' && file.previewUrl ? (
                          <img
                            src={file.previewUrl}
                            alt={file.name}
                            className="w-12 h-12 rounded-lg object-cover border border-[#E3EAE5] shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-200 text-red-600 flex flex-col items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                            <span className="text-[8px] font-mono font-bold uppercase mt-0.5">PDF</span>
                          </div>
                        )}

                        {/* File Name, Size, & Upload Status */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#26352E] truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#8C9B93]">
                            <span>{file.sizeFormatted}</span>
                            <span>•</span>
                            <span className="capitalize">{file.type}</span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#176B45] mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#176B45]"></span>
                            {file.status}
                          </span>
                        </div>

                        {/* Remove Action */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1.5 text-[#8C9B93] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                          title="Remove file"
                          aria-label={`Remove ${file.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cryptographic Footprint & Verification Logic Notice */}
              <div className="p-3 bg-white rounded-xl border border-[#E3EAE5] flex items-center justify-between text-xs text-[#66756D]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#176B45] shrink-0" />
                  <span className="text-[11px]">
                    <strong>Audit Integrity:</strong> File digests (SHA-256) will be computed and anchored to the blockchain on submission. Files will be verifiable on-chain in the Audit Dossier.
                  </span>
                </div>
              </div>
            </div>

            {/* Handler Notes */}
            <div>
              <label className="block text-xs font-medium text-[#26352E] mb-1">
                Inspection Notes &amp; Hazmat Observations
              </label>
              <textarea
                rows={2}
                placeholder="Notes on packaging condition, hazard flags, sorting instructions..."
                {...register('notes')}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E3EAE5] rounded-xl text-[#26352E] focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 focus:border-[#176B45]"
              />
            </div>

            {/* Submit and Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end pt-4 border-t border-[#E3EAE5] gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#176B45] hover:bg-[#003B23] rounded-xl transition-all shadow-xs hover:shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Anchoring to Ledger & Generating ID...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save &amp; Generate Batch ID</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
