import { useEffect, useMemo, useState } from "react"
import { Toaster, toast } from "sonner"
import {
  checkTenantSubdomain,
  createTenant,
} from "../../services/api/platformTenantService"
import { CloudiShopMarketingHome } from "../public/HomePage"
import "./platform-tenant-create.css"

const INITIAL_FORM = {
  store_name: "",
  subdomain: "",
  owner_name: "",
  owner_email: "",
  password: "",
  publish: false,
}

const PROVISION_STEPS = [
  "Creando tu tienda...",
  "Preparando base de datos...",
  "Configurando dominio...",
  "Creando administrador...",
]

const CREATE_STORE_PATH = "/crea-tu-tienda"
const PLATFORM_LOGO_SRC = "/platform/cloudishop-logo.png"

function PlatformTenantCreatePage() {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/"

  if (normalizedPathname !== CREATE_STORE_PATH) {
    return <PlatformLandingPage />
  }

  return <PlatformTenantCreateForm />
}

function PlatformLandingPage() {
  return <CloudiShopMarketingHome createStorePath={CREATE_STORE_PATH} loginPath="/platform/admin" />
}

function PlatformTenantCreateForm() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [subdomainStatus, setSubdomainStatus] = useState(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)
  const [creating, setCreating] = useState(false)
  const [provisionStep, setProvisionStep] = useState("")

  const normalizedSubdomain = useMemo(
    () => normalizeSubdomain(form.subdomain),
    [form.subdomain]
  )

  const canSubmit =
    form.store_name.trim() &&
    normalizedSubdomain &&
    form.owner_name.trim() &&
    form.owner_email.trim() &&
    form.password.length >= 8 &&
    subdomainStatus?.available &&
    !creating

  useEffect(() => {
    setForm((current) => {
      const nextSubdomain = normalizeSubdomain(current.subdomain)
      if (nextSubdomain === current.subdomain) return current

      return {
        ...current,
        subdomain: nextSubdomain,
      }
    })
  }, [form.subdomain])

  useEffect(() => {
    if (!normalizedSubdomain || normalizedSubdomain.length < 3) {
      setSubdomainStatus(null)
      return undefined
    }

    let isActive = true
    const timer = window.setTimeout(async () => {
      try {
        setCheckingSubdomain(true)
        const response = await checkTenantSubdomain(normalizedSubdomain)

        if (isActive) {
          setSubdomainStatus(response?.data || null)
        }
      } catch (error) {
        if (isActive) {
          setSubdomainStatus({
            subdomain: normalizedSubdomain,
            valid: false,
            available: false,
            message: error?.data?.message || error.message,
          })
        }
      } finally {
        if (isActive) {
          setCheckingSubdomain(false)
        }
      }
    }, 450)

    return () => {
      isActive = false
      window.clearTimeout(timer)
    }
  }, [normalizedSubdomain])

  useEffect(() => {
    if (!creating) {
      setProvisionStep("")
      return undefined
    }

    let stepIndex = 0
    setProvisionStep(PROVISION_STEPS[stepIndex])

    const timer = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, PROVISION_STEPS.length - 1)
      setProvisionStep(PROVISION_STEPS[stepIndex])
    }, 1200)

    return () => window.clearInterval(timer)
  }, [creating])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) {
      toast.error("Completa los datos y elige un subdominio disponible.")
      return
    }

    try {
      setCreating(true)
      const response = await createTenant({
        store_name: form.store_name.trim(),
        subdomain: normalizedSubdomain,
        owner_name: form.owner_name.trim(),
        owner_email: form.owner_email.trim(),
        password: form.password,
        publish: Boolean(form.publish),
      })
      const redirectUrl = getLoginRedirectUrl(response?.data?.urls)

      toast.success(response?.message || "Tienda creada correctamente.")

      if (redirectUrl) {
        window.location.assign(redirectUrl)
      }
    } catch (error) {
      const errors = error?.data?.errors || {}
      const firstError = Object.values(errors).flat()[0]
      toast.error(firstError || error?.data?.message || error.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="platform-create">
      <header className="platform-create__topbar">
        <a className="platform-brand" href="/" aria-label="Volver a CloudiShop">
          <PlatformLogo />
        </a>
        <a href="/">Volver</a>
      </header>

      <section className="platform-create__panel">
        <div className="platform-create__intro">
          <PlatformLogo compact />
          <h1>Crea tu tienda en minutos</h1>
          <p>
            Elige tu subdominio, registra al administrador y prepara la base de
            tu ecommerce.
          </p>
        </div>

        <form className="platform-create__form" onSubmit={handleSubmit}>
          <label>
            <span>Nombre de la tienda</span>
            <input
              name="store_name"
              value={form.store_name}
              onChange={handleChange}
              placeholder="Joyas MX"
              disabled={creating}
              required
            />
          </label>

          <label>
            <span>Subdominio</span>
            <div className="platform-create__subdomain">
              <input
                name="subdomain"
                value={form.subdomain}
                onChange={handleChange}
                placeholder="joyas"
                disabled={creating}
                required
              />
              <strong>.cloudishop.mx</strong>
            </div>
          </label>

          <SubdomainStatus
            checking={checkingSubdomain}
            status={subdomainStatus}
            subdomain={normalizedSubdomain}
          />

          <label>
            <span>Nombre del administrador</span>
            <input
              name="owner_name"
              value={form.owner_name}
              onChange={handleChange}
              placeholder="Juan Perez"
              disabled={creating}
              required
            />
          </label>

          <label>
            <span>Email del administrador</span>
            <input
              type="email"
              name="owner_email"
              value={form.owner_email}
              onChange={handleChange}
              placeholder="juan@example.com"
              disabled={creating}
              required
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              disabled={creating}
              minLength={8}
              required
            />
          </label>

          <label className="platform-create__switch">
            <input
              type="checkbox"
              name="publish"
              checked={form.publish}
              onChange={handleChange}
              disabled={creating}
            />
            <span>Publicar la tienda al terminar</span>
          </label>

          {creating ? (
            <div className="platform-create__progress" role="status">
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              <span>{provisionStep}</span>
            </div>
          ) : null}

          <button type="submit" disabled={!canSubmit}>
            {creating ? "Creando tienda..." : "Crear tienda"}
          </button>
        </form>
      </section>

      <Toaster position="bottom-right" richColors closeButton />
    </main>
  )
}

