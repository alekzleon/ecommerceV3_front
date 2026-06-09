import api from "./api"

export async function getProducts(params = {}) {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set("page", String(params.page))
  if (params.per_page) searchParams.set("per_page", String(params.per_page))
  if (params.sort) searchParams.set("sort", params.sort)
  if (params.search) searchParams.set("search", params.search)
  if (params.category_id) searchParams.set("category_id", String(params.category_id))
  if (params.category_slug) searchParams.set("category_slug", params.category_slug)
  if (params.family_id) searchParams.set("family_id", String(params.family_id))
  if (params.family_slug) searchParams.set("family_slug", params.family_slug)
  if (params.brand) searchParams.set("brand", params.brand)

  const { data } = await api.get("/products", { params: searchParams })
  return data
}

export async function getProductDetail(slug) {
  const { data } = await api.get(`/products/${slug}`)
  return data
}

export async function getRecentPurchases() {
  const { data } = await api.get("/products/recent-purchases")
  return data
}

export async function getSearchSuggestions(query) {
  const { data } = await api.get("/search/suggestions", {
    params: {
      q: query,
    },
  })
  return data
}

export async function getCatalogSidebar() {
  const { data } = await api.get("/catalog/sidebar")
  return data
}
