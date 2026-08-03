import api from "./api"

export async function getAdminCarts(params = {}) {
  const { data } = await api.get("/admin/carts", { params })
  return data
}
