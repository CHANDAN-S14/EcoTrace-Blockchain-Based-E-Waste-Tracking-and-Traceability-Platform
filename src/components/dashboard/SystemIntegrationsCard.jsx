import React from 'react'
import { Navigation, Atom, Box, Building2 } from 'lucide-react'
import { useBatchStore } from '../../hooks/useBatchStore'

export function SystemIntegrationsCard() {
  const { backendStatus, facilities } = useBatchStore()

  const facCount = Array.isArray(facilities) ? facilities.length : 0
  const activeFacs = Array.isArray(facilities)
    ? facilities.filter(f => f.licenceStatus === 'Active & Verified').length
    : 0

  const items = [
    {
      title: 'QpiAI Opt',
      subtitle: 'Smart Dispatch',
      status: 'Active',
      subtext: 'Classical MILP & Cloud',
      icon: Navigation,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
    },
    {
      title: 'QpiAI QCloud',
      subtitle: 'Quantum Lab',
      status: 'Connected',
      subtext: '4-Qubit Simulator & QPU',
      icon: Atom,
      iconBg: '#F3E8FF',
      iconColor: '#9333EA',
    },
    {
      title: 'Blockchain',
      subtitle: 'Audit Ledger',
      status: backendStatus?.blockchainConnected ? 'Hardhat Live' : 'RPC Connected',
      subtext: 'Chain ID 31337',
      icon: Box,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
    },
    {
      title: 'Facilities',
      subtitle: 'Directory',
      status: `${facCount} Registered`,
      subtext: `${activeFacs} Active & Verified`,
      icon: Building2,
      iconBg: '#CCFBF1',
      iconColor: '#0D9488',
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col h-full">
      <h3 className="font-bold text-gray-900 text-sm mb-3">System Integrations Status</h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-auto">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className="p-3 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-xs leading-tight">{item.title}</p>
                  <p className="text-[11px] text-gray-500 leading-tight">{item.subtitle}</p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-200/60 flex flex-col">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block"></span>
                  <span>{item.status}</span>
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5">{item.subtext}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
