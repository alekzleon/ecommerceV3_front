import { lazy, Suspense } from "react"
import { Route, Routes, Navigate } from "react-router-dom"
import ProtectedAdminRoute, { ProtectedAdminModule } from "./ProtectedAdminRoute"
import { can } from "../../utils/adminAccess"
import AdminLayout from "../components/AdminLayout/AdminLayout"

const DashboardPage = lazy(() => import("../pages/DashboardPage/DashboardPage"))
const SalesChannelsPage = lazy(() => import("../pages/SalesChannelsPage/SalesChannelsPage"))
const UsersPage = lazy(() => import("../pages/UsersPage/UsersPage"))
const RolesPage = lazy(() => import("../pages/RolesPage/RolesPage"))
const CustomerPage = lazy(() => import("../pages/CustomersPage/CustomersPage"))
const ProductsPage = lazy(() => import("../pages/ProductsPage/ProductsPage"))
const CategoriesPage = lazy(() => import("../pages/CategoriesPage/CategoriesPage"))
const FamiliesPage = lazy(() => import("../pages/FamiliesPage/FamiliesPage"))
const MarketingPage = lazy(() => import("../pages/MarketingPage/MarketingPage"))
const PromotionsPage = lazy(() => import("../pages/PromotionsPage/PromotionsPage"))
const GiftItemsPage = lazy(() => import("../pages/PromotionsPage/GiftItemsPage"))
const CouponsPage = lazy(() => import("../pages/CouponsPage/CouponsPage"))
const OrdersPage = lazy(() => import("../pages/OrdersPage/OrdersPage"))
const AdminForbiddenPage = lazy(() => import("../pages/AdminForbiddenPage/AdminForbiddenPage"))
const LogsPage = lazy(() => import("../pages/LogsPage/LogsPage"))
const SettingsPage = lazy(() => import("../pages/SettingsPage/SettingsPage"))
const DesignEcommercePage = lazy(() => import("../pages/DesignEcommercePage/DesignEcommercePage"))
const SubscriptionPage = lazy(() => import("../pages/SubscriptionPage/SubscriptionPage"))
const CreditPage = lazy(() => import("../pages/CreditPage/CreditPage"))
const CollectionsPage = lazy(() => import("../pages/CollectionsPage/CollectionsPage"))
const SyncPage = lazy(() => import("../pages/SyncPage/SyncPage"))

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
          <Route path="/" element={can(currentUser, "dashboard") ? lazyElement(<DashboardPage />) : <Navigate to="/admin/subscription" replace />} />
          <Route path="/sales-channels" element={withModule(currentUser, "canales_venta", <SalesChannelsPage />)} />
          <Route path="/users" element={withModule(currentUser, "usuarios", <UsersPage />)} />
          <Route path="/roles" element={withModule(currentUser, "roles", <RolesPage />)} />
          <Route path="/customers" element={withModule(currentUser, "clientes", <CustomerPage />)} />
          <Route
            path="/products"
            element={withModule(currentUser, ["productos", "carga_masiva_productos", "variantes"], <ProductsPage />)}
          />
          <Route path="/catalog/categories" element={withModule(currentUser, "categorias", <CategoriesPage />)} />
          <Route path="/catalog/families" element={withModule(currentUser, "familias", <FamiliesPage />)} />
          <Route path="/orders" element={withModule(currentUser, "pedidos", <OrdersPage />)} />
          <Route path="/carts" element={withModule(currentUser, "carritos", <OrdersPage />)} />
          <Route path="/credit" element={withModule(currentUser, "credito", <CreditPage />)} />
          <Route path="/collections" element={withModule(currentUser, "cobranza", <CollectionsPage />)} />
          <Route path="/marketing" element={withModule(currentUser, ["marketing", "banners"], <MarketingPage />)} />
          <Route path="/banners" element={<Navigate to="/admin/marketing" replace />} />
          <Route path="/promotions" element={withModule(currentUser, "promociones", <PromotionsPage />)} />
          <Route path="/promotions/gift-items" element={withModule(currentUser, "promociones", <GiftItemsPage />)} />
          <Route path="/coupons" element={withModule(currentUser, "cupones", <CouponsPage />)} />
          <Route path="/logs" element={withModule(currentUser, "logs", <LogsPage />)} />
          <Route path="/sync" element={withModule(currentUser, "sincronizacion", <SyncPage />)} />
          <Route path="/settings" element={withModule(currentUser, "configuracion_ecommerce", <SettingsPage />)} />
          <Route
            path="/design"
            element={withModule(currentUser, "configuracion_ecommerce", <DesignEcommercePage />)}
          />
          <Route path="/subscription" element={lazyElement(<SubscriptionPage />)} />
          <Route path="/forbidden" element={lazyElement(<AdminForbiddenPage />)} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

function withModule(user, module, element) {
  return (
    <ProtectedAdminModule user={user} module={module}>
      <Suspense fallback={null}>{element}</Suspense>
    </ProtectedAdminModule>
  )
}

function lazyElement(element) {
  return <Suspense fallback={null}>{element}</Suspense>
}

export default AdminRoutes
