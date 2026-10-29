import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Boxes,
  GitCommitHorizontal,
  Recycle,
  BarChart3,
  Atom,
  ShieldCheck,
  Building2,
  FileText,
  Users,
  Leaf,
  Info,
} from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'

export const NAV_ITEMS = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Batches',
    path: '/batches',
    icon: Boxes,
  },
  {
    name: 'Handover & Custody',
    path: '/custody',
    icon: GitCommitHorizontal,
    badgeKey: 'pendingHandovers',
  },
  {
    name: 'Recovery & Processing',
    path: '/recovery',
    icon: Recycle,
  },
  {
    name: 'Smart Dispatch (QpiAI Opt)',
    path: '/optimization',
    icon: BarChart3,
  },
  {
    name: 'QpiAI Lab (QCloud)',
    path: '/quantum-lab',
    icon: Atom,
  },
  {
    name: 'Audit & Blockchain',
    path: '/audit',
    icon: ShieldCheck,
    badgeKey: 'flaggedClaims',
  },
  {
    name: 'Facilities',
    path: '/facilities',
    icon: Building2,
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: FileText,
  },
  {
    name: 'Users',
    path: '/users',
    icon: Users,
  },
  {
    name: 'About EcoTrace',
    path: '/about',
    icon: Info,
  },
]

export function Sidebar({ isCollapsed, onToggle }) {
  const { liveKPIs } = useBatchStore()

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#063D27] text-white z-30 transition-all duration-200 flex flex-col justify-between ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Navigation */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Logo Header */}
        <div className="h-20 flex items-center px-5 border-b border-[#0B4D31]/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-md">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xl text-white tracking-tight leading-none">
                  EcoTrace
                </span>
                <span className="text-[11px] text-[#A7F3D0] font-medium tracking-wide mt-1">
                  E-Waste Tracking
                </span>
                <span className="text-[9px] text-[#D1FAE5]/80 font-medium tracking-wider">
                  Trace • Recycle • Sustain
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 11 Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            let badgeCount = null
            if (item.badgeKey === 'pendingHandovers') {
              badgeCount = liveKPIs.pendingCustodyHandovers > 0 ? liveKPIs.pendingCustodyHandovers : null
            } else if (item.badgeKey === 'flaggedClaims') {
              badgeCount = liveKPIs.flaggedClaims > 0 ? liveKPIs.flaggedClaims : null
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative ${
                    isActive
                      ? 'bg-[#16A34A] text-white font-semibold shadow-sm'
                      : 'text-[#D1D5DB] hover:bg-[#0B4D31] hover:text-white'
                  }`
                }
                title={isCollapsed ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-[#D1D5DB] group-hover:text-white'
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="truncate">{item.name}</span>

                        {badgeCount && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              item.badgeKey === 'flaggedClaims'
                                ? 'bg-red-500 text-white'
                                : 'bg-amber-400 text-gray-900'
                            }`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Bottom Promo & Eco Mission Banner */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[#0B4D31]/80">
          <div className="relative rounded-xl overflow-hidden shadow-inner group">
            <img
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&auto=format&fit=crop&q=80"
              alt="Hands holding green plant sprout"
              className="w-full h-24 object-cover brightness-75 group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#063D27] via-[#063D27]/40 to-transparent flex flex-col justify-end p-2.5 text-center">
              <span className="text-xs font-bold text-white tracking-wide">
                Cleaner Electronics
              </span>
              <span className="text-[10px] text-[#A7F3D0] font-medium">
                Greener Tomorrow
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
