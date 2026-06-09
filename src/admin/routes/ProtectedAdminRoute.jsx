import { Navigate, Outlet } from "react-router-dom"

function ProtectedAdminRoute({ sessionReady, isAuthenticated, isInternal }) {
  if (!sessionReady) {
    return <div style={{ padding: "2rem" }}>Cargando panel...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isInternal) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedAdminRoute