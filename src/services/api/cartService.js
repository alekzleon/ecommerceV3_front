import api from "./api"
import { mergeSalesTrackingPayload } from "../../utils/salesTracking"
import { hasAuthSession } from "../storage/authStorage"

const GUEST_TOKEN_STORAGE_KEY = "ecommerce_guest_token"

function getGuestToken() {
  return localStorage.getItem(GUEST_TOKEN_STORAGE_KEY) || ""
}

function persistGuestToken(payload) {
  const data = payload?.data?.cart || payload?.data || payload?.cart || payload || {}
  const guestToken = data?.guest_token

  if (guestToken) {
    localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, guestToken)
  }

  return guestToken || getGuestToken()
}

function guestConfig(params = {}) {
  const guestToken = getGuestToken()

  return {
    headers: guestToken ? { "X-Guest-Token": guestToken } : {},
    params: {
      ...(guestToken ? { guest_token: guestToken } : {}),
      ...params,
    },
  }
}

function withGuestToken(payload = {}) {
  const guestToken = getGuestToken()

  return guestToken ? { ...payload, guest_token: guestToken } : payload
}

export async function addCartItem(payload) {
  if (!hasAuthSession()) {
    await ensureGuestCart()
    const response = await api.post(
      "/guest/cart/items",
      mergeSalesTrackingPayload(withGuestToken(payload)),
      guestConfig()
    )
    persistGuestToken(response.data)
    return response.data
  }

  const response = await api.post("/cart/items", mergeSalesTrackingPayload(payload))
  return response.data
}

export async function updateCartSalesChannel(payload = {}) {
  const response = await api.patch("/cart/sales-channel", mergeSalesTrackingPayload(payload))
  return response.data
}

export async function getCart() {
  if (!hasAuthSession()) {
    return ensureGuestCart()
  }

  const response = await api.get("/cart")
  return response.data
}

export async function getCartSummary() {
  if (!hasAuthSession()) {
    const response = await ensureGuestCart()
    return response?.data?.cart || response?.data || response
  }

  const response = await api.get("/cart/summary")
  return response.data
}

export async function updateCartItem(itemId, payload) {
  if (!hasAuthSession()) {
    const response = await api.patch(`/guest/cart/items/${itemId}`, withGuestToken(payload), guestConfig())
    persistGuestToken(response.data)
    return response.data
  }

  const response = await api.patch(`/cart/items/${itemId}`, payload)
  return response.data
}

export async function removeCartItem(itemId) {
  if (!hasAuthSession()) {
    const response = await api.delete(`/guest/cart/items/${itemId}`, guestConfig())
    persistGuestToken(response.data)
    return response.data
  }

  const response = await api.delete(`/cart/items/${itemId}`)
  return response.data
}

export async function clearCart() {
  if (!hasAuthSession()) {
    const response = await api.delete("/guest/cart", guestConfig())
    persistGuestToken(response.data)
    return response.data
  }

  const response = await api.delete("/cart")
  return response.data
}

export async function recoverAbandonedCart(cartId) {
  const response = await api.post(`/cart/abandoned/${cartId}/recover`)
  return response.data
}

export async function applyCartCoupon(payload) {
  const response = await api.post("/cart/coupon", payload)
  return response.data
}

export async function clearCartCoupon() {
  const response = await api.delete("/cart/coupon")
  return response.data
}

export async function selectCartPromotionGift(promotionId, payload) {
  const response = await api.post(
    `/cart/promotions/${promotionId}/select-gift`,
    payload
  )
  return response.data
}

export async function clearCartPromotionGiftSelection(promotionId) {
  const response = await api.delete(`/cart/promotions/${promotionId}/select-gift`)
  return response.data
}

export async function applyCartCashback(payload) {
  const response = await api.post("/cart/cashback/apply", payload)
  return response.data
}

export async function clearCartCashback() {
  const response = await api.delete("/cart/cashback")
  return response.data
}

export async function addCartPromotionGiftProduct(promotionId) {
  const response = await api.post(`/cart/promotions/${promotionId}/add-gift-product`)
  return response.data
}

export async function downloadCartExcelLayout() {
  const response = await api.get("/cart/excel/layout", {
    responseType: "blob",
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  })

  return response
}

export async function importCartExcelFile(file) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await api.post("/cart/excel/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data
}

export async function getCheckoutPreview(params = {}) {
  if (!hasAuthSession()) {
    await ensureGuestCart()
    const response = await api.get("/guest/checkout/preview", guestConfig(params))
    persistGuestToken(response.data)
    return response.data
  }

  const response = await api.get("/checkout/preview", { params })
  return response.data
}

export async function validateCheckout(payload = {}) {
  if (!hasAuthSession()) {
    return getCheckoutPreview()
  }

  const response = await api.post("/checkout/validate", mergeSalesTrackingPayload(payload))
  return response.data
}

export async function ensureGuestCart() {
  const response = await api.get("/guest/cart", guestConfig())
  persistGuestToken(response.data)
  return response.data
}

export function getStoredGuestToken() {
  return getGuestToken()
}

export function clearStoredGuestToken() {
  localStorage.removeItem(GUEST_TOKEN_STORAGE_KEY)
}
