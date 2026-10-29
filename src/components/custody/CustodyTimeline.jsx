import React from 'react'
import {
  Building2,
  Truck,
  Building,
  Recycle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react'

const PIPELINE_STAGES = [
  { step: 1, name: 'Collection Center', icon: Building2, desc: 'Intake & weighing' },
  { step: 2, name: 'Transporter', icon: Truck, desc: 'GPS logged transit' },
  { step: 3, name: 'Receiving Depot', icon: Building, desc: 'Dock scale check' },
  { step: 4, name: 'Certified Recycler', icon: Recycle, desc: 'Metallurgy assay' },
  { step: 5, name: 'Final Audit', icon: ShieldCheck, desc: 'CPCB ledger anchor' },
]

export function CustodyTimeline({ currentStep = 2, hasDiscrepancy = false }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] shadow-xs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-[#003B23]">
            Multi-Party Chain of Custody Pipeline
          </h3>
          <p className="text-xs text-[#66756D]">
            Strict custody verification protocol with physical scale reconciliation at each handover point
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#176B45] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#C2E3D0]">
          Standard: CPCB-EWM-2024
        </span>
      </div>

      <div className="relative">
        {/* Progress bar background line */}
        <div className="hidden sm:block absolute top-6 left-8 right-8 h-1 bg-[#E3EAE5] -z-0" />
        <div
          className={`hidden sm:block absolute top-6 left-8 h-1 transition-all duration-300 -z-0 ${
            hasDiscrepancy ? 'bg-[#D94F4F]' : 'bg-[#176B45]'
          }`}
          style={{ width: `${Math.min(100, ((currentStep - 1) / (PIPELINE_STAGES.length - 1)) * 100)}%` }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
          {PIPELINE_STAGES.map((stage) => {
            const Icon = stage.icon
            const isCompleted = stage.step < currentStep
            const isCurrent = stage.step === currentStep
            const isUpcoming = stage.step > currentStep

            return (
              <div
                key={stage.step}
                className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-2 sm:p-0 rounded-xl sm:rounded-none bg-[#FAFCFA] sm:bg-transparent border sm:border-0 border-[#E3EAE5]"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all border-2 ${
                    hasDiscrepancy && isCurrent
                      ? 'bg-[#FDF2F2] border-[#D94F4F] text-[#D94F4F]'
                      : isCompleted
                      ? 'bg-[#176B45] border-[#176B45] text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#E8F5EE] border-[#176B45] text-[#176B45] ring-4 ring-[#E8F5EE]'
                      : 'bg-white border-[#E3EAE5] text-[#8C9B93]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : hasDiscrepancy && isCurrent ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-[#8C9B93] block">
                    Step 0{stage.step}
                  </span>
                  <p className="text-xs font-semibold text-[#26352E] truncate">{stage.name}</p>
                  <p className="text-[11px] text-[#66756D] hidden sm:block mt-0.5">{stage.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
