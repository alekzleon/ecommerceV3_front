const AUTH_TOKEN_KEY = "pf_auth_token"
const AUTH_USER_KEY = "pf_auth_user"

export function setAuthSession(token, user) {
  localStorage.setItem(getScopedStorageKey(AUTH_TOKEN_KEY), token)
  localStorage.setItem(getScopedStorageKey(AUTH_USER_KEY), JSON.stringify(user))
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function getAuthToken() {
  return localStorage.getItem(getScopedStorageKey(AUTH_TOKEN_KEY))
    || localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getAuthUser() {
  const raw = localStorage.getItem(getScopedStorageKey(AUTH_USER_KEY))
    || localStorage.getItem(AUTH_USER_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearAuthSession() {
  localStorage.removeItem(getScopedStorageKey(AUTH_TOKEN_KEY))
  localStorage.removeItem(getScopedStorageKey(AUTH_USER_KEY))
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function hasAuthSession() {
  return !!getAuthToken()
}

function getScopedStorageKey(key) {
  return `${key}:${getAuthScope()}`
}

function getAuthScope() {
  if (typeof window === "undefined") return "default"

  return window.location.hostname || "default"
}
