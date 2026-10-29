import React, { useState } from 'react'
import { Recycle, Scale, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { ProcessingForm } from '../components/recovery/ProcessingForm'
import { RecoveryHistoryTable } from '../components/recovery/RecoveryHistoryTable'
import { useBatchStore } from '../hooks/useBatchStore'

export function ProcessingRecoveryPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900 tracking-tight">
          Recovery &amp; Processing
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Record e-waste processing and recovered materials, verify weights, and check for duplicate recovery claims.
        </p>
      </div>

      {/* Primary Processing Form */}
      <ProcessingForm onComplete={() => setRefreshKey(prev => prev + 1)} />

      {/* Historical Recovery Claim Ledger */}
      <RecoveryHistoryTable key={refreshKey} />
    </div>
  )
}
