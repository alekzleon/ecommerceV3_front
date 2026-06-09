import { Route, Routes, Navigate } from "react-router-dom"
import ProtectedAdminRoute from "./ProtectedAdminRoute"
import AdminLayout from "../components/AdminLayout/AdminLayout"
import DashboardPage from "../pages/DashboardPage/DashboardPage"
import UsersPage from "../pages/UsersPage/UsersPage"
import RolesPage from "../pages/RolesPage/RolesPage"
import CustomerPage from "../pages/CustomersPage/CustomersPage"
import ProductsPage from "../pages/ProductsPage/ProductsPage"
import MarketingPage from "../pages/MarketingPage/MarketingPage"
import PromotionsPage from "../pages/PromotionsPage/PromotionsPage"
import GiftItemsPage from "../pages/PromotionsPage/GiftItemsPage"
import AdminForbiddenPage from "../pages/AdminForbiddenPage/AdminForbiddenPage"
import LogsPage from "../pages/LogsPage/LogsPage"

function AdminRoutes({
  sessionReady,
  isAuthenticated,
  isInternal,
  currentUser,
  menu,
  onLogout,
}) {
  return (
    <Routes>
      <Route
        element={
          <ProtectedAdminRoute
            sessionReady={sessionReady}
            isAuthenticated={isAuthenticated}
            isInternal={isInternal}
          />
        }
      >
        <Route
          element={
            <AdminLayout
              currentUser={currentUser}
              menu={menu}
              onLogout={onLogout}
            />
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/customers" element={<CustomerPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/marketing" element={<MarketingPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/promotions/gift-items" element={<GiftItemsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/forbidden" element={<AdminForbiddenPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AdminRoutes
