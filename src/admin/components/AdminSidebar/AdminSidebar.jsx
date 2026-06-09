import { NavLink } from "react-router-dom"
import "./AdminSidebar.css"

function AdminSidebar({ menu = [], currentUser, onLogout, isOpen = false, onClose }) {
  return (
    <aside className={`admin-sidebar ${isOpen ? "admin-sidebar--open" : ""}`}>
      <div className="admin-sidebar__top">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__brand-logo">P</div>

          <div className="admin-sidebar__brand-copy">
            <h2 className="admin-sidebar__brand-title">PideFácil</h2>
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
            <div className="admin-sidebar__group" key={group.group_key}>
              <p className="admin-sidebar__group-title">{group.group_name}</p>

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
            </div>
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

          <button
            type="button"
            className="admin-sidebar__logout-icon"
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  )
}

function renderSidebarIcon(moduleName) {
  const icons = {
    dashboard: "◫",
    usuarios: "◎",
    roles: "◈",
    productos: "▣",
    pedidos: "◉",
    clientes: "◌",
    credito: "◍",
    cobranza: "◔",
    marketing: "✦",
    promociones: "✧",
    logs: "☰",
    sincronizacion: "↻",
    configuracion_ecommerce: "⚙",
  }

  return icons[moduleName] || "•"
}

export default AdminSidebar
