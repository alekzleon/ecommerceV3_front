import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  getAccountCashback,
  getAccountCashbackTransactions,
} from "../../services/api/accountService"
import { notifyError } from "../../utils/toast"
import "./account.css"

const INITIAL_FILTERS = {
  type: "",
  status: "",
  order_id: "",
  from: "",
  to: "",
  per_page: 15,
  page: 1,
}

const FALLBACK_TYPES = [
  { key: "credit", label: "Generado" },
  { key: "debit", label: "Usado" },
]

const FALLBACK_STATUSES = [
  { key: "available", label: "Disponible" },
  { key: "pending", label: "Pendiente" },
  { key: "cancelled", label: "Cancelado" },
]

function AccountCashbackPage() {
  const [summary, setSummary] = useState(createEmptySummary())
  const [transactions, setTransactions] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [meta, setMeta] = useState(createEmptyMeta())
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [filterOptions, setFilterOptions] = useState({
    types: FALLBACK_TYPES,
    statuses: FALLBACK_STATUSES,
  })
  const [loading, setLoading] = useState(true)

  const loadCashback = useCallback(async (nextFilters = INITIAL_FILTERS) => {
    try {
      setLoading(true)
      const [summaryResponse, transactionsResponse] = await Promise.all([
        getAccountCashback(),
        getAccountCashbackTransactions(cleanParams(nextFilters)),
      ])

      const nextSummary = normalizeSummary(summaryResponse)
      const nextTransactions = normalizeTransactions(transactionsResponse?.data)

      setSummary(nextSummary)
      setRecentTransactions(normalizeTransactions(nextSummary.recent_transactions))
      setTransactions(nextTransactions)
      setMeta(normalizeMeta(transactionsResponse?.meta, nextFilters))
      setFilterOptions({
        types: normalizeFilterOptions(transactionsResponse?.filters?.types, FALLBACK_TYPES),
        statuses: normalizeFilterOptions(transactionsResponse?.filters?.statuses, FALLBACK_STATUSES),
      })
    } catch (error) {
      console.error("Error al cargar cashback:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar tu cashback.")
      setSummary(createEmptySummary())
      setRecentTransactions([])
      setTransactions([])
      setMeta(createEmptyMeta())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCashback(filters)
  }, [filters, loadCashback])

  function updateFilter(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: name === "page" ? value : 1,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadCashback(filters)
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
  }

  const hasPreviousPage = meta.current_page > 1
  const hasNextPage = meta.current_page < meta.last_page
  const currency = summary.currency || "mxn"

  return (
    <div className="account_detail_page">
      <div className="account_detail_shell account_orders_shell">
        <nav className="account_detail_breadcrumb" aria-label="Breadcrumb">
          <Link to="/mi-cuenta">Mi cuenta</Link>
          <span>/</span>
          <span>Cashback</span>
        </nav>

        <header className="account_detail_header account_orders_header">
          <div>
            <h1 className="account_detail_title">Cashback</h1>
            <p className="account_detail_text">
              Consulta tu saldo disponible, cashback pendiente y movimientos relacionados con tus pedidos.
            </p>
          </div>
        </header>

        <section className="account_cashback_balance" aria-label="Resumen principal de cashback">
          <article className="account_cashback_balance_card account_cashback_balance_card--primary">
            <span>Cashback disponible</span>
            <strong>{formatMoney(summary.balance.available, currency)}</strong>
            <small>Saldo usable en carrito.</small>
          </article>
          <article className="account_cashback_balance_card">
            <span>Cashback pendiente</span>
            <strong>{formatMoney(summary.balance.pending, currency)}</strong>
            <small>Por pago o confirmación.</small>
          </article>
        </section>

        <section className="account_orders_summary account_cashback_totals" aria-label="Totales de cashback">
          <div>
            <span>Generado</span>
            <strong>{formatMoney(summary.totals.earned, currency)}</strong>
          </div>
          <div>
            <span>Usado</span>
            <strong>{formatMoney(summary.totals.used, currency)}</strong>
          </div>
          <div>
            <span>Cancelado</span>
            <strong>{formatMoney(summary.totals.cancelled, currency)}</strong>
          </div>
          <div>
            <span>Movimientos</span>
            <strong>{formatNumber(summary.totals.transactions)}</strong>
          </div>
        </section>

        <section className="account_cashback_settings" aria-label="Configuración de cashback">
          <div>
            <span>Generación</span>
            <strong>
              {summary.settings.cashback_enabled
                ? `${formatNumber(summary.settings.cashback_earn_percentage)}% por compra`
                : "No disponible"}
            </strong>
          </div>
          <div>
            <span>Uso en carrito</span>
            <strong>
              {summary.settings.cashback_redeem_enabled
                ? `Hasta ${formatNumber(summary.settings.cashback_max_redeem_percentage)}% del pedido`
                : "No disponible"}
            </strong>
          </div>
        </section>

        {recentTransactions.length ? (
          <section className="account_cashback_recent" aria-label="Movimientos recientes">
            <div className="account_cashback_section_head">
              <h2>Movimientos recientes</h2>
            </div>
            <div className="account_cashback_recent_grid">
              {recentTransactions.slice(0, 3).map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} currency={currency} compact />
              ))}
            </div>
          </section>
        ) : null}

        <form className="account_orders_filters account_cashback_filters" onSubmit={handleSubmit}>
          <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}>
            <option value="">Todos los tipos</option>
            {filterOptions.types.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="">Todos los estados</option>
            {filterOptions.statuses.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={filters.order_id}
            onChange={(event) => updateFilter("order_id", event.target.value)}
            placeholder="ID de pedido"
          />
          <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} aria-label="Desde" />
          <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} aria-label="Hasta" />
          <select value={filters.per_page} onChange={(event) => updateFilter("per_page", Number(event.target.value))}>
            {[15, 25, 50].map((value) => (
              <option key={value} value={value}>{value} por página</option>
            ))}
          </select>
          <button type="submit" className="btn btn_primary" disabled={loading}>Aplicar</button>
          <button type="button" className="btn btn_secondary" onClick={resetFilters} disabled={loading}>Limpiar</button>
        </form>

        <section className="account_cashback_statement" aria-label="Estado de cuenta de cashback">
          <div className="account_cashback_section_head">
            <h2>Estado de cuenta</h2>
            <span>Mostrando {meta.from || 0}-{meta.to || transactions.length} de {meta.total || transactions.length}</span>
          </div>

          {loading ? (
            <div className="account_orders_empty">Cargando movimientos...</div>
          ) : transactions.length ? (
            <div className="account_cashback_transactions">
              {transactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} currency={currency} />
              ))}
            </div>
          ) : (
            <div className="account_orders_empty">No encontramos movimientos con estos filtros.</div>
          )}

          <footer className="account_orders_pagination">
            <span>Página {meta.current_page} de {meta.last_page}</span>
            <div>
              <button type="button" className="btn btn_secondary" disabled={!hasPreviousPage || loading} onClick={() => updateFilter("page", meta.current_page - 1)}>
                Anterior
              </button>
              <button type="button" className="btn btn_secondary" disabled={!hasNextPage || loading} onClick={() => updateFilter("page", meta.current_page + 1)}>
                Siguiente
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}

