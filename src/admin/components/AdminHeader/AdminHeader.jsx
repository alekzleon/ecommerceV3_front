import "./AdminHeader.css"

function AdminHeader({ title, subtitle, currentUser, onToggleSidebar }) {
  return (
    <header className="admin-header">
      <div className="admin-header__left">
        <button
          type="button"
          className="admin-header__menu-btn"
          aria-label="Abrir menú"
          onClick={onToggleSidebar}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="admin-header__title-block">
          <p className="admin-header__eyebrow">pidefacilraul.com</p>
          <h1 className="admin-header__title">{title}</h1>
          {subtitle ? <p className="admin-header__subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="admin-header__right">
        <div className="admin-header__role-pill">
          <span className="admin-header__role-dot" />
          <span>{currentUser?.role?.display_name || "Usuario"}</span>
        </div>

        <div className="admin-header__profile">
          <div className="admin-header__avatar">
            {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="admin-header__profile-meta">
            <strong>{currentUser?.name || "Usuario"}</strong>
            <span>{currentUser?.email || "Sin correo"}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminHeader