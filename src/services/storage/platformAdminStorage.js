const PLATFORM_ADMIN_TOKEN_KEY = "cloudishop_platform_admin_token"
const PLATFORM_ADMIN_USER_KEY = "cloudishop_platform_admin_user"

export function setPlatformAdminSession(token, user) {
  localStorage.setItem(PLATFORM_ADMIN_TOKEN_KEY, token)
  localStorage.setItem(PLATFORM_ADMIN_USER_KEY, JSON.stringify(user))
}

export function getPlatformAdminToken() {
  return localStorage.getItem(PLATFORM_ADMIN_TOKEN_KEY)
}

export function getPlatformAdminUser() {
  const raw = localStorage.getItem(PLATFORM_ADMIN_USER_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearPlatformAdminSession() {
  localStorage.removeItem(PLATFORM_ADMIN_TOKEN_KEY)
  localStorage.removeItem(PLATFORM_ADMIN_USER_KEY)
}

export function hasPlatformAdminSession() {
  return Boolean(getPlatformAdminToken())
}