function PlatformLogo({ compact = false }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (imageFailed) {
    return <span className="platform-brand__fallback">CloudiShop</span>
  }

  return (
    <img loading="lazy"
      className={compact ? "platform-brand__logo is-compact" : "platform-brand__logo"}
      src={PLATFORM_LOGO_SRC}
      alt="CloudiShop"
      onError={() => setImageFailed(true)}
    />
  )
}

function SubdomainStatus({ checking, status, subdomain }) {
  if (!subdomain || subdomain.length < 3) {
    return (
      <p className="platform-create__hint">
        Usa al menos 3 caracteres. Solo letras, números y guiones.
      </p>
    )
  }

  if (checking) {
    return <p className="platform-create__hint">Validando disponibilidad...</p>
  }

  if (!status) return null

  if (status.available) {
    return (
      <div className="platform-create__status is-success">
        <strong>Subdominio disponible</strong>
      </div>
    )
  }

  return (
    <div className="platform-create__status is-error">
      <strong>No disponible</strong>
      <span>{status.message || "Elige otro subdominio."}</span>
    </div>
  )
}

function normalizeSubdomain(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function getLoginRedirectUrl(urls = {}) {
  const hostname = typeof window === "undefined" ? "" : window.location.hostname
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1"

  return isLocal ? urls.local_login : urls.production_login
}

export default PlatformTenantCreatePage
