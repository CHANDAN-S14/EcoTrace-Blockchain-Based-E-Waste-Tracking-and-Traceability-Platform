import React, { useMemo } from 'react'
import { Disc, Layers, Package, Gem } from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'

export function RecoverySummaryCard() {
  const { recoveryLogs } = useBatchStore()

  const materials = useMemo(() => {
    if (!recoveryLogs || recoveryLogs.length === 0) return []

    let copper = 0
    let aluminum = 0
    let plastic = 0
    let other = 0

    recoveryLogs.forEach((r) => {
      if (r.materials && typeof r.materials === 'object') {
        Object.entries(r.materials).forEach(([k, v]) => {
          const val = Number(v) || 0
          const key = k.toLowerCase()
          if (key.includes('copper')) {
            copper += val
          } else if (key.includes('alumin')) {
            aluminum += val
          } else if (key.includes('plastic') || key.includes('polymer')) {
            plastic += val
          } else {
            other += val
          }
        })
      } else if (r.recoveredWeight) {
        other += Number(r.recoveredWeight) || 0
      }
    })

    const total = copper + aluminum + plastic + other
    if (total === 0) return []

    return [
      {
        name: 'Copper Recovered',
        weight: `${Math.round(copper)} kg`,
        percentage: total > 0 ? Math.round((copper / total) * 100) : 0,
        barColor: '#B45309',
        iconBg: '#FEF3C7',
        iconColor: '#B45309',
        icon: Disc,
      },
      {
        name: 'Aluminium Recovered',
        weight: `${Math.round(aluminum)} kg`,
        percentage: total > 0 ? Math.round((aluminum / total) * 100) : 0,
        barColor: '#64748B',
        iconBg: '#F1F5F9',
        iconColor: '#475569',
        icon: Layers,
      },
      {
        name: 'Plastic Recovered',
        weight: `${Math.round(plastic)} kg`,
        percentage: total > 0 ? Math.round((plastic / total) * 100) : 0,
        barColor: '#16A34A',
        iconBg: '#DCFCE7',
        iconColor: '#16A34A',
        icon: Package,
      },
      {
        name: 'Other Materials',
        weight: `${Math.round(other)} kg`,
        percentage: total > 0 ? Math.round((other / total) * 100) : 0,
        barColor: '#F59E0B',
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
        icon: Gem,
      },
    ]
  }, [recoveryLogs])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">Recovery Summary</h3>
      </div>

      <div className="space-y-4 my-auto">
        {materials.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-xs text-center py-6">
            <p className="font-medium text-gray-500">No material recovery claims recorded</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Submit mass-balance claims to track recovered output</p>
          </div>
        ) : (
          materials.map((mat) => {
            const Icon = mat.icon
            return (
              <div key={mat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: mat.iconBg, color: mat.iconColor }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-gray-700 text-xs">{mat.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 text-xs">{mat.weight}</span>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${mat.percentage}%`,
                        backgroundColor: mat.barColor,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 w-8 text-right">
                    {mat.percentage}%
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
