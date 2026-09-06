import { useCallback, useEffect, useMemo, useState } from "react"
import { getAdminDashboard } from "../../../services/api/adminDashboardService"
import { notifyError } from "../../../utils/toast"
import "./DashboardPage.css"

const QUICK_RANGES = [
  { key: "today", label: "Hoy", days: 1 },
  { key: "7d", label: "Últimos 7 días", days: 7 },
  { key: "30d", label: "Últimos 30 días", days: 30 },
]

const EMPTY_DASHBOARD = {
  filters: getDefaultFilters(),
  summary: {
    sales: 0,
    orders: 0,
    average_order_value: 0,
    discounts: 0,
    customers_total: 0,
    customers_new: 0,
    customers_with_purchase: 0,
    products_total: 0,
    products_active: 0,
    pending_orders: 0,
    abandoned_carts: 0,
    recovered_carts: 0,
    cashback_earned: 0,
    cashback_redeemed: 0,
    cashback_available_balance: 0,
    estimated_customer_savings: 0,
  },
  charts: {
    sales_by_day: [],
    orders_by_status: [],
    cashback_by_day: [],
    cart_funnel: [],
  },
  tables: {
    top_products: [],
    best_selling_products: [],
    least_selling_products: [],
    low_stock_products: [],
    recent_orders: [],
  },
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [filters, setFilters] = useState(getDefaultFilters)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const summaryCards = useMemo(() => buildSummaryCards(dashboard.summary), [dashboard.summary])
  const activeQuickRange = useMemo(() => getActiveQuickRange(filters), [filters])

  const loadDashboard = useCallback(async (nextFilters) => {
    try {
      setRefreshing(true)
      const dashboardResponse = await getAdminDashboard(nextFilters)
      const normalizedDashboard = normalizeDashboardResponse(dashboardResponse)
      setDashboard(normalizedDashboard)
      setFilters(normalizedDashboard.filters)
    } catch (error) {
      console.error("Error cargando dashboard:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el dashboard.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard(getDefaultFilters())
  }, [loadDashboard])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadDashboard(filters)
  }

  function applyQuickRange(range) {
    const nextFilters = getRangeFilters(range.days)
    setFilters(nextFilters)
    loadDashboard(nextFilters)
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen comercial, clientes, carritos, cashback y pedidos recientes.</p>
        </div>

        <form className="dashboard-filters" onSubmit={handleSubmit}>
          <div className="dashboard-filters__quick" aria-label="Accesos rápidos de periodo">
            {QUICK_RANGES.map((range) => (
              <button
                key={range.key}
                type="button"
                className={activeQuickRange === range.key ? "is-active" : ""}
                onClick={() => applyQuickRange(range)}
                disabled={refreshing}
              >
                {range.label}
              </button>
            ))}
            <span className={!activeQuickRange ? "is-active" : ""}>Personalizado</span>
          </div>

          <label>
            <span>Desde</span>
            <input type="date" name="from" value={filters.from} onChange={handleFilterChange} />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" name="to" value={filters.to} onChange={handleFilterChange} />
          </label>
          <button type="submit" disabled={refreshing}>
            {refreshing ? "Actualizando..." : "Aplicar"}
          </button>
        </form>
      </header>

      <section className="dashboard-page__kpis">
        {summaryCards.map((item) => (
          <article className="dashboard-widget dashboard-widget--kpi" key={item.title}>
            <div className={`dashboard-widget__badge ${item.color}`}>
              <i className={`bi ${item.icon}`} aria-hidden="true" />
            </div>

            <div className="dashboard-widget__kpi-content">
              <p className="dashboard-widget__label">{item.title}</p>
              <h3 className="dashboard-widget__amount">{item.value}</h3>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-page__middle">
        <article className="dashboard-widget dashboard-widget--chart">
          <WidgetHeader
            title="Ventas por día"
            description={`${formatDate(dashboard.filters.from)} - ${formatDate(dashboard.filters.to)}`}
          />
          <SalesByDayChart items={dashboard.charts.sales_by_day} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--chart">
          <WidgetHeader title="Pedidos por estatus" description="Conteo y total por estado" />
          <OrdersStatusChart items={dashboard.charts.orders_by_status} loading={loading} />
        </article>
      </section>

      <section className="dashboard-page__middle">
        <article className="dashboard-widget dashboard-widget--chart">
          <WidgetHeader title="Cashback por día" description="Generado contra redimido" />
          <CashbackChart items={dashboard.charts.cashback_by_day} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--chart">
          <WidgetHeader title="Carritos" description="Activos y abandonados" />
          <CartFunnel items={dashboard.charts.cart_funnel} loading={loading} />
        </article>
      </section>

      <section className="dashboard-page__bottom">
        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Productos más vendidos" description="Top por cantidad e ingresos" />
          <ProductsSalesTable items={dashboard.tables.best_selling_products} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Productos menos vendidos" description="Productos con menor movimiento en el periodo" />
          <ProductsSalesTable
            items={dashboard.tables.least_selling_products}
            loading={loading}
            emptyText="Sin productos con ventas bajas en el periodo."
          />
        </article>
      </section>

      <section className="dashboard-page__bottom">
        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Menor stock" description="Stock actual con ventas del periodo como contexto" />
          <LowStockTable items={dashboard.tables.low_stock_products} loading={loading} />
        </article>

        <article className="dashboard-widget dashboard-widget--table">
          <WidgetHeader title="Pedidos recientes" description="Últimos movimientos del periodo" />
          <RecentOrdersTable items={dashboard.tables.recent_orders} loading={loading} />
        </article>
      </section>
    </div>
  )
}

function WidgetHeader({ title, description }) {
  return (
    <div className="dashboard-widget__header">
      <div>
        <h3 className="dashboard-widget__title">{title}</h3>
        {description ? <p className="dashboard-widget__description">{description}</p> : null}
      </div>
    </div>
  )
}

function SalesByDayChart({ items, loading }) {
  const [activePoint, setActivePoint] = useState(null)

  if (loading) return <ChartSkeleton />

  if (!items.length) return <EmptyState text="Sin ventas en el periodo." />

  const chart = buildLineChart(items)
  const lastItem = items[items.length - 1]
  const bestItem = items.reduce((best, item) => (item.sales > best.sales ? item : best), items[0])
  const showEvery = Math.max(Math.ceil(items.length / 7), 1)

  return (
    <div className="dashboard-line-card">
      <div className="dashboard-line-card__summary">
        <div>
          <span>Total del periodo</span>
          <strong>{formatMoney(chart.totalSales)}</strong>
        </div>
        <div>
          <span>Mejor día</span>
          <strong>{formatMoney(bestItem.sales)}</strong>
          <small>{formatShortDate(bestItem.date)}</small>
        </div>
        <div>
          <span>Último día</span>
          <strong>{formatMoney(lastItem.sales)}</strong>
          <small>{formatShortDate(lastItem.date)}</small>
        </div>
      </div>

      <div className="dashboard-line-chart__legend">
        <span aria-hidden="true" />
        <strong>Ventas por día</strong>
      </div>

      <div className="dashboard-line-chart">
        <div className="dashboard-line-chart__scale" aria-hidden="true">
          {chart.ticks.map((tick) => (
            <span key={tick}>{formatCompactMoney(tick)}</span>
          ))}
        </div>

        <div className="dashboard-line-chart__canvas" onMouseLeave={() => setActivePoint(null)}>
          <svg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" role="img" aria-label="Ventas por día">
            {chart.gridLines.map((line) => (
              <line
                key={`h-${line}`}
                className="dashboard-line-chart__grid dashboard-line-chart__grid--horizontal"
                x1={chart.paddingX}
                x2={chart.width - chart.paddingX}
                y1={line}
                y2={line}
              />
            ))}
            {chart.verticalGridLines.map((line) => (
              <line
                key={`v-${line}`}
                className="dashboard-line-chart__grid dashboard-line-chart__grid--vertical"
                x1={line}
                x2={line}
                y1={chart.paddingTop}
                y2={chart.bottomY}
              />
            ))}
            {activePoint ? (
              <line
                className="dashboard-line-chart__cursor-line"
                x1={activePoint.x}
                x2={activePoint.x}
                y1={chart.paddingTop}
                y2={chart.bottomY}
              />
            ) : null}
            <path className="dashboard-line-chart__line" d={chart.linePath} />
            {chart.points.map((point) => (
              <g
                key={point.date}
                className="dashboard-line-chart__point-group"
                onMouseEnter={() => setActivePoint(point)}
                onFocus={() => setActivePoint(point)}
                onBlur={() => setActivePoint(null)}
                tabIndex={0}
              >
                <circle className="dashboard-line-chart__point-halo" cx={point.x} cy={point.y} r="10" />
                <circle
                  className={`dashboard-line-chart__point ${
                    activePoint?.date === point.date ? "is-active" : ""
                  }`}
                  cx={point.x}
                  cy={point.y}
                  r="6"
                >
                  <title>{`${formatDate(point.date)}: ${formatMoney(point.sales)}`}</title>
                </circle>
                <circle className="dashboard-line-chart__hit-area" cx={point.x} cy={point.y} r="16" />
              </g>
            ))}
          </svg>

          {activePoint ? (
            <div
              className={`dashboard-line-chart__tooltip ${
                activePoint.svgPercentX > 68 ? "is-left" : ""
              } ${
                activePoint.svgPercentY < 34 ? "is-below" : ""
              } ${
                activePoint.svgPercentY > 70 ? "is-above" : ""
              }`}
              style={{
                left: `${activePoint.svgPercentX}%`,
                top: `${activePoint.svgPercentY}%`,
              }}
            >
              <strong>{formatShortDate(activePoint.date)}</strong>
              <span>
                <i aria-hidden="true" />
                <em>Ventas</em>
                <b>{formatMoney(activePoint.sales)}</b>
              </span>
            </div>
          ) : null}

          <div className="dashboard-line-chart__labels">
            {items.map((item, index) => (
              index % showEvery === 0 || index === items.length - 1 ? (
                <span key={item.date} style={{ left: `${chart.points[index]?.percentX || 0}%` }}>
                  {formatShortDate(item.date)}
                </span>
              ) : null
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function OrdersStatusChart({ items, loading }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)

  if (loading) return <ChartSkeleton />
  if (!items.length) return <EmptyState text="Sin pedidos por estatus." />

  return (
    <div className="dashboard-list-chart">
      {items.map((item) => (
        <div className="dashboard-list-chart__item" key={item.status}>
          <div className="dashboard-list-chart__meta">
            <strong>{translateStatus(item.status)}</strong>
            <span>{item.count} pedidos · {formatMoney(item.total)}</span>
          </div>
          <div className="dashboard-list-chart__track">
            <span style={{ width: `${Math.max((item.count / maxCount) * 100, 4)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CashbackChart({ items, loading }) {
  const maxValue = Math.max(...items.map((item) => Math.max(item.earned, item.redeemed)), 1)

  if (loading) return <ChartSkeleton />
  if (!items.length) return <EmptyState text="Sin movimientos de cashback." />

  return (
    <div className="dashboard-chart dashboard-chart--cashback">
      {items.map((item) => (
        <div className="dashboard-chart__day" key={item.date}>
          <div className="dashboard-chart__bar-pair">
            <span
              className="dashboard-chart__bar is-earned"
              style={{ height: `${Math.max((item.earned / maxValue) * 100, item.earned ? 5 : 0)}%` }}
              title={`Generado: ${formatMoney(item.earned)}`}
            />
            <span
              className="dashboard-chart__bar is-redeemed"
              style={{ height: `${Math.max((item.redeemed / maxValue) * 100, item.redeemed ? 5 : 0)}%` }}
              title={`Redimido: ${formatMoney(item.redeemed)}`}
            />
          </div>
          <small>{formatShortDate(item.date)}</small>
        </div>
      ))}
    </div>
  )
}

function CartFunnel({ items, loading }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)

  if (loading) return <ChartSkeleton />
  if (!items.length) return <EmptyState text="Sin datos de carritos." />

  return (
    <div className="dashboard-funnel">
      {items.map((item) => (
        <div className="dashboard-funnel__item" key={item.status}>
          <div>
            <strong>{translateCartStatus(item.status)}</strong>
            <span>{item.count}</span>
          </div>
          <div className="dashboard-funnel__track">
            <span style={{ width: `${Math.max((item.count / maxCount) * 100, 8)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductsSalesTable({
  items,
  loading,
  emptyText = "Sin productos vendidos en el periodo.",
}) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text={emptyText} />

  return (
    <div className="dashboard-table dashboard-table--products">
      <div className="dashboard-table__head">
        <span>Producto</span>
        <span>SKU</span>
        <span>Cantidad</span>
        <span>Ingresos</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item, index) => (
          <div className="dashboard-table__row" key={`${item.product_id || "product"}-${index}`}>
            <strong>{item.name}</strong>
            <span>{item.sku || "-"}</span>
            <span>{formatNumber(item.quantity)}</span>
            <span>{formatMoney(item.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LowStockTable({ items, loading }) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text="Sin productos con stock bajo." />

  return (
    <div className="dashboard-table dashboard-table--stock">
      <div className="dashboard-table__head">
        <span>Producto</span>
        <span>SKU</span>
        <span>Stock</span>
        <span>Vendido</span>
        <span>Ingresos</span>
        <span>Activo</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item, index) => (
          <div className="dashboard-table__row" key={`${item.product_id || "stock"}-${index}`}>
            <strong>{item.name}</strong>
            <span>{item.sku || "-"}</span>
            <span className={item.stock <= 0 ? "dashboard-stock is-empty" : "dashboard-stock"}>
              {formatNumber(item.stock)}
            </span>
            <span>{formatNumber(item.quantity_sold)}</span>
            <span>{formatMoney(item.revenue)}</span>
            <span className={`dashboard-status ${item.is_active ? "is-paid" : "is-pending"}`}>
              {item.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentOrdersTable({ items, loading }) {
  if (loading) return <TableSkeleton rows={5} />
  if (!items.length) return <EmptyState text="Sin pedidos recientes." />

  return (
    <div className="dashboard-table dashboard-table--orders">
      <div className="dashboard-table__head">
        <span>Pedido</span>
        <span>Cliente</span>
        <span>Estatus</span>
        <span>Total</span>
        <span>Fecha</span>
      </div>
      <div className="dashboard-table__body">
        {items.map((item) => (
          <div className="dashboard-table__row" key={item.id}>
            <strong>{item.number}</strong>
            <span>{item.customer?.name || item.customer?.email || "Cliente sin nombre"}</span>
            <span className={`dashboard-status ${item.status === "paid" ? "is-paid" : "is-pending"}`}>
              {translateStatus(item.status)}
            </span>
            <span>{formatMoney(item.total)}</span>
            <span>{formatDateTime(item.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="dashboard-skeleton-chart" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

function TableSkeleton({ rows = 4 }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

function EmptyState({ text }) {
  return <div className="dashboard-empty">{text}</div>
}

function buildSummaryCards(summary) {
  return [
    {
      title: "Ventas",
      value: formatMoney(summary.sales),
      icon: "bi-cash-coin",
      color: "is-blue",
    },
    {
      title: "Pedidos",
      value: formatNumber(summary.orders),
      icon: "bi-receipt",
      color: "is-cyan",
    },
    {
      title: "Ticket promedio",
      value: formatMoney(summary.average_order_value),
      icon: "bi-graph-up-arrow",
      color: "is-green",
    },
    {
      title: "Clientes",
      value: formatNumber(summary.customers_total),
      icon: "bi-people",
      color: "is-purple",
    },
    {
      title: "Ahorro estimado",
      value: formatMoney(summary.estimated_customer_savings),
      icon: "bi-piggy-bank",
      color: "is-orange",
    },
    {
      title: "Cashback disponible",
      value: formatMoney(summary.cashback_available_balance),
      icon: "bi-wallet2",
      color: "is-blue",
    },
    {
      title: "Carritos abandonados",
      value: formatNumber(summary.abandoned_carts),
      icon: "bi-cart-x",
      color: "is-red",
    },
    {
      title: "Carritos recuperados",
      value: formatNumber(summary.recovered_carts),
      icon: "bi-cart-check",
      color: "is-green",
    },
  ]
}

function normalizeDashboardResponse(response) {
  const data = response?.data || response || {}
  const payload = data.data || data

  return {
    filters: {
      ...EMPTY_DASHBOARD.filters,
      ...(payload.filters || {}),
    },
    summary: normalizeSummary(payload.summary),
    charts: {
      sales_by_day: normalizeSalesByDay(payload.charts?.sales_by_day),
      orders_by_status: normalizeOrdersByStatus(payload.charts?.orders_by_status),
      cashback_by_day: normalizeCashbackByDay(payload.charts?.cashback_by_day),
      cart_funnel: normalizeCartFunnel(payload.charts?.cart_funnel),
    },
    tables: {
      top_products: normalizeProductSales(payload.tables?.top_products),
      best_selling_products: normalizeProductSales(
        payload.tables?.best_selling_products || payload.tables?.top_products
      ),
      least_selling_products: normalizeProductSales(payload.tables?.least_selling_products),
      low_stock_products: normalizeLowStockProducts(payload.tables?.low_stock_products),
      recent_orders: normalizeRecentOrders(payload.tables?.recent_orders),
    },
  }
}

function normalizeSummary(summary = {}) {
  return Object.fromEntries(
    Object.entries(EMPTY_DASHBOARD.summary).map(([key, fallback]) => [
      key,
      Number(summary?.[key] ?? fallback),
    ])
  )
}

function normalizeSalesByDay(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        date: item.date || "",
        orders: Number(item.orders ?? 0),
        sales: Number(item.sales ?? 0),
        discounts: Number(item.discounts ?? 0),
      }))
    : []
}

function normalizeOrdersByStatus(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        status: item.status || "unknown",
        count: Number(item.count ?? 0),
        total: Number(item.total ?? 0),
      }))
    : []
}

function normalizeCashbackByDay(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        date: item.date || "",
        earned: Number(item.earned ?? 0),
        redeemed: Number(item.redeemed ?? 0),
      }))
    : []
}

function normalizeCartFunnel(items = []) {
  return Array.isArray(items)
    ? items
        .filter((item) => ["active", "abandoned"].includes(String(item.status || "").toLowerCase()))
        .map((item) => ({
          status: item.status || "unknown",
          count: Number(item.count ?? 0),
        }))
    : []
}


function normalizeProductSales(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        product_id: item.product_id ?? null,
        name: item.name || "Producto sin nombre",
        sku: item.sku || null,
        quantity: Number(item.quantity ?? 0),
        revenue: Number(item.revenue ?? 0),
      }))
    : []
}

function normalizeLowStockProducts(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        product_id: item.product_id ?? null,
        name: item.name || "Producto sin nombre",
        sku: item.sku || null,
        stock: Number(item.stock ?? 0),
        quantity_sold: Number(item.quantity_sold ?? 0),
        revenue: Number(item.revenue ?? 0),
        is_active: Boolean(item.is_active),
      }))
    : []
}

function normalizeRecentOrders(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        number: item.number || `#${item.id}`,
        customer: item.customer || {},
        status: item.status || "unknown",
        payment_status: item.payment_status || "unknown",
        total: Number(item.total ?? 0),
        created_at: item.created_at || null,
        paid_at: item.paid_at || null,
      }))
    : []
}

function getDefaultFilters() {
  return getRangeFilters(30)
}

function getRangeFilters(days) {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - Math.max(Number(days || 1) - 1, 0))

  return {
    from: formatDateInput(from),
    to: formatDateInput(today),
  }
}

function getActiveQuickRange(filters) {
  const match = QUICK_RANGES.find((range) => {
    const rangeFilters = getRangeFilters(range.days)
    return filters.from === rangeFilters.from && filters.to === rangeFilters.to
  })

  return match?.key || ""
}

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatCompactMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0))
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatShortDate(value) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function translateStatus(status) {
  const map = {
    paid: "Pagado",
    pending: "Pendiente",
    cancelled: "Cancelado",
    canceled: "Cancelado",
    completed: "Completado",
    processing: "Procesando",
    failed: "Fallido",
  }

  return map[String(status || "").toLowerCase()] || status || "Sin estatus"
}

function translateCartStatus(status) {
  const map = {
    active: "Activos",
    abandoned: "Abandonados",
    converted: "Convertidos",
    recovered: "Recuperados",
  }

  return map[String(status || "").toLowerCase()] || status || "Sin estatus"
}

function buildLineChart(items = []) {
  const width = 720
  const height = 260
  const paddingX = 18
  const paddingTop = 22
  const paddingBottom = 36
  const plotWidth = width - paddingX * 2
  const plotHeight = height - paddingTop - paddingBottom
  const maxSales = Math.max(...items.map((item) => item.sales), 1)
  const bottomY = height - paddingBottom
  const totalSales = items.reduce((total, item) => total + Number(item.sales || 0), 0)

  const points = items.map((item, index) => {
    const ratio = items.length > 1 ? index / (items.length - 1) : 0.5
    const x = paddingX + ratio * plotWidth
    const y = bottomY - (Number(item.sales || 0) / maxSales) * plotHeight

    return {
      ...item,
      x,
      y,
      percentX: ((x - paddingX) / plotWidth) * 100,
      svgPercentX: (x / width) * 100,
      svgPercentY: (y / height) * 100,
    }
  })

  const linePath = buildSmoothLinePath(points)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => paddingTop + ratio * plotHeight)
  const verticalGridLines = points.map((point) => point.x)
  const ticks = [maxSales, maxSales * 0.75, maxSales * 0.5, maxSales * 0.25, 0]

  return {
    width,
    height,
    paddingX,
    paddingTop,
    bottomY,
    totalSales,
    points,
    linePath,
    gridLines,
    verticalGridLines,
    ticks,
  }
}

function buildSmoothLinePath(points = []) {
  if (!points.length) return ""
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`

    const previous = points[index - 1]
    const previousControl = points[index - 2] || previous
    const nextControl = points[index + 1] || point
    const tension = 0.18
    const controlX1 = previous.x + (point.x - previousControl.x) * tension
    const controlY1 = previous.y + (point.y - previousControl.y) * tension
    const controlX2 = point.x - (nextControl.x - previous.x) * tension
    const controlY2 = point.y - (nextControl.y - previous.y) * tension

    return `${path} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${point.x} ${point.y}`
  }, "")
}

export default DashboardPage
