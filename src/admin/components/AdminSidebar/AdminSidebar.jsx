import { NavLink } from "react-router-dom"
import { useSettings } from "../../../context/SettingsContext"
import { can } from "../../../utils/adminAccess"
import "./AdminSidebar.css"

function AdminSidebar({ menu = [], currentUser, isOpen = false, onClose }) {
  const { brandName, logoUrl } = useSettings()
  const brandInitial = brandName?.charAt(0)?.toUpperCase() || "T"
  const visibleMenu = addStorefrontAdminMenuItems(menu, currentUser)

  return (
    <aside className={`admin-sidebar ${isOpen ? "admin-sidebar--open" : ""}`}>
      <div className="admin-sidebar__top">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__brand-logo">
            {logoUrl ? <img loading="lazy" src={logoUrl} alt={brandName} /> : brandInitial}
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
          <i className="bi bi-layout-sidebar-inset" aria-hidden="true" />
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

function addStorefrontAdminMenuItems(menu, currentUser) {
  const subscriptionItem = buildSubscriptionMenuItem()
  const sidebarMenu = injectCouponMenuItem(menu, currentUser)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.name !== "banners"),
    }))
    .filter((group) => group.items.length > 0)

  if (!sidebarMenu.length) {
    return [
      {
        group_key: "account",
        group_name: "Cuenta",
        items: [subscriptionItem],
      },
    ]
  }

  const nextMenu = sidebarMenu.map((group) => {
    const hasSettings = group.items.some((item) => item.name === "configuracion_ecommerce")
    const hasPayments = group.items.some((item) => item.name === "pagos")
    const hasDesign = group.items.some((item) => item.name === "disena_ecommerce")
    const hasDomains = group.items.some((item) => item.name === "dominios_personalizados")
    const hasSubscription = group.items.some((item) => item.name === "suscripcion")

    if (!hasSettings && !hasDesign && !hasPayments && !hasDomains) return group

    const items = []

    group.items.forEach((item) => {
      items.push(item)

      if (item.name === "configuracion_ecommerce" && !hasDesign) {
        items.push({
          ...item,
          name: "disena_ecommerce",
          display_name: "Diseña tu ecommerce",
          front_path: "/admin/design",
        })
      }

      if (item.name === "configuracion_ecommerce" && !hasPayments) {
        items.push({
          ...item,
          name: "pagos",
          display_name: "Pagos",
          front_path: "/admin/payments",
        })
      }

      if (item.name === "configuracion_ecommerce" && !hasDomains) {
        items.push({
          ...item,
          name: "dominios_personalizados",
          display_name: "Dominios",
          front_path: "/admin/domains",
        })
      }

      const isDesignInsertionPoint = item.name === "disena_ecommerce"
        || (item.name === "configuracion_ecommerce" && !hasDesign && !hasPayments && !hasDomains)
      const isPaymentsInsertionPoint = item.name === "pagos"
      const isDomainsInsertionPoint = item.name === "dominios_personalizados"

      if ((isDesignInsertionPoint || isPaymentsInsertionPoint || isDomainsInsertionPoint) && !hasSubscription) {
        items.push(buildSubscriptionMenuItem(item))
      }
    })

    return {
      ...group,
      items,
    }
  })

  const alreadyHasSubscription = nextMenu.some((group) =>
    group.items.some((item) => item.name === "suscripcion")
  )

  if (alreadyHasSubscription) return nextMenu

  return nextMenu.map((group, index) => {
    if (index !== 0) return group

    return {
      ...group,
      items: [
        ...group.items,
        subscriptionItem,
      ],
    }
  })
}

function injectCouponMenuItem(menu, currentUser) {
  const hasCouponAccess = can(currentUser, "cupones") || can(currentUser, "coupons")
  const alreadyHasCoupons = menu.some((group) =>
    group.items.some((item) => ["cupones", "coupons"].includes(item.name))
  )

  if (!hasCouponAccess || alreadyHasCoupons) return menu

  const couponItem = {
    name: "cupones",
    display_name: "Cupones",
    front_path: "/admin/coupons",
  }

  const hasMarketingGroup = menu.some((group) => {
    const groupKey = String(group.group_key || "").toLowerCase()
    return groupKey === "marketing" || group.items.some((item) => ["marketing", "promociones", "promotions"].includes(item.name))
  })

  if (!hasMarketingGroup) {
    return [
      ...menu,
      {
        group_key: "marketing",
        group_name: "Marketing",
        items: [couponItem],
      },
    ]
  }

  return menu.map((group) => {
    const groupKey = String(group.group_key || "").toLowerCase()
    const isMarketingGroup = groupKey === "marketing" ||
      group.items.some((item) => ["marketing", "promociones", "promotions"].includes(item.name))

    if (!isMarketingGroup) return group

    const items = []
    let inserted = false

    group.items.forEach((item) => {
      items.push(item)

      if (!inserted && ["promociones", "promotions"].includes(item.name)) {
        items.push(couponItem)
        inserted = true
      }
    })

    if (!inserted) items.push(couponItem)

    return {
      ...group,
      items,
    }
  })
}

function buildSubscriptionMenuItem(source = {}) {
  return {
    ...source,
    name: "suscripcion",
    display_name: "Suscripción",
    front_path: "/admin/subscription",
  }
}

function renderSidebarIcon(moduleName) {
  const icons = {
    dashboard: "bi-grid",
    sales_channels: "bi-shop-window",
    canales_venta: "bi-shop-window",
    usuarios: "bi-people",
    roles: "bi-shield-check",
    productos: "bi-box-seam",
    categories: "bi-ui-checks-grid",
    categorias: "bi-ui-checks-grid",
    families: "bi-diagram-3",
    familias: "bi-diagram-3",
    pedidos: "bi-receipt",
    orders: "bi-receipt",
    carritos: "bi-cart",
    carts: "bi-cart",
    clientes: "bi-people-fill",
    customers: "bi-people-fill",
    credito: "bi-credit-card-2-front",
    cobranza: "bi-bank2",
    marketing: "bi-bullseye",
    banners: "bi-image",
    promociones: "bi-percent",
    promotions: "bi-percent",
    cupones: "bi-ticket-perforated",
    coupons: "bi-ticket-perforated",
    logs: "bi-list-check",
    sincronizacion: "bi-arrow-repeat",
    configuracion_ecommerce: "bi-gear",
    pagos: "bi-cash-stack",
    dominios_personalizados: "bi-globe2",
    disena_ecommerce: "bi-palette",
    suscripcion: "bi-credit-card",
    design: "bi-palette",
    settings: "bi-gear",
    notificaciones: "bi-bell",
    notifications: "bi-bell",
  }

  return <i className={`bi ${icons[moduleName] || "bi-circle-fill"}`} aria-hidden="true" />
}

export default AdminSidebar
