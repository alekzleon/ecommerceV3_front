import { Link } from "react-router-dom"
import RegisterForm from "../../components/auth/RegisterForm/RegisterForm"
import { useSettings } from "../../context/SettingsContext"
import loginBusiness from "../../assets/images/auth/login-business.png"
import "./loginpage.css"

function RegisterPage() {
  const { brandName, logoUrl } = useSettings()

  return (
    <section className="login-page">
      <div className="login-page__content">
        <div className="login-page__left">
          <div className="login-page__inner login-page__inner--register">
            <Link to="/" className="login-page__brand" aria-label="Ir al inicio">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="login-page__logo" />
              ) : (
                <span className="login-page__brand-name">{brandName}</span>
              )}
            </Link>

            <div className="login-page__copy login-page__copy--register">
              <h1 className="login-page__title">
                Crea tu cuenta y compra más rápido para tu negocio
              </h1>
              <p className="login-page__text">
                Regístrate como cliente para guardar tus datos, consultar pedidos
                y acceder a tus compras frecuentes.
              </p>
            </div>

            <RegisterForm />
          </div>
        </div>

        <div className="login-page__right">
          <nav className="login-page__nav" aria-label="Navegación de registro">
            <Link to="/">Inicio</Link>
            <Link to="/productos">Productos</Link>
            <Link to="/ofertas">Ofertas</Link>
            <Link to="/login" className="is-active">Iniciar sesión</Link>
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

export default RegisterPage
