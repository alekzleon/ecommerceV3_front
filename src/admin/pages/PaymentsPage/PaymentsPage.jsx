import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  createStripeConnectAccount,
  createStripeConnectOnboardingLink,
  getStripeConnectStatus,
} from "../../../services/api/stripeConnectService"
import { getAdminStorefront } from "../../../services/api/settingsService"
import {
  getAdminPaymentMethods,
  updateAdminPaymentMethods,
} from "../../../services/api/paymentMethodsService"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import "./PaymentsPage.css"

const PAYMENT_GATEWAYS = [
  {
    id: "stripe",
    name: "Stripe",
    icon: "bi-credit-card-2-front-fill",
    description: "Recibe pagos con tarjeta mediante Stripe Connect.",
    enabled: true,
  },
  {
    id: "mercado_pago",
    name: "Mercado Pago",
    icon: "bi-wallet2",
    description: "Pasarela preparada para una próxima etapa.",
    enabled: false,
  },
]

function PaymentsPage() {
  const location = useLocation()
  const isStripeReturn = location.pathname === "/admin/payments/stripe/return"
  const [activeGateway, setActiveGateway] = useState("stripe")
  const [stripeStatus, setStripeStatus] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState(null)
  const [storefrontPublished, setStorefrontPublished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")

  const statusCopy = useMemo(() => getStripeStatusCopy(stripeStatus), [stripeStatus])
  const blockingRequirements = useMemo(() => buildBlockingRequirements(stripeStatus), [stripeStatus])
  const stripeMethod = useMemo(() => getPaymentMethod(paymentMethods, "stripe"), [paymentMethods])

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      const [stripeResponse, methodsResponse, storefrontResponse] = await Promise.allSettled([
        getStripeConnectStatus(),
        getAdminPaymentMethods(),
        getAdminStorefront(),
      ])

      if (stripeResponse.status === "fulfilled") {
        setStripeStatus(stripeResponse.value?.data || null)
      } else {
        throw stripeResponse.reason
      }

      if (methodsResponse.status === "fulfilled") {
        setPaymentMethods(normalizePaymentMethods(methodsResponse.value))
      }

      if (storefrontResponse.status === "fulfilled") {
        setStorefrontPublished(Boolean(normalizeStorefrontValue(storefrontResponse.value)?.is_published))
      }
    } catch (error) {
      console.error("Error cargando estado de Stripe Connect:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible consultar el estado de pagos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  async function handlePrepareAccount() {
    try {
      setActionLoading("account")
      await createStripeConnectAccount()
      notifySuccess("Cuenta de Stripe preparada correctamente.")
      await loadStatus()
    } catch (error) {
      console.error("Error preparando Stripe Connect:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible preparar la cuenta de Stripe.")
    } finally {
      setActionLoading("")
    }
  }

  async function handleToggleStripePayment(nextEnabled) {
    if (nextEnabled && !stripeStatus?.ready_for_charges) {
      notifyWarning("Completa Stripe Connect antes de activar este método en checkout.")
      return
    }

    if (!nextEnabled && storefrontPublished && countActivePaymentMethods(paymentMethods) <= 1) {
      notifyWarning("No puedes desactivar el único método de pago mientras la tienda está publicada.")
      return
    }

    try {
      setActionLoading("stripe_enabled")
      const response = await updateAdminPaymentMethods({
        methods: {
          stripe: {
            enabled: nextEnabled,
          },
        },
      })

      setPaymentMethods(normalizePaymentMethods(response))
      notifySuccess(nextEnabled ? "Stripe activado en checkout." : "Stripe desactivado en checkout.")
    } catch (error) {
      console.error("Error actualizando método de pago:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el método de pago.")
    } finally {
      setActionLoading("")
    }
  }

  async function handleStartOnboarding() {
    try {
      setActionLoading("onboarding")
      const response = await createStripeConnectOnboardingLink()
      const onboardingUrl = response?.data?.onboarding?.url

      if (!onboardingUrl) {
        notifyError("No se recibió la URL de configuración de Stripe.")
        return
      }

      window.location.href = onboardingUrl
    } catch (error) {
      console.error("Error generando link de onboarding:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible continuar la configuración de Stripe.")
    } finally {
      setActionLoading("")
    }
  }

  if (loading) return <PaymentsSkeleton />

  return (
    <div className="payments-page">
      <header className="payments-header">
        <div>
          <h1>Pagos</h1>
          <p>Administra las pasarelas de pago disponibles para tu ecommerce.</p>
        </div>
      </header>

      <nav className="payments-gateways" aria-label="Pasarelas de pago">
        {PAYMENT_GATEWAYS.map((gateway) => (
          <button
            key={gateway.id}
            type="button"
            className={`payments-gateway ${activeGateway === gateway.id ? "is-active" : ""}`}
            onClick={() => setActiveGateway(gateway.id)}
          >
            <span className="payments-gateway__icon">
              <i className={`bi ${gateway.icon}`} aria-hidden="true" />
            </span>
            <span>
              <strong>{gateway.name}</strong>
              <small>{gateway.enabled ? "Disponible" : "Próximamente"}</small>
            </span>
          </button>
        ))}
      </nav>

      {activeGateway === "stripe" ? (
        <StripeGatewayPanel
          actionLoading={actionLoading}
          isStripeReturn={isStripeReturn}
          onPrepareAccount={handlePrepareAccount}
          onRefresh={loadStatus}
          onStartOnboarding={handleStartOnboarding}
          onToggleStripePayment={handleToggleStripePayment}
          blockingRequirements={blockingRequirements}
          stripeMethod={stripeMethod}
          statusCopy={statusCopy}
          stripeStatus={stripeStatus}
        />
      ) : (
        <ComingSoonGatewayPanel gateway={PAYMENT_GATEWAYS.find((gateway) => gateway.id === activeGateway)} />
      )}
    </div>
  )
}

function StripeGatewayPanel({
  actionLoading,
  isStripeReturn,
  onPrepareAccount,
  onRefresh,
  onStartOnboarding,
  onToggleStripePayment,
  blockingRequirements,
  stripeMethod,
  statusCopy,
  stripeStatus,
}) {
  const canContinueOnboarding = Boolean(stripeStatus?.can_continue_onboarding)
  const disabledReasonLabel = stripeStatus?.requirements?.disabled_reason_label || ""
  const stripeEnabled = Boolean(stripeMethod?.enabled || stripeMethod?.active)
  const stripeAvailable = stripeStatus?.ready_for_charges && stripeMethod?.available !== false

  return (
    <>
      <section className={`payments-status payments-status--${statusCopy.tone}`}>
        <div className="payments-status__icon">
          <i className={`bi ${statusCopy.icon}`} aria-hidden="true" />
        </div>

        <div className="payments-status__copy">
          <span>{isStripeReturn ? "Regreso de Stripe" : "Stripe Connect"}</span>
          <h2>{statusCopy.title}</h2>
          <p>{statusCopy.message}</p>
        </div>

        <div className="payments-status__actions">
          {!stripeStatus?.connected ? (
            <button
              type="button"
              onClick={onPrepareAccount}
              disabled={Boolean(actionLoading)}
            >
              {actionLoading === "account" ? "Preparando..." : "Preparar cuenta"}
            </button>
          ) : null}

          {!stripeStatus?.ready_for_charges && canContinueOnboarding ? (
            <button
              type="button"
              onClick={onStartOnboarding}
              disabled={Boolean(actionLoading)}
            >
              {actionLoading === "onboarding" ? "Abriendo Stripe..." : "Continuar configuración"}
            </button>
          ) : null}
        </div>
      </section>

      <section className="payments-grid">
        <InfoCard label="Estado" value={translateStripeStatus(stripeStatus?.status)} />
        <InfoCard label="Cobros" value={stripeStatus?.account?.charges_enabled ? "Habilitados" : "Pendientes"} />
        <InfoCard label="Depósitos" value={stripeStatus?.account?.payouts_enabled ? "Habilitados" : "Pendientes"} />
        <InfoCard label="Datos enviados" value={stripeStatus?.account?.details_submitted ? "Sí" : "No"} />
      </section>

      <section className="payments-panel">
        <div className="payments-method-toggle">
          <div>
            <span>Método en checkout</span>
            <h2>Tarjeta de crédito o débito</h2>
            <p>
              {stripeEnabled
                ? "Stripe está visible para que los clientes paguen en checkout."
                : "Stripe no se mostrará como método de pago en checkout."}
            </p>
            {!stripeAvailable ? (
              <p className="payments-panel__message">
                Completa Stripe Connect antes de activar este método.
              </p>
            ) : null}
          </div>

          <label className="payments-switch">
            <input
              type="checkbox"
              checked={stripeEnabled}
              onChange={(event) => onToggleStripePayment(event.target.checked)}
              disabled={Boolean(actionLoading) || !stripeAvailable}
            />
            <span />
          </label>
        </div>
      </section>

      <section className="payments-panel">
        <div className="payments-panel__head">
          <div>
            <span>Stripe Connect</span>
            <h2>Información de la cuenta</h2>
          </div>
          <button type="button" onClick={onRefresh} disabled={Boolean(actionLoading)}>
            Actualizar
          </button>
        </div>

        <dl className="payments-details">
          <div>
            <dt>ID de cuenta</dt>
            <dd>{stripeStatus?.account?.stripe_account_id || "-"}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{stripeStatus?.account?.account_type || "-"}</dd>
          </div>
          <div>
            <dt>Razón de bloqueo</dt>
            <dd>{disabledReasonLabel || stripeStatus?.requirements?.disabled_reason || "-"}</dd>
          </div>
        </dl>
      </section>

      {blockingRequirements.length ? (
        <section className="payments-panel">
          <div className="payments-panel__head">
            <div>
              <span>Pendientes bloqueantes</span>
              <h2>Requisitos de Stripe</h2>
            </div>
          </div>
          <div className="payments-requirements">
            {blockingRequirements.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
      ) : !stripeStatus?.ready_for_charges ? (
        <section className="payments-panel">
          <div className="payments-panel__head">
            <div>
              <span>Estado en revisión</span>
              <h2>Stripe aún no está listo</h2>
            </div>
            {canContinueOnboarding ? (
              <button type="button" onClick={onStartOnboarding} disabled={Boolean(actionLoading)}>
                {actionLoading === "onboarding" ? "Abriendo Stripe..." : "Continuar configuración"}
              </button>
            ) : null}
          </div>
          <p className="payments-panel__message">
            {disabledReasonLabel || "Stripe aún está revisando o activando la cuenta. Intenta actualizar el estado en unos minutos."}
          </p>
        </section>
      ) : null}
    </>
  )
}

function ComingSoonGatewayPanel({ gateway }) {
  return (
    <section className="payments-panel payments-panel--empty">
      <div className="payments-panel__empty-icon">
        <i className={`bi ${gateway?.icon || "bi-wallet2"}`} aria-hidden="true" />
      </div>
      <div>
        <span>Pasarela de pago</span>
        <h2>{gateway?.name || "Pasarela"} estará disponible próximamente</h2>
        <p>{gateway?.description || "Esta integración quedó preparada para una próxima etapa."}</p>
      </div>
    </section>
  )
}

function InfoCard({ label, value }) {
  return (
    <article className="payments-info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function PaymentsSkeleton() {
  return (
    <div className="payments-page">
      <section className="payments-status payments-status--loading">
        <span />
        <strong />
        <p />
      </section>
    </div>
  )
}

function getStripeStatusCopy(status) {
  const disabledReasonLabel = status?.requirements?.disabled_reason_label

  if (status?.ready_for_charges) {
    return {
      tone: "success",
      icon: "bi-check-circle-fill",
      title: "Stripe conectado",
      message: "Tu tienda ya puede recibir pagos con Stripe.",
    }
  }

  const state = String(status?.status || "not_connected")

  const copy = {
    not_connected: {
      tone: "neutral",
      icon: "bi-cash-stack",
      title: "Conecta Stripe para recibir pagos",
      message: "Prepara tu cuenta y completa el onboarding de Stripe Connect.",
    },
    onboarding_pending: {
      tone: "warning",
      icon: "bi-exclamation-circle-fill",
      title: "Configuración de Stripe pendiente",
      message: "Continúa el proceso de onboarding para habilitar cobros.",
    },
    restricted: {
      tone: "danger",
      icon: "bi-slash-circle-fill",
      title: "Stripe requiere información",
      message: disabledReasonLabel || "Hay requisitos pendientes antes de poder recibir pagos.",
    },
    enabled: {
      tone: "success",
      icon: "bi-check-circle-fill",
      title: "Stripe conectado",
      message: "Tu tienda ya puede recibir pagos con Stripe.",
    },
  }

  return copy[state] || copy.not_connected
}

function buildBlockingRequirements(status) {
  const requirements = status?.requirements || {}
  const blockingItems = Array.isArray(requirements.items)
    ? requirements.items.filter((item) => item?.blocking)
    : []

  if (blockingItems.length) {
    return blockingItems
      .map((item) => item.label || item.field)
      .filter(Boolean)
  }

  return [
    ...(Array.isArray(requirements.blocking) ? requirements.blocking : []),
    ...(Array.isArray(requirements.past_due) ? requirements.past_due : []),
    ...(Array.isArray(requirements.currently_due) ? requirements.currently_due : []),
    ...(Array.isArray(requirements.eventually_due) ? requirements.eventually_due : []),
  ].filter(Boolean)
}

function translateStripeStatus(status) {
  const statuses = {
    not_connected: "No conectado",
    onboarding_pending: "Onboarding pendiente",
    restricted: "Restringido",
    enabled: "Habilitado",
  }

  return statuses[String(status || "")] || status || "Sin estado"
}

function normalizePaymentMethods(response) {
  const value = response?.data?.value || response?.data?.data?.value || response?.value || {}

  return {
    default_method: value.default_method || null,
    methods: Array.isArray(value.methods) ? value.methods : [],
  }
}

function getPaymentMethod(paymentMethods, key) {
  return paymentMethods?.methods?.find((method) => method.key === key) || null
}

function countActivePaymentMethods(paymentMethods) {
  return paymentMethods?.methods?.filter((method) => method.active || method.enabled).length || 0
}

function normalizeStorefrontValue(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return value && typeof value === "object" ? value : {}
}

export default PaymentsPage
