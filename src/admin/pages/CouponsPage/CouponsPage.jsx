import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import {
  assignAdminCouponUsers,
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupon,
  getAdminCouponFormOptions,
  getAdminCoupons,
  toggleAdminCoupon,
  updateAdminCoupon,
} from "../../../services/api/adminCouponService"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import "./CouponsPage.css"

const EMPTY_COUPON_FORM = {
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  usage_limit: "",
  per_user_usage_limit: "",
  is_combinable: false,
  trigger_coupon_id: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  is_general: true,
  user_ids: [],
  campaign: {
    send_email: false,
    send_at: "",
    subject: "",
    message: "",
    user_ids: [],
  },
}

const DEFAULT_OPTIONS = {
  discount_types: [
    { value: "percentage", label: "Porcentaje" },
    { value: "fixed", label: "Monto fijo" },
  ],
  clients: [],
  coupons: [],
  channels: [
    { value: "email", label: "Correo" },
    { value: "whatsapp", label: "WhatsApp" },
  ],
}

function CouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [panelOpen, setPanelOpen] = useState(false)
  const [assignPanelOpen, setAssignPanelOpen] = useState(false)
  const [editingCouponId, setEditingCouponId] = useState(null)
  const [assignmentCoupon, setAssignmentCoupon] = useState(null)
  const [assignmentSearch, setAssignmentSearch] = useState("")
  const [assignmentUserIds, setAssignmentUserIds] = useState([])
  const [form, setForm] = useState(EMPTY_COUPON_FORM)

  useEffect(() => {
    loadCouponsModule()
  }, [])

  const filteredCoupons = useMemo(() => {
    const term = search.trim().toLowerCase()

    return coupons.filter((coupon) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && coupon.is_active) ||
        (statusFilter === "inactive" && !coupon.is_active)

      if (!matchesStatus) return false
      if (!term) return true

      return [coupon.code, coupon.name, coupon.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [coupons, search, statusFilter])

  const activeCount = coupons.filter((coupon) => coupon.is_active).length
  const totalUses = coupons.reduce((sum, coupon) => sum + Number(coupon.usage_count || 0), 0)
  const assignedCount = coupons.filter((coupon) => !coupon.is_general).length
  const isEditing = Boolean(editingCouponId)
  const filteredAssignmentClients = useMemo(() => {
    const term = assignmentSearch.trim().toLowerCase()

    const source = term
      ? options.clients.filter((client) =>
      [client.name, client.email, client.username, client.whatsapp]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
      )
      : options.clients

    return source.slice(0, 5)
  }, [assignmentSearch, options.clients])
  const assignmentHiddenCount = useMemo(() => {
    const term = assignmentSearch.trim().toLowerCase()
    const total = term
      ? options.clients.filter((client) =>
          [client.name, client.email, client.username, client.whatsapp]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term)
        ).length
      : options.clients.length

    return Math.max(total - filteredAssignmentClients.length, 0)
  }, [assignmentSearch, filteredAssignmentClients.length, options.clients])
  const assignedClients = useMemo(() => {
    const assignedSet = new Set(assignmentUserIds.map(Number))
    return options.clients.filter((client) => assignedSet.has(Number(client.id)))
  }, [assignmentUserIds, options.clients])

  async function loadCouponsModule() {
    try {
      setLoading(true)
      const [couponsResponse, optionsResponse] = await Promise.all([
        getAdminCoupons(),
        getAdminCouponFormOptions(),
      ])

      setCoupons(normalizeCoupons(couponsResponse))
      setOptions(normalizeOptions(optionsResponse))
    } catch (error) {
      console.error("Error al cargar cupones:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los cupones.")
    } finally {
      setLoading(false)
    }
  }

  function openCreatePanel() {
    setEditingCouponId(null)
    setForm(EMPTY_COUPON_FORM)
    setPanelOpen(true)
  }

  function openEditPanel(coupon) {
    setEditingCouponId(coupon.id)
    setForm(mapCouponToForm(coupon))
    setPanelOpen(true)
  }

  async function openAssignPanel(coupon) {
    setAssignPanelOpen(true)
    setAssignmentLoading(true)
    setAssignmentSearch("")
    setAssignmentCoupon(coupon)
    setAssignmentUserIds(Array.isArray(coupon.user_ids) ? coupon.user_ids.map(Number) : [])

    try {
      const response = await getAdminCoupon(coupon.id)
      const freshCoupon = normalizeCoupon(response?.data ?? response ?? coupon)
      setAssignmentCoupon(freshCoupon)
      setAssignmentUserIds(Array.isArray(freshCoupon.user_ids) ? freshCoupon.user_ids.map(Number) : [])
    } catch (error) {
      console.error("Error al cargar asignaciones del cupón:", error?.response?.data || error)
      notifyWarning("No fue posible refrescar las asignaciones; se usará la información cargada.")
    } finally {
      setAssignmentLoading(false)
    }
  }

  function closePanel() {
    if (saving) return
    setPanelOpen(false)
    setEditingCouponId(null)
    setForm(EMPTY_COUPON_FORM)
  }

  function closeAssignPanel() {
    if (assigning) return
    setAssignPanelOpen(false)
    setAssignmentCoupon(null)
    setAssignmentSearch("")
    setAssignmentUserIds([])
  }

  function handleFormChange(event) {
    const { name, value, type, checked, selectedOptions } = event.target

    setForm((prev) => {
      const nextValue =
        type === "checkbox"
          ? checked
          : type === "select-multiple"
          ? Array.from(selectedOptions).map((option) => Number(option.value))
          : value
      const [group, field] = name.split(".")

      if (group === "campaign") {
        return {
          ...prev,
          campaign: {
            ...prev.campaign,
            [field]: nextValue,
          },
        }
      }

      const nextForm = {
        ...prev,
        [name]: nextValue,
      }

      if (name === "is_general" && checked) {
        return {
          ...nextForm,
          user_ids: [],
          campaign: {
            ...nextForm.campaign,
            user_ids: [],
          },
        }
      }

      return nextForm
    })
  }

  function toggleAssignmentUser(userId) {
    const numericUserId = Number(userId)

    setAssignmentUserIds((prev) =>
      prev.map(Number).includes(numericUserId)
        ? prev.filter((id) => Number(id) !== numericUserId)
        : [...prev, numericUserId]
    )
    setAssignmentSearch("")
  }

  function removeAssignedUser(userId) {
    const numericUserId = Number(userId)
    setAssignmentUserIds((prev) => prev.filter((id) => Number(id) !== numericUserId))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validation = validateCouponForm(form)
    if (!validation.valid) {
      notifyWarning(validation.message)
      return
    }

    try {
      setSaving(true)
      const payload = buildCouponPayload(form)
      const response = isEditing
        ? await updateAdminCoupon(editingCouponId, payload)
        : await createAdminCoupon(payload)

      notifySuccess(response?.message || (isEditing ? "Cupón actualizado." : "Cupón creado."))
      await loadCouponsModule()
      closePanel()
    } catch (error) {
      console.error("Error al guardar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar el cupón.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleCouponStatus(couponId) {
    try {
      const response = await toggleAdminCoupon(couponId)
      notifySuccess(response?.message || "Estado del cupón actualizado.")
      await loadCouponsModule()
    } catch (error) {
      console.error("Error al cambiar estado de cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cambiar el estado.")
    }
  }

  async function removeCoupon(coupon) {
    if (!window.confirm(`¿Eliminar el cupón ${coupon.code}?`)) return

    try {
      const response = await deleteAdminCoupon(coupon.id)
      notifySuccess(response?.message || "Cupón eliminado.")
      await loadCouponsModule()
    } catch (error) {
      console.error("Error al eliminar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar el cupón.")
    }
  }

  async function handleSaveAssignment() {
    if (!assignmentCoupon?.id) return

    try {
      setAssigning(true)
      const response = await assignAdminCouponUsers(assignmentCoupon.id, {
        user_ids: assignmentUserIds.map(Number),
      })

      notifySuccess(response?.message || "Asignación del cupón actualizada.")
      await loadCouponsModule()
      closeAssignPanel()
    } catch (error) {
      console.error("Error al asignar cupón:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar la asignación.")
    } finally {
      setAssigning(false)
    }
  }

  return (
    <>
      <AdminCard
        title="Cupones"
        subtitle="Crea y administra códigos promocionales para campañas de marketing."
        right={
          <button type="button" className="coupons-button coupons-button--primary" onClick={openCreatePanel}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Nuevo cupón
          </button>
        }
      >
        <div className="coupons-page">
          <section className="coupons-page__summary" aria-label="Resumen de cupones">
            <div>
              <span>Total</span>
              <strong>{coupons.length}</strong>
            </div>
            <div>
              <span>Activos</span>
              <strong>{activeCount}</strong>
            </div>
            <div>
              <span>Asignados</span>
              <strong>{assignedCount}</strong>
            </div>
            <div>
              <span>Usos registrados</span>
              <strong>{totalUses}</strong>
            </div>
          </section>

          <div className="coupons-page__toolbar">
            <label className="coupons-page__search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código, nombre o descripción"
              />
            </label>

            <div className="coupons-page__segmented" role="group" aria-label="Filtrar estado">
              {[
                ["all", "Todos"],
                ["active", "Activos"],
                ["inactive", "Inactivos"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={statusFilter === value ? "is-active" : ""}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="coupons-page__table-wrapper">
            <table className="coupons-page__table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descuento</th>
                  <th>Uso</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="coupons-page__empty">
                      Cargando cupones...
                    </td>
                  </tr>
                ) : filteredCoupons.length ? (
                  filteredCoupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td>
                        <div className="coupons-page__code-cell">
                          <strong>{coupon.code}</strong>
                          <span>{coupon.name}</span>
                          <div className="coupons-page__badges">
                            <span className="coupons-page__badge">
                              {coupon.is_general ? "General" : `${coupon.users_count || coupon.user_ids.length} asignado(s)`}
                            </span>
                            {coupon.is_combinable ? (
                              <span className="coupons-page__badge coupons-page__badge--blue">Combinable</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{formatDiscount(coupon)}</strong>
                      </td>
                      <td>
                        <div className="coupons-page__usage">
                          <strong>{coupon.usage_count || coupon.redemptions_count || 0}</strong>
                          <span>{coupon.usage_limit ? `de ${coupon.usage_limit}` : "sin límite"}</span>
                          <span>
                            {coupon.per_user_usage_limit
                              ? `Por usuario: ${coupon.per_user_usage_limit}`
                              : "Sin límite por usuario"}
                          </span>
                        </div>
                      </td>
                      <td>{formatValidity(coupon)}</td>
                      <td>
                        <label className="coupons-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(coupon.is_active)}
                            onChange={() => toggleCouponStatus(coupon.id)}
                          />
                          <span>{coupon.is_active ? "Activo" : "Inactivo"}</span>
                        </label>
                      </td>
                      <td className="text-end">
                        <div className="coupons-page__actions">
                          <button
                            type="button"
                            className="coupons-action-button"
                            onClick={() => openAssignPanel(coupon)}
                          >
                            Asignar cupón
                          </button>
                          <button
                            type="button"
                            className="coupons-icon-button coupons-icon-button--edit"
                            onClick={() => openEditPanel(coupon)}
                            title="Editar cupón"
                            aria-label={`Editar ${coupon.code}`}
                          >
                            <i className="bi bi-pencil-square" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="coupons-icon-button coupons-icon-button--delete"
                            onClick={() => removeCoupon(coupon)}
                            title="Eliminar cupón"
                            aria-label={`Eliminar ${coupon.code}`}
                          >
                            <i className="bi bi-trash3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="coupons-page__empty">
                      No hay cupones con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>

      <AdminSidePanel
        isOpen={panelOpen}
        title={isEditing ? "Editar cupón" : "Nuevo cupón"}
        subtitle="Marketing · Cupones"
        onClose={closePanel}
        closeDisabled={saving}
        width="lg"
        footer={
          <div className="coupons-panel__footer">
            <button type="button" className="coupons-button coupons-button--secondary" onClick={closePanel} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" form="coupon-form" className="coupons-button coupons-button--primary" disabled={saving}>
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cupón"}
            </button>
          </div>
        }
      >
        <form id="coupon-form" className="coupons-panel" onSubmit={handleSubmit}>
          <section className="coupons-panel__section">
            <h4>Datos generales</h4>
            <div className="coupons-panel__grid">
              <label className="coupons-panel__field">
                <span>Código</span>
                <input name="code" value={form.code} onChange={handleFormChange} placeholder="VERANO10" />
              </label>
              <label className="coupons-panel__field">
                <span>Nombre</span>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="Campaña de temporada" />
              </label>
            </div>
            <label className="coupons-panel__field">
              <span>Descripción</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                rows="3"
                placeholder="Cupón general de temporada"
              />
            </label>
          </section>

          <section className="coupons-panel__section">
            <h4>Reglas del cupón</h4>
            <div className="coupons-panel__grid coupons-panel__grid--three">
              <label className="coupons-panel__field">
                <span>Tipo</span>
                <select name="discount_type" value={form.discount_type} onChange={handleFormChange}>
                  {options.discount_types.map((type) => (
                    <option value={type.value} key={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="coupons-panel__field">
                <span>Descuento</span>
                <input
                  type="number"
                  min="0"
                  max={form.discount_type === "percentage" ? "100" : undefined}
                  step="0.01"
                  name="discount_value"
                  value={form.discount_value}
                  onChange={handleFormChange}
                  placeholder={form.discount_type === "percentage" ? "10" : "200"}
                />
              </label>
              <label className="coupons-panel__field">
                <span>Límite de usos</span>
                <input
                  type="number"
                  min="0"
                  name="usage_limit"
                  value={form.usage_limit}
                  onChange={handleFormChange}
                  placeholder="Sin límite"
                />
              </label>
              <label className="coupons-panel__field">
                <span>Límite por usuario</span>
                <input
                  type="number"
                  min="0"
                  name="per_user_usage_limit"
                  value={form.per_user_usage_limit}
                  onChange={handleFormChange}
                  placeholder="Sin límite"
                />
              </label>
              <label className="coupons-panel__field">
                <span>Cupón relacionado</span>
                <select name="trigger_coupon_id" value={form.trigger_coupon_id} onChange={handleFormChange}>
                  <option value="">Sin cupón relacionado</option>
                  {options.coupons
                    .filter((coupon) => Number(coupon.id) !== Number(editingCouponId))
                    .map((coupon) => (
                      <option value={coupon.id} key={coupon.id}>
                        {coupon.code} · {coupon.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="coupons-panel__checks">
              <label className="coupons-panel__check">
                <input type="checkbox" name="is_combinable" checked={form.is_combinable} onChange={handleFormChange} />
                <span>Permitir combinar con otros cupones</span>
              </label>
              <label className="coupons-panel__check">
                <input type="checkbox" name="is_general" checked={form.is_general} onChange={handleFormChange} />
                <span>Cupón general</span>
              </label>
            </div>

            {!form.is_general ? (
              <label className="coupons-panel__field">
                <span>Usuarios asignados</span>
                <select multiple name="user_ids" value={form.user_ids.map(String)} onChange={handleFormChange}>
                  {options.clients.map((client) => (
                    <option value={client.id} key={client.id}>
                      {client.name || client.username || client.email} {client.email ? `· ${client.email}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </section>

          <section className="coupons-panel__section">
            <h4>Publicación</h4>
            <div className="coupons-panel__grid">
              <label className="coupons-panel__field">
                <span>Inicio</span>
                <input type="datetime-local" name="starts_at" value={form.starts_at} onChange={handleFormChange} />
              </label>
              <label className="coupons-panel__field">
                <span>Fin</span>
                <input type="datetime-local" name="ends_at" value={form.ends_at} onChange={handleFormChange} />
              </label>
            </div>
            <label className="coupons-panel__check">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} />
              <span>Activo</span>
            </label>
          </section>

          <section className="coupons-panel__section">
            <h4>Campaña email</h4>
            <label className="coupons-panel__check">
              <input type="checkbox" name="campaign.send_email" checked={form.campaign.send_email} onChange={handleFormChange} />
              <span>Enviar campaña por correo</span>
            </label>

            {form.campaign.send_email ? (
              <>
                <div className="coupons-panel__grid">
                  <label className="coupons-panel__field">
                    <span>Fecha de envío</span>
                    <input type="datetime-local" name="campaign.send_at" value={form.campaign.send_at} onChange={handleFormChange} />
                  </label>
                  <label className="coupons-panel__field">
                    <span>Destinatarios</span>
                    <select multiple name="campaign.user_ids" value={form.campaign.user_ids.map(String)} onChange={handleFormChange}>
                      {options.clients.map((client) => (
                        <option value={client.id} key={client.id}>
                          {client.name || client.username || client.email} {client.email ? `· ${client.email}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="coupons-panel__field">
                  <span>Asunto</span>
                  <input name="campaign.subject" value={form.campaign.subject} onChange={handleFormChange} placeholder="Tienes un cupón disponible" />
                </label>
                <label className="coupons-panel__field">
                  <span>Mensaje</span>
                  <textarea name="campaign.message" value={form.campaign.message} onChange={handleFormChange} rows="4" placeholder="Usa este cupón en tu próxima compra." />
                </label>
              </>
            ) : null}
          </section>
        </form>
      </AdminSidePanel>

      <AdminSidePanel
        isOpen={assignPanelOpen}
        title="Asignar cupón"
        subtitle={assignmentCoupon ? `${assignmentCoupon.code} · ${assignmentCoupon.name}` : "Marketing · Cupones"}
        onClose={closeAssignPanel}
        closeDisabled={assigning}
        width="lg"
        footer={
          <div className="coupons-panel__footer">
            <button type="button" className="coupons-button coupons-button--secondary" onClick={closeAssignPanel} disabled={assigning}>
              Cancelar
            </button>
            <button type="button" className="coupons-button coupons-button--primary" onClick={handleSaveAssignment} disabled={assigning || assignmentLoading}>
              {assigning ? "Guardando..." : "Guardar asignación"}
            </button>
          </div>
        }
      >
        {assignmentLoading ? (
          <div className="coupons-page__empty">Cargando asignaciones...</div>
        ) : (
          <div className="coupons-assignment">
            <section className="coupons-panel__section">
              <h4>Usuarios asignados</h4>
              {assignedClients.length ? (
                <div className="coupons-assignment__assigned-list">
                  {assignedClients.map((client) => (
                    <div className="coupons-assignment__assigned-user" key={client.id}>
                      <div>
                        <strong>{client.name || client.username || client.email}</strong>
                        <span>{client.email || client.username || "Sin correo"}</span>
                      </div>
                      <button
                        type="button"
                        className="coupons-icon-button coupons-icon-button--delete"
                        onClick={() => removeAssignedUser(client.id)}
                        title="Quitar usuario"
                        aria-label={`Quitar ${client.name || client.email || client.id}`}
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="coupons-assignment__empty">Este cupón no tiene clientes asignados.</p>
              )}
            </section>

            <section className="coupons-panel__section">
              <h4>Clientes disponibles</h4>
              <label className="coupons-page__search coupons-assignment__search">
                <i className="bi bi-search" aria-hidden="true" />
                <input
                  type="search"
                  value={assignmentSearch}
                  onChange={(event) => setAssignmentSearch(event.target.value)}
                  placeholder="Buscar cliente por nombre, correo, usuario o WhatsApp"
                />
              </label>

              <div className="coupons-assignment__client-list">
                {filteredAssignmentClients.length ? (
                  <>
                    {filteredAssignmentClients.map((client) => {
                      const checked = assignmentUserIds.map(Number).includes(Number(client.id))

                      return (
                        <label className="coupons-assignment__client" key={client.id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignmentUser(client.id)}
                          />
                          <span>
                            <strong>{client.name || client.username || client.email}</strong>
                            <small>
                              {[client.email, client.username, client.whatsapp].filter(Boolean).join(" · ") || "Cliente sin datos de contacto"}
                            </small>
                          </span>
                        </label>
                      )
                    })}
                    {assignmentHiddenCount > 0 ? (
                      <p className="coupons-assignment__empty">
                        {assignmentHiddenCount} cliente(s) más. Usa el buscador para encontrarlos.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="coupons-assignment__empty">No hay clientes con esa búsqueda.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </AdminSidePanel>

    </>
  )
}

function normalizeCoupons(response) {
  const payload = response?.data ?? response ?? []
  const items =
    payload?.data && Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.coupons)
      ? payload.coupons
      : []

  return items.map(normalizeCoupon)
}

function normalizeCoupon(coupon = {}) {
  return {
    ...coupon,
    is_active: Boolean(coupon.is_active),
    is_general: coupon.is_general !== false,
    is_combinable: Boolean(coupon.is_combinable),
    usage_count: Number(coupon.usage_count ?? coupon.redemptions_count ?? 0),
    users_count: Number(coupon.users_count ?? coupon.users?.length ?? 0),
    per_user_usage_limit: coupon.per_user_usage_limit ?? null,
    trigger_coupon_id: coupon.trigger_coupon_id ?? null,
    user_ids: Array.isArray(coupon.user_ids)
      ? coupon.user_ids
      : Array.isArray(coupon.users)
      ? coupon.users.map((user) => user.id)
      : [],
  }
}

function normalizeCouponOption(coupon = {}) {
  return {
    id: coupon.id,
    code: coupon.code || "",
    name: coupon.name || "",
  }
}

function normalizeOptions(response) {
  const data = response?.data ?? response ?? {}

  return {
    discount_types: Array.isArray(data.discount_types) && data.discount_types.length
      ? data.discount_types
      : DEFAULT_OPTIONS.discount_types,
    clients: Array.isArray(data.clients) ? data.clients : Array.isArray(data.users) ? data.users : [],
    coupons: Array.isArray(data.coupons) ? data.coupons.map(normalizeCouponOption) : [],
    channels: Array.isArray(data.channels) && data.channels.length
      ? data.channels
      : DEFAULT_OPTIONS.channels,
  }
}

function mapCouponToForm(coupon) {
  return {
    code: coupon.code || "",
    name: coupon.name || "",
    description: coupon.description || "",
    discount_type: coupon.discount_type || "percentage",
    discount_value: coupon.discount_value ?? "",
    usage_limit: coupon.usage_limit ?? "",
    per_user_usage_limit: coupon.per_user_usage_limit ?? "",
    is_combinable: Boolean(coupon.is_combinable),
    trigger_coupon_id: coupon.trigger_coupon_id ?? "",
    starts_at: toDateTimeLocalValue(coupon.starts_at),
    ends_at: toDateTimeLocalValue(coupon.ends_at),
    is_active: Boolean(coupon.is_active),
    is_general: Boolean(coupon.is_general),
    user_ids: Array.isArray(coupon.user_ids) ? coupon.user_ids.map(Number) : [],
    campaign: {
      send_email: Boolean(coupon.campaign?.send_email),
      send_at: toDateTimeLocalValue(coupon.campaign?.send_at),
      subject: coupon.campaign?.subject || "",
      message: coupon.campaign?.message || "",
      user_ids: Array.isArray(coupon.campaign?.user_ids)
        ? coupon.campaign.user_ids.map(Number)
        : [],
    },
  }
}

function validateCouponForm(form) {
  if (!form.code.trim() || !form.name.trim()) {
    return { valid: false, message: "Completa código y nombre del cupón." }
  }

  if (!/^[A-Z0-9_-]+$/.test(form.code.trim().toUpperCase())) {
    return { valid: false, message: "El código solo puede usar A-Z, 0-9, guion bajo o guion medio." }
  }

  const discountValue = Number(form.discount_value || 0)

  if (discountValue <= 0) {
    return { valid: false, message: "El descuento debe ser mayor a 0." }
  }

  if (form.discount_type === "percentage" && discountValue > 100) {
    return { valid: false, message: "El porcentaje no puede ser mayor a 100." }
  }

  if (!form.is_general && !form.user_ids.length) {
    return { valid: false, message: "Selecciona al menos un usuario o marca el cupón como general." }
  }

  if (form.campaign.send_email && !form.campaign.subject.trim()) {
    return { valid: false, message: "Agrega un asunto para la campaña email." }
  }

  return { valid: true, message: "" }
}

function buildCouponPayload(form) {
  const campaignUserIds = form.campaign.user_ids.length
    ? form.campaign.user_ids.map(Number)
    : form.user_ids.map(Number)

  const payload = {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value || 0),
    is_active: Boolean(form.is_active),
    is_general: Boolean(form.is_general),
    is_combinable: Boolean(form.is_combinable),
    starts_at: form.starts_at ? `${form.starts_at.replace("T", " ")}:00` : null,
    ends_at: form.ends_at ? `${form.ends_at.replace("T", " ")}:00` : null,
    usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
    per_user_usage_limit: form.per_user_usage_limit === "" ? null : Number(form.per_user_usage_limit),
    trigger_coupon_id: form.trigger_coupon_id === "" ? null : Number(form.trigger_coupon_id),
    user_ids: form.is_general ? [] : form.user_ids.map(Number),
    campaign: {
      send_email: Boolean(form.campaign.send_email),
      send_at: form.campaign.send_at ? `${form.campaign.send_at.replace("T", " ")}:00` : null,
      subject: form.campaign.subject.trim() || null,
      message: form.campaign.message.trim() || null,
      user_ids: campaignUserIds,
    },
  }

  return payload
}

function formatDiscount(coupon) {
  const value = Number(coupon.discount_value || 0)

  if (coupon.discount_type === "fixed") {
    return formatMoney(value)
  }

  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`
}

function formatValidity(coupon) {
  const start = formatShortDate(coupon.starts_at) || "Sin inicio"
  const end = formatShortDate(coupon.ends_at) || "Sin fin"
  return `${start} - ${end}`
}

function formatShortDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

function toDateTimeLocalValue(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (number) => String(number).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default CouponsPage
