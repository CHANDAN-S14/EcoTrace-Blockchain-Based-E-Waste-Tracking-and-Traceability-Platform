import React from 'react'
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert, Truck, Sparkles } from 'lucide-react'

export function StatusBadge({ status, size = 'sm', className = '' }) {
  const norm = (status || '').toLowerCase()

  let style = 'bg-[#E8F5EE] text-[#176B45] border-[#C2E3D0]'
  let Icon = CheckCircle2

  if (norm.includes('verified') || norm.includes('reconciled') || norm.includes('active') || norm.includes('accepted') || norm.includes('processed')) {
    style = 'bg-[#E8F5EE] text-[#176B45] border-[#C2E3D0]'
    Icon = CheckCircle2
  } else if (norm.includes('anchored')) {
    style = 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]'
    Icon = CheckCircle2
  } else if (norm.includes('pending') || norm.includes('transit') || norm.includes('review')) {
    style = 'bg-[#FEF5E7] text-[#B8741A] border-[#FAD7A0]'
    Icon = norm.includes('transit') ? Truck : Clock
  } else if (norm.includes('discrepancy') || norm.includes('missing') || norm.includes('critical') || norm.includes('mismatch')) {
    style = 'bg-[#FDF2F2] text-[#D94F4F] border-[#F8B4B4]'
    Icon = AlertTriangle
  } else if (norm.includes('duplicate') || norm.includes('rejected')) {
    style = 'bg-[#FDF2F2] text-[#B91C1C] border-[#FCA5A5]'
    Icon = ShieldAlert
  } else if (norm.includes('quantum') || norm.includes('optimized') || norm.includes('feasible')) {
    style = 'bg-[#EBF3FB] text-[#2B6CB0] border-[#BEE3F8]'
    Icon = Sparkles
  } else if (norm.includes('registered')) {
    style = 'bg-[#F4F7F5] text-[#3E5649] border-[#D5E0DA]'
    Icon = CheckCircle2
  }

  const sizeClasses = size === 'xs'
    ? 'text-xs px-2 py-0.5 gap-1'
    : size === 'lg'
    ? 'text-sm px-3.5 py-1.5 gap-2'
    : 'text-xs px-2.5 py-1 gap-1.5'

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${style} ${className}`}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{status}</span>
    </span>
  )
}
