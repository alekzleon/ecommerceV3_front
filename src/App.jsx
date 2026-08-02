// src/App.jsx
import { lazy, Suspense, useEffect } from "react"
import AppRouter from './routes/AppRouter'
import { Toaster } from "sonner"
import { LoadingProvider } from "./context/LoadingContext";
import { AuthProvider } from "./context/AuthContext"
import { SettingsProvider } from "./context/SettingsContext"
import { probeTenant } from "./services/api/tenantService"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-icons/font/bootstrap-icons.css"

const PlatformTenantCreatePage = lazy(() => import("./pages/platform/PlatformTenantCreatePage"))
const PlatformAdminPage = lazy(() => import("./pages/platform/PlatformAdminPage"))

let tenantProbeWasCalled = false

function App() {
  const isPlatform = isPlatformHost()
  const isPlatformAdmin = isPlatformAdminPath()
  const isLegalPage = isLegalPath()

  useEffect(() => {
    if (isPlatform || !import.meta.env.DEV || tenantProbeWasCalled) return

    tenantProbeWasCalled = true

    probeTenant()
      .then((data) => {
        const counts = data?.counts || {}
        const countsAreOne =
          Object.keys(counts).length > 0 &&
          Object.values(counts).every((count) => Number(count) === 1)

        console.info("[tenant/probe]", {
          tenant_id: data?.tenant_id,
          tenant_id_ok: data?.tenant_id === "demo",
          database: data?.database,
          database_ok: data?.database === "tenantdemo",
          counts,
          counts_ok: countsAreOne,
        })
      })
      .catch((error) => {
        console.error("[tenant/probe] Error:", error?.response?.data || error)
      })
  }, [isPlatform])

  if (isPlatformAdmin) {
    return (
      <Suspense fallback={null}>
        <PlatformAdminPage />
      </Suspense>
    )
  }

  if (isPlatform && !isLegalPage) {
    return (
      <Suspense fallback={null}>
        <PlatformTenantCreatePage />
      </Suspense>
    )
  }

  return (
    <SettingsProvider>
      <LoadingProvider>
        <AuthProvider>
          <AppRouter />

          <Toaster
            position="bottom-right"
            richColors
            closeButton
            expand={false}
            duration={2600}
          />
        </AuthProvider>
      </LoadingProvider>
    </SettingsProvider>
  )
}

function isPlatformHost() {
  if (typeof window === "undefined") return false

  return ["localhost", "127.0.0.1", "cloudishop.mx", "www.cloudishop.mx"].includes(
    window.location.hostname
  )
}

function isPlatformAdminPath() {
  if (typeof window === "undefined") return false

  return window.location.pathname.startsWith("/platform/admin")
}

function isLegalPath() {
  if (typeof window === "undefined") return false

  return ["/aviso-privacidad", "/terminos-y-condiciones"].includes(window.location.pathname)
}

export default App
