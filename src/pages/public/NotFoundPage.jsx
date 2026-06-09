import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div>
      <h1>404</h1>
      <p>La página que buscas no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  )
}

export default NotFoundPage