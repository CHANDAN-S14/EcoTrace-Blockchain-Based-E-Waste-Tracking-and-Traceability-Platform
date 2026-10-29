import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Search,
  Menu,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  User,
  LogOut,
  CheckCircle2,
} from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'

const ROUTE_NAMES = {
  '/dashboard': 'Dashboard',
  '/batches': 'Batches',
  '/custody': 'Handover & Custody',
  '/recovery': 'Recovery & Processing',
  '/optimization': 'Smart Dispatch (QpiAI Opt)',
  '/dispatch': 'Smart Dispatch (QpiAI Opt)',
  '/quantum-lab': 'QpiAI Lab (QCloud)',
  '/audit': 'Audit & Blockchain',
  '/facilities': 'Facilities',
  '/reports': 'Reports',
  '/users': 'Users',
  '/about': 'About EcoTrace',
}

export function Topbar({ onMenuClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { batches, attentionItems, setSelectedBatchForModal } = useBatchStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const searchRef = useRef(null)
  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  // Filter batches for search
  const searchMatches = searchQuery.trim()
    ? batches.filter(
        b =>
          b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.sourceOrg?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : []

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentTitle = ROUTE_NAMES[location.pathname] || 'Dashboard'

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E5E7EB] px-4 md:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="font-semibold text-gray-800 text-sm md:hidden">
          {currentTitle}
        </span>
      </div>

      {/* Center: Search batches, handovers, facilities */}
      <div className="flex-1 max-w-xl hidden sm:block relative" ref={searchRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearchResults(true)
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search batches, handovers, facilities..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all"
          />
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchMatches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Matching Records
            </div>
            {searchMatches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => {
                  setSelectedBatchForModal(batch)
                  setShowSearchResults(false)
                  setSearchQuery('')
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-semibold text-[#16A34A]">{batch.id}</span>
                  <span className="text-gray-500 truncate text-[11px]">{batch.category}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-medium text-gray-800">{batch.grossWeight} kg</span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Notifications & User profile matching reference image */}
      <div className="flex items-center gap-4">
        {/* Notification Bell with red count badge */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-800">
                  Notifications (3 New)
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">Mark all read</span>
              </div>
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Handover confirmed
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Batch EW-001 accepted at Bengaluru central dock.
                  </p>
                  <span className="text-[10px] text-gray-400 mt-1 block">2 hours ago</span>
                </div>

                <div className="p-2 rounded-lg bg-red-50 border border-red-100 text-xs">
                  <div className="flex items-center gap-2 text-red-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Weight discrepancy reported
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Batch EW-002 variance of 5.0 kg flagged at Mysuru.
                  </p>
                  <span className="text-[10px] text-gray-400 mt-1 block">4 hours ago</span>
                </div>

                <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-xs">
                  <div className="flex items-center gap-2 text-blue-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Dispatch assignment approved
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    CleanTech facility scheduled for 1,450 kg consignment.
                  </p>
                  <span className="text-[10px] text-gray-400 mt-1 block">6 hours ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile: Circular avatar with JD, John Doe, Admin, ChevronDown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 pl-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-[#063D27] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
              JD
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-gray-900 leading-tight">John Doe</span>
              <span className="text-[11px] text-gray-500">Admin</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="font-semibold text-gray-800">John Doe</p>
                <p className="text-[11px] text-gray-500">admin@ecotrace.gov.in</p>
              </div>
              <Link
                to="/users"
                onClick={() => setShowUserMenu(false)}
                className="w-full px-3 py-2 flex items-center gap-2 text-gray-700 hover:bg-gray-50 text-left"
              >
                <User className="w-3.5 h-3.5 text-gray-400" />
                User Management
              </Link>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50 text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
