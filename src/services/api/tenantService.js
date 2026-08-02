import api from "./api"

export async function probeTenant() {
  const { data } = await api.get("/tenant/probe")
  return data
}
