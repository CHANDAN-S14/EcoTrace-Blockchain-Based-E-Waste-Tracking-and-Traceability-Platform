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
  let targetUrl = ''

  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    targetUrl = envUrl.trim().replace(/\/+$/, '')
  } else if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname
    // If running on non-localhost domain (e.g. fronted-1axq.onrender.com or any production host)
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      targetUrl = RENDER_PROD_URL
    }
  }

  if (!targetUrl) {
    targetUrl = envUrl ? envUrl.trim().replace(/\/+$/, '') : 'http://localhost:5000/api'
  }

  // Ensure absolute URLs end with /api
  if (/^https?:\/\//i.test(targetUrl) && !targetUrl.endsWith('/api')) {
    targetUrl = `${targetUrl}/api`
  }

  return targetUrl
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

/**
 * Resolves backend-hosted static asset / upload URLs (e.g. /uploads/evidence.jpg)
 * Ensures assets are NEVER requested from the static frontend host
 */
export function resolveFileUrl(filePathOrUrl) {
  if (!filePathOrUrl) return ''
  const str = String(filePathOrUrl).trim()
  if (str.startsWith('data:') || str.startsWith('blob:') || /^https?:\/\//i.test(str)) {
    return str
  }

  const cleanPath = str.replace(/^\/+/, '')
  // Strip trailing /api to get root backend origin (e.g. https://ecotrace-blockchain-based-e-waste.onrender.com)
  const hostBase = getApiBaseUrl().replace(/\/api\/?$/, '')

  if (cleanPath.startsWith('uploads/')) {
    return `${hostBase}/${cleanPath}`
  }
  return `${hostBase}/uploads/${cleanPath}`
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
 * Verifies that a given Blob starts with valid PDF magic bytes (%PDF-)
 */
export async function checkPdfMagicBytes(blob) {
  if (!blob || !(blob instanceof Blob)) return false
  try {
    const slice = blob.slice(0, 5)
    const text = await slice.text()
    return text === '%PDF-'
  } catch {
    return false
  }
}

/**
 * Binary blob fetcher with automatic base URL, auth headers, content-type verification,
 * and filename extraction from Content-Disposition.
 * Rejects JSON error responses even if HTTP 200 was sent.
 */
export async function fetchBlob(endpoint, options = {}) {
  const url = buildApiUrl(endpoint)
  const controller = new AbortController()
  const timeoutMs = options.timeout ?? (DEFAULT_REQUEST_TIMEOUT_MS * 2) // 60s for PDF compilation
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const { timeout: _customTimeout, headers: customHeaders, expectedType = 'pdf', ...fetchOptions } = options
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

    const contentType = response.headers.get('Content-Type') || ''
    const isPdfExpected = expectedType === 'pdf' || endpoint.includes('/pdf')

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

    // Guard: Prevent treating an HTTP 200 JSON payload as a valid PDF
    if (isPdfExpected && contentType.includes('application/json')) {
      let errJson = null
      try {
        errJson = await response.json()
      } catch {}
      const errMsg = errJson?.message || errJson?.error || 'Server returned a JSON response instead of a PDF document.'
      throw new ApiError(errMsg, 502, errJson)
    }

    const blob = await response.blob()

    // Validate PDF magic bytes: standard PDFs must begin with %PDF-
    if (isPdfExpected) {
      const isValidPdf = await checkPdfMagicBytes(blob)
      if (!isValidPdf) {
        let errorMsg = 'Invalid PDF document received from server'
        try {
          const rawText = await blob.text()
          if (rawText.startsWith('{') || rawText.startsWith('[')) {
            const parsed = JSON.parse(rawText)
            errorMsg = parsed.message || parsed.error || errorMsg
          }
        } catch {}
        throw new ApiError(errorMsg, 502, { invalidHeader: true, contentType })
      }
    }

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
      contentType: contentType || (isPdfExpected ? 'application/pdf' : blob.type),
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
