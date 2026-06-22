import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getAccountOrder, getAccountOrders } from "../../services/api/accountService"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import { notifyError } from "../../utils/toast"
import "./account.css"

const INITIAL_FILTERS = {
  search: "",
  status: "",
  payment_status: "",
  from: "",
  to: "",
  sort_by: "latest",
  per_page: 12,
  page: 1,
}

const STATUS_OPTIONS = [
  ["", "Todos"],
  ["pending_payment", "Pendiente"],
  ["paid", "Pagado"],
  ["payment_failed", "Fallido"],
  ["cancelled", "Cancelado"],
]

const PAYMENT_OPTIONS = [
  ["", "Todos los pagos"],
  ["pending", "Pendiente"],
  ["paid", "Pagado"],
  ["failed", "Fallido"],
]

const SORT_OPTIONS = [
  ["latest", "Más recientes"],
  ["oldest", "Más antiguos"],
  ["total_desc", "Total mayor"],
  ["total_asc", "Total menor"],
  ["paid_at_desc", "Pagados recientes"],
]

function AccountOrdersPage() {
  const [orders, setOrders] = useState([])
  const [meta, setMeta] = useState(createEmptyMeta())
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += Number(order.total || 0)
        acc.orders += 1
        if (order.payment_status === "paid") acc.paid += 1
        return acc
      },
      { total: 0, orders: 0, paid: 0 }
    )
  }, [orders])

  const loadOrders = useCallback(async (nextFilters = INITIAL_FILTERS) => {
    try {
      setLoading(true)
      const response = await getAccountOrders(cleanParams(nextFilters))
      setOrders(normalizeOrders(response?.data))
      setMeta(normalizeMeta(response?.meta, nextFilters))
    } catch (error) {
      console.error("Error al cargar pedidos:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar tus pedidos.")
      setOrders([])
      setMeta(createEmptyMeta())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders(filters)
  }, [filters, loadOrders])

  function updateFilter(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: name === "page" ? value : 1,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadOrders(filters)
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
  }

  async function openOrder(order) {
    if (!order?.id) return

    try {
      setDetailLoading(true)
      setSelectedOrder(order)
      const response = await getAccountOrder(order.id)
      setSelectedOrder(normalizeOrderDetail(response?.data ?? response))
    } catch (error) {
      console.error("Error al cargar pedido:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el detalle del pedido.")
    } finally {
      setDetailLoading(false)
    }
  }

  const hasPreviousPage = meta.current_page > 1
  const hasNextPage = meta.current_page < meta.last_page

  return (
    <div className="account_detail_page">
      <div className="account_detail_shell account_orders_shell">
        <nav className="account_detail_breadcrumb" aria-label="Breadcrumb">
          <Link to="/mi-cuenta">Mi cuenta</Link>
          <span>/</span>
          <span>Mis pedidos</span>
        </nav>

        <header className="account_detail_header account_orders_header">
          <div>
            <h1 className="account_detail_title">Mis pedidos</h1>
            <p className="account_detail_text">Consulta tus compras, pagos, productos, beneficios y notas del pedido.</p>
          </div>
        </header>

        <section className="account_orders_summary" aria-label="Resumen de pedidos">
          <div>
            <span>Pedidos</span>
            <strong>{formatNumber(totals.orders)}</strong>
          </div>
          <div>
            <span>Pagados</span>
            <strong>{formatNumber(totals.paid)}</strong>
          </div>
          <div>
            <span>Total del periodo</span>
            <strong>{formatMoney(totals.total)}</strong>
          </div>
        </section>

        <form className="account_orders_filters" onSubmit={handleSubmit}>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Buscar por número de pedido"
          />
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value || "all"} value={value}>{label}</option>
            ))}
          </select>
          <select value={filters.payment_status} onChange={(event) => updateFilter("payment_status", event.target.value)}>
            {PAYMENT_OPTIONS.map(([value, label]) => (
              <option key={value || "all-payments"} value={value}>{label}</option>
            ))}
          </select>
          <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} aria-label="Desde" />
          <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} aria-label="Hasta" />
          <select value={filters.sort_by} onChange={(event) => updateFilter("sort_by", event.target.value)}>
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="submit" className="btn btn_primary" disabled={loading}>Aplicar</button>
          <button type="button" className="btn btn_secondary" onClick={resetFilters} disabled={loading}>Limpiar</button>
        </form>

        <div className="account_orders_layout">
          <section className="account_orders_list" aria-label="Listado de pedidos">
            {loading ? (
              <div className="account_orders_empty">Cargando pedidos...</div>
            ) : orders.length ? (
              orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={`account_order_card ${selectedOrder?.id === order.id ? "is-active" : ""}`}
                  onClick={() => openOrder(order)}
                >
                  <span className="account_order_card__number">{order.number || `#${order.id}`}</span>
                  <span className={`account_order_status account_order_status--${order.payment_status || "default"}`}>
                    {order.payment_status_label || getPaymentLabel(order.payment_status)}
                  </span>
                  <span className="account_order_card__meta">{formatDate(order.created_at)} · {order.items_count} producto(s)</span>
                  <strong>{formatMoney(order.total, order.currency)}</strong>
                </button>
              ))
            ) : (
              <div className="account_orders_empty">No encontramos pedidos con estos filtros.</div>
            )}

            <footer className="account_orders_pagination">
              <span>
                Mostrando {meta.from || 0}-{meta.to || orders.length} de {meta.total || orders.length}
              </span>
              <div>
                <button type="button" className="btn btn_secondary" disabled={!hasPreviousPage || loading} onClick={() => updateFilter("page", meta.current_page - 1)}>
                  Anterior
                </button>
                <strong>{meta.current_page} / {meta.last_page}</strong>
                <button type="button" className="btn btn_secondary" disabled={!hasNextPage || loading} onClick={() => updateFilter("page", meta.current_page + 1)}>
                  Siguiente
                </button>
              </div>
            </footer>
          </section>

          <OrderDetailPanel order={selectedOrder} loading={detailLoading} />
        </div>
      </div>
    </div>
  )
}

function OrderDetailPanel({ order, loading }) {
  if (!order) {
    return (
      <aside className="account_order_detail account_order_detail--empty">
        <strong>Selecciona un pedido</strong>
        <span>Al abrirlo verás productos, dirección, pagos, beneficios y notas.</span>
      </aside>
    )
  }

  const savings = order.savings || {}

  return (
    <aside className="account_order_detail">
      {loading ? <div className="account_orders_loading">Actualizando detalle...</div> : null}

      <header className="account_order_detail__head">
        <div>
          <span>Pedido</span>
          <h2>{order.number || `#${order.id}`}</h2>
        </div>
        <span className={`account_order_status account_order_status--${order.payment_status || "default"}`}>
          {order.payment_status_label || getPaymentLabel(order.payment_status)}
        </span>
      </header>

      <div className="account_order_detail__grid">
        <InfoItem label="Total" value={formatMoney(order.total, order.currency)} strong />
        <InfoItem label="Método" value={order.payment_method || "Sin método"} />
        <InfoItem label="Fecha" value={formatDateTime(order.created_at)} />
        <InfoItem label="Pagado" value={formatDateTime(order.paid_at) || "No registrado"} />
      </div>

      {order.document_notes ? (
        <section className="account_order_section">
          <h3>Notas del pedido</h3>
          <p>{order.document_notes}</p>
        </section>
      ) : null}

      <section className="account_order_section">
        <h3>Dirección de envío</h3>
        <p>{formatAddress(order.shipping_address)}</p>
      </section>

      <section className="account_order_section">
        <h3>Productos</h3>
        <div className="account_order_items">
          {order.items.length ? (
            order.items.map((item) => (
              <article className="account_order_item" key={item.id}>
                <div className="account_order_item__media">
                  {item.image ? <img src={normalizeMediaUrl(item.image)} alt={item.name} /> : <i className="bi bi-box-seam" aria-hidden="true" />}
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{formatSelectedAttributes(item.selected_attributes)}</span>
                  <small>SKU: {item.sku || "N/D"}</small>
                </div>
                <div className="account_order_item__numbers">
                  <span>Cant. {formatNumber(item.quantity)}</span>
                  <span>{formatMoney(item.unit_price, order.currency)}</span>
                  <strong>{formatMoney(item.line_total, order.currency)}</strong>
                </div>
              </article>
            ))
          ) : (
            <p>Este pedido no tiene productos registrados.</p>
          )}
        </div>
      </section>

      <section className="account_order_detail__grid">
        <InfoItem label="Descuento pedido" value={formatMoney(savings.order_discount, order.currency)} />
        <InfoItem label="Cupón" value={formatMoney(savings.coupon_discount, order.currency)} />
        <InfoItem label="Cashback usado" value={formatMoney(savings.cashback_used, order.currency)} />
        <InfoItem label="Cashback ganado" value={formatMoney(savings.cashback_earned, order.currency)} />
      </section>

      <section className="account_order_section">
        <h3>Totales</h3>
        <div className="account_order_totals">
          <InfoRow label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
          <InfoRow label="Descuento" value={formatMoney(order.discount, order.currency)} />
          <InfoRow label="Impuestos" value={formatMoney(order.tax, order.currency)} />
          <InfoRow label="Envío" value={formatMoney(order.shipping, order.currency)} />
          <InfoRow label="Total" value={formatMoney(order.total, order.currency)} strong />
        </div>
      </section>
    </aside>
  )
}