function TransactionCard({ transaction, currency, compact = false }) {
  const isDebit = transaction.type === "debit" || Number(transaction.signed_amount) < 0
  const amountClass = isDebit ? "is-debit" : "is-credit"

  return (
    <article className={`account_cashback_transaction ${compact ? "is-compact" : ""}`}>
      <div className="account_cashback_transaction_main">
        <span className={`account_cashback_badge account_cashback_badge--${transaction.status || "default"}`}>
          {transaction.status_label || transaction.status || "Movimiento"}
        </span>
        <strong>{transaction.description || transaction.type_label || "Movimiento de cashback"}</strong>
        <small>
          {transaction.order?.number ? `Pedido ${transaction.order.number}` : "Sin pedido relacionado"}
          {transaction.created_at ? ` · ${formatDateTime(transaction.created_at)}` : ""}
        </small>
      </div>
      <div className="account_cashback_transaction_amount">
        <strong className={amountClass}>{formatSignedMoney(transaction.signed_amount, currency)}</strong>
        <span>{transaction.type_label || getTypeLabel(transaction.type)}</span>
      </div>
    </article>
  )
}

function normalizeSummary(response = {}) {
  const payload = response?.data?.data || response?.data || response || {}

  return {
    currency: payload.currency || "mxn",
    settings: {
      cashback_enabled: Boolean(payload.settings?.cashback_enabled),
      cashback_earn_percentage: Number(payload.settings?.cashback_earn_percentage || 0),
      cashback_redeem_enabled: Boolean(payload.settings?.cashback_redeem_enabled),
      cashback_max_redeem_percentage: Number(payload.settings?.cashback_max_redeem_percentage || 0),
    },
    balance: {
      available: Number(payload.balance?.available || 0),
      pending: Number(payload.balance?.pending || 0),
    },
    totals: {
      earned: Number(payload.totals?.earned || 0),
      used: Number(payload.totals?.used || 0),
      cancelled: Number(payload.totals?.cancelled || 0),
      transactions: Number(payload.totals?.transactions || 0),
    },
    recent_transactions: Array.isArray(payload.recent_transactions) ? payload.recent_transactions : [],
  }
}

function createEmptySummary() {
  return normalizeSummary()
}

function normalizeTransactions(items = []) {
  return Array.isArray(items) ? items.map(normalizeTransaction) : []
}

function normalizeTransaction(transaction = {}) {
  return {
    id: transaction.id,
    type: transaction.type || "",
    type_label: transaction.type_label || "",
    status: transaction.status || "",
    status_label: transaction.status_label || "",
    amount: Number(transaction.amount || 0),
    signed_amount: Number(transaction.signed_amount ?? transaction.amount ?? 0),
    description: transaction.description || "",
    order: transaction.order || null,
    metadata: transaction.metadata || {},
    created_at: transaction.created_at || null,
    updated_at: transaction.updated_at || null,
  }
}

function normalizeMeta(meta = {}, filters = INITIAL_FILTERS) {
  return {
    current_page: Number(meta.current_page || filters.page || 1),
    last_page: Number(meta.last_page || 1),
    per_page: Number(meta.per_page || filters.per_page || 15),
    total: Number(meta.total || 0),
    from: Number(meta.from || 0),
    to: Number(meta.to || 0),
  }
}

function createEmptyMeta() {
  return normalizeMeta()
}

function normalizeFilterOptions(items, fallback) {
  return Array.isArray(items) && items.length
    ? items.map((item) => ({ key: item.key, label: item.label || item.key })).filter((item) => item.key)
    : fallback
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  )
}

function getTypeLabel(type) {
  const labels = {
    credit: "Generado",
    debit: "Usado",
  }

  return labels[type] || "Movimiento"
}

function formatMoney(value, currency = "mxn") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: String(currency || "mxn").toUpperCase(),
  }).format(Number(value || 0))
}

function formatSignedMoney(value, currency = "mxn") {
  const numberValue = Number(value || 0)
  const prefix = numberValue > 0 ? "+" : ""
  return `${prefix}${formatMoney(numberValue, currency)}`
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX").format(Number(value || 0))
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

export default AccountCashbackPage
