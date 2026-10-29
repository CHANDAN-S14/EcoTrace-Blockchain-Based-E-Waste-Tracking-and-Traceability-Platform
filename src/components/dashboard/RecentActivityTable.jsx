import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'
import { formatDate } from '../../utils/formatters'

export function RecentActivityTable() {
  const { batches } = useBatchStore()

  const activities = useMemo(() => {
    if (!batches || batches.length === 0) return []

    const list = []

    batches.forEach((b) => {
      const bId = b.batchId || b.id

      if (b.handovers && b.handovers.length > 0) {
        b.handovers.forEach((h) => {
          const isError = h.status === 'Discrepancy Detected' || h.verificationStatus === 'Discrepancy Flagged'
          const isSuccess = h.status === 'Accepted' || h.verificationStatus === 'Verified On-Chain'

          list.push({
            id: h.handoverId || `${bId}-${h.step || Math.random()}`,
            batchId: bId,
            event: h.stage || (isSuccess ? 'Handover Confirmed' : 'Handover Pending'),
            party: h.sender && h.receiver ? `${h.sender} → ${h.receiver}` : (b.sourceOrg || 'Logistics Chain'),
            weight: h.receivedWeight != null && h.dispatchWeight != null && h.receivedWeight !== h.dispatchWeight
              ? `${h.receivedWeight} / ${h.dispatchWeight}`
              : `${h.dispatchWeight || b.grossWeight || 0}`,
            location: h.location || b.collectionLocation || 'Intake Depot',
            time: formatDate(h.timestamp || b.collectionDate || b.createdAt),
            status: h.status || 'Pending',
            statusType: isError ? 'error' : isSuccess ? 'success' : 'warning',
            isAlert: isError,
            rawTime: new Date(h.timestamp || b.collectionDate || b.createdAt || 0).getTime(),
          })
        })
      } else {
        const isError = b.status === 'Flagged Discrepancy'
        list.push({
          id: `reg-${bId}`,
          batchId: bId,
          event: 'Consignment Registered',
          party: b.sourceOrg ? `${b.sourceOrg} → ${b.collectionFacility || 'Intake Depot'}` : 'Intake Hub',
          weight: `${b.grossWeight || 0}`,
          location: b.collectionLocation || b.collectionFacility || 'Central Depot',
          time: formatDate(b.collectionDate || b.createdAt),
          status: b.status || 'Registered',
          statusType: isError ? 'error' : 'success',
          isAlert: isError,
          rawTime: new Date(b.collectionDate || b.createdAt || 0).getTime(),
        })
      }
    })

    list.sort((a, b) => b.rawTime - a.rawTime)
    return list.slice(0, 5)
  }, [batches])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">Recent Activity</h3>
        <Link
          to="/batches"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
        >
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto flex-1">
        {activities.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-xs">
            <p className="font-medium text-gray-500">No consignment activity recorded</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Custody and registration events will appear here</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-medium">
                <th className="pb-2.5 font-normal">Batch ID</th>
                <th className="pb-2.5 font-normal">Event</th>
                <th className="pb-2.5 font-normal">Party</th>
                <th className="pb-2.5 font-normal">Weight (kg)</th>
                <th className="pb-2.5 font-normal">Location</th>
                <th className="pb-2.5 font-normal">Time</th>
                <th className="pb-2.5 font-normal text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activities.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-2.5 font-mono font-semibold text-gray-900">
                    {row.batchId}
                  </td>
                  <td className={`py-2.5 ${row.isAlert ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                    {row.event}
                  </td>
                  <td className="py-2.5 text-gray-600 truncate max-w-[160px]">{row.party}</td>
                  <td className="py-2.5 font-mono text-gray-800">{row.weight}</td>
                  <td className="py-2.5 text-gray-600 truncate max-w-[120px]">{row.location}</td>
                  <td className="py-2.5 text-gray-400 text-[11px] whitespace-nowrap">{row.time}</td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        row.statusType === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : row.statusType === 'error'
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
