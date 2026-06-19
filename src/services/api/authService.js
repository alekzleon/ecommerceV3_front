import api from "./api"

function throwResponseData(error) {
  throw error?.response?.data || error
}

export async function loginRequest(payload) {
  try {
    const { data } = await api.post("/login", payload)
    return data
  } catch (error) {
    throwResponseData(error)
  }
}

export async function registerRequest(payload) {
  try {
    const { data } = await api.post("/register", payload)
    return data
  } catch (error) {
    throwResponseData(error)
  }
}

export async function meRequest(token) {
  try {
    const { data } = await api.get("/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return data
  } catch (error) {
    throwResponseData(error)
  }
}

export async function logoutRequest(token) {
  try {
    const { data } = await api.post("/logout", null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return data
  } catch (error) {
    throwResponseData(error)
  }
}
