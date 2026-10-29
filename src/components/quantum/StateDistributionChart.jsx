import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'

export function StateDistributionChart({ distribution, shots = 2048, optimalState = '|0110⟩' }) {
  if (!distribution || distribution.length === 0) return null

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-xl border border-[#E3EAE5] shadow-lg text-xs space-y-1">
          <p className="font-mono font-bold text-[#26352E]">Basis State: {d.state}</p>
          <p className="text-[#3978C5]">
            Measurement Counts: <strong className="font-mono">{d.count} / {shots}</strong>
          </p>
          <p className="text-[#176B45]">
            Probability: <strong className="font-mono">{d.probability}%</strong>
          </p>
          <p className="text-[#66756D] border-t border-[#F4F7F5] pt-1 font-mono">
            Hamiltonian Energy: {d.costEnergy != null ? `${d.costEnergy} Hartree units` : '—'}
          </p>
          {d.isOptimal && (
            <span className="text-[10px] font-bold text-[#176B45] bg-[#E8F5EE] px-1.5 py-0.5 rounded block text-center mt-1">
              ★ Ground-State Minimum Cost Partition
            </span>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#26352E]">
            QPU Measurement State Distribution
          </h3>
          <p className="text-xs text-[#66756D]">
            Normalized probability amplitudes across {distribution.length} computational basis bitstrings
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#2B6CB0] bg-[#EBF3FB] px-2 py-0.5 rounded-full border border-[#BEE3F8]">
          Optimal State: {optimalState}
        </span>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F3" vertical={false} />
            <XAxis
              dataKey="state"
              tick={{ fontSize: 11, fill: '#26352E', fontFamily: 'monospace' }}
              axisLine={{ stroke: '#E3EAE5' }}
              tickLine={false}
            />
            <YAxis
              unit="%"
              tick={{ fontSize: 11, fill: '#66756D' }}
              axisLine={{ stroke: '#E3EAE5' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
              {distribution.map((entry, index) => (
                <Cell
                  key={`cell-state-${index}`}
                  fill={entry.isOptimal ? '#176B45' : '#3978C5'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
