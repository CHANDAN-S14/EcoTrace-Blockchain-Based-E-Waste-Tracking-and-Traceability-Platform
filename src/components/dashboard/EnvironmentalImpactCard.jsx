import React from 'react'
import { Leaf, Trees, Smartphone, ArrowUpRight } from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'

export function EnvironmentalImpactCard() {
  const { liveKPIs } = useBatchStore()

  const intakeKg = liveKPIs?.grossIntakeKg || 0
  const co2Num = Math.round(intakeKg * 1.44)
  const treesNum = Math.round(co2Num / 22)
  const devicesNum = Math.round(intakeKg / 2.5)

  const co2Saved = intakeKg > 0 ? `${co2Num.toLocaleString()} kg` : '0 kg'
  const trees = intakeKg > 0 ? `${treesNum.toLocaleString()}` : '0'
  const devices = intakeKg > 0 ? `${devicesNum.toLocaleString()}` : '0'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">Environmental Impact</h3>
      </div>

      <div className="grid grid-cols-3 gap-2 my-auto">
        {/* CO2 Emissions Saved */}
        <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/60 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <Leaf className="w-4 h-4" />
          </div>
          <p className="text-[10px] text-gray-500 font-medium leading-tight">CO₂ Emissions Saved</p>
          <p className="font-bold text-gray-900 text-sm my-1">{co2Saved}</p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> CPCB EPA Factor
          </span>
        </div>

        {/* Trees Equivalent */}
        <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/60 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <Trees className="w-4 h-4" />
          </div>
          <p className="text-[10px] text-gray-500 font-medium leading-tight">Trees Equivalent</p>
          <p className="font-bold text-gray-900 text-sm my-1">{trees}</p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Annual Offset
          </span>
        </div>

        {/* Devices Recycled */}
        <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/60 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <Smartphone className="w-4 h-4" />
          </div>
          <p className="text-[10px] text-gray-500 font-medium leading-tight">Est. Devices Diverted</p>
          <p className="font-bold text-gray-900 text-sm my-1">{devices}</p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Landfill Diverted
          </span>
        </div>
      </div>
    </div>
  )
}
