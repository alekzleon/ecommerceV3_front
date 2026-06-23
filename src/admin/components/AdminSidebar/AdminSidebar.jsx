import { NavLink } from "react-router-dom"
import { useSettings } from "../../../context/SettingsContext"
import "./AdminSidebar.css"

function AdminSidebar({ menu = [], currentUser, isOpen = false, onClose }) {
  const { brandName, logoUrl } = useSettings()
  const brandInitial = brandName?.charAt(0)?.toUpperCase() || "T"

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
        {menu.length === 0 ? (
          <div className="admin-sidebar__empty">
            <p>No hay módulos visibles para este usuario.</p>
          </div>
        ) : (
          menu.map((group) => (
            <details
              className="admin-sidebar__group admin-sidebar__dropdown"
              key={group.group_key}
              open={isDefaultOpenGroup(group)}
            >
              <summary className="admin-sidebar__group-title">
                <span>{group.group_name}</span>
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </summary>

              <SidebarGroupLinks group={group} onClose={onClose} />
            </details>
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

function isDefaultOpenGroup(group) {
  return String(group?.group_key || "").toLowerCase() === "analitica"
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

          <span className="admin-sidebar__link-arrow">+</span>
        </NavLink>
      ))}
    </div>
  )
}

function renderSidebarIcon(moduleName) {
  const icons = {
    dashboard: "◫",
    sales_channels: "◬",
    usuarios: "◎",
    roles: "◈",
    productos: "▣",
    categorias: "▤",
    familias: "▥",
    pedidos: "◉",
    clientes: "◌",
    credito: "◍",
    cobranza: "◔",
    marketing: "✦",
    banners: "▧",
    promociones: "✧",
    cupones: "%",
    logs: "☰",
    sincronizacion: "↻",
    configuracion_ecommerce: "⚙",
  }

  return icons[moduleName] || "•"
}

export default AdminSidebar
