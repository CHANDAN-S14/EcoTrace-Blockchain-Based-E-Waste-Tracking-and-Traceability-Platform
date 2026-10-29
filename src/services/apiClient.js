/**
 * Centralized API Client for EcoTrace Platform
 * Handles HTTP requests, timeouts, and transparent fallback to demo mode
 * when no backend server is responding.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const DEFAULT_REQUEST_TIMEOUT_MS = 30000 // 30s general API timeout

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

let isBackendLive = false

export function getBackendStatus() {
  return {
    isLive: isBackendLive,
    baseUrl: BASE_URL,
    mode: isBackendLive ? 'Live Backend API' : 'Demo Mode (Local Reactive Store)',
  }
}

export async function checkBackendHealth() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(`${BASE_URL}/health`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    isBackendLive = res.ok
    return isBackendLive
  } catch {
    isBackendLive = false
    return false
  }
}

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const controller = new AbortController()
  const timeoutMs = options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const { timeout: _customTimeout, ...fetchOptions } = options

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers = {
    Accept: 'application/json',
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...fetchOptions.headers,
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    isBackendLive = true

    if (!response.ok) {
      let errorBody = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = await response.text()
      }
      throw new ApiError(
        errorBody?.message || errorBody?.error || `Request failed with status ${response.status}`,
        response.status,
        errorBody
      )
    }

    return await response.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      const seconds = Math.round(timeoutMs / 1000)
      throw new ApiError(`Request timed out after ${seconds}s while waiting for server response`, 408)
    }
    throw err
  }
}
