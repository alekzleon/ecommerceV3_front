import api from "./api.js"

export async function getAdminProductVariantAttributes(productId) {
  const { data } = await api.get(`/admin/products/${productId}/variant-attributes`)
  return data
}

export async function createAdminProductVariantAttribute(productId, payload) {
  const { data } = await api.post(`/admin/products/${productId}/variant-attributes`, payload)
  return data
}

export async function createAdminProductVariantAttributeValue(productId, attributeId, payload) {
  const { data } = await api.post(
    `/admin/products/${productId}/variant-attributes/${attributeId}/values`,
    payload
  )
  return data
}

export async function getAdminProductVariants(productId) {
  const { data } = await api.get(`/admin/products/${productId}/variants`)
  return data
}

export async function createAdminProductVariant(productId, payload) {
  const { data } = await api.post(`/admin/products/${productId}/variants`, payload)
  return data
}

export async function updateAdminProductVariant(productId, variantId, payload) {
  const { data } = await api.post(`/admin/products/${productId}/variants/${variantId}`, payload)
  return data
}

export async function updateAdminProductVariantStatus(productId, variantId, isActive) {
  const { data } = await api.patch(`/admin/products/${productId}/variants/${variantId}/status`, {
    is_active: isActive,
  })
  return data
}

export async function reorderAdminProductVariants(productId, variants) {
  const { data } = await api.post(`/admin/products/${productId}/variants/reorder`, { variants })
  return data
}
