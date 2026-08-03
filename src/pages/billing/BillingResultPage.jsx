import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  confirmTenantSubscriptionCheckout,
  getTenantSubscription,
} from "../../services/api/subscriptionService"
import { useAuth } from "../../context/AuthContext"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast"
import "./BillingResultPage.css"

function BillingResultPage({ type = "success" }) {
  const { refreshMe } = useAuth()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const confirmAttemptedRef = useRef(false)
  const [status, setStatus] = useState(type === "success" && sessionId ? "confirming" : "idle")
  const [subscription, setSubscription] = useState(null)
  const copy = getBillingResultCopy(type)

  useEffect(() => {
    if (type !== "success" || !sessionId || confirmAttemptedRef.current) return

    confirmAttemptedRef.current = true

    async function confirmCheckout() {
      try {
        setStatus("confirming")
        const response = await confirmTenantSubscriptionCheckout(sessionId)
        const [subscriptionResponse] = await Promise.allSettled([
          getTenantSubscription(),
          refreshMe(),
        ])

        if (subscriptionResponse.status === "fulfilled") {
          setSubscription(subscriptionResponse.value?.data || null)
        }

        setStatus("confirmed")
        notifySuccess(response?.message || "Suscripción actualizada correctamente.")
      } catch (error) {
        const statusCode = error?.response?.status || error?.status

        console.error("Error confirmando checkout de suscripción:", error?.response?.data || error)

        if (statusCode === 404 || statusCode === 405) {
          setStatus("pending")
          notifyWarning("El pago fue recibido. Estamos esperando la confirmación automática de Stripe.")
          return
        }

        setStatus("pending")
        notifyError(
          error?.response?.data?.message ||
            error?.message ||
            "El pago fue recibido, pero no pudimos actualizar el plan todavía."
        )
      }
    }

    confirmCheckout()
  }, [refreshMe, sessionId, type])

  return (
    <main className="billing-result">
      <section className={`billing-result__panel ${copy.className}`}>
        <span className="billing-result__icon">
          <i className={`bi ${copy.icon}`} aria-hidden="true" />
        </span>

        <span className="billing-result__eyebrow">{copy.eyebrow}</span>
        <h1>{getBillingTitle(copy, status)}</h1>
        <p>{getBillingMessage(copy, status)}</p>
        {subscription ? (
          <p>
            Plan {subscription.plan?.name || subscription.plan_key || "-"} · Estado{" "}
            {translateSubscriptionStatus(subscription.status)}
          </p>
        ) : null}

        <div className="billing-result__actions">
          <Link to="/admin/subscription" className="billing-result__primary">
            Ver suscripción
          </Link>
          <Link to="/admin" className="billing-result__secondary">
            Ir al admin
          </Link>
        </div>
      </section>
    </main>
  )
}

function getBillingTitle(copy, status) {
  const titles = {
    confirming: "Confirmando tu suscripción",
    confirmed: "Tu plan fue actualizado",
    pending: "Pago recibido",
  }

  return titles[status] || copy.title
}

function getBillingMessage(copy, status) {
  const messages = {
    confirming: "Validamos la sesión con Stripe para activar tu nuevo plan.",
    confirmed: "Ya puedes volver a Suscripción para revisar los atributos de tu plan actual.",
    pending: "Estamos esperando la confirmación automática de Stripe. Si el plan no cambia de inmediato, revisa nuevamente en unos segundos.",
  }

  return messages[status] || copy.message
}

function getBillingResultCopy(type) {
  if (type === "cancel") {
    return {
      className: "is-cancel",
      icon: "bi-x-circle-fill",
      eyebrow: "Pago cancelado",
      title: "No se completó la contratación",
      message: "Puedes volver a Suscripción para elegir un plan o intentar el pago nuevamente.",
    }
  }

  return {
    className: "is-success",
    icon: "bi-check-circle-fill",
    eyebrow: "Pago recibido",
    title: "Tu suscripción está en proceso",
    message: "Estamos actualizando tu plan. Si no lo ves reflejado de inmediato, vuelve a revisar en unos segundos.",
  }
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

export default BillingResultPage
