import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, Box, Handshake, AlertTriangle } from 'lucide-react'
import { WelcomeBanner } from '../components/dashboard/WelcomeBanner'
import { KpiCard } from '../components/dashboard/KpiCard'
import { MonthlyIntakeBarChart } from '../components/dashboard/MonthlyIntakeBarChart'
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart'
import { FacilityLocationsMap } from '../components/dashboard/FacilityLocationsMap'
import { RecentActivityTable } from '../components/dashboard/RecentActivityTable'
import { RecoverySummaryCard } from '../components/dashboard/RecoverySummaryCard'
import { SystemIntegrationsCard } from '../components/dashboard/SystemIntegrationsCard'
import { EnvironmentalImpactCard } from '../components/dashboard/EnvironmentalImpactCard'
import { useBatchStore } from '../hooks/useBatchStore'
import { formatWeight } from '../utils/formatters'

export function DashboardPage() {
  const navigate = useNavigate()
  const { liveKPIs, batches } = useBatchStore()

  // Compute authentic live totals from MongoDB data store
  const totalWeightStr = `${formatWeight(liveKPIs.grossIntakeKg || 0, 0)}`
  const batchesCount = liveKPIs.totalBatches || 0
  const confirmedHandoversCount = liveKPIs.confirmedHandovers || 0
  const discrepanciesCount = liveKPIs.flaggedClaims || 0

  return (
    <div className="space-y-5 pb-8 max-w-[1400px] mx-auto">
      {/* 1. Welcome Banner matching reference */}
      <WelcomeBanner />

      {/* 2. Top 4 KPI Cards matching reference image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total E-Waste Collected"
          value={totalWeightStr}
          trend="+12.5% from last month"
          icon={Scale}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          onClick={() => navigate('/batches')}
        />
        <KpiCard
          title="Batches Tracked"
          value={batchesCount}
          trend="+8.1% from last month"
          icon={Box}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          onClick={() => navigate('/batches')}
        />
        <KpiCard
          title="Confirmed Handovers"
          value={confirmedHandoversCount}
          trend="+7.3% from last month"
          icon={Handshake}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          onClick={() => navigate('/custody')}
        />
        <KpiCard
          title="Discrepancies"
          value={discrepanciesCount}
          trend="+25% from last month"
          isAlert={true}
          icon={AlertTriangle}
          onClick={() => navigate('/audit')}
        />
      </div>

      {/* 3. Row 2: Charts and Map (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MonthlyIntakeBarChart />
        <CategoryDonutChart totalWeight={totalWeightStr} />
        <FacilityLocationsMap />
      </div>

      {/* 4. Row 3: Recent Activity (60%) & Recovery Summary (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <RecentActivityTable />
        </div>
        <div className="lg:col-span-5">
          <RecoverySummaryCard />
        </div>
      </div>

      {/* 5. Row 4: System Integrations Status & Environmental Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <SystemIntegrationsCard />
        </div>
        <div className="lg:col-span-5">
          <EnvironmentalImpactCard />
        </div>
      </div>
    </div>
  )
}
