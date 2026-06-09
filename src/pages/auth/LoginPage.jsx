import LoginForm from "../../components/auth/LoginForm/LoginForm"
import "./loginpage.css"

function LoginPage() {
  return (
    <section className="login-page">
      <div className="container-main">
        <div className="login-page__wrapper">
          <div className="login-page__panel">
            <div className="login-page__brand">
              <img
                src="https://www.pidefacilraul.com/cms/wp-content/uploads/2020/09/CC-175-PIDEFaCIL-LOGO-HORIZONTAL-e1724443779289.png"
                alt="PideFácil Raúl"
                className="login-page__logo"
              />


              <h1 className="login-page__title">
                Entra a tu cuenta y continúa con tus compras
              </h1>

              <p className="login-page__text">
                Consulta tus pedidos, vuelve a comprar tus productos frecuentes y
                administra tu cuenta desde un solo lugar.
              </p>

              <ul className="login-page__benefits">
                <li>Compra más rápido</li>
                <li>Revisa tus compras</li>
                <li>Guarda tus productos favoritos</li>
              </ul>
            </div>

            <div className="login-page__form-card">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LoginPage