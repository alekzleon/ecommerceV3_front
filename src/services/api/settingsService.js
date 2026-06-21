import api from "./api"

function multipartConfig(payload) {
  return payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}
}

export async function getPublicSettings() {
  const { data } = await api.get("/settings")
  return data
}

export async function getPublicNavTitle() {
  const { data } = await api.get("/ecommerce-settings/nav-title")
  return data
}

export async function getPublicGeneralLogo() {
  const { data } = await api.get("/ecommerce-settings/general-logo")
  return data
}

export async function getPublicContactFaqImage() {
  const { data } = await api.get("/ecommerce-settings/contact-faq-image")
  return data
}

export async function getPublicContactMapUrl() {
  const { data } = await api.get("/ecommerce-settings/contact-map-url")
  return data
}

export async function getPublicMetaPixel() {
  const { data } = await api.get("/ecommerce-settings/meta-pixel")
  return data
}

export async function getPublicAbandonedCartSettings() {
  const { data } = await api.get("/ecommerce-settings/abandoned-cart")
  return data
}

export async function getPublicHomeBenefits() {
  const { data } = await api.get("/ecommerce-settings/home-benefits")
  return data
}

export async function getPublicHomeBenefit(benefitId) {
  const { data } = await api.get(`/ecommerce-settings/home-benefits/${benefitId}`)
  return data
}

export async function getAdminSettings() {
  const { data } = await api.get("/admin/settings")
  return data
}

export async function getAdminNavTitle() {
  const { data } = await api.get("/admin/ecommerce-settings/nav-title")
  return data
}

export async function getAdminGeneralLogo() {
  const { data } = await api.get("/admin/ecommerce-settings/general-logo")
  return data
}

export async function getAdminContactFaqImage() {
  const { data } = await api.get("/admin/ecommerce-settings/contact-faq-image")
  return data
}

export async function getAdminContactMapUrl() {
  const { data } = await api.get("/admin/ecommerce-settings/contact-map-url")
  return data
}

export async function getAdminMetaPixel() {
  const { data } = await api.get("/admin/ecommerce-settings/meta-pixel")
  return data
}

export async function getAdminAbandonedCartSettings() {
  const { data } = await api.get("/admin/ecommerce-settings/abandoned-cart")
  return data
}

export async function getAdminHomeBenefits() {
  const { data } = await api.get("/admin/ecommerce-settings/home-benefits")
  return data
}

export async function getAdminHomeBenefit(benefitId) {
  const { data } = await api.get(`/admin/ecommerce-settings/home-benefits/${benefitId}`)
  return data
}

export async function createAdminSettings(payload) {
  const { data } = await api.post("/admin/settings", payload, multipartConfig(payload))
  return data
}

export async function updateAdminSettings(id, payload) {
  const { data } = await api.put(`/admin/settings/${id}`, payload, multipartConfig(payload))
  return data
}

export async function updateAdminSettingValue({ settingsId, key, value }) {
  if (key === "nav_title.title") {
    return updateAdminNavTitle(value)
  }

  const payload = { [key]: value }

  if (settingsId) {
    const { data } = await api.put(`/admin/settings/${settingsId}`, payload)
    return data
  }

  const { data } = await api.post("/admin/settings", payload)
  return data
}

export async function updateAdminNavTitle(title) {
  const { data } = await api.patch("/admin/ecommerce-settings/nav-title", { title })
  return data
}

export async function updateAdminGeneralLogo(file) {
  const payload = new FormData()
  payload.append("logo", file)

  const { data } = await api.post("/admin/ecommerce-settings/general-logo", payload, multipartConfig(payload))
  return data
}

export async function updateAdminContactFaqImage(file) {
  const payload = new FormData()
  payload.append("image", file)

  const { data } = await api.post("/admin/ecommerce-settings/contact-faq-image", payload, multipartConfig(payload))
  return data
}

export async function updateAdminContactMapUrl(url) {
  const { data } = await api.patch("/admin/ecommerce-settings/contact-map-url", { url })
  return data
}

export async function updateAdminMetaPixel(pixelId) {
  const { data } = await api.patch("/admin/ecommerce-settings/meta-pixel", {
    pixel_id: pixelId || null,
  })
  return data
}

export async function updateAdminAbandonedCartSettings(payload) {
  const { data } = await api.patch("/admin/ecommerce-settings/abandoned-cart", payload)
  return data
}

export async function updateAdminHomeBenefit(benefitId, payload, options = {}) {
  const method = options.hasFile ? "post" : "patch"
  const { data } = await api[method](
    `/admin/ecommerce-settings/home-benefits/${benefitId}`,
    payload,
    multipartConfig(payload)
  )
  return data
}

export async function deleteAdminSettings(id) {
  const { data } = await api.delete(`/admin/settings/${id}`)
  return data
}
