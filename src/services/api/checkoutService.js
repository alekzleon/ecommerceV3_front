import api from "./api.js"
import { mergeSalesTrackingPayload } from "../../utils/salesTracking.js"
import { hasAuthSession } from "../storage/authStorage.js"
import { getStoredGuestToken } from "./cartService.js"

function guestConfig() {
  const guestToken = getStoredGuestToken()

  return {
    headers: guestToken ? { "X-Guest-Token": guestToken } : {},
  }
}

function withGuestToken(payload = {}) {
  const guestToken = getStoredGuestToken()

  return guestToken ? { ...payload, guest_token: guestToken } : payload
}

export async function createCheckoutOrder(payload = {}) {
  if (!hasAuthSession()) {
    const response = await api.post(
      "/guest/checkout/orders",
      mergeSalesTrackingPayload(withGuestToken(payload)),
      guestConfig()
    )
    return response.data
  }

  const response = await api.post("/checkout/orders", mergeSalesTrackingPayload(payload))
  return response.data
}

export async function createStripeCheckoutSession(payload) {
  if (!hasAuthSession()) {
    const response = await api.post(
      "/guest/checkout/stripe/session",
      withGuestToken(payload),
      guestConfig()
    )
    return response.data
  }

  const response = await api.post("/checkout/stripe/session", payload)
  return response.data
}

export async function confirmStripeCheckoutSession(payload) {
  if (!hasAuthSession()) {
    const response = await api.post(
      "/guest/checkout/stripe/session/confirm",
      withGuestToken(payload),
      guestConfig()
    )
    return response.data
  }

  const response = await api.post("/checkout/stripe/session/confirm", payload)
  return response.data
}

export async function getCheckoutOrder(orderId) {
  const response = await api.get(`/checkout/orders/${orderId}`)
  return response.data
}

export async function restoreCheckoutOrderCart(orderId, payload = {}) {
  const response = await api.post(`/checkout/orders/${orderId}/restore-cart`, payload)
  return response.data
}

export async function restoreRecoverableOrderCart(payload = {}) {
  const response = await api.post("/checkout/recoverable-order/restore", payload)
  return response.data
}
