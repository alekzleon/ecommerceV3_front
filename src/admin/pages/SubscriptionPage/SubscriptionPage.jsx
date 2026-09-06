import { useCallback, useEffect, useMemo, useState } from "react"
import {
  cancelTenantSubscription,
  createTenantSubscriptionCheckout,
  getTenantSubscription,
  getTenantSubscriptionPlans,
} from "../../../services/api/subscriptionService"
import { notifyError, notifySuccess } from "../../../utils/toast"
import "./SubscriptionPage.css"

function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null)
  const [plansData, setPlansData] = useState({
    current_plan_key: "",
    subscription_status: "",
    is_usable: true,
    plans: [],
  })
  const [loading, setLoading] = useState(true)
  const [checkoutPlanKey, setCheckoutPlanKey] = useState("")
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState("monthly")
  const [cancelLoading, setCancelLoading] = useState(false)

  const currentPlan = useMemo(() => {
    return plansData.plans.find((plan) => plan.is_current || plan.key === plansData.current_plan_key)
      || subscription?.plan
      || null
  }, [plansData.current_plan_key, plansData.plans, subscription])

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true)
      const [subscriptionResponse, plansResponse] = await Promise.allSettled([
        getTenantSubscription(),
        getTenantSubscriptionPlans(),
      ])

      if (plansResponse.status === "rejected") {
        throw plansResponse.reason
      }

      const subscriptionData =
        subscriptionResponse.status === "fulfilled" ? subscriptionResponse.value?.data || null : null
      const plansResponseData = plansResponse.value?.data || {}

      setSubscription(subscriptionData)
      setPlansData({
        current_plan_key: subscriptionData?.plan_key || plansResponseData.current_plan_key || "",
        subscription_status: subscriptionData?.status || plansResponseData.subscription_status || "",
        is_usable: Boolean(subscriptionData?.is_usable ?? plansResponseData.is_usable ?? true),
        plans: Array.isArray(plansResponseData.plans) ? plansResponseData.plans : [],
      })
    } catch (error) {
      console.error("Error cargando suscripción:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar la suscripción.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  async function handleCheckout(planKey, billingPeriod = "monthly") {
    try {
      setCheckoutPlanKey(`${planKey}:${billingPeriod}`)
      const response = await createTenantSubscriptionCheckout(planKey, billingPeriod)
      const checkoutUrl = response?.data?.url

      if (!checkoutUrl) {
        notifyError("No se recibió la URL de pago.")
        return
      }

      window.location.href = checkoutUrl
    } catch (error) {
      console.error("Error creando checkout de suscripción:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible iniciar el pago del plan.")
    } finally {
      setCheckoutPlanKey("")
    }
  }

  async function handleCancelSubscription() {
    const confirmed = window.confirm(
      "La suscripción se cancelará al final del período actual. Tu tienda conservará acceso hasta esa fecha. ¿Deseas continuar?"
    )

    if (!confirmed) return

    try {
      setCancelLoading(true)
      const response = await cancelTenantSubscription({ cancel_at_period_end: true })
      const nextSubscription = response?.data?.subscription || null

      if (nextSubscription) {
        setSubscription(nextSubscription)
        setPlansData((prev) => ({
          ...prev,
          current_plan_key: nextSubscription.plan_key || prev.current_plan_key,
          subscription_status: nextSubscription.status || prev.subscription_status,
          is_usable: Boolean(nextSubscription.is_usable ?? prev.is_usable),
        }))
      } else {
        await loadSubscription()
      }

      notifySuccess(response?.message || "La suscripción se cancelará al final del período actual.")
    } catch (error) {
      console.error("Error cancelando suscripción:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cancelar la suscripción.")
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) return <SubscriptionSkeleton />

  return (
    <div className="subscription-page">
      <section className="subscription-current">
        <div>
          <span>Plan actual</span>
          <h1>{currentPlan?.name || subscription?.plan?.name || plansData.current_plan_key || "Sin plan"}</h1>
          <p>
            Estado {translateSubscriptionStatus(plansData.subscription_status)}
            {plansData.is_usable ? "" : " · tienda suspendida"}
          </p>
        </div>

        <div className="subscription-current__meta">
          <InfoPill label="Precio" value={currentPlan?.label || formatSubscriptionPrice(currentPlan)} />
          <InfoPill label="Inicio" value={formatDate(subscription?.started_at)} />
          <InfoPill label="Termina" value={formatDate(subscription?.ends_at) || "Sin vencimiento"} />
        </div>
      </section>

      <section className="subscription-plans">
        <div className="subscription-billing-switch" role="group" aria-label="Periodo de pago">
          <button
            type="button"
            className={selectedBillingPeriod === "monthly" ? "is-active" : ""}
            onClick={() => setSelectedBillingPeriod("monthly")}
          >
            Mensual
          </button>
          <button
            type="button"
            className={selectedBillingPeriod === "annual" ? "is-active" : ""}
            onClick={() => setSelectedBillingPeriod("annual")}
          >
            Anual
          </button>
        </div>

        {plansData.plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            checkoutPlanKey={checkoutPlanKey}
            selectedBillingPeriod={selectedBillingPeriod}
            subscription={subscription}
            onCheckout={handleCheckout}
          />
        ))}
      </section>

      <SubscriptionCancellationNotice
        subscription={subscription}
        onCancelSubscription={handleCancelSubscription}
        cancelLoading={cancelLoading}
      />
    </div>
  )
}

function PlanCard({ plan, checkoutPlanKey, selectedBillingPeriod, subscription, onCheckout }) {
  const modules = Array.isArray(plan.included_modules) ? plan.included_modules : []
  const includesAllModules = modules.includes("*")
  const features = Array.isArray(plan.features) ? plan.features : []
  const billingOptions = normalizeBillingOptions(plan)
  const activeBillingPeriod = selectedBillingPeriod || plan.default_billing_period || billingOptions[0]?.key || "monthly"
  const selectedOption = billingOptions.find((option) => option.key === activeBillingPeriod) || billingOptions[0] || null
  const checkoutKey = `${plan.key}:${activeBillingPeriod}`
  const canCheckoutCurrentPlan = isSubscriptionCancelled(subscription)

  return (
    <article className={`subscription-plan ${plan.is_current ? "is-current" : ""}`}>
      <div className="subscription-plan__head">
        <div>
          <span>{plan.is_current ? "Seleccionado" : "Disponible"}</span>
          <h2>{plan.name}</h2>
          <p>{plan.description}</p>
        </div>
        <div className="subscription-plan__price">
          <strong>{selectedOption?.label || plan.label || formatSubscriptionPrice(plan)}</strong>
          {selectedOption?.savings_label ? (
            <em>{selectedOption.savings_label}</em>
          ) : null}
        </div>
      </div>

      <div className="subscription-plan__body">
        <div>
          <h3>Atributos</h3>
          <ul>
            {(features.length ? features : ["Herramientas para operar tu ecommerce."]).map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Módulos incluidos</h3>
          {includesAllModules ? (
            <p className="subscription-plan__all-modules">Todos los módulos</p>
          ) : modules.length ? (
            <div className="subscription-plan__modules">
              {modules.map((module) => (
                <span key={module}>{formatModuleName(module)}</span>
              ))}
            </div>
          ) : (
            <p className="subscription-plan__empty">Sin módulos declarados.</p>
          )}
        </div>
      </div>

      <div className="subscription-plan__footer">
        {plan.is_current && !canCheckoutCurrentPlan ? (
          <span>Plan actual</span>
        ) : plan.can_checkout ? (
          <button
            type="button"
            onClick={() => onCheckout(plan.key, activeBillingPeriod)}
            disabled={checkoutPlanKey === checkoutKey}
          >
            {checkoutPlanKey === checkoutKey ? "Abriendo pago..." : "Contratar"}
          </button>
        ) : (
          <span>No disponible para checkout</span>
        )}
      </div>
    </article>
  )
}

function SubscriptionCancellationNotice({ subscription, onCancelSubscription, cancelLoading }) {
  const cancellation = subscription?.cancellation || null
  const status = String(subscription?.status || "").toLowerCase()
  const isCanceled = ["canceled", "cancelled"].includes(status)
  const isPendingCancellation = Boolean(cancellation?.cancel_at_period_end)
  const canCancel = Boolean(subscription?.plan_key && !isCanceled && !isPendingCancellation)

  if (!subscription?.plan_key) return null

  if (isPendingCancellation) {
    const endDate = formatDate(cancellation?.current_period_end || subscription?.ends_at)

    return (
      <section className="subscription-cancellation is-pending">
        <div>
          <strong>Suscripción cancelada</strong>
          <p>
            Tu suscripción ya está cancelada y terminará el {endDate || "al final del período actual"}.
            Puedes contratar otro plan cuando lo necesites.
          </p>
        </div>
      </section>
    )
  }

  if (isCanceled) {
    return (
      <section className="subscription-cancellation is-canceled">
        <div>
          <strong>Suscripción cancelada</strong>
          <p>Tu suscripción está cancelada. Puedes contratar otro plan para reactivar tu tienda.</p>
        </div>
      </section>
    )
  }

  if (!canCancel) return null

  return (
    <section className="subscription-cancellation">
      <div>
        <strong>Cancelar suscripción</strong>
        <p>Si cancelas, conservarás el acceso hasta el final del período pagado.</p>
      </div>
      <button type="button" onClick={onCancelSubscription} disabled={cancelLoading}>
        {cancelLoading ? "Cancelando..." : "Cancelar al final del período"}
      </button>
    </section>
  )
}

function InfoPill({ label, value }) {
  return (
    <div className="subscription-current__pill">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  )
}

function SubscriptionSkeleton() {
  return (
    <div className="subscription-page">
      <section className="subscription-current subscription-current--loading">
        <span />
        <strong />
        <p />
      </section>
      <section className="subscription-plans">
        {[1, 2, 3].map((item) => (
          <article className="subscription-plan subscription-plan--loading" key={item}>
            <span />
            <strong />
            <p />
            <p />
          </article>
        ))}
      </section>
    </div>
  )
}

function formatSubscriptionPrice(plan = {}) {
  const amount = Number(plan?.price || 0)
  if (!amount) return "Gratis"

  const normalizedAmount = amount >= 1000 ? amount / 100 : amount
  const currency = String(plan.currency || "MXN").toUpperCase()
  const interval = plan.interval === "year" ? " /año" : plan.interval === "month" ? " /mes" : ""

  return `${new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(normalizedAmount)}${interval}`
}

function normalizeBillingOptions(plan = {}) {
  if (Array.isArray(plan.billing_options) && plan.billing_options.length) {
    return plan.billing_options.map((option) => ({
      key: option.key || "monthly",
      label: option.label || formatSubscriptionPrice(option),
      price: option.price,
      amount: option.amount,
      currency: option.currency || plan.currency || "MXN",
      interval: option.interval || (option.key === "annual" ? "year" : "month"),
      months_charged: Number(option.months_charged ?? 0),
      months_free: Number(option.months_free ?? 0),
      savings_label: option.savings_label || "",
    }))
  }

  return [
    {
      key: plan.default_billing_period || "monthly",
      label: plan.label || formatSubscriptionPrice(plan),
      price: plan.price,
      amount: plan.amount,
      currency: plan.currency || "MXN",
      interval: plan.interval || "month",
      months_charged: 1,
      months_free: 0,
      savings_label: "",
    },
  ]
}

function isSubscriptionCancelled(subscription) {
  const status = String(subscription?.status || "").toLowerCase()

  return ["canceled", "cancelled"].includes(status) || Boolean(subscription?.cancellation?.cancel_at_period_end)
}

function translateSubscriptionStatus(status) {
  const map = {
    active: "activo",
    trialing: "en prueba",
    past_due: "con pago pendiente",
    suspended: "suspendido",
    canceled: "cancelado",
    cancelled: "cancelado",
    incomplete: "incompleto",
  }

  return map[String(status || "").toLowerCase()] || status || "sin estatus"
}

function formatModuleName(value = "") {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return ""

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export default SubscriptionPage
