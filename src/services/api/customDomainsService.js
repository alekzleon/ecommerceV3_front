import api from "./api"

export async function getAdminCustomDomains() {
  const { data } = await api.get("/admin/custom-domains")
  return data
}

export async function createAdminCustomDomain(domain) {
  const { data } = await api.post("/admin/custom-domains", { domain })
  return data
}

export async function getAdminCustomDomain(domainId) {
  const { data } = await api.get(`/admin/custom-domains/${domainId}`)
  return data
}

export async function refreshAdminCustomDomain(domainId) {
  const { data } = await api.post(`/admin/custom-domains/${domainId}/refresh`)
  return data
}

export async function deleteAdminCustomDomain(domainId) {
  const { data } = await api.delete(`/admin/custom-domains/${domainId}`)
  return data
}
