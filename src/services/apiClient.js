/**
 * Centralized API Client for EcoTrace Platform
 * Handles HTTP requests, timeouts, binary blob fetching, and transparent resolution
 * between local development and deployed production Render backend.
 */

const RENDER_PROD_URL = 'https://ecotrace-blockchain-based-e-waste.onrender.com/api'
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

/**
 * Resolves the accurate API base URL across local dev and deployed production
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, '')
  }

  // Check if running in browser
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname
    // If running on non-localhost/non-127.0.0.1 domain (e.g. Render, Vercel, Netlify)
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return RENDER_PROD_URL
    }
  }

  // In local development:
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }
  return 'http://localhost:5000/api'
}

/**
 * Normalizes full endpoint URL and avoids redundant /api/api prefixes
 */
export function buildApiUrl(endpoint) {
  const base = getApiBaseUrl().replace(/\/+$/, '')
  let cleanEndpoint = String(endpoint || '').trim()
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`
  }
  // Strip leading /api if base already ends with /api
  if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api/, '')
  }
  return `${base}${cleanEndpoint}`
}

function getAuthToken() {
  try {
    if (typeof localStorage !== 'undefined') {
      return (
        localStorage.getItem('token') ||
        localStorage.getItem('auth_token') ||
        localStorage.getItem('ecotrace_token') ||
        sessionStorage.getItem('token') ||
        null
      )
    }
  } catch {
    return null
  }
  return null
}

export function getBackendStatus() {
  const baseUrl = getApiBaseUrl()
  return {
    isLive: isBackendLive,
    baseUrl,
    mode: isBackendLive ? 'Live Backend API' : 'Demo Mode (Local Reactive Store)',
  }
}

export async function checkBackendHealth() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const url = buildApiUrl('/health')
    const res = await fetch(url, {
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

/**
 * Standard JSON API request
 */
export async function request(endpoint, options = {}) {
  const url = buildApiUrl(endpoint)
  const controller = new AbortController()
  const timeoutMs = options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const { timeout: _customTimeout, ...fetchOptions } = options

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const token = getAuthToken()

  const headers = {
    Accept: 'application/json',
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        try {
          errorBody = await response.text()
        } catch {}
      }
      const message =
        (typeof errorBody === 'object' && (errorBody?.message || errorBody?.error)) ||
        (typeof errorBody === 'string' && errorBody) ||
        `Request failed with status ${response.status}`
      throw new ApiError(message, response.status, errorBody)
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

/**
 * Binary blob fetcher with automatic base URL, auth headers, and filename extraction
 */
export async function fetchBlob(endpoint, options = {}) {
  const url = buildApiUrl(endpoint)
  const controller = new AbortController()
  const timeoutMs = options.timeout ?? (DEFAULT_REQUEST_TIMEOUT_MS * 2) // 60s for PDF compilation
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const { timeout: _customTimeout, headers: customHeaders, ...fetchOptions } = options
  const token = getAuthToken()

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
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
        try {
          errorBody = await response.text()
        } catch {}
      }
      const message =
        (typeof errorBody === 'object' && (errorBody?.message || errorBody?.error)) ||
        (typeof errorBody === 'string' && errorBody) ||
        `Request failed with status ${response.status}`
      throw new ApiError(message, response.status, errorBody)
    }

    const blob = await response.blob()

    // Extract filename from Content-Disposition if present
    let filename = null
    const disposition = response.headers.get('Content-Disposition')
    if (disposition) {
      const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '').trim()
      }
    }

    return {
      blob,
      filename,
      contentType: response.headers.get('Content-Type') || blob.type,
      size: blob.size,
      ok: true,
    }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      const seconds = Math.round(timeoutMs / 1000)
      throw new ApiError(`Request timed out after ${seconds}s while generating file`, 408)
    }
    throw err
  }
}

/**
 * Safely triggers client download of a binary Blob with delayed URL revocation
 */
export function triggerBlobDownload(blob, defaultFilename = 'download.pdf') {
  if (typeof window === 'undefined') return ''
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', defaultFilename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Safely delay object URL revocation to prevent empty/cancelled downloads
  setTimeout(() => {
    try {
      window.URL.revokeObjectURL(url)
    } catch {}
  }, 60000)
  return url
}

/**
 * Creates an object URL for in-browser PDF preview or iframe rendering
 */
export function createBlobPreviewUrl(blob) {
  if (typeof window === 'undefined') return { url: '', revoke: () => {} }
  const url = window.URL.createObjectURL(blob)
  return {
    url,
    revoke: () => {
      try {
        window.URL.revokeObjectURL(url)
      } catch {}
    },
  }
}
