import "./AdminForbiddenPage.css"

function AdminForbiddenPage() {
  return (
    <div className="admin-forbidden">
      <div className="admin-card admin-forbidden__box">
        <h1>No tienes acceso a este módulo</h1>
        <p>Tu rol actual no tiene permisos para entrar a esta sección.</p>
      </div>
    </div>
  )
}

export default AdminForbiddenPage