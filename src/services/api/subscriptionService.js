import api from "./api"

export async function getTenantSubscription() {
  const { data } = await api.get("/tenant/subscription")
  return data
}

export async function getTenantSubscriptionPlans() {
  const { data } = await api.get("/tenant/subscription/plans")
  return data
}

export async function createTenantSubscriptionCheckout(planKey) {
  const { data } = await api.post("/tenant/subscription/checkout", {
    plan_key: planKey,
  })
  return data
}

export async function confirmTenantSubscriptionCheckout(sessionId) {
  const { data } = await api.post("/tenant/subscription/checkout/confirm", {
    session_id: sessionId,
  })
  return data
}
