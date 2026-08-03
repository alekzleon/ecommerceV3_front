import api from "./api"

export async function getStripeConnectStatus() {
  const { data } = await api.get("/tenant/stripe-connect/status")
  return data
}

export async function createStripeConnectAccount() {
  const { data } = await api.post("/tenant/stripe-connect/account")
  return data
}

export async function createStripeConnectOnboardingLink() {
  const { data } = await api.post("/tenant/stripe-connect/onboarding-link")
  return data
}
