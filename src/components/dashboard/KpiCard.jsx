import React from 'react'
import { ArrowUpRight } from 'lucide-react'

export function KpiCard({
  title,
  value,
  trend = '+12.5% from last month',
  isAlert = false,
  icon: Icon,
  iconBg = '#DCFCE7',
  iconColor = '#16A34A',
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex items-center gap-4 transition-all ${
        onClick ? 'cursor-pointer hover:border-[#16A34A]/50 hover:shadow-sm' : ''
      }`}
    >
      {/* Left Icon in circle/rounded square */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{
          backgroundColor: isAlert ? '#FEE2E2' : iconBg,
          color: isAlert ? '#DC2626' : iconColor,
        }}
      >
        {Icon && <Icon className="w-6 h-6" />}
      </div>

      {/* Right details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium leading-tight truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight my-0.5">
          {value}
        </p>
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          <ArrowUpRight
            className={`w-3.5 h-3.5 ${isAlert ? 'text-red-500' : 'text-emerald-600'}`}
          />
          <span className={isAlert ? 'text-red-500' : 'text-emerald-600'}>{trend}</span>
        </div>
      </div>
    </div>
  )
}
