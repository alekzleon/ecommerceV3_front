import { BrowserRouter, Routes, Route } from "react-router-dom"
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
import LoginPage from "../pages/auth/LoginPage"
import RegisterPage from "../pages/auth/RegisterPage"
import AccountPage from "../pages/account/AccountHomePage"
import NotFoundPage from "../pages/public/NotFoundPage"
import PrivacyPolicyPage from "../pages/legal/PrivacyPolicyPage"
import TermsPage from "../pages/legal/TermsPage"
import ScrollToTop from "../components/common/ScrollToTop/ScrollToTop"
import AccountProfilePage from "../pages/account/AccountProfilePage"
import AccountAddressesPage from "../pages/account/AccountAddressesPage"
import FavoritesPage from "../pages/account/FavoritesPage"

import AdminRoutes from "../admin/routes/AdminRoutes"
import { getAdminMenu } from "../admin/services/adminNavigationService"
import { useEffect, useState } from "react"

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

        const normalizedMenu = response.menu.map((group) => ({
          ...group,
          items: group.items.map((item) => ({
            ...item,
            front_path: mapModuleToFrontPath(item.name),
          })),
        }))

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
          <Route path="carrito/excel" element={<CartExcelImportPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/success" element={<CheckoutResultPage type="success" />} />
          <Route path="checkout/cancel" element={<CheckoutResultPage type="cancel" />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route path="mi-cuenta" element={<AccountPage />} />
          <Route path="mi-cuenta/datos" element={<AccountProfilePage />} />
          <Route path="mi-cuenta/direcciones" element={<AccountAddressesPage />} />
          <Route path="favoritos" element={<FavoritesPage />} />
          <Route path="aviso-privacidad" element={<PrivacyPolicyPage />} />
          <Route path="terminos-y-condiciones" element={<TermsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

function mapModuleToFrontPath(moduleName) {
  const map = {
    dashboard: "/admin",
    usuarios: "/admin/users",
    roles: "/admin/roles",
    productos: "/admin/products",
    pedidos: "/admin/orders",
    clientes: "/admin/customers",
    credito: "/admin/credit",
    cobranza: "/admin/collections",
    marketing: "/admin/marketing",
    promociones: "/admin/promotions",
    logs: "/admin/logs",
    sincronizacion: "/admin/sync",
    configuracion_ecommerce: "/admin/settings",
  }

  return map[moduleName] || "/admin"
}

export default AppRouter
