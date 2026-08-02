import { useCallback, useEffect, useMemo, useState } from "react"
import {
  createTenantSubscriptionCheckout,
  getTenantSubscription,
  getTenantSubscriptionPlans,
} from "../../../services/api/subscriptionService"
import { notifyError } from "../../../utils/toast"
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

  async function handleCheckout(planKey) {
    try {
      setCheckoutPlanKey(planKey)
      const response = await createTenantSubscriptionCheckout(planKey)
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
        {plansData.plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            checkoutPlanKey={checkoutPlanKey}
            onCheckout={handleCheckout}
          />
        ))}
      </section>
    </div>
  )
}

function PlanCard({ plan, checkoutPlanKey, onCheckout }) {
  const modules = Array.isArray(plan.included_modules) ? plan.included_modules : []
  const includesAllModules = modules.includes("*")
  const features = Array.isArray(plan.features) ? plan.features : []

  return (
    <article className={`subscription-plan ${plan.is_current ? "is-current" : ""}`}>
      <div className="subscription-plan__head">
        <div>
          <span>{plan.is_current ? "Seleccionado" : "Disponible"}</span>
          <h2>{plan.name}</h2>
          <p>{plan.description}</p>
        </div>
        <strong>{plan.label || formatSubscriptionPrice(plan)}</strong>
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
        {plan.is_current ? (
          <span>Plan actual</span>
        ) : plan.can_checkout ? (
          <button
            type="button"
            onClick={() => onCheckout(plan.key)}
            disabled={checkoutPlanKey === plan.key}
          >
            {checkoutPlanKey === plan.key ? "Abriendo pago..." : "Contratar"}
          </button>
        ) : (
          <span>No disponible para checkout</span>
        )}
      </div>
    </article>
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
  const interval = plan.interval === "month" ? " /mes" : ""

  return `${new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(normalizedAmount)}${interval}`
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
