import React from 'react'
import { NavLink } from 'react-router-dom'
import { X, Leaf } from 'lucide-react'
import { NAV_ITEMS } from './Sidebar'

export function MobileNavigation({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-xs flex">
      <div className="bg-[#063D27] text-white w-72 h-full flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-[#0B4D31]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shadow-sm">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading font-bold text-lg text-white">EcoTrace</span>
              <p className="text-[10px] text-[#A7F3D0]">E-Waste Tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-300 hover:text-white rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#16A34A] text-white font-semibold shadow-sm'
                      : 'text-[#D1D5DB] hover:bg-[#0B4D31] hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
