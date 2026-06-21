import { useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useSettings } from "../../context/SettingsContext"
import { resetPasswordRequest } from "../../services/api/authService"
import loginBusiness from "../../assets/images/auth/login-business.png"
import "./loginpage.css"

const EMPTY_FORM = {
  password: "",
  password_confirmation: "",
}

function ResetPasswordPage() {
  const { brandName, logoUrl } = useSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const query = useMemo(() => {
    const params = new URLSearchParams(location.search)

    return {
      email: params.get("email") || "",
      token: params.get("token") || "",
    }
  }, [location.search])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function validate() {
    const nextErrors = {}

    if (!query.email) nextErrors.general = "El link no incluye un correo válido."
    if (!query.token) nextErrors.general = "El link de recuperación no es válido."
    if (!form.password) {
      nextErrors.password = "La contraseña es obligatoria."
    } else if (form.password.length < 8) {
      nextErrors.password = "Debe tener al menos 8 caracteres."
    }
    if (form.password_confirmation !== form.password) {
      nextErrors.password_confirmation = "Las contraseñas no coinciden."
    }

    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    try {
      setSubmitting(true)
      const response = await resetPasswordRequest({
        email: query.email,
        token: query.token,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })

      toast.success(response?.message || "Contraseña actualizada correctamente.")
      navigate("/login", { replace: true })
    } catch (requestError) {
      const normalizedErrors = normalizeResetErrors(requestError)
      setErrors(normalizedErrors)
      toast.error(normalizedErrors.general || "No fue posible actualizar la contraseña.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-page__content">
        <img
          src={loginBusiness}
          alt=""
          className="login-page__watermark"
          aria-hidden="true"
        />

        <nav className="login-page__nav login-page__nav--center" aria-label="Navegación de restablecimiento">
          <Link to="/" className="login-page__brand" aria-label="Ir al inicio">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="login-page__logo" />
            ) : (
              <span className="login-page__brand-name">{brandName}</span>
            )}
          </Link>
        </nav>

        <div className="login-page__main login-page__main--single">
          <div className="login-page__copy login-page__copy--center">
            <h1 className="login-page__title">Crea una nueva contraseña</h1>
            <p className="login-page__switch">
              Después podrás <Link to="/login">iniciar sesión</Link> con tus nuevos datos.
            </p>
          </div>

          <div className="login-page__form-panel login-page__form-panel--single">
            <form className="login-form__form" onSubmit={handleSubmit} noValidate>
              {errors.general ? <div className="login-form__alert">{errors.general}</div> : null}

              <div className={`login-form__field ${errors.password ? "is-error" : ""}`}>
                <label htmlFor="reset-password" className="login-form__label">
                  Nueva contraseña
                </label>
                <input
                  id="reset-password"
                  name="password"
                  type="password"
                  className="login-form__input"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                {errors.password ? <span className="login-form__error">{errors.password}</span> : null}
              </div>

              <div className={`login-form__field ${errors.password_confirmation ? "is-error" : ""}`}>
                <label htmlFor="reset-password-confirmation" className="login-form__label">
                  Confirmar contraseña
                </label>
                <input
                  id="reset-password-confirmation"
                  name="password_confirmation"
                  type="password"
                  className="login-form__input"
                  placeholder="Repite tu contraseña"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                {errors.password_confirmation ? (
                  <span className="login-form__error">{errors.password_confirmation}</span>
                ) : null}
              </div>

              <div className="login-form__actions">
                <button type="submit" className="login-form__submit" disabled={submitting}>
                  {submitting ? "Guardando..." : "Actualizar contraseña"}
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

function normalizeResetErrors(error) {
  const nextErrors = {}
  const apiErrors = error?.errors || {}

  Object.entries(apiErrors).forEach(([field, messages]) => {
    nextErrors[field] = Array.isArray(messages) ? messages[0] : String(messages)
  })

  if (!Object.keys(nextErrors).length) {
    nextErrors.general = error?.message || "No fue posible actualizar la contraseña."
  }

  return nextErrors
}

export default ResetPasswordPage
