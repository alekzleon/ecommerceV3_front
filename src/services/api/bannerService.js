import api from "./api.js"
import { normalizeMediaUrl } from "../../utils/mediaUrl.js"

function getMultipartConfig(payload) {
  return payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {}
}

export async function getBanners(params = {}) {
  const { data } = await api.get("/banners", { params })
  return data
}

export function normalizeBannerMediaUrl(banner) {
  const mediaUrl =
    banner?.media_url ||
    banner?.file_url ||
    banner?.image_url ||
    banner?.video_url ||
    banner?.url ||
    ""

  if (mediaUrl) return normalizeMediaUrl(mediaUrl)

  const mediaPath =
    banner?.media_path ||
    banner?.image_path ||
    banner?.video_path ||
    ""

  if (!mediaPath) return ""

  return normalizeMediaUrl(mediaPath)
}

export function getBannerMediaType(banner) {
  const explicitType = banner?.media_type || banner?.file_type || ""

  if (String(explicitType).toLowerCase().includes("video")) return "video"

  const url = normalizeBannerMediaUrl(banner).toLowerCase()
  if (/\.(mp4|webm|ogg|mov)(\?|$)/.test(url)) return "video"

  return "image"
}

export async function getAdminBanners(params = {}) {
  const { data } = await api.get("/admin/banners", { params })
  return data
}

export async function createAdminBanner(payload) {
  const { data } = await api.post("/admin/banners", payload, getMultipartConfig(payload))
  return data
}

export async function getAdminBanner(id) {
  const { data } = await api.get(`/admin/banners/${id}`)
  return data
}

export async function updateAdminBanner(id, payload) {
  if (payload instanceof FormData) {
    payload.append("_method", "PATCH")
    const { data } = await api.post(`/admin/banners/${id}`, payload, getMultipartConfig(payload))
    return data
  }

  const { data } = await api.patch(`/admin/banners/${id}`, payload)
  return data
}

export async function deleteAdminBanner(id) {
  const { data } = await api.delete(`/admin/banners/${id}`)
  return data
}

export async function toggleAdminBanner(id) {
  const { data } = await api.patch(`/admin/banners/${id}/toggle`)
  return data
}

export async function reorderAdminBanners(payload) {
  const { data } = await api.post("/admin/banners/reorder", payload)
  return data
}
