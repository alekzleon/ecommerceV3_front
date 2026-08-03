import { useCallback, useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import { getAdminCarts } from "../../../services/api/adminCartService"
import { notifyError } from "../../../utils/toast"
import "./AbandonedCartsPage.css"

const INITIAL_FILTERS = {
  status: "abandoned",
  search: "",
  from: "",
  to: "",
  per_page: 20,
  page: 1,
}

function AbandonedCartsPage() {
  const [carts, setCarts] = useState([])
  const [meta, setMeta] = useState(createEmptyMeta())
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [loading, setLoading] = useState(true)

  const summary = useMemo(() => buildSummary(carts, meta), [carts, meta])
  const hasNextPage = meta.current_page < meta.last_page
  const hasPreviousPage = meta.current_page > 1

  const loadCarts = useCallback(async (nextFilters = INITIAL_FILTERS) => {
    try {
      setLoading(true)
      const response = await getAdminCarts(cleanParams(nextFilters))
      const pagination = normalizePagination(response?.data, nextFilters)

      setCarts(pagination.items)
      setMeta(pagination.meta)
    } catch (error) {
      console.error("Error al cargar carritos abandonados:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los carritos abandonados.")
      setCarts([])
      setMeta(createEmptyMeta())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCarts(filters)
  }, [filters, loadCarts])

  function updateFilter(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: name === "page" ? Number(value) : 1,
    }))
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
  }

  return (
    <AdminCard
      title="Carritos abandonados"
      subtitle="Consulta carritos pendientes de recuperación, cliente, monto y seguimiento de notificaciones."
      right={
        <button type="button" className="abandoned-carts-button abandoned-carts-button--secondary" onClick={() => loadCarts(filters)}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          Actualizar
        </button>
      }
    >
      <div className="abandoned-carts-page">
        <section className="abandoned-carts-page__summary" aria-label="Resumen de carritos abandonados">
          <SummaryCard label="Carritos" value={formatNumber(summary.totalCarts)} />
          <SummaryCard label="Monto en riesgo" value={formatMoney(summary.totalAmount)} />
          <SummaryCard label="Email enviado" value={formatNumber(summary.emailSent)} />
          <SummaryCard label="Recuperados" value={formatNumber(summary.recovered)} />
        </section>

        <section className="abandoned-carts-page__filters" aria-label="Filtros de carritos abandonados">
          <label className="abandoned-carts-page__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Buscar cliente o correo"
            />
          </label>

          <input
            type="date"
            value={filters.from}
            onChange={(event) => updateFilter("from", event.target.value)}
            aria-label="Desde"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => updateFilter("to", event.target.value)}
            aria-label="Hasta"
          />

          <select value={filters.per_page} onChange={(event) => updateFilter("per_page", event.target.value)}>
            {[10, 20, 30, 50].map((value) => (
              <option key={value} value={value}>{value} por página</option>
            ))}
          </select>

          <button type="button" className="abandoned-carts-button abandoned-carts-button--ghost" onClick={resetFilters}>
            Limpiar
          </button>
        </section>

        <div className="abandoned-carts-page__table-wrapper">
          <table className="abandoned-carts-page__table">
            <thead>
              <tr>
                <th>Carrito</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Última actividad</th>
                <th>Abandonado</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="abandoned-carts-page__empty">Cargando carritos abandonados...</td>
                </tr>
              ) : carts.length ? (
                carts.map((cart) => (
                  <tr key={cart.id}>
                    <td>
                      <div className="abandoned-carts-page__main-cell">
                        <strong>#{cart.id}</strong>
                        <span>{translateCartStatus(cart.status)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="abandoned-carts-page__main-cell">
                        <strong>{cart.customer.name || "Cliente invitado"}</strong>
                        <span>{cart.customer.email || "Sin correo"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="abandoned-carts-page__main-cell">
                        <strong>{formatNumber(cart.items_count)} producto(s)</strong>
                        <span>{formatNumber(cart.items_rows_count)} SKU(s)</span>
                      </div>
                    </td>
                    <td>
                      <strong>{formatMoney(cart.total)}</strong>
                    </td>
                    <td>{formatDateTime(cart.last_activity_at)}</td>
                    <td>{formatDateTime(cart.abandoned_at)}</td>
                    <td>
                      <TrackingBadges tracking={cart.tracking} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="abandoned-carts-page__empty">No hay carritos abandonados con estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="abandoned-carts-page__pagination">
          <span>
            Mostrando {meta.from || 0}-{meta.to || carts.length} de {meta.total || carts.length}
          </span>
          <div>
            <button
              type="button"
              className="abandoned-carts-button abandoned-carts-button--secondary"
              disabled={!hasPreviousPage || loading}
              onClick={() => updateFilter("page", meta.current_page - 1)}
            >
              Anterior
            </button>
            <strong>Página {meta.current_page} de {meta.last_page}</strong>
            <button
              type="button"
              className="abandoned-carts-button abandoned-carts-button--secondary"
              disabled={!hasNextPage || loading}
              onClick={() => updateFilter("page", meta.current_page + 1)}
            >
              Siguiente
            </button>
          </div>
        </footer>
      </div>
    </AdminCard>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function TrackingBadges({ tracking = {} }) {
  return (
    <div className="abandoned-carts-tracking">
      <StatusBadge active={Boolean(tracking.abandoned_email_sent_at)} label="Email" />
      <StatusBadge active={Boolean(tracking.abandoned_whatsapp_sent_at)} label="WhatsApp" />
      <StatusBadge active={Boolean(tracking.recovered_at)} label="Recuperado" tone="success" />
    </div>
  )
}

function StatusBadge({ active, label, tone = "default" }) {
  const className = [
    "abandoned-carts-badge",
    active ? "is-active" : "is-muted",
    tone === "success" ? "is-success" : "",
  ].filter(Boolean).join(" ")

  return (
    <span className={className}>
      <i className={`bi ${active ? "bi-check-circle-fill" : "bi-clock"}`} aria-hidden="true" />
      {label}
    </span>
  )
}

function normalizePagination(payload = {}, filters = INITIAL_FILTERS) {
  const items = Array.isArray(payload?.data) ? payload.data.map(normalizeCart) : []

  return {
    items,
    meta: {
      current_page: Number(payload.current_page || filters.page || 1),
      last_page: Number(payload.last_page || 1),
      per_page: Number(payload.per_page || filters.per_page || 20),
      total: Number(payload.total || items.length),
      from: Number(payload.from || (items.length ? 1 : 0)),
      to: Number(payload.to || items.length),
      next_page_url: payload.next_page_url || null,
      prev_page_url: payload.prev_page_url || null,
    },
  }
}

function normalizeCart(item = {}) {
  return {
    id: item.id,
    status: item.status || "abandoned",
    customer: {
      id: item.customer?.id ?? null,
      name: item.customer?.name || "",
      email: item.customer?.email || "",
    },
    items_count: Number(item.items_count ?? 0),
    items_rows_count: Number(item.items_rows_count ?? 0),
    subtotal: Number(item.subtotal ?? 0),
    discount: Number(item.discount ?? 0),
    tax: Number(item.tax ?? 0),
    total: Number(item.total ?? 0),
    last_activity_at: item.last_activity_at || null,
    abandoned_at: item.abandoned_at || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    tracking: item.tracking || {},
  }
}

function buildSummary(items = [], meta = {}) {
  return {
    totalCarts: meta.total || items.length,
    totalAmount: items.reduce((total, item) => total + Number(item.total || 0), 0),
    emailSent: items.filter((item) => item.tracking?.abandoned_email_sent_at).length,
    recovered: items.filter((item) => item.tracking?.recovered_at).length,
  }
}

function createEmptyMeta() {
  return {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
    next_page_url: null,
    prev_page_url: null,
  }
}

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  )
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function translateCartStatus(status) {
  const map = {
    abandoned: "Abandonado",
    active: "Activo",
    recovered: "Recuperado",
    converted: "Convertido",
  }

  return map[String(status || "").toLowerCase()] || status || "Sin estatus"
}

export default AbandonedCartsPage
