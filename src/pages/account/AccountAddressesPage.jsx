import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  createAccountAddress,
  deleteAccountAddress,
  getAccountAddresses,
  setAccountAddressDefault,
  updateAccountAddress,
} from "../../services/api/accountService"
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from "../../utils/toast"
import "./account-addresses.css"

const emptyAddressForm = {
  alias: "",
  street: "",
  address_line_2: "",
  zip_code: "",
  neighborhood: "",
  state: "",
  delivery_note: "",
  contact_name: "",
  phone: "",
  is_default: false,
}

function AccountAddressesPage() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [defaultingId, setDefaultingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [form, setForm] = useState(emptyAddressForm)

  useEffect(() => {
    loadInitialData()
  }, [])

  const sortedAddresses = useMemo(() => {
    return [...addresses].sort((a, b) => Number(b.is_default) - Number(a.is_default))
  }, [addresses])

  async function loadInitialData() {
    try {
      setLoading(true)
      const addressesResponse = await getAccountAddresses()

      setAddresses(normalizeAddresses(addressesResponse))
    } catch (error) {
      console.error("Error al cargar direcciones:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar tus direcciones.")
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingAddressId(null)
    setForm({
      ...emptyAddressForm,
      is_default: addresses.length === 0,
    })
    setModalOpen(true)
  }

  function openEditModal(address) {
    setEditingAddressId(address.id)
    setForm({
      alias: address.alias || "",
      street: address.street || "",
      address_line_2: address.address_line_2 || "",
      zip_code: address.zip_code || "",
      neighborhood: address.neighborhood || "",
      state: address.state || "",
      delivery_note: address.delivery_note || "",
      contact_name: address.contact_name || "",
      phone: address.phone || "",
      is_default: Boolean(address.is_default),
    })
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditingAddressId(null)
    setForm(emptyAddressForm)
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.alias.trim() || !form.street.trim() || !form.zip_code.trim()) {
      notifyWarning("Completa alias, calle y código postal.")
      return
    }

    try {
      setSaving(true)
      const payload = buildAddressPayload(form)
      const response = editingAddressId
        ? await updateAccountAddress(editingAddressId, payload)
        : await createAccountAddress(payload)

      notifySuccess(
        response?.message ||
          (editingAddressId ? "Dirección actualizada correctamente." : "Dirección agregada correctamente.")
      )
      setModalOpen(false)
      setEditingAddressId(null)
      setForm(emptyAddressForm)
      await loadInitialData()
    } catch (error) {
      console.error("Error al guardar dirección:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la dirección.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSetDefault(address) {
    if (address.is_default) {
      notifyInfo("Esta ya es tu dirección predeterminada.")
      return
    }

    try {
      setDefaultingId(address.id)
      const response = await setAccountAddressDefault(address.id)
      notifySuccess(response?.message || "Dirección predeterminada actualizada.")
      await loadInitialData()
    } catch (error) {
      console.error("Error al marcar default:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar la predeterminada.")
    } finally {
      setDefaultingId(null)
    }
  }

  async function handleDeleteAddress(address) {
    if (!window.confirm(`¿Eliminar la dirección "${address.alias}"?`)) return

    try {
      setDeletingId(address.id)
      const response = await deleteAccountAddress(address.id)
      notifySuccess(response?.message || "Dirección eliminada correctamente.")
      await loadInitialData()
    } catch (error) {
      console.error("Error al eliminar dirección:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar la dirección.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="account_addresses_page">
      <div className="account_addresses_shell">
        <div className="account_addresses_breadcrumb">
          <Link to="/mi-cuenta">Mi cuenta</Link>
          <span>›</span>
          <span>Mis direcciones</span>
        </div>

        <header className="account_addresses_header">
          <div>
            <h1 className="account_addresses_title">Mis direcciones</h1>
            <p className="account_addresses_text">
              Consulta tus domicilios de entrega y define cuál usar como predeterminada.
            </p>
          </div>
          <button type="button" className="address_header_btn" onClick={openCreateModal}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Agregar dirección
          </button>
        </header>

        {loading ? (
          <div className="address_empty_state">
            <h2>Cargando direcciones...</h2>
            <p>Estamos obteniendo tus domicilios guardados.</p>
          </div>
        ) : sortedAddresses.length === 0 ? (
          <div className="address_empty_state">
            <h2>No hay direcciones disponibles</h2>
            <p>Agrega una dirección de entrega para poder completar tus pedidos.</p>
            <button type="button" className="address_btn address_btn_primary" onClick={openCreateModal}>
              Agregar dirección
            </button>
          </div>
        ) : (
          <section className="account_addresses_grid">
            <button type="button" className="address_add_card" onClick={openCreateModal}>
              <span className="address_add_plus">+</span>
              <span className="address_add_text">Agregar dirección</span>
            </button>

            {sortedAddresses.map((address) => (
              <article className="address_card" key={address.id}>
                <div className="address_card_top">
                  <div className="address_card_top_label">
                    {address.is_default ? (
                      <>
                        <span className="address_default_text">Predeterminada:</span>
                        <span className="address_default_brand">Tienda</span>
                      </>
                    ) : (
                      <span className="address_secondary_text">Dirección guardada</span>
                    )}
                  </div>
                </div>

                <div className="address_card_body">
                  <h2 className="address_name">{address.contact_name || "Sin contacto"}</h2>

                  <p className="address_line">
                    <strong>{address.alias || "Sin alias"}</strong>
                  </p>

                  <p className="address_line">{address.street || "-"}</p>
                  {address.address_line_2 ? (
                    <p className="address_line">{address.address_line_2}</p>
                  ) : null}
                  <p className="address_line">{address.neighborhood || "-"}</p>
                  <p className="address_line">
                    {[address.zip_code, address.state].filter(Boolean).join(", ") || "-"}
                  </p>
                  <p className="address_line">Número de teléfono: {address.phone || "-"}</p>

                  {address.delivery_note ? (
                    <button
                      type="button"
                      className="address_instruction_link"
                      onClick={() => notifyInfo(`Instrucciones: ${address.delivery_note}`)}
                    >
                      Ver instrucciones de entrega
                    </button>
                  ) : null}
                </div>

                <div className="address_card_actions">
                  <button
                    type="button"
                    className={`address_favorite_btn ${address.is_default ? "is-active" : ""}`}
                    onClick={() => handleSetDefault(address)}
                    disabled={defaultingId === address.id || address.is_default}
                    aria-label={address.is_default ? "Dirección predeterminada" : "Marcar como predeterminada"}
                    title={address.is_default ? "Predeterminada" : "Marcar como predeterminada"}
                  >
                    <i className={`bi ${address.is_default ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
                  </button>

                  <div className="address_card_footer_links">
                    <button
                      type="button"
                      className="address_action_link"
                      onClick={() => openEditModal(address)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="address_action_link address_action_link--danger"
                      onClick={() => handleDeleteAddress(address)}
                      disabled={deletingId === address.id}
                    >
                      {deletingId === address.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {modalOpen ? (
        <div className="address_modal_overlay" role="dialog" aria-modal="true">
          <form className="address_modal" onSubmit={handleSubmit}>
            <div className="address_modal_header">
              <div>
                <h2>{editingAddressId ? "Editar dirección" : "Agregar dirección"}</h2>
                <p>Completa los datos de entrega para tu cuenta.</p>
              </div>
              <button type="button" className="address_modal_close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="address_modal_body">
              <div className="address_form_grid">
                <label>
                  Alias
                  <input name="alias" value={form.alias} onChange={handleFormChange} placeholder="Casa" />
                </label>
                <label>
                  Contacto
                  <input name="contact_name" value={form.contact_name} onChange={handleFormChange} placeholder="Juan Pérez" />
                </label>
                <label>
                  Teléfono
                  <input name="phone" value={form.phone} onChange={handleFormChange} placeholder="3312345678" />
                </label>
                <label className="address_form_full">
                  Calle y número
                  <input name="street" value={form.street} onChange={handleFormChange} placeholder="Av. Principal 123" />
                </label>
                <label className="address_form_full">
                  Complemento
                  <input name="address_line_2" value={form.address_line_2} onChange={handleFormChange} placeholder="Interior 4B, edificio azul" />
                </label>
                <label>
                  Código postal
                  <input name="zip_code" value={form.zip_code} onChange={handleFormChange} placeholder="44100" />
                </label>
                <label>
                  Colonia
                  <input name="neighborhood" value={form.neighborhood} onChange={handleFormChange} placeholder="Centro" />
                </label>
                <label>
                  Estado
                  <input name="state" value={form.state} onChange={handleFormChange} placeholder="Jalisco" />
                </label>
                <label className="address_form_full">
                  Instrucciones de entrega
                  <textarea name="delivery_note" value={form.delivery_note} onChange={handleFormChange} rows="3" placeholder="Tocar el timbre negro. Entregar en recepción." />
                </label>
                <label className="address_default_check">
                  <input type="checkbox" name="is_default" checked={form.is_default} onChange={handleFormChange} />
                  Usar como dirección predeterminada
                </label>
              </div>
            </div>

            <div className="address_modal_actions">
              <button type="button" className="address_btn address_btn_secondary" onClick={closeModal}>
                Cancelar
              </button>
              <button type="submit" className="address_btn address_btn_primary" disabled={saving}>
                {saving ? "Guardando..." : editingAddressId ? "Guardar dirección" : "Agregar dirección"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function normalizeAddresses(response) {
  const data = response?.data?.data || response?.data || response || []
  return Array.isArray(data) ? data : []
}

function buildAddressPayload(form) {
  return {
    alias: form.alias.trim(),
    street: form.street.trim(),
    address_line_2: form.address_line_2.trim(),
    zip_code: form.zip_code.trim(),
    neighborhood: form.neighborhood.trim(),
    state: form.state.trim(),
    delivery_note: form.delivery_note.trim(),
    contact_name: form.contact_name.trim(),
    phone: form.phone.trim(),
    is_default: Boolean(form.is_default),
  }
}

export default AccountAddressesPage
