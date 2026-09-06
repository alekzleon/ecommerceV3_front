import api from "./api"

export async function getAdminPaymentMethods() {
  const { data } = await api.get("/admin/ecommerce-settings/payment-methods")
  return data
}

export async function updateAdminPaymentMethods(payload) {
  const { data } = await api.patch("/admin/ecommerce-settings/payment-methods", payload)
  return data
}

export async function getPublicPaymentMethods() {
  const { data } = await api.get("/ecommerce-settings/payment-methods")
  return data
}
