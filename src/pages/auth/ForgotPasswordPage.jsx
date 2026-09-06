import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { useSettings } from "../../context/SettingsContext"
import { forgotPasswordRequest } from "../../services/api/authService"
import loginBusiness from "../../assets/images/auth/login-business.webp"
import "./loginpage.css"

function ForgotPasswordPage() {
  const { brandName, logoUrl } = useSettings()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const nextEmail = email.trim()

    setError("")
    setMessage("")

    if (!nextEmail) {
      setError("Ingresa tu correo electrónico.")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("Ingresa un correo válido.")
      return
    }

    try {
      setSubmitting(true)
      const response = await forgotPasswordRequest({ email: nextEmail })
      const successMessage =
        response?.message || "Si el correo existe, enviaremos instrucciones para recuperar la contraseña."

      setMessage(successMessage)
      toast.success(successMessage)
    } catch (requestError) {
      const errorMessage =
        requestError?.errors?.email?.[0] ||
        requestError?.message ||
        "No fue posible solicitar la recuperación."

      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-page__content">
        <img loading="lazy"
          src={loginBusiness}
          alt=""
          className="login-page__watermark"
          aria-hidden="true"
        />

        <nav className="login-page__nav login-page__nav--center" aria-label="Navegación de recuperación">
          <Link to="/" className="login-page__brand" aria-label="Ir al inicio">
            {logoUrl ? (
              <img loading="lazy" src={logoUrl} alt={brandName} className="login-page__logo" />
            ) : (
              <span className="login-page__brand-name">{brandName}</span>
            )}
          </Link>
        </nav>

        <div className="login-page__main login-page__main--single">
          <div className="login-page__copy login-page__copy--center">
            <h1 className="login-page__title">Recupera el acceso a tu cuenta</h1>
            <p className="login-page__switch">
              ¿Recordaste tu contraseña? <Link to="/login">Inicia sesión</Link>
            </p>
          </div>

          <div className="login-page__form-panel login-page__form-panel--single">
            <form className="login-form__form" onSubmit={handleSubmit} noValidate>
              {message ? <div className="login-form__alert login-form__alert--success">{message}</div> : null}
              {error ? <div className="login-form__alert">{error}</div> : null}

              <div className={`login-form__field ${error ? "is-error" : ""}`}>
                <label htmlFor="forgot-email" className="login-form__label">
                  Correo electrónico
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  className="login-form__input"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="login-form__actions">
                <button type="submit" className="login-form__submit" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar instrucciones"}
                </button>

                <Link to="/login" className="login-form__signup">
                  Volver al login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForgotPasswordPage
