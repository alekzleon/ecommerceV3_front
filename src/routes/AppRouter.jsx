import { lazy, Suspense, useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import { useAuth } from "../context/AuthContext"

import ScrollToTop from "../components/common/ScrollToTop/ScrollToTop"

import { getAdminMenu } from "../admin/services/adminNavigationService"
import { updateCartSalesChannel } from "../services/api/cartService"
import {
  captureSalesTrackingFromSearch,
  getSalesTrackingPayload,
} from "../utils/salesTracking"

const HomePage = lazy(() => import("../pages/public/HomePage"))
const ContactPage = lazy(() => import("../pages/public/ContactPage"))
const NotFoundPage = lazy(() => import("../pages/public/NotFoundPage"))
const PrivacyPolicyPage = lazy(() => import("../pages/legal/PrivacyPolicyPage"))
const TermsPage = lazy(() => import("../pages/legal/TermsPage"))
const ProductsPage = lazy(() => import("../pages/shop/ProductsPage"))
const ProductDetailPage = lazy(() => import("../pages/shop/ProductDetailPage"))
const OffersPage = lazy(() => import("../pages/shop/OffersPage"))
const CartPage = lazy(() => import("../pages/cart/CartPage"))
const CheckoutPage = lazy(() => import("../pages/cart/CheckoutPage"))
const CheckoutResultPage = lazy(() => import("../pages/cart/CheckoutResultPage"))
const CartExcelImportPage = lazy(() => import("../pages/cart/CartExcelImportPage"))
const RecoverCartPage = lazy(() => import("../pages/cart/RecoverCartPage"))
const LoginPage = lazy(() => import("../pages/auth/LoginPage"))
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"))
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"))
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"))
const BillingResultPage = lazy(() => import("../pages/billing/BillingResultPage"))
const AccountPage = lazy(() => import("../pages/account/AccountHomePage"))
const AccountProfilePage = lazy(() => import("../pages/account/AccountProfilePage"))
const AccountAddressesPage = lazy(() => import("../pages/account/AccountAddressesPage"))
const AccountOrdersPage = lazy(() => import("../pages/account/AccountOrdersPage"))
const FavoritesPage = lazy(() => import("../pages/account/FavoritesPage"))
const WishlistsPage = lazy(() => import("../pages/account/WishlistsPage"))
const AdminRoutes = lazy(() => import("../admin/routes/AdminRoutes"))

const HIDDEN_ADMIN_MODULES = new Set([
  "carga_masiva_productos",
  "carga_masiva",
  "bulk_import",
  "variantes",
  "variant_attributes",
  "notificaciones",
  "notifications",
])

const HIDDEN_ADMIN_ROUTE_NAMES = new Set([
  "admin.products.bulk-import",
  "admin.variant-attributes.index",
  "admin.notifications.index",
])

function AppRouter() {
  const { sessionReady, isAuthenticated, isInternal, user, token, logout } = useAuth()
  const [adminMenu, setAdminMenu] = useState([])

  useEffect(() => {
    const loadAdminMenu = async () => {
      if (!sessionReady || !isAuthenticated || !isInternal || !token) {
        setAdminMenu([])
        return
      }

      try {
        const response = await getAdminMenu(token)

        const normalizedMenu = response.menu
          .map((group) => ({
            ...group,
            group_name: normalizeAdminGroupName(group),
            items: group.items
              .filter((item) => shouldShowAdminMenuItem(item))
              .map((item) => ({
                ...item,
                front_path: mapAdminMenuItemToFrontPath(item),
              })),
          }))
          .filter((group) => group.items.length > 0)

        setAdminMenu(normalizedMenu)
      } catch (error) {
        console.error("Error cargando menú admin:", error)
        setAdminMenu([])
      }
    }

    loadAdminMenu()
  }, [sessionReady, isAuthenticated, isInternal, token])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <SalesTrackingCapture />

      <Suspense fallback={null}>
      <Routes>
        {/* Admin */}
        <Route
          path="/admin/*"
          element={
            <AdminRoutes
              sessionReady={sessionReady}
              isAuthenticated={isAuthenticated}
              isInternal={isInternal}
              currentUser={user}
              menu={adminMenu}
              onLogout={logout}
            />
          }
        />

        {/* Layout público principal */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="preview/ecommerce" element={<HomePage />} />
          <Route path="productos" element={<ProductsPage />} />
          <Route path="producto/:slug" element={<ProductDetailPage />} />
          <Route path="ofertas" element={<OffersPage />} />
          <Route path="contacto" element={<ContactPage />} />
          <Route path="carrito" element={<CartPage />} />
          <Route path="carrito/recuperar" element={<RecoverCartPage />} />
          <Route path="carrito/excel" element={<CartExcelImportPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/success" element={<CheckoutResultPage type="success" />} />
          <Route path="checkout/cancel" element={<CheckoutResultPage type="cancel" />} />
          <Route path="billing/success" element={<BillingResultPage type="success" />} />
          <Route path="billing/cancel" element={<BillingResultPage type="cancel" />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route path="recuperar-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="mi-cuenta" element={<AccountPage />} />
          <Route path="mi-cuenta/datos" element={<AccountProfilePage />} />
          <Route path="mi-cuenta/direcciones" element={<AccountAddressesPage />} />
          <Route path="mi-cuenta/pedidos" element={<AccountOrdersPage />} />
          <Route path="favoritos" element={<FavoritesPage />} />
          <Route path="listas" element={<WishlistsPage />} />
          <Route path="aviso-privacidad" element={<PrivacyPolicyPage />} />
          <Route path="terminos-y-condiciones" element={<TermsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function SalesTrackingCapture() {
  const location = useLocation()
  const { sessionReady, isAuthenticated } = useAuth()

  useEffect(() => {
    captureSalesTrackingFromSearch(location.search)
  }, [location.search])

  useEffect(() => {
    if (!sessionReady || !isAuthenticated) return

    const tracking = getSalesTrackingPayload()

    if (!Object.keys(tracking).length) return

    updateCartSalesChannel(tracking).catch((error) => {
      console.error("Error sincronizando canal de venta:", error?.response?.data || error)
    })
  }, [isAuthenticated, location.search, sessionReady])

  return null
}

function mapAdminMenuItemToFrontPath(item = {}) {
  const routeName = String(item.route_name || "").toLowerCase()
  const moduleName = String(item.name || "").toLowerCase()

  return ADMIN_ROUTE_NAME_PATHS[routeName] || ADMIN_MODULE_NAME_PATHS[moduleName] || "/admin"
}

function shouldShowAdminMenuItem(item = {}) {
  const moduleName = String(item.name || "").toLowerCase()
  const routeName = String(item.route_name || "").toLowerCase()

  return !HIDDEN_ADMIN_MODULES.has(moduleName) && !HIDDEN_ADMIN_ROUTE_NAMES.has(routeName)
}

function normalizeAdminGroupName(group = {}) {
  const groupKey = String(group.group_key || "").toLowerCase()

  if (groupKey === "catalogo" || groupKey === "catalogos") return "Catálogos"

  return group.group_name
}

const ADMIN_ROUTE_NAME_PATHS = {
  "admin.dashboard": "/admin",
  "admin.products.index": "/admin/products",
  "admin.products.bulk-import": "/admin/products",
  "admin.variant-attributes.index": "/admin/products",
  "admin.categories.index": "/admin/catalog/categories",
  "admin.families.index": "/admin/catalog/families",
  "admin.orders.index": "/admin/orders",
  "admin.carts.index": "/admin/carts",
  "admin.customers.index": "/admin/customers",
  "admin.sales-channels.index": "/admin/sales-channels",
  "admin.credit.index": "/admin/credit",
  "admin.collections.index": "/admin/collections",
  "admin.promotions.index": "/admin/promotions",
  "admin.coupons.index": "/admin/coupons",
  "admin.banners.index": "/admin/marketing",
  "admin.marketing.index": "/admin/marketing",
  "admin.sync.index": "/admin/sync",
  "admin.settings.index": "/admin/settings",
  "admin.design.index": "/admin/design",
  "admin.subscription.index": "/admin/subscription",
  "admin.subscriptions.index": "/admin/subscription",
  "admin.notifications.index": "/admin/settings",
  "admin.users.index": "/admin/users",
  "admin.roles.index": "/admin/roles",
  "admin.logs.index": "/admin/logs",
}

const ADMIN_MODULE_NAME_PATHS = {
  dashboard: "/admin",
  sales_channels: "/admin/sales-channels",
  canales_venta: "/admin/sales-channels",
  categorias: "/admin/catalog/categories",
  categories: "/admin/catalog/categories",
  familias: "/admin/catalog/families",
  families: "/admin/catalog/families",
  carga_masiva_productos: "/admin/products",
  carga_masiva: "/admin/products",
  bulk_import: "/admin/products",
  variantes: "/admin/products",
  variant_attributes: "/admin/products",
  usuarios: "/admin/users",
  users: "/admin/users",
  roles: "/admin/roles",
  productos: "/admin/products",
  products: "/admin/products",
  pedidos: "/admin/orders",
  orders: "/admin/orders",
  carritos: "/admin/carts",
  carts: "/admin/carts",
  clientes: "/admin/customers",
  customers: "/admin/customers",
  credito: "/admin/credit",
  credit: "/admin/credit",
  cobranza: "/admin/collections",
  collections: "/admin/collections",
  marketing: "/admin/marketing",
  banners: "/admin/marketing",
  promociones: "/admin/promotions",
  promotions: "/admin/promotions",
  cupones: "/admin/coupons",
  coupons: "/admin/coupons",
  logs: "/admin/logs",
  sincronizacion: "/admin/sync",
  sync: "/admin/sync",
  configuracion_ecommerce: "/admin/settings",
  disena_ecommerce: "/admin/design",
  design: "/admin/design",
  suscripcion: "/admin/subscription",
  subscription: "/admin/subscription",
  subscriptions: "/admin/subscription",
  settings: "/admin/settings",
  notificaciones: "/admin/settings",
  notifications: "/admin/settings",
}

export default AppRouter
