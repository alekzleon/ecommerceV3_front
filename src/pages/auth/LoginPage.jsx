import { Link } from "react-router-dom"
import LoginForm from "../../components/auth/LoginForm/LoginForm"
import { useSettings } from "../../context/SettingsContext"
import loginBusiness from "../../assets/images/auth/login-business.png"
import "./loginpage.css"

function LoginPage() {
  const { brandName, logoUrl } = useSettings()

  return (
    <section className="login-page">
      <div className="login-page__content">
        <div className="login-page__left">
          <div className="login-page__inner">
            <Link to="/" className="login-page__brand" aria-label="Ir al inicio">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="login-page__logo" />
              ) : (
                <span className="login-page__brand-name">{brandName}</span>
              )}
            </Link>

            <div className="login-page__copy">
              <h1 className="login-page__title">
                Entra a tu cuenta y continúa comprando para tu negocio
              </h1>
              <p className="login-page__text">
                Bienvenido de vuelta. Inicia sesión para revisar tus pedidos,
                favoritos y compras frecuentes.
              </p>
            </div>

            <LoginForm />
          </div>
        </div>

        <div className="login-page__right">
          <nav className="login-page__nav" aria-label="Navegación de login">
            <Link to="/" className="is-active">Inicio</Link>
            <Link to="/productos">Productos</Link>
            <Link to="/ofertas">Ofertas</Link>
            <Link to="/registro">Registrarse</Link>
          </nav>

          <div className="login-page__illustration-wrap">
            <img
              src={loginBusiness}
              alt="Persona feliz en su negocio"
              className="login-page__illustration"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
