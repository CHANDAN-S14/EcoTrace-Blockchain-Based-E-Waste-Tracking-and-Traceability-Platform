/**
 * Formatting utilities for EcoTrace Platform
 */

export function formatWeight(kg, decimals = 1) {
  if (kg === null || kg === undefined || isNaN(kg)) return '0.0 kg'
  return `${Number(kg).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kg`
}

export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency === 'INR' ? 'INR' : 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercentage(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0.0%'
  return `${Number(val).toFixed(decimals)}%`
}

export function truncateHash(hash, start = 8, end = 6) {
  if (!hash) return ''
  if (hash.length <= start + end) return hash
  return `${hash.slice(0, start)}...${hash.slice(-end)}`
}

export function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}
