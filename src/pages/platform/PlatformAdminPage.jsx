import { useCallback, useEffect, useMemo, useState } from "react"
import { toast, Toaster } from "sonner"
import {
  getPlatformAdminDashboard,
  getPlatformAdminTenant,
  getPlatformAdminTenants,
  platformAdminLogin,
  platformAdminLogout,
  platformAdminMe,
  updatePlatformAdminTenantSubscription,
} from "../../services/api/platformAdminService"
import {
  clearPlatformAdminSession,
  getPlatformAdminToken,
  getPlatformAdminUser,
  hasPlatformAdminSession,
  setPlatformAdminSession,
} from "../../services/storage/platformAdminStorage"
import "./platform-admin.css"

const INITIAL_LOGIN = {
  login: "",
  password: "",
}

const INITIAL_FILTERS = {
  search: "",
  plan_key: "",
  status: "",
  per_page: 20,
}

const PLAN_OPTIONS = ["free", "basic", "shop", "shop_plus"]
const STATUS_OPTIONS = ["active", "past_due", "suspended", "canceled"]

function PlatformAdminPage() {
  const [sessionReady, setSessionReady] = useState(false)
  const [user, setUser] = useState(getPlatformAdminUser())

  useEffect(() => {
    if (!hasPlatformAdminSession()) {
      setSessionReady(true)
      return
    }

    platformAdminMe()
      .then((response) => {
        const nextUser = response.user || response.data?.user || response.data || getPlatformAdminUser()
        setPlatformAdminSession(response.token || getPlatformAdminToken(), nextUser)
        setUser(nextUser)
      })
      .catch(() => {
        clearPlatformAdminSession()
        setUser(null)
      })
      .finally(() => setSessionReady(true))
  }, [])

  async function handleLogin(payload) {
    const response = await platformAdminLogin(payload)
    const nextUser = response.user || response.data?.user || null

    setPlatformAdminSession(response.token, nextUser)
    setUser(nextUser)
  }

  async function handleLogout() {
    try {
      await platformAdminLogout()
    } catch (error) {
      console.error("Error cerrando sesión platform admin:", error?.data || error)
    } finally {
      clearPlatformAdminSession()
      setUser(null)
    }
  }

  if (!sessionReady) {
    return <div className="platform-admin-loading">Cargando consola...</div>
  }

  return (
    <>
      {user ? (
        <PlatformAdminConsole user={user} onLogout={handleLogout} />
      ) : (
        <PlatformAdminLogin onLogin={handleLogin} />
      )}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  )
}

function PlatformAdminLogin({ onLogin }) {
  const [form, setForm] = useState(INITIAL_LOGIN)
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setLoading(true)
      await onLogin(form)
      toast.success("Sesión iniciada correctamente.")
    } catch (error) {
      toast.error(error?.data?.message || error.message || "No fue posible iniciar sesión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="platform-admin-login">
      <form className="platform-admin-login__card" onSubmit={handleSubmit}>
        <div>
          <span>CloudiShop</span>
          <h1>Platform Admin</h1>
          <p>Consola central para tiendas, suscripciones y pagos.</p>
        </div>

        <label>
          <span>Email o usuario</span>
          <input
            name="login"
            value={form.login}
            onChange={handleChange}
            placeholder="admin@cloudishop.mx"
            autoComplete="username"
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
            placeholder="Password"
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  )
}

