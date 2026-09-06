import {
  clearPlatformAdminSession,
  getPlatformAdminToken,
} from "../storage/platformAdminStorage"

const API_URL = import.meta.env.VITE_API_URL
const PLATFORM_ADMIN_BASE_URL = `${API_URL}/api/v1/platform/admin`

async function platformAdminRequest(path, options = {}) {
  const token = getPlatformAdminToken()
  const response = await fetch(`${PLATFORM_ADMIN_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) {
      clearPlatformAdminSession()
    }

    const error = new Error(data?.message || "No fue posible completar la solicitud.")
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function platformAdminLogin(payload) {
  return platformAdminRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      device_name: "platform-admin",
      ...payload,
    }),
  })
}

export function platformAdminMe() {
  return platformAdminRequest("/auth/me")
}

export function platformAdminLogout() {
  return platformAdminRequest("/auth/logout", {
    method: "POST",
  })
}

export function getPlatformAdminDashboard() {
  return platformAdminRequest("/dashboard")
}

export function getPlatformAdminTenants(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, value)
    }
  })

  const query = searchParams.toString()
  return platformAdminRequest(`/tenants${query ? `?${query}` : ""}`)
}

export function getPlatformAdminTenant(tenantId) {
  return platformAdminRequest(`/tenants/${encodeURIComponent(tenantId)}`)
}

export function updatePlatformAdminTenantSubscription(tenantId, payload) {
  return platformAdminRequest(`/tenants/${encodeURIComponent(tenantId)}/subscription`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}