function InfoItem({ label, value, strong = false }) {
  return (
    <div className="account_order_info">
      <span>{label}</span>
      <strong className={strong ? "is-strong" : ""}>{value}</strong>
    </div>
  )
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div className={`account_order_total_row ${strong ? "is-strong" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function normalizeOrders(items = []) {
  return Array.isArray(items) ? items.map(normalizeOrder) : []
}

function normalizeOrder(order = {}) {
  return {
    id: order.id,
    number: order.number || "",
    orden_compra: order.orden_compra || "",
    status: order.status || "",
    status_label: order.status_label || "",
    payment_status: order.payment_status || "",
    payment_status_label: order.payment_status_label || "",
    payment_method: order.payment_method || "",
    currency: order.currency || "mxn",
    items_count: Number(order.items_count || 0),
    items_lines_count: Number(order.items_lines_count || 0),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    tax: Number(order.tax || 0),
    shipping: Number(order.shipping || 0),
    total: Number(order.total || 0),
    document_notes: order.document_notes || "",
    paid_at: order.paid_at || null,
    created_at: order.created_at || null,
    links: order.links || {},
    savings: {},
    shipping_address: {},
    items: [],
    payments: [],
  }
}

function normalizeOrderDetail(order = {}) {
  return {
    ...normalizeOrder(order),
    savings: order.savings || {},
    coupon: order.coupon || null,
    cashback: order.cashback || null,
    shipping_address: order.shipping_address || {},
    items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
    payments: Array.isArray(order.payments) ? order.payments : [],
  }
}

function normalizeOrderItem(item = {}) {
  return {
    id: item.id,
    product_id: item.product_id ?? null,
    sku: item.sku || "",
    name: item.name || "Producto",
    brand: item.brand || "",
    image: item.image || "",
    selected_attributes: Array.isArray(item.selected_attributes) ? item.selected_attributes : [],
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    discount: Number(item.discount || 0),
    line_total: Number(item.line_total || 0),
    promotion: item.promotion || null,
    breakdown: item.breakdown || {},
  }
}

function normalizeMeta(meta = {}, filters = INITIAL_FILTERS) {
  return {
    current_page: Number(meta.current_page || filters.page || 1),
    last_page: Number(meta.last_page || 1),
    per_page: Number(meta.per_page || filters.per_page || 12),
    total: Number(meta.total || 0),
    from: Number(meta.from || 0),
    to: Number(meta.to || 0),
  }
}

function createEmptyMeta() {
  return normalizeMeta()
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  )
}

function formatSelectedAttributes(attributes = []) {
  if (!attributes.length) return "Sin atributos"
  return attributes.map((attribute) => `${attribute.attribute}: ${attribute.value}`).join(" / ")
}

function formatAddress(address = {}) {
  const parts = [
    address.street,
    address.external_number,
    address.internal_number,
    address.neighborhood,
    address.city,
    address.state,
    address.zip_code,
  ].filter(Boolean)

  return parts.join(", ") || address.full_address || "Sin dirección registrada"
}

function getPaymentLabel(status) {
  const labels = {
    pending: "Pendiente",
    paid: "Pagado",
    failed: "Fallido",
  }

  return labels[String(status || "").toLowerCase()] || "Sin pago"
}

function formatMoney(value, currency = "mxn") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: String(currency || "mxn").toUpperCase(),
  }).format(Number(value || 0))
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return "N/D"
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) return ""
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default AccountOrdersPage
