import React, { useState, useEffect } from 'react'
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Edit,
  Mail,
  MapPin,
  TrendingUp,
  Boxes,
  X,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Info,
  Recycle,
  Database,
  Check,
} from 'lucide-react'
import { useBatchStore } from '../hooks/useBatchStore'

export function FacilitiesPage() {
  const { addToast, refreshFacilities } = useBatchStore()
  const [facilities, setFacilities] = useState([])
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [editingFacility, setEditingFacility] = useState(null)
  const [showInfoBanner, setShowInfoBanner] = useState(true)
  const [lastSyncResult, setLastSyncResult] = useState(null)

  // Form state for manual onboarding
  const [formData, setFormData] = useState({
    name: '',
    facilityType: 'RECYCLER',
    licenceNumber: '',
    location: '',
    capacityKgMonth: '',
    contactEmail: '',
    categoriesAccepted: 'PCBs & Circuit Boards, Consumer Electronics',
  })

  // Load facilities from backend API
  const loadFacilities = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/facilities')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setFacilities(json.data)
        if (json.summary) {
          setSummary(json.summary)
        }
      } else {
        setFacilities([])
      }
    } catch (err) {
      console.warn('[FacilitiesPage] Backend fetch notice:', err.message)
      setFacilities([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFacilities()
  }, [])

  // Sync public Karnataka e-waste collection centre dataset from OpenCity KML
  const handleSyncPublicDataset = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/facilities/import-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (json.success) {
        setLastSyncResult(json)
        addToast({
          type: 'success',
          title: 'Public Dataset Synchronized',
          message: `Imported ${json.inserted} new and updated ${json.updated} Karnataka collection centres.`,
        })
        await loadFacilities()
        if (refreshFacilities) await refreshFacilities()
      } else {
        addToast({
          type: 'error',
          title: 'Sync Failed',
          message: json.message || 'Unable to synchronize public dataset.',
        })
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Connection Notice',
        message: err.message || 'Network notice during public dataset sync.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Filter facilities
  const filteredFacilities = facilities.filter((fac) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      fac.name?.toLowerCase().includes(q) ||
      fac.licenceNumber?.toLowerCase().includes(q) ||
      fac.registrationNumber?.toLowerCase().includes(q) ||
      fac.facilityId?.toLowerCase().includes(q) ||
      fac.location?.toLowerCase().includes(q) ||
      fac.dataSource?.toLowerCase().includes(q)

    const matchesType = typeFilter === 'ALL' || fac.facilityType === typeFilter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active & Verified' && fac.licenceStatus === 'Active & Verified') ||
      (statusFilter === 'Unverified' &&
        (fac.licenceStatus === 'Unverified' || fac.verificationStatus === 'UNVERIFIED')) ||
      (statusFilter === 'Review Required (Expiring)' && fac.licenceStatus?.includes('Review')) ||
      (statusFilter === 'Suspended' && fac.licenceStatus === 'Suspended')

    const matchesSource =
      sourceFilter === 'ALL' ||
      (sourceFilter === 'OpenCity' && fac.dataSource?.includes('OpenCity')) ||
      (sourceFilter === 'CPCB' && fac.dataSource?.includes('CPCB')) ||
      (sourceFilter === 'Manual' && fac.dataSource?.includes('Manual'))

    return matchesSearch && matchesType && matchesStatus && matchesSource
  })

  // Handle Add Facility
  const handleCreateFacility = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        facilityType: formData.facilityType,
        licenceNumber: formData.licenceNumber || null,
        location: formData.location,
        capacityKgMonth: formData.capacityKgMonth ? Number(formData.capacityKgMonth) : null,
        contactEmail: formData.contactEmail,
        categoriesAccepted: formData.categoriesAccepted.split(',').map((s) => s.trim()),
      }

      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        addToast({
          type: 'success',
          title: 'Facility Registered',
          message: `${formData.name} successfully registered.`,
        })
        setShowAddModal(false)
        setFormData({
          name: '',
          facilityType: 'RECYCLER',
          licenceNumber: '',
          location: '',
          capacityKgMonth: '',
          contactEmail: '',
          categoriesAccepted: 'PCBs & Circuit Boards, Consumer Electronics',
        })
        await loadFacilities()
        if (refreshFacilities) await refreshFacilities()
      } else {
        alert(json.message || 'Failed to register facility')
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message,
      })
    }
  }

  // Handle Edit / Verify Facility
  const handleUpdateFacility = async (e) => {
    e.preventDefault()
    if (!editingFacility) return
    try {
      const payload = {
        name: editingFacility.name,
        facilityType: editingFacility.facilityType,
        licenceStatus: editingFacility.licenceStatus,
        verificationStatus:
          editingFacility.licenceStatus === 'Active & Verified' ? 'VERIFIED' : editingFacility.verificationStatus,
        licenceNumber: editingFacility.licenceNumber || null,
        location: editingFacility.location,
        capacityKgMonth:
          editingFacility.capacityKgMonth !== '' && editingFacility.capacityKgMonth !== null
            ? Number(editingFacility.capacityKgMonth)
            : null,
      }

      const res = await fetch(`/api/facilities/${editingFacility.facilityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        addToast({
          type: 'success',
          title: 'Facility Updated',
          message: `${editingFacility.name} records updated successfully.`,
        })
        setEditingFacility(null)
        await loadFacilities()
        if (refreshFacilities) await refreshFacilities()
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Update Notice', message: err.message })
    }
  }

  // Calculations for summary metrics strictly from actual data fields
  const totalCount = summary?.totalFacilities ?? facilities.length
  const activeCount =
    summary?.activeLicensed ??
    facilities.filter(
      (f) => f.licenceStatus === 'Active & Verified' || f.verificationStatus === 'VERIFIED'
    ).length
  const unverifiedCount =
    summary?.unverified ??
    facilities.filter(
      (f) => f.verificationStatus === 'UNVERIFIED' || f.licenceStatus === 'Unverified'
    ).length
  const knownCapacitySum =
    summary?.totalCapacityKgMonth ??
    facilities.reduce((acc, f) => acc + (typeof f.capacityKgMonth === 'number' && f.capacityKgMonth > 0 ? f.capacityKgMonth : 0), 0)
  const recyclersWithCapacityCount =
    summary?.facilitiesWithKnownCapacity ??
    facilities.filter((f) => typeof f.capacityKgMonth === 'number' && f.capacityKgMonth > 0).length

  return (
    <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
              Facilities Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Live Registry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real public e-waste collection centres (KSPCB / OpenCity), authorized municipal drop-boxes, and certified metallurgical recyclers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSyncPublicDataset}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Import and refresh real Karnataka collection centres from OpenCity KML dataset"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-700' : 'text-emerald-700'}`} />
            <span>{isSyncing ? 'Syncing KSPCB Dataset...' : 'Sync Public Dataset'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Facility</span>
          </button>
        </div>
      </div>

      {/* Dataset & Regulatory Policy Notice Banner */}
      {showInfoBanner && (
        <div className="bg-gradient-to-r from-emerald-50/80 via-white to-blue-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs relative">
          <button
            onClick={() => setShowInfoBanner(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div className="pr-6 space-y-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-900">Real Public Data Integration</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 font-mono">
                  OpenCity Dataset
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 font-mono">
                  CPCB Regulatory Policy
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Collection centre coordinates and names are synchronized directly from the published{' '}
                <a
                  href="https://data.opencity.in/dataset/karnataka-waste-collection-recycling-and-processing-centres"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline font-medium hover:text-emerald-900 inline-flex items-center gap-0.5"
                >
                  Karnataka Waste Collection &amp; Recycling dataset
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                (KSPCB / KSRSAC). Public collection centres are documented as intake drop-boxes with{' '}
                <code className="text-gray-800 bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">
                  verificationStatus: UNVERIFIED
                </code>
                . In strict compliance with regulatory standards, official metallurgical recycler authorizations and smelting capacities require verified consents under the{' '}
                <a
                  href="https://eprewaste.cpcb.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline font-medium hover:text-emerald-900 inline-flex items-center gap-0.5"
                >
                  CPCB E-Waste Management System
                  <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total Facilities */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Registered Hubs</p>
            <p className="text-xl font-bold text-gray-900">{totalCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {summary?.collectionCentres || 0} Collection • {summary?.recyclers || 0} Recyclers
            </p>
          </div>
        </div>

        {/* Active & Verified Recyclers */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Active &amp; Licensed</p>
            <p className="text-xl font-bold text-gray-900">{activeCount}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">Verified CPCB Consents</p>
          </div>
        </div>

        {/* Unverified Public Collection Centres */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Public Intake Centres</p>
            <p className="text-xl font-bold text-gray-900">{unverifiedCount}</p>
            <p className="text-[10px] text-amber-700 mt-0.5 font-medium">KSPCB OpenCity Points</p>
          </div>
        </div>

        {/* Monthly Capacity */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Monthly Processing Capacity</p>
            <p className="text-xl font-bold text-gray-900">
              {(knownCapacitySum / 1000).toFixed(0)} T
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              From {recyclersWithCapacityCount} certified recyclers
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search facility name, KGIS registration code, location, or source..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />

          {/* Facility Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-gray-50 focus:outline-none"
          >
            <option value="ALL">All Hub Types</option>
            <option value="COLLECTION_CENTRE">Public Collection Centres</option>
            <option value="RECYCLER">Recycling &amp; Processing Plants</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-gray-50 focus:outline-none"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="Active & Verified">Active &amp; Verified</option>
            <option value="Unverified">Unverified Intake Hubs</option>
            <option value="Review Required (Expiring)">Review Required</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* Data Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-gray-50 focus:outline-none"
          >
            <option value="ALL">All Data Sources</option>
            <option value="OpenCity">OpenCity / KSPCB (KSRSAC)</option>
            <option value="CPCB">CPCB / SPCB Authorized</option>
            <option value="Manual">Manual Registration</option>
          </select>
        </div>
      </div>

      {/* Facilities Grid */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="font-semibold text-gray-800 text-sm">Loading Facility Records...</p>
          <p className="text-xs text-gray-400 mt-1">Fetching live registry from MongoDB...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredFacilities.map((fac) => {
            const isCollectionCentre = fac.facilityType === 'COLLECTION_CENTRE'
            const isUnverified =
              fac.verificationStatus === 'UNVERIFIED' || fac.licenceStatus === 'Unverified'
            const isReview = fac.licenceStatus?.includes('Review')
            const isOpenCity = fac.dataSource?.includes('OpenCity')

            const hasCapacity = typeof fac.capacityKgMonth === 'number' && fac.capacityKgMonth > 0
            const utilization =
              hasCapacity
                ? Math.min(100, Math.round(((fac.currentLoadKg || 0) / fac.capacityKgMonth) * 100))
                : null

            const coords = Array.isArray(fac.coordinates) && fac.coordinates.length === 2 ? fac.coordinates : null
            const mapUrl = coords
              ? `https://www.openstreetmap.org/?mlat=${coords[0]}&mlon=${coords[1]}#map=16/${coords[0]}/${coords[1]}`
              : null

            return (
              <div
                key={fac.facilityId}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges Strip */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm truncate" title={fac.name}>
                          {fac.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                          {fac.facilityId}
                        </span>
                      </div>

                      {/* Location & Map Coordinates */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{fac.location}</span>
                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 hover:text-emerald-800 underline ml-1"
                            title={`Open coordinates (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}) on OpenStreetMap`}
                          >
                            Map
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          isUnverified
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : isReview
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isUnverified ? (
                          <AlertTriangle className="w-2.5 h-2.5" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        )}
                        {fac.licenceStatus || 'Unverified'}
                      </span>

                      {/* Facility Type Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          isCollectionCentre
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}
                      >
                        {isCollectionCentre ? (
                          <>
                            <Building2 className="w-2.5 h-2.5" />
                            Collection Centre
                          </>
                        ) : (
                          <>
                            <Recycle className="w-2.5 h-2.5" />
                            Recycling Plant
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Identifiers & Regulatory Attribution */}
                  <div className="mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>CPCB Licence / Consent:</span>
                      <span className="font-mono font-semibold text-gray-800">
                        {fac.licenceNumber || (
                          <span className="text-gray-400 font-normal italic">
                            {isCollectionCentre ? 'Not Required (Intake Drop-Box)' : 'Unverified / Pending Audit'}
                          </span>
                        )}
                      </span>
                    </div>

                    {fac.registrationNumber && (
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Registration / KGIS Code:</span>
                        <span className="font-mono text-[10px] text-gray-700 truncate max-w-[240px]">
                          {fac.registrationNumber}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5 border-t border-gray-100/60">
                      <span>Data Source:</span>
                      <span
                        className={`font-medium ${
                          isOpenCity ? 'text-teal-700' : 'text-emerald-700'
                        }`}
                      >
                        {fac.dataSource || 'Manual Entry'}
                      </span>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="mt-3">
                    <p className="text-[11px] text-gray-400 mb-1.5 font-medium">Authorized Categories:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(fac.categoriesAccepted || []).map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Capacity Gauge or Intake Notice */}
                  <div className="mt-4">
                    {hasCapacity ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Monthly Processing Quota:</span>
                          <span className="font-semibold text-gray-800">
                            {(fac.currentLoadKg || 0).toLocaleString()} / {(fac.capacityKgMonth || 0).toLocaleString()} kg ({utilization}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              utilization > 85 ? 'bg-amber-500' : 'bg-[#16A34A]'
                            }`}
                            style={{ width: `${utilization}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-gray-50 text-[11px] text-gray-500 flex items-center justify-between">
                        <span>Monthly Processing Quota:</span>
                        <span className="text-gray-400 italic">Not Specified (Collection Intake)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Boxes className="w-3.5 h-3.5 text-gray-400" />
                    <span>{fac.batchCount || 0} batches associated</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFacility(fac)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Facility Details
                    </button>
                    <button
                      onClick={() => setEditingFacility(fac)}
                      className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Verify or update facility records"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredFacilities.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="font-semibold text-gray-700">No facilities matching current filters</p>
          <p className="text-xs text-gray-400 mt-1">Try resetting search keywords or sync the public dataset.</p>
          <button
            onClick={handleSyncPublicDataset}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Synchronize Public Dataset</span>
          </button>
        </div>
      )}

      {/* Add Facility Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Register Facility</h3>
                <p className="text-xs text-gray-500">Onboard a certified collection depot or recycler plant</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFacility} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Karnataka CleanRecycle Industrial Corp"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Facility Type</label>
                  <select
                    value={formData.facilityType}
                    onChange={(e) => setFormData({ ...formData, facilityType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  >
                    <option value="RECYCLER">Recycling &amp; Processing Plant</option>
                    <option value="COLLECTION_CENTRE">Public Collection Centre</option>
                    <option value="DEPOT">Receiving Depot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">CPCB / SPCB Licence Number</label>
                  <input
                    type="text"
                    value={formData.licenceNumber}
                    onChange={(e) => setFormData({ ...formData, licenceNumber: e.target.value })}
                    placeholder="e.g. CPCB/KSPCB/E-WASTE/2026/088"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Location / Zone *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Peenya Industrial Area, Bengaluru"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Monthly Processing Capacity (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.capacityKgMonth}
                    onChange={(e) => setFormData({ ...formData, capacityKgMonth: e.target.value })}
                    placeholder="Optional for collection centres"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="e.g. compliance@facility.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Categories (comma-separated)</label>
                <input
                  type="text"
                  value={formData.categoriesAccepted}
                  onChange={(e) => setFormData({ ...formData, categoriesAccepted: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-medium text-gray-600 hover:text-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg shadow-xs"
                >
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facility Details Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selectedFacility.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{selectedFacility.facilityId}</p>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Hub Classification:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedFacility.facilityType === 'COLLECTION_CENTRE'
                      ? 'Public E-Waste Collection Centre'
                      : 'Authorized Metallurgical Recycler'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Licence / Consent Status:</span>
                  <span className="font-semibold text-emerald-700">{selectedFacility.licenceStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Verification Status:</span>
                  <span className="font-mono font-medium text-gray-800">
                    {selectedFacility.verificationStatus || 'UNVERIFIED'}
                  </span>
                </div>
                {selectedFacility.licenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">CPCB Licence Number:</span>
                    <span className="font-mono font-medium text-gray-800">
                      {selectedFacility.licenceNumber}
                    </span>
                  </div>
                )}
                {selectedFacility.registrationNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Registration / KGIS Code:</span>
                    <span className="font-mono text-[11px] text-gray-800 truncate max-w-[240px]">
                      {selectedFacility.registrationNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Location:</span>
                  <span className="text-gray-800">{selectedFacility.location}</span>
                </div>
                {Array.isArray(selectedFacility.coordinates) && selectedFacility.coordinates.length === 2 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Coordinates (Lat, Lng):</span>
                    <span className="font-mono text-gray-800">
                      {selectedFacility.coordinates[0].toFixed(5)}, {selectedFacility.coordinates[1].toFixed(5)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly Processing Quota:</span>
                  <span className="font-semibold text-gray-800">
                    {typeof selectedFacility.capacityKgMonth === 'number' && selectedFacility.capacityKgMonth > 0
                      ? `${selectedFacility.capacityKgMonth.toLocaleString()} kg`
                      : 'Not Specified (Public Intake Point)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data Source:</span>
                  <span className="font-medium text-emerald-700">{selectedFacility.dataSource}</span>
                </div>
                {selectedFacility.sourceUrl && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source Dataset URL:</span>
                    <a
                      href={selectedFacility.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 underline truncate max-w-[220px]"
                    >
                      OpenCity Dataset
                    </a>
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold text-gray-800 mb-1">Authorized Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedFacility.categoriesAccepted || []).map((cat) => (
                    <span key={cat} className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 text-[11px]">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedFacility(null)}
                className="px-4 py-2 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Verify Facility Modal */}
      {editingFacility && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Verify / Edit Facility</h3>
                <p className="text-xs text-gray-500 font-mono">{editingFacility.facilityId}</p>
              </div>
              <button
                onClick={() => setEditingFacility(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFacility} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={editingFacility.name}
                  onChange={(e) => setEditingFacility({ ...editingFacility, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Facility Type</label>
                  <select
                    value={editingFacility.facilityType || 'COLLECTION_CENTRE'}
                    onChange={(e) => setEditingFacility({ ...editingFacility, facilityType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  >
                    <option value="COLLECTION_CENTRE">Public Collection Centre</option>
                    <option value="RECYCLER">Recycling &amp; Processing Plant</option>
                    <option value="DEPOT">Receiving Depot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Licence Status</label>
                  <select
                    value={editingFacility.licenceStatus || 'Unverified'}
                    onChange={(e) => setEditingFacility({ ...editingFacility, licenceStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  >
                    <option value="Active & Verified">Active &amp; Verified</option>
                    <option value="Unverified">Unverified</option>
                    <option value="Review Required (Expiring)">Review Required (Expiring)</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">CPCB / SPCB Licence Number</label>
                <input
                  type="text"
                  value={editingFacility.licenceNumber || ''}
                  onChange={(e) => setEditingFacility({ ...editingFacility, licenceNumber: e.target.value })}
                  placeholder="e.g. CPCB/KSPCB/E-WASTE/2026/099"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Monthly Processing Capacity (kg)
                </label>
                <input
                  type="number"
                  value={editingFacility.capacityKgMonth ?? ''}
                  onChange={(e) =>
                    setEditingFacility({
                      ...editingFacility,
                      capacityKgMonth: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="Leave empty if not certified for metallurgical recycling"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Physical Location</label>
                <input
                  type="text"
                  value={editingFacility.location || ''}
                  onChange={(e) => setEditingFacility({ ...editingFacility, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFacility(null)}
                  className="px-4 py-2 font-medium text-gray-600 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
