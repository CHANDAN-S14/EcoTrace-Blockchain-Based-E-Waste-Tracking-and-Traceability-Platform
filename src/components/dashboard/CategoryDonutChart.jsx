import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useBatchStore } from '../../hooks/useBatchStore'

const COLOR_PALETTE = ['#0F766E', '#16A34A', '#06B6D4', '#84CC16', '#F59E0B', '#8B5CF6', '#EC4899']

export function CategoryDonutChart({ totalWeight = '0 kg' }) {
  const { batches } = useBatchStore()

  const { categoryData, grandTotalKg } = useMemo(() => {
    if (!batches || batches.length === 0) {
      return { categoryData: [], grandTotalKg: 0 }
    }

    const map = {}
    let total = 0

    batches.forEach((b) => {
      const cat = b.category || 'Mixed E-Waste'
      const w = Number(b.grossWeight) || 0
      total += w
      map[cat] = (map[cat] || 0) + w
    })

    const data = Object.entries(map).map(([name, weight], index) => {
      const pct = total > 0 ? Math.round((weight / total) * 100) : 0
      return {
        name,
        value: pct,
        weight: `${Math.round(weight)} kg`,
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      }
    })

    // Sort descending by weight
    data.sort((a, b) => b.value - a.value)

    return { categoryData: data, grandTotalKg: total }
  }, [batches])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col h-full shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900 text-sm">E-Waste by Category</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 flex-1 min-h-[220px]">
        {categoryData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs py-8">
            <p className="font-medium text-gray-500">No batch categories recorded</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Register batches to view category distribution</p>
          </div>
        ) : (
          <>
            {/* Donut Chart with Center Text */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val, name, item) => [`${val}% (${item.payload.weight})`, name]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E5E7EB',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-sm font-bold text-gray-900 leading-tight">{totalWeight}</span>
                <span className="text-[10px] text-gray-400 font-medium">Total</span>
              </div>
            </div>

            {/* Legend on Right */}
            <div className="flex-1 w-full space-y-2 text-xs pl-2">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-gray-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="truncate text-[11px] text-gray-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 text-[11px] shrink-0 pl-1">{item.value}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
