import { NavLink } from "react-router-dom"
import { useSettings } from "../../../context/SettingsContext"
import "./AdminSidebar.css"

function AdminSidebar({ menu = [], currentUser, isOpen = false, onClose }) {
  const { brandName, logoUrl } = useSettings()
  const brandInitial = brandName?.charAt(0)?.toUpperCase() || "T"
  const visibleMenu = addDesignMenuItem(menu)

  return (
    <aside className={`admin-sidebar ${isOpen ? "admin-sidebar--open" : ""}`}>
      <div className="admin-sidebar__top">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__brand-logo">
            {logoUrl ? <img src={logoUrl} alt={brandName} /> : brandInitial}
          </div>

          <div className="admin-sidebar__brand-copy">
            <h2 className="admin-sidebar__brand-title">{brandName}</h2>
            <p className="admin-sidebar__brand-subtitle">Admin Suite</p>
          </div>
        </div>

        <button
          type="button"
          className="admin-sidebar__brand-action"
          aria-label="Cerrar menú"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <nav className="admin-sidebar__nav">
        {visibleMenu.length === 0 ? (
          <div className="admin-sidebar__empty">
            <p>No hay módulos visibles para este usuario.</p>
          </div>
        ) : (
          visibleMenu.map((group) => (
            <section className="admin-sidebar__group" key={group.group_key}>
              <div className="admin-sidebar__group-title">
                <span>{group.group_name}</span>
              </div>

              <SidebarGroupLinks group={group} onClose={onClose} />
            </section>
          ))
        )}
      </nav>

      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__user">
          <div className="admin-sidebar__avatar">
            {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="admin-sidebar__user-meta">
            <p className="admin-sidebar__user-name">{currentUser?.name || "Usuario"}</p>
            <p className="admin-sidebar__user-role">
              {currentUser?.email || currentUser?.role?.display_name || "Sin rol"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function SidebarGroupLinks({ group, onClose }) {
  return (
    <div className="admin-sidebar__group-links">
      {group.items.map((item) => (
        <NavLink
          key={item.name}
          to={item.front_path}
          end={item.front_path === "/admin"}
          onClick={onClose}
          className={({ isActive }) =>
            `admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`
          }
        >
          <span className="admin-sidebar__link-icon">
            {renderSidebarIcon(item.name)}
          </span>

          <span className="admin-sidebar__link-text">{item.display_name}</span>
        </NavLink>
      ))}
    </div>
  )
}

function addDesignMenuItem(menu) {
  return menu.map((group) => {
    const hasSettings = group.items.some((item) => item.name === "configuracion_ecommerce")
    const hasDesign = group.items.some((item) => item.name === "disena_ecommerce")

    if (!hasSettings || hasDesign) return group

    const items = []

    group.items.forEach((item) => {
      items.push(item)

      if (item.name === "configuracion_ecommerce") {
        items.push({
          ...item,
          name: "disena_ecommerce",
          display_name: "Diseña tu ecommerce",
          front_path: "/admin/design",
        })
      }
    })

    return {
      ...group,
      items,
    }
  })
}

function renderSidebarIcon(moduleName) {
  const icons = {
    dashboard: "bi-house-door-fill",
    sales_channels: "bi-shop-window",
    canales_venta: "bi-shop-window",
    usuarios: "bi-person-fill",
    roles: "bi-shield-lock-fill",
    productos: "bi-tag-fill",
    categories: "bi-collection-fill",
    categorias: "bi-collection-fill",
    families: "bi-diagram-3-fill",
    familias: "bi-diagram-3-fill",
    pedidos: "bi-inbox-fill",
    orders: "bi-inbox-fill",
    carritos: "bi-cart-fill",
    carts: "bi-cart-fill",
    clientes: "bi-people-fill",
    customers: "bi-people-fill",
    credito: "bi-credit-card-2-front-fill",
    cobranza: "bi-bank2",
    marketing: "bi-bullseye",
    banners: "bi-image-fill",
    promociones: "bi-percent",
    promotions: "bi-percent",
    cupones: "bi-ticket-perforated-fill",
    coupons: "bi-ticket-perforated-fill",
    logs: "bi-list-check",
    sincronizacion: "bi-arrow-repeat",
    configuracion_ecommerce: "bi-gear-fill",
    disena_ecommerce: "bi-palette-fill",
    design: "bi-palette-fill",
    settings: "bi-gear-fill",
    notificaciones: "bi-bell-fill",
    notifications: "bi-bell-fill",
  }

  return <i className={`bi ${icons[moduleName] || "bi-circle-fill"}`} aria-hidden="true" />
}

export default AdminSidebar
