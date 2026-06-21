import { Link, useLocation } from "react-router-dom"
import LoginForm from "../../components/auth/LoginForm/LoginForm"
import { useSettings } from "../../context/SettingsContext"
import { PENDING_CART_RECOVER_URL_KEY } from "../../utils/cartRecovery"
import loginBusiness from "../../assets/images/auth/login-business.png"
import "./loginpage.css"

function LoginPage() {
  const { brandName, logoUrl } = useSettings()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const isRecoveringCart =
    params.get("recover_cart") === "1" ||
    params.get("redirect") === "/carrito/recuperar" ||
    Boolean(localStorage.getItem(PENDING_CART_RECOVER_URL_KEY))

  return (
    <section className="login-page">
      <div className="login-page__content">
        <nav className="login-page__nav" aria-label="Navegación de login">
          <Link to="/" className="login-page__brand" aria-label="Ir al inicio">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="login-page__logo" />
            ) : (
              <span className="login-page__brand-name">{brandName}</span>
            )}
          </Link>

          <div className="login-page__nav-links">
            <Link to="/" className="is-active">Inicio</Link>
            <Link to="/productos">Productos</Link>
            <Link to="/ofertas">Ofertas</Link>
            <Link to="/registro">Registrarse</Link>
          </div>
        </nav>

        <div className="login-page__main login-page__main--register">
          <div className="login-page__register-hero">
            <div className="login-page__copy">
              <h1 className="login-page__title">
                {isRecoveringCart
                  ? "Inicia sesión para recuperar tu carrito"
                  : "Entra y continúa comprando para tu negocio"}
              </h1>
              {isRecoveringCart ? (
                <p className="login-page__text">
                  Después de iniciar sesión activaremos tu carrito abandonado y te llevaremos de vuelta a compra.
                </p>
              ) : null}
              <p className="login-page__switch">
                ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
              </p>
            </div>

            <div className="login-page__illustration-wrap login-page__illustration-wrap--register">
              <img
                src={loginBusiness}
                alt="Persona feliz en su negocio"
                className="login-page__illustration"
              />
            </div>
          </div>

          <div className="login-page__form-panel login-page__form-panel--register">
            {isRecoveringCart ? (
              <div className="login-page__notice" role="status">
                Inicia sesión para recuperar tu carrito.
              </div>
            ) : null}

            <LoginForm />
          </div>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
