import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import { useAuth } from "../context/AuthContext"

import HomePage from "../pages/public/HomePage"
import ContactPage from "../pages/public/ContactPage"
import ProductsPage from "../pages/shop/ProductsPage"
import ProductDetailPage from "../pages/shop/ProductDetailPage"
import OffersPage from "../pages/shop/OffersPage"
import CartPage from "../pages/cart/CartPage"
import CheckoutPage from "../pages/cart/CheckoutPage"
import CheckoutResultPage from "../pages/cart/CheckoutResultPage"
import CartExcelImportPage from "../pages/cart/CartExcelImportPage"
import RecoverCartPage from "../pages/cart/RecoverCartPage"
import LoginPage from "../pages/auth/LoginPage"
import RegisterPage from "../pages/auth/RegisterPage"
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage"
import ResetPasswordPage from "../pages/auth/ResetPasswordPage"
import AccountPage from "../pages/account/AccountHomePage"
import NotFoundPage from "../pages/public/NotFoundPage"
import PrivacyPolicyPage from "../pages/legal/PrivacyPolicyPage"
import TermsPage from "../pages/legal/TermsPage"
import ScrollToTop from "../components/common/ScrollToTop/ScrollToTop"
import AccountProfilePage from "../pages/account/AccountProfilePage"
import AccountAddressesPage from "../pages/account/AccountAddressesPage"
import AccountOrdersPage from "../pages/account/AccountOrdersPage"
import FavoritesPage from "../pages/account/FavoritesPage"
import WishlistsPage from "../pages/account/WishlistsPage"

import AdminRoutes from "../admin/routes/AdminRoutes"
import { getAdminMenu } from "../admin/services/adminNavigationService"
import { useEffect, useState } from "react"
import { updateCartSalesChannel } from "../services/api/cartService"
import {
  captureSalesTrackingFromSearch,
  getSalesTrackingPayload,
} from "../utils/salesTracking"

const HIDDEN_ADMIN_MODULES = new Set([
  "credito",
  "cobranza",
  "sincronizacion",
  "carga_masiva",
  "bulk_import",
  "variantes",
  "variant_attributes",
])

const HIDDEN_ADMIN_ROUTE_NAMES = new Set([
  "admin.products.bulk-import",
  "admin.variant-attributes.index",
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
  "admin.carts.index": "/admin/orders",
  "admin.customers.index": "/admin/customers",
  "admin.sales-channels.index": "/admin/sales-channels",
  "admin.promotions.index": "/admin/promotions",
  "admin.coupons.index": "/admin/coupons",
  "admin.banners.index": "/admin/banners",
  "admin.marketing.index": "/admin/marketing",
  "admin.settings.index": "/admin/settings",
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
  usuarios: "/admin/users",
  users: "/admin/users",
  roles: "/admin/roles",
  productos: "/admin/products",
  products: "/admin/products",
  pedidos: "/admin/orders",
  orders: "/admin/orders",
  carritos: "/admin/orders",
  carts: "/admin/orders",
  clientes: "/admin/customers",
  customers: "/admin/customers",
  marketing: "/admin/marketing",
  banners: "/admin/banners",
  promociones: "/admin/promotions",
  promotions: "/admin/promotions",
  cupones: "/admin/coupons",
  coupons: "/admin/coupons",
  logs: "/admin/logs",
  configuracion_ecommerce: "/admin/settings",
  settings: "/admin/settings",
  notificaciones: "/admin/settings",
  notifications: "/admin/settings",
}

export default AppRouter
