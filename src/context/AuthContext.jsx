/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { loginRequest, logoutRequest, meRequest } from "../services/api/authService"
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  hasAuthSession,
  setAuthSession,
} from "../services/storage/authStorage"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAuthToken())
  const [user, setUser] = useState(getAuthUser())
  const [isAuthenticated, setIsAuthenticated] = useState(hasAuthSession())
  const [sessionReady, setSessionReady] = useState(false)

  const login = async ({ login, password, device_name = "react-web" }) => {
    const response = await loginRequest({
      login,
      password,
      device_name,
    })

    setAuthSession(response.token, response.user)
    setToken(response.token)
    setUser(response.user)
    setIsAuthenticated(true)
    setSessionReady(true)

    return response
  }

  const refreshMe = async () => {
    const currentToken = getAuthToken()

    if (!currentToken) {
      clearAuthSession()
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      setSessionReady(true)
      return null
    }

    try {
      const response = await meRequest(currentToken)

      setAuthSession(currentToken, response.user)
      setToken(currentToken)
      setUser(response.user)
      setIsAuthenticated(true)
      setSessionReady(true)

      return response
    } catch {
      clearAuthSession()
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      setSessionReady(true)
      return null
    }
  }

  const logout = async () => {
    try {
      const currentToken = getAuthToken()

      if (currentToken) {
        await logoutRequest(currentToken)
      }
    } catch (error) {
      console.error("Error al cerrar sesión en API:", error)
    } finally {
      clearAuthSession()
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      setSessionReady(true)
    }
  }

  useEffect(() => {
    refreshMe()
  }, [])

  const value = useMemo(() => {
    const modules = user?.modules || []
    const isInternal = user?.role?.name !== "cliente" && Boolean(user?.role)

    return {
      token,
      user,
      modules,
      isAuthenticated,
      isInternal,
      sessionReady,
      login,
      logout,
      refreshMe,
    }
  }, [token, user, isAuthenticated, sessionReady])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }

  return context
}
