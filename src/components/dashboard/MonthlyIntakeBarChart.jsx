import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { useBatchStore } from '../../hooks/useBatchStore'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthlyIntakeBarChart() {
  const { batches } = useBatchStore()
  const [range, setRange] = useState('6M')

  const chartData = useMemo(() => {
    const numMonths = range === '6M' ? 6 : 12
    const now = new Date()
    const months = []

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        month: MONTH_NAMES[d.getMonth()],
        weight: 0,
      })
    }

    (batches || []).forEach((b) => {
      const rawDate = b.collectionDate || b.createdAt
      if (!rawDate) return
      const bDate = new Date(rawDate)
      if (isNaN(bDate.getTime())) return

      const bYear = bDate.getFullYear()
      const bMonth = bDate.getMonth()
      const match = months.find((m) => m.year === bYear && m.monthIndex === bMonth)
      if (match) {
        match.weight += Math.round(Number(b.grossWeight) || 0)
      }
    })

    return months.map((m) => ({
      month: m.month,
      weight: m.weight,
    }))
  }, [batches, range])

  const maxVal = Math.max(...chartData.map((d) => d.weight), 100)
  const yDomain = [0, Math.ceil(maxVal * 1.25)]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col h-full shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900 text-sm">Monthly E-Waste Collection (kg)</h3>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600 bg-gray-50 focus:outline-none cursor-pointer"
        >
          <option value="6M">Last 6 Months</option>
          <option value="12M">Last 12 Months</option>
        </select>
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        {batches.length === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center text-gray-400 text-xs">
            <p className="font-medium text-gray-500">No consignment data recorded</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Register a batch to track collection trends</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                domain={yDomain}
              />
              <Tooltip
                formatter={(val) => [`${val} kg`, 'Collected']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Bar dataKey="weight" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={38}>
                <LabelList
                  dataKey="weight"
                  position="top"
                  style={{ fill: '#374151', fontSize: '11px', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
