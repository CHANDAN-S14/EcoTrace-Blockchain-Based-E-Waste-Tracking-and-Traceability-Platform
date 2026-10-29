import React, { useState } from 'react'
import { BatchRegistrationForm } from '../components/batches/BatchRegistrationForm'
import { BatchTable } from '../components/batches/BatchTable'
import { Boxes, Plus } from 'lucide-react'

export function BatchRegistrationPage() {
  const [activeTab, setActiveTab] = useState('register') // 'register' | 'table'

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
            Batches
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Register e-waste consignments with unique IDs, tare weighing slips, and verifiable QR passports.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#E3EAE5] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('register')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-[#176B45] text-white shadow-xs'
                : 'text-[#66756D] hover:text-[#26352E]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Consignment</span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'table'
                ? 'bg-[#176B45] text-white shadow-xs'
                : 'text-[#66756D] hover:text-[#26352E]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Registered Batches</span>
          </button>
        </div>
      </div>

      {/* Forms & Tables */}
      {activeTab === 'register' ? (
        <div className="space-y-6">
          <BatchRegistrationForm onSuccess={() => setActiveTab('table')} />
          <div className="pt-2">
            <BatchTable />
          </div>
        </div>
      ) : (
        <BatchTable />
      )}
    </div>
  )
}
