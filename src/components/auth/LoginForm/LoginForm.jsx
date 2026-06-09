import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useAuth } from "../../../context/AuthContext"
import "./loginform.css"

function LoginForm() {
  const navigate = useNavigate()
  const { login: loginAction } = useAuth()

  const [form, setForm] = useState({
    login: "",
    password: "",
    remember: false,
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const validate = () => {
    const newErrors = {}

    if (!form.login.trim()) {
      newErrors.login = "Ingresa tu correo o usuario."
    }

    if (!form.password.trim()) {
      newErrors.password = "La contraseña es obligatoria."
    }

    return newErrors
  }

  const hasCartItems = () => {
    try {
      const rawCart = localStorage.getItem("cart_items")
      if (!rawCart) return false

      const parsedCart = JSON.parse(rawCart)
      return Array.isArray(parsedCart) && parsedCart.length > 0
    } catch {
      return false
    }
  }

  const resolveRedirect = (response) => {
    const redirectTo = response?.redirect_to || "/"
    const isInternal = Boolean(response?.is_internal)

    if (isInternal) {
      return redirectTo
    }

    if (response?.must_change_password || response?.user?.must_change_password) {
      return "/mi-cuenta/datos"
    }

    if (hasCartItems()) {
      return "/carrito"
    }

    return redirectTo
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    try {
      setIsSubmitting(true)
      setErrors({})

      const response = await loginAction({
        login: form.login.trim(),
        password: form.password,
        device_name: "react-web",
      })

      toast.success("Sesión iniciada correctamente.")

      navigate(resolveRedirect(response), { replace: true })
    } catch (error) {
      console.error("Error de login:", error)

      const newErrors = {}

      if (error?.errors?.login?.[0]) {
        newErrors.general = error.errors.login[0]
      } else if (error?.message) {
        newErrors.general = error.message
      } else {
        newErrors.general = "No fue posible iniciar sesión. Intenta nuevamente."
      }

      setErrors(newErrors)
      toast.error(newErrors.general)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-form">
      <div className="login-form__header">
        <h2 className="login-form__title">Iniciar sesión</h2>
        <p className="login-form__subtitle">
          Accede con tu correo o usuario.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="login-form__form">
        {errors.general ? (
          <div className="login-form__alert">{errors.general}</div>
        ) : null}

        <div className="login-form__field">
          <label htmlFor="login" className="login-form__label">
            Correo o usuario
          </label>
          <input
            id="login"
            name="login"
            type="text"
            className={`login-form__input ${errors.login ? "is-error" : ""}`}
            placeholder="correo@ejemplo.com o usuario123"
            value={form.login}
            onChange={handleChange}
          />
          {errors.login ? (
            <span className="login-form__error">{errors.login}</span>
          ) : null}
        </div>

        <div className="login-form__field">
          <label htmlFor="password" className="login-form__label">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={`login-form__input ${errors.password ? "is-error" : ""}`}
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
          />
          {errors.password ? (
            <span className="login-form__error">{errors.password}</span>
          ) : null}
        </div>

        <div className="login-form__row">
          <label className="login-form__check">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            <span>Recordarme</span>
          </label>

          <Link to="/recuperar-password" className="login-form__link">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          className="login-form__submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="login-form__footer">
        <p>
          ¿Aún no tienes cuenta?{" "}
          <Link to="/registro" className="login-form__link">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginForm
