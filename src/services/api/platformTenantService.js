const API_URL = import.meta.env.VITE_API_URL

function getPlatformUrl(path) {
  return `${API_URL}/api/v1/platform/tenants${path}`
}

function getPlatformBaseUrl(path) {
  return `${API_URL}/api/v1/platform${path}`
}

async function requestPlatform(path, options = {}) {
  const response = await fetch(getPlatformUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data?.message || "No fue posible completar la solicitud.")
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function checkTenantSubdomain(subdomain) {
  const params = new URLSearchParams({ subdomain })
  return requestPlatform(`/check-subdomain?${params.toString()}`)
}

export function createTenant(payload) {
  return requestPlatform("", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getPublicPlatformPlans() {
  const response = await fetch(getPlatformBaseUrl("/plans"), {
    headers: {
      Accept: "application/json",
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data?.message || "No fue posible cargar los planes.")
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
