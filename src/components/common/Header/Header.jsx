import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import SearchBar from "../SearchBar/SearchBar"
import InlineSettingEditor from "../InlineSettingEditor/InlineSettingEditor"
import InlineLogoSettingEditor from "../InlineLogoSettingEditor/InlineLogoSettingEditor"
import { useAuth } from "../../../context/AuthContext"
import { useSettings } from "../../../context/SettingsContext"
import { getCatalogSidebar } from "../../../services/api/productService"
import { getCartSummary } from "../../../services/api/cartService"
import "./header.css"

const CART_SUMMARY_STORAGE_KEY = "ecommerce_cart_summary"
const DEFAULT_NAV_TAGLINE = "Todo para tu negocio, al mejor precio y con entrega garantizada."

const defaultCartSummary = {
  id: null,
  items_count: 0,
  subtotal: 0,
  discount: 0,
  tax: 0,
  tax_breakdown: {
    total: 0,
    items: [],
  },
  total: 0,
}

function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, isInternal, modules, user, logout } = useAuth()
  const { settings, loading: settingsLoading, brandName, logoUrl, updateLocalSetting } = useSettings()

  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [cartSummary, setCartSummary] = useState(defaultCartSummary)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("")

  const displayName = user?.name ? user.name.split(" ")[0] : ""
  const profileName = user?.name ? user.name.toUpperCase() : ""
  const avatarLetter = user?.name ? user.name.charAt(0).toUpperCase() : ""
  const navTitle = settings.nav_title?.title || DEFAULT_NAV_TAGLINE
  const canEditNavTitle = isAuthenticated && isInternal && hasModule(modules, "configuracion_ecommerce")
  const canEditGeneralLogo = canEditNavTitle
  const visibleLogoUrl = logoPreviewUrl || logoUrl

  const readStoredCartSummary = () => {
    try {
      const raw = localStorage.getItem(CART_SUMMARY_STORAGE_KEY)

      if (!raw) {
        return defaultCartSummary
      }

      const parsed = JSON.parse(raw)

      return {
        id: parsed?.id ?? null,
        items_count: Number(parsed?.items_count ?? 0),
        subtotal: Number(parsed?.subtotal ?? 0),
        discount: Number(parsed?.discount ?? 0),
        tax: Number(parsed?.tax ?? 0),
        tax_breakdown: normalizeTaxBreakdown(parsed?.tax_breakdown),
        total: Number(parsed?.total ?? 0),
      }
    } catch {
      return defaultCartSummary
    }
  }

  const saveCartSummary = (payload) => {
    const summary = {
      id: payload?.id ?? null,
      items_count: Number(payload?.items_count ?? 0),
      subtotal: Number(payload?.subtotal ?? 0),
      discount: Number(payload?.discount ?? 0),
      tax: Number(payload?.tax ?? 0),
      tax_breakdown: normalizeTaxBreakdown(payload?.tax_breakdown),
      total: Number(payload?.total ?? 0),
    }

    setCartSummary(summary)
    localStorage.setItem(CART_SUMMARY_STORAGE_KEY, JSON.stringify(summary))
  }

  const clearCartSummary = () => {
    setCartSummary(defaultCartSummary)
    localStorage.removeItem(CART_SUMMARY_STORAGE_KEY)
  }

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)

        const response = await getCatalogSidebar()
        setCategories(response?.data?.categoryFamilies || [])
      } catch (error) {
        console.error("Error loading header categories:", error)
        setCategories([])
      } finally {
        setCategoriesLoading(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      clearCartSummary()
      return
    }

    setCartSummary(readStoredCartSummary())

    const fetchCartSummary = async () => {
      try {
        const response = await getCartSummary()
        const summary = response?.data || response

        if (summary && typeof summary === "object") {
          saveCartSummary(summary)
        }
      } catch (error) {
        console.error("Error loading cart summary:", error?.response?.data || error)
      }
    }

    fetchCartSummary()
  }, [isAuthenticated])

  useEffect(() => {
    const handleCartUpdated = (event) => {
      const detail = event?.detail

      if (detail && typeof detail === "object") {
        saveCartSummary(detail)
      }
    }

    const handleStorage = (event) => {
      if (event.key === CART_SUMMARY_STORAGE_KEY) {
        setCartSummary(readStoredCartSummary())
      }
    }

    window.addEventListener("cart:updated", handleCartUpdated)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("cart:updated", handleCartUpdated)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const handleLogout = async () => {
    setIsProfileOpen(false)
    setIsMobileMenuOpen(false)
    clearCartSummary()
    await logout()
    navigate("/login")
  }

  const handleCategoryClick = (categorySlug) => {
    setIsCategoriesOpen(false)
    setIsMobileMenuOpen(false)
    navigate(`/productos?category=${encodeURIComponent(categorySlug)}`)
  }

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="header">
      <div className="header-top container-main">
        <div className="header-logo">
          {settingsLoading ? (
            <span className="header-logo__skeleton" aria-hidden="true" />
          ) : (
            <>
              <Link to="/" onClick={closeMobileMenu}>
                {visibleLogoUrl ? (
                  <img src={visibleLogoUrl} alt={brandName} className="logo-img" />
                ) : (
                  <span className="header-logo__text">{brandName}</span>
                )}
              </Link>
              <InlineLogoSettingEditor
                canEdit={canEditGeneralLogo}
                onPreviewChange={setLogoPreviewUrl}
                onSaved={(logo) => {
                  updateLocalSetting("general_logo", logo)
                  updateLocalSetting("logo_url", logo.logo_url)
                }}
              />
            </>
          )}
        </div>

        <div className="header-search">
          <SearchBar />
        </div>

        <div className="header-promo">
          {settingsLoading ? (
            <span className="header-promo__skeleton" aria-hidden="true" />
          ) : (
            <InlineSettingEditor
              settingKey="nav_title.title"
              value={navTitle}
              canEdit={canEditNavTitle}
              onSaved={(value) => updateLocalSetting("nav_title.title", value)}
              className="inline-setting-editor--wrap"
              inputLabel="Editar mensaje del nav"
              allowEmpty
            />
          )}
        </div>

        <button
          type="button"
          className={`header-mobile-toggle ${isMobileMenuOpen ? "is-open" : ""}`}
          onClick={handleMobileMenuToggle}
          aria-label="Abrir menú"
        >
          <span className="header-mobile-toggle-line" />
          <span className="header-mobile-toggle-line" />
          <span className="header-mobile-toggle-line" />
        </button>
      </div>

      <div className={`header-nav ${isMobileMenuOpen ? "is-mobile-open" : ""}`}>
        <div className="container-main header-nav-inner">
          <div className="header-links">
            <Link to="/" onClick={closeMobileMenu}>
              Inicio
            </Link>

            <div
              className={`header-dropdown ${isCategoriesOpen ? "is-open" : ""}`}
              onMouseEnter={() => {
                if (window.innerWidth > 991) setIsCategoriesOpen(true)
              }}
              onMouseLeave={() => {
                if (window.innerWidth > 991) setIsCategoriesOpen(false)
              }}
            >
              <button
                type="button"
                className="header-dropdown-toggle"
                onClick={() => setIsCategoriesOpen((prev) => !prev)}
              >
                <span className="header-dropdown-label">Categorías</span>
                <span className="header-dropdown-arrow">▾</span>
              </button>

              <div className="header-dropdown-menu">
                {categoriesLoading ? (
                  <div className="dropdown-item">Cargando categorías...</div>
                ) : categories.length > 0 ? (
                  categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="dropdown-item"
                      onClick={() => handleCategoryClick(cat.slug)}
                    >
                      {cat.name}
                    </button>
                  ))
                ) : (
                  <div className="dropdown-item">Sin categorías disponibles</div>
                )}
              </div>
            </div>

            <Link to="/productos" onClick={closeMobileMenu}>
              Productos
            </Link>

            <Link to="/ofertas" onClick={closeMobileMenu}>
              Ofertas
            </Link>

            {isAuthenticated ? (
              <Link to="/frecuentes" onClick={closeMobileMenu}>
                Frecuentes
              </Link>
            ) : null}

          </div>

          <div className="header-user">
            {isAuthenticated ? (
              <div
                className={`header-profile-dropdown ${isProfileOpen ? "is-open" : ""}`}
                onMouseEnter={() => {
                  if (window.innerWidth > 991) setIsProfileOpen(true)
                }}
                onMouseLeave={() => {
                  if (window.innerWidth > 991) setIsProfileOpen(false)
                }}
              >
                <button
                  type="button"
                  className="header-profile-toggle"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                >
                  <div className="header-profile-text">
                    <span className="header-profile-name">{displayName}</span>
                    <span className="header-profile-subtitle">Mi perfil</span>
                  </div>
                  <span className="header-profile-arrow">▾</span>
                </button>

                <div className="header-profile-menu">
                  <Link
                    to="/mi-cuenta"
                    className="header-profile-header"
                    onClick={() => {
                      setIsProfileOpen(false)
                      closeMobileMenu()
                    }}
                  >
                    <div className="profile-avatar">{avatarLetter}</div>

                    <div className="profile-info">
                      <span className="profile-name">{profileName}</span>
                      <span className="profile-link">Mi perfil ›</span>
                    </div>
                  </Link>

                  <hr className="header-profile-divider" />

                  <Link
                    to="/pedidos"
                    className="header-profile-item"
                    onClick={() => {
                      setIsProfileOpen(false)
                      closeMobileMenu()
                    }}
                  >
                    Mis pedidos
                  </Link>

                  <hr className="header-profile-divider" />

                  <Link
                    to="/listas"
                    className="header-profile-item"
                    onClick={() => {
                      setIsProfileOpen(false)
                      closeMobileMenu()
                    }}
                  >
                    Listas
                  </Link>

                  <hr className="header-profile-divider" />

                  <button
                    type="button"
                    className="header-profile-item header-profile-logout"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : null}

            {isAuthenticated ? (
              <Link to="/favoritos" onClick={closeMobileMenu}>
                Favoritos
              </Link>
            ) : null}

            <Link to="/contacto" onClick={closeMobileMenu}>
              Contacto
            </Link>

            {!isAuthenticated ? (
              <Link to="/login" onClick={closeMobileMenu}>
                Ingresar
              </Link>
            ) : null}

            {isAuthenticated ? (
              <Link to="/carrito" className="header-cart" onClick={closeMobileMenu}>
                <span className="header-cart__icon-wrap">
                  <svg
                    className="header-cart__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 4H5L7.2 14.2C7.3 14.7 7.7 15 8.2 15H17.4C17.9 15 18.3 14.7 18.4 14.2L20 7H6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="9" cy="19" r="1.6" fill="currentColor" />
                    <circle cx="17" cy="19" r="1.6" fill="currentColor" />
                  </svg>

                  {cartSummary.items_count > 0 ? (
                    <span className="header-cart__badge">
                      {cartSummary.items_count}
                    </span>                    
                  ) : null}                  
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

function hasModule(modules = [], moduleName) {
  return Array.isArray(modules) && modules.some((module) => {
    if (typeof module === "string") return module === moduleName
    return module?.name === moduleName || module?.module === moduleName
  })
}

function normalizeTaxBreakdown(taxBreakdown) {
  const items = Array.isArray(taxBreakdown?.items) ? taxBreakdown.items : []

  return {
    total: Number(taxBreakdown?.total ?? 0),
    items: items.filter(Boolean).map((item) => ({
      cart_item_id: item.cart_item_id ?? item.id ?? null,
      product_id: item.product_id ?? null,
      taxable_base: Number(item.taxable_base ?? 0),
      tax_amount: Number(item.tax_amount ?? item.tax ?? 0),
      taxes: Array.isArray(item.taxes)
        ? item.taxes.filter(Boolean).map((tax) => ({
            impuesto_art_id: tax.impuesto_art_id ?? null,
            impuesto_id: tax.impuesto_id ?? null,
            nombre: tax.nombre ?? "",
            pctje_impuesto: Number(tax.pctje_impuesto ?? 0),
            importe: Number(tax.importe ?? 0),
          }))
        : [],
    })),
  }
}
