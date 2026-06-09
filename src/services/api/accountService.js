import api from "./api"

export async function getAccountProfile() {
  const response = await api.get("/account/profile")
  return response.data
}

export async function changeAccountPassword(payload) {
  const response = await api.post("/change-password", payload)
  return response.data
}

export async function getCustomerPfrProfile() {
  const response = await api.get("/account/customer-pfr-profile")
  return response.data
}

export async function saveCustomerPfrProfile(payload) {
  const response = await api.post("/account/customer-pfr-profile", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
  return response.data
}

export async function getAccountAddresses() {
  const response = await api.get("/account/addresses")
  return response.data
}

export async function createAccountAddress(payload) {
  const response = await api.post("/account/addresses", payload)
  return response.data
}

export async function getAccountAddress(addressId) {
  const response = await api.get(`/account/addresses/${addressId}`)
  return response.data
}

export async function updateAccountAddress(addressId, payload) {
  const response = await api.patch(`/account/addresses/${addressId}`, payload)
  return response.data
}

export async function deleteAccountAddress(addressId) {
  const response = await api.delete(`/account/addresses/${addressId}`)
  return response.data
}

export async function setAccountAddressDefault(addressId) {
  const response = await api.patch(`/account/addresses/${addressId}/default`)
  return response.data
}

export async function getAccountFavorites(params = {}) {
  const response = await api.get("/account/favorites", { params })
  return response.data
}

export async function toggleAccountFavorite(productId) {
  const response = await api.post("/account/favorites/toggle", {
    product_id: productId,
  })
  return response.data
}