function PlatformAdminConsole({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(null)
  const [tenants, setTenants] = useState([])
  const [pagination, setPagination] = useState(null)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [selectedTenantId, setSelectedTenantId] = useState("")
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingTenant, setSavingTenant] = useState(false)

  const stats = useMemo(() => normalizeDashboardStats(dashboard), [dashboard])

  const loadDashboard = useCallback(async () => {
    try {
      const response = await getPlatformAdminDashboard()
      setDashboard(response.data || response)
    } catch (error) {
      toast.error(error?.data?.message || "No fue posible cargar el dashboard.")
    }
  }, [])

  const loadTenants = useCallback(async (nextFilters) => {
    try {
      setLoading(true)
      const response = await getPlatformAdminTenants(nextFilters)
      const data = response.data || response
      const items = data.data || data.tenants || data.items || []

      setTenants(Array.isArray(items) ? items : [])
      setPagination(data.meta || data.pagination || null)
    } catch (error) {
      toast.error(error?.data?.message || "No fue posible cargar tiendas.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
    loadTenants(INITIAL_FILTERS)
  }, [loadDashboard, loadTenants])

  useEffect(() => {
    if (!selectedTenantId) {
      setSelectedTenant(null)
      return
    }

    getPlatformAdminTenant(selectedTenantId)
      .then((response) => setSelectedTenant(response.data || response.tenant || response))
      .catch((error) => {
        toast.error(error?.data?.message || "No fue posible cargar el detalle.")
      })
  }, [selectedTenantId])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function handleFilterSubmit(event) {
    event.preventDefault()
    loadTenants(filters)
  }

  async function handleSubscriptionUpdate(payload) {
    if (!selectedTenantId) return

    try {
      setSavingTenant(true)
      const response = await updatePlatformAdminTenantSubscription(selectedTenantId, payload)

      setSelectedTenant(response.data || response.tenant || response)
      toast.success(response.message || "Suscripción actualizada.")
      loadDashboard()
      loadTenants(filters)
    } catch (error) {
      toast.error(error?.data?.message || "No fue posible actualizar la suscripción.")
    } finally {
      setSavingTenant(false)
    }
  }

  return (
    <main className="platform-admin">
      <header className="platform-admin__topbar">
        <div>
          <span>CloudiShop</span>
          <h1>Platform Admin</h1>
        </div>
        <div className="platform-admin__user">
          <strong>{user?.name || user?.email || "Admin"}</strong>
          <button type="button" onClick={onLogout}>Salir</button>
        </div>
      </header>

      <section className="platform-admin__stats">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="platform-admin__layout">
        <div className="platform-admin__panel">
          <div className="platform-admin__panel-head">
            <div>
              <h2>Tiendas</h2>
              <p>{pagination?.total ? `${pagination.total} registros` : "Clientes CloudiShop"}</p>
            </div>
          </div>

          <form className="platform-admin__filters" onSubmit={handleFilterSubmit}>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar tienda"
            />
            <select name="plan_key" value={filters.plan_key} onChange={handleFilterChange}>
              <option value="">Todos los planes</option>
              {PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
            </select>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button type="submit" disabled={loading}>{loading ? "Buscando..." : "Filtrar"}</button>
          </form>

          <div className="platform-admin__tenant-list">
            {tenants.map((tenant) => {
              const tenantId = getTenantId(tenant)

              return (
                <button
                  type="button"
                  className={selectedTenantId === tenantId ? "is-active" : ""}
                  key={tenantId}
                  onClick={() => setSelectedTenantId(tenantId)}
                >
                  <span>
                    <strong>{tenant.name || tenant.store_name || tenantId}</strong>
                    <small>{tenant.domain || tenant.primary_domain || `${tenantId}.cloudishop.mx`}</small>
                  </span>
                  <em>{tenant.plan_key || tenant.plan?.key || tenant.subscription?.plan_key || "free"}</em>
                </button>
              )
            })}
            {!loading && !tenants.length ? <p className="platform-admin__empty">Sin tiendas para mostrar.</p> : null}
          </div>
        </div>

        <TenantDetailPanel
          tenant={selectedTenant}
          saving={savingTenant}
          onUpdate={handleSubscriptionUpdate}
        />
      </section>
    </main>
  )
}

function TenantDetailPanel({ tenant, saving, onUpdate }) {
  const subscription = tenant?.subscription || tenant?.plan || {}
  const payments = tenant?.subscription_payments || tenant?.payments || tenant?.invoices || []
  const formKey = getTenantId(tenant)

  if (!tenant) {
    return (
      <aside className="platform-admin__panel platform-admin__detail is-empty">
        <h2>Selecciona una tienda</h2>
        <p>Verás plan, estado, Stripe customer/subscription y pagos recientes.</p>
      </aside>
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    onUpdate({
      plan_key: formData.get("plan_key") || undefined,
      status: formData.get("status") || undefined,
      subscription_ends_at: fromDateTimeInput(formData.get("subscription_ends_at")),
    })
  }

  return (
    <aside className="platform-admin__panel platform-admin__detail">
      <div className="platform-admin__panel-head">
        <div>
          <h2>{tenant.name || tenant.store_name || getTenantId(tenant)}</h2>
          <p>{tenant.domain || tenant.primary_domain || "Sin dominio principal"}</p>
        </div>
        <span className="platform-admin__status">{subscription.status || tenant.status || "sin estado"}</span>
      </div>

      <div className="platform-admin__detail-grid">
        <InfoItem label="Tenant" value={getTenantId(tenant)} />
        <InfoItem label="Plan" value={subscription.plan_key || tenant.plan_key || "-"} />
        <InfoItem label="Stripe customer" value={tenant.stripe_customer_id || subscription.stripe_customer_id || "-"} />
        <InfoItem label="Stripe subscription" value={tenant.stripe_subscription_id || subscription.stripe_subscription_id || "-"} />
      </div>

      <form className="platform-admin__subscription-form" onSubmit={handleSubmit} key={formKey}>
        <label>
          <span>Plan</span>
          <select name="plan_key" defaultValue={subscription.plan_key || tenant?.plan_key || ""}>
            <option value="">Sin cambio</option>
            {PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={subscription.status || tenant?.status || ""}>
            <option value="">Sin cambio</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span>Termina en</span>
          <input
            type="datetime-local"
            name="subscription_ends_at"
            defaultValue={toDateTimeInput(subscription.ends_at || tenant?.subscription_ends_at || "")}
          />
        </label>
        <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Actualizar suscripción"}</button>
      </form>

      <div className="platform-admin__payments">
        <h3>Últimos pagos</h3>
        {Array.isArray(payments) && payments.length ? (
          payments.slice(0, 6).map((payment) => (
            <article key={payment.id || payment.stripe_invoice_id || payment.created_at}>
              <span>{payment.stripe_invoice_id || payment.invoice_id || `Pago #${payment.id}`}</span>
              <strong>{formatMoney(payment.amount || payment.amount_paid, payment.currency)}</strong>
              <em>{payment.status || payment.payment_status || "-"}</em>
            </article>
          ))
        ) : (
          <p className="platform-admin__empty">Sin pagos registrados.</p>
        )}
      </div>
    </aside>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="platform-admin__info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function normalizeDashboardStats(dashboard = {}) {
  const source = dashboard?.totals || dashboard?.summary || dashboard || {}

  return [
    { label: "Tenants", value: formatNumber(source.tenants_total || source.total_tenants || source.tenants || 0) },
    { label: "Activos", value: formatNumber(source.active || source.active_tenants || 0) },
    { label: "Vencidos", value: formatNumber(source.past_due || source.expired || 0) },
    { label: "Suspendidos", value: formatNumber(source.suspended || 0) },
    { label: "Cancelados", value: formatNumber(source.canceled || source.cancelled || 0) },
    { label: "Revenue mes", value: formatMoney(source.month_revenue || source.revenue_month || source.monthly_revenue || 0, source.currency) },
  ]
}

function getTenantId(tenant = {}) {
  const source = tenant || {}

  return String(source.tenant_id || source.id || source.key || source.subdomain || "")
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

function formatMoney(value, currency = "MXN") {
  const amount = Number(value || 0)
  const normalizedAmount = amount >= 1000 ? amount / 100 : amount

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: String(currency || "MXN").toUpperCase(),
    minimumFractionDigits: 2,
  }).format(normalizedAmount)
}

function toDateTimeInput(value) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDateTimeInput(value) {
  if (!value) return undefined
  return value.replace("T", " ") + ":00"
}

export default PlatformAdminPage
