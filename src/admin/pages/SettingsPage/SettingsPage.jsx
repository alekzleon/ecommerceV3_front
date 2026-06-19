import { useEffect, useMemo, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import {
  createAdminSettings,
  deleteAdminSettings,
  getAdminSettings,
} from "../../../services/api/settingsService"
import {
  createAdminContactFaq,
  deleteAdminContactFaq,
  getAdminContactFaqs,
  reorderAdminContactFaqs,
  toggleAdminContactFaq,
  updateAdminContactFaq,
} from "../../../services/api/contactFaqService"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import { useSettings } from "../../../context/SettingsContext"
import "./SettingsPage.css"

const EMPTY_FORM = {
  id: null,
  site_title: "",
  contact_numbers: ["", ""],
  email: "",
  address: "",
  social_links: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },
  forms_recipient_email: "",
  meta: {
    title: "",
    description: "",
    keywords: "",
  },
  google_analytics_pixel: "",
  meta_pixel: "",
  loyalty: {
    first_purchase_discount_enabled: false,
    first_purchase_discount_percentage: "",
    cashback_enabled: false,
    cashback_earn_percentage: "",
    cashback_redeem_enabled: false,
    cashback_max_redeem_percentage: "100",
  },
  logo: null,
  logo_url: "",
  favicon: null,
  favicon_url: "",
  og_image: null,
  og_image_url: "",
}

const EMPTY_FAQ_FORM = {
  id: null,
  question: "",
  answer: "",
  sort_order: "",
  is_active: true,
}

const SECTIONS = [
  {
    id: "identity",
    icon: "bi-shop-window",
    title: "Identidad del sitio",
    description: "Nombre, logo, favicon e imagen para compartir.",
  },
  {
    id: "contact",
    icon: "bi-telephone",
    title: "Contacto",
    description: "Teléfonos, correo principal y dirección.",
  },
  {
    id: "social",
    icon: "bi-share",
    title: "Redes sociales",
    description: "Links visibles hacia Instagram, Facebook y TikTok.",
  },
  {
    id: "forms",
    icon: "bi-envelope-paper",
    title: "Formularios",
    description: "Correo que recibe mensajes de contacto y ventas.",
  },
  {
    id: "seo",
    icon: "bi-search",
    title: "SEO",
    description: "Meta título, descripción y palabras clave.",
  },
  {
    id: "tracking",
    icon: "bi-graph-up-arrow",
    title: "Tracking",
    description: "Google Analytics y Meta Pixel.",
  },
  {
    id: "loyalty",
    icon: "bi-stars",
    title: "Fidelidad",
    description: "Primera compra, cashback acumulado y uso en carrito.",
  },
  {
    id: "contact_faqs",
    icon: "bi-question-circle",
    title: "Preguntas frecuentes",
    description: "Dudas visibles en la página de contacto.",
  },
]

function SettingsPage() {
  const { refreshSettings } = useSettings()
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isContactFaqsSection = activeSection === "contact_faqs"

  const activeSectionMeta = useMemo(() => {
    return SECTIONS.find((section) => section.id === activeSection) || SECTIONS[0]
  }, [activeSection])

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const response = await getAdminSettings()
      const data = normalizeSettingsResponse(response)

      setForm(mapSettingsToForm(data))
    } catch (error) {
      console.error("Error al cargar configuración:", error)
      notifyError(error?.response?.data?.message || "No fue posible cargar la configuración.")
      setForm(EMPTY_FORM)
    } finally {
      setLoading(false)
    }
  }

  function handleFieldChange(event) {
    const { name, value, type, files, checked } = event.target

    if (type === "file") {
      const file = files?.[0] || null
      const previewKey = `${name}_url`

      setForm((prev) => ({
        ...prev,
        [name]: file,
        [previewKey]: file ? URL.createObjectURL(file) : prev[previewKey],
      }))
      return
    }

    if (name.startsWith("social_links.")) {
      const key = name.replace("social_links.", "")
      setForm((prev) => ({
        ...prev,
        social_links: {
          ...prev.social_links,
          [key]: value,
        },
      }))
      return
    }

    if (name.startsWith("meta.")) {
      const key = name.replace("meta.", "")
      setForm((prev) => ({
        ...prev,
        meta: {
          ...prev.meta,
          [key]: value,
        },
      }))
      return
    }

    if (name.startsWith("loyalty.")) {
      const key = name.replace("loyalty.", "")
      setForm((prev) => ({
        ...prev,
        loyalty: {
          ...prev.loyalty,
          [key]: type === "checkbox" ? checked : value,
        },
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleContactNumberChange(index, value) {
    setForm((prev) => {
      const nextNumbers = [...prev.contact_numbers]
      nextNumbers[index] = value

      return {
        ...prev,
        contact_numbers: nextNumbers.slice(0, 2),
      }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const numbers = form.contact_numbers.map((item) => item.trim()).filter(Boolean)

    if (numbers.length > 2) {
      notifyWarning("Solo puedes guardar máximo 2 números de contacto.")
      return
    }

    try {
      setSaving(true)
      const payload = buildSettingsPayload(form, activeSection)
      await createAdminSettings(payload)

      const freshResponse = await getAdminSettings()
      const data = normalizeSettingsResponse(freshResponse)
      setForm(mapSettingsToForm(data))
      refreshSettings()
      notifySuccess("Configuración guardada correctamente.")
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la configuración.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form.id || deleting) return
    if (!window.confirm("¿Eliminar la configuración actual del ecommerce?")) return

    try {
      setDeleting(true)
      await deleteAdminSettings(form.id)
      setForm(EMPTY_FORM)
      notifySuccess("Configuración eliminada correctamente.")
    } catch (error) {
      console.error("Error al eliminar configuración:", error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar la configuración.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminCard
      title="Configuración"
      subtitle="Administra la información pública, SEO, contacto y medición del ecommerce."
      right={!isContactFaqsSection ? (
        <button
          type="submit"
          form="settings-form"
          className="settings-page__save-button"
          disabled={saving || loading}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      ) : null}
    >
      <div className="settings-page">
        <aside className="settings-page__cards" aria-label="Secciones de configuración">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`settings-page__card ${activeSection === section.id ? "is-active" : ""}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="settings-page__card-icon">
                <i className={`bi ${section.icon}`} aria-hidden="true" />
              </span>
              <span className="settings-page__card-copy">
                <strong>{section.title}</strong>
                <small>{section.description}</small>
              </span>
            </button>
          ))}
        </aside>

        <form id="settings-form" className="settings-page__panel" onSubmit={handleSubmit}>
          {loading ? (
            <div className="settings-page__loading">Cargando configuración...</div>
          ) : (
            <>
              <div className="settings-page__panel-head">
                <span className="settings-page__panel-icon">
                  <i className={`bi ${activeSectionMeta.icon}`} aria-hidden="true" />
                </span>
                <div>
                  <h3>{activeSectionMeta.title}</h3>
                  <p>{activeSectionMeta.description}</p>
                </div>
              </div>

              {activeSection === "identity" ? (
                <IdentitySection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "contact" ? (
                <ContactSection
                  form={form}
                  onChange={handleFieldChange}
                  onContactNumberChange={handleContactNumberChange}
                />
              ) : null}

              {activeSection === "social" ? (
                <SocialSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "forms" ? (
                <FormsSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "seo" ? (
                <SeoSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "tracking" ? (
                <TrackingSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "loyalty" ? (
                <LoyaltySection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "contact_faqs" ? (
                <ContactFaqsSection />
              ) : null}

              {!isContactFaqsSection ? (
              <div className="settings-page__footer">
                <button type="submit" className="settings-page__save-button" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>

                {form.id ? (
                  <button
                    type="button"
                    className="settings-page__danger-button"
                    onClick={handleDelete}
                    disabled={saving || deleting}
                  >
                    {deleting ? "Eliminando..." : "Eliminar configuración"}
                  </button>
                ) : null}
              </div>
              ) : null}
            </>
          )}
        </form>
      </div>
    </AdminCard>
  )
}

function IdentitySection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Nombre del sitio"
          name="site_title"
          value={form.site_title}
          onChange={onChange}
          placeholder="Mi tienda"
        />
      </div>

      <div className="settings-page__asset-grid">
        <AssetInput
          label="Logo"
          name="logo"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          previewUrl={form.logo_url}
          onChange={onChange}
        />
        <AssetInput
          label="Favicon"
          name="favicon"
          accept=".ico,image/png,image/webp,image/svg+xml"
          previewUrl={form.favicon_url}
          onChange={onChange}
          compact
        />
      </div>
    </section>
  )
}

function ContactSection({ form, onChange, onContactNumberChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Correo principal"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="contacto@mitienda.com"
        />

        <Field
          label="Dirección"
          name="address"
          value={form.address}
          onChange={onChange}
          placeholder="Av. Principal 123, Guadalajara"
        />
      </div>

      <div className="settings-page__phone-box">
        <div>
          <h4>Teléfonos de contacto</h4>
          <p>El backend permite máximo dos números.</p>
        </div>
        <div className="settings-page__grid settings-page__grid--two">
          {[0, 1].map((index) => (
            <label className="settings-page__field" key={index}>
              <span>Teléfono {index + 1}</span>
              <input
                type="tel"
                value={form.contact_numbers[index] || ""}
                onChange={(event) => onContactNumberChange(index, event.target.value)}
                placeholder={index === 0 ? "3312345678" : "3311223344"}
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

function SocialSection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Instagram"
          name="social_links.instagram"
          value={form.social_links.instagram}
          onChange={onChange}
          placeholder="https://instagram.com/mitienda"
        />
        <Field
          label="Facebook"
          name="social_links.facebook"
          value={form.social_links.facebook}
          onChange={onChange}
          placeholder="https://facebook.com/mitienda"
        />
        <Field
          label="TikTok"
          name="social_links.tiktok"
          value={form.social_links.tiktok}
          onChange={onChange}
          placeholder="https://tiktok.com/@mitienda"
        />
      </div>
    </section>
  )
}

function FormsSection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <Field
        label="Correo receptor de formularios"
        name="forms_recipient_email"
        type="email"
        value={form.forms_recipient_email}
        onChange={onChange}
        placeholder="formularios@mitienda.com"
        helpText="Este correo decide a dónde llegan los mensajes de formularios."
      />
    </section>
  )
}

function SeoSection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <Field
        label="Meta título"
        name="meta.title"
        value={form.meta.title}
        onChange={onChange}
        placeholder="Mi tienda"
      />

      <label className="settings-page__field">
        <span>Meta descripción</span>
        <textarea
          name="meta.description"
          rows="4"
          value={form.meta.description}
          onChange={onChange}
          placeholder="Ecommerce de productos tecnológicos."
        />
      </label>

      <Field
        label="Keywords"
        name="meta.keywords"
        value={form.meta.keywords}
        onChange={onChange}
        placeholder="tecnología, ecommerce, computadoras"
        helpText="Escribe las palabras separadas por coma."
      />

      <div className="settings-page__asset-grid settings-page__asset-grid--single">
        <AssetInput
          label="Imagen OG"
          name="og_image"
          accept="image/png,image/jpeg,image/webp"
          previewUrl={form.og_image_url}
          onChange={onChange}
        />
      </div>
    </section>
  )
}

function TrackingSection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Google Analytics"
          name="google_analytics_pixel"
          value={form.google_analytics_pixel}
          onChange={onChange}
          placeholder="G-XXXXXXXXXX"
        />
        <Field
          label="Meta Pixel"
          name="meta_pixel"
          value={form.meta_pixel}
          onChange={onChange}
          placeholder="123456789012345"
        />
      </div>
    </section>
  )
}

function LoyaltySection({ form, onChange }) {
  return (
    <section className="settings-page__section">
      <div className="settings-page__loyalty-grid">
        <ToggleField
          label="Descuento en primera compra"
          name="loyalty.first_purchase_discount_enabled"
          checked={form.loyalty.first_purchase_discount_enabled}
          onChange={onChange}
          helpText="Si está activo, el backend lo aplicará automáticamente a clientes elegibles."
        />

        <Field
          label="Porcentaje de primera compra"
          name="loyalty.first_purchase_discount_percentage"
          type="number"
          value={form.loyalty.first_purchase_discount_percentage}
          onChange={onChange}
          placeholder="10"
          helpText="Ejemplo: 10 equivale a 10%."
        />

        <ToggleField
          label="Generar cashback"
          name="loyalty.cashback_enabled"
          checked={form.loyalty.cashback_enabled}
          onChange={onChange}
          helpText="Calcula saldo a favor que el cliente ganará por su compra."
        />

        <Field
          label="Porcentaje a ganar"
          name="loyalty.cashback_earn_percentage"
          type="number"
          value={form.loyalty.cashback_earn_percentage}
          onChange={onChange}
          placeholder="5"
        />

        <ToggleField
          label="Permitir usar cashback"
          name="loyalty.cashback_redeem_enabled"
          checked={form.loyalty.cashback_redeem_enabled}
          onChange={onChange}
          helpText="Habilita que el cliente aplique saldo en carrito."
        />

        <Field
          label="Máximo aplicable sobre el total"
          name="loyalty.cashback_max_redeem_percentage"
          type="number"
          value={form.loyalty.cashback_max_redeem_percentage}
          onChange={onChange}
          placeholder="100"
          helpText="100 permite cubrir todo el total permitido por backend."
        />
      </div>
    </section>
  )
}

function ContactFaqsSection() {
  const [faqs, setFaqs] = useState([])
  const [form, setForm] = useState(EMPTY_FAQ_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  useEffect(() => {
    loadFaqs()
  }, [])

  async function loadFaqs() {
    try {
      setLoading(true)
      const response = await getAdminContactFaqs()
      const items = normalizeFaqCollection(response)
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      setFaqs(items)
    } catch (error) {
      console.error("Error al cargar preguntas frecuentes:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar las preguntas frecuentes.")
      setFaqs([])
    } finally {
      setLoading(false)
    }
  }

  function handleFaqChange(event) {
    const { name, value, type, checked } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function resetFaqForm() {
    setForm(EMPTY_FAQ_FORM)
  }

  function editFaq(faq) {
    setForm({
      id: faq.id,
      question: faq.question || "",
      answer: faq.answer || "",
      sort_order: faq.sort_order ?? "",
      is_active: Boolean(faq.is_active),
    })
  }

  async function saveFaq() {
    const question = form.question.trim()
    const answer = form.answer.trim()

    if (!question || !answer) {
      notifyWarning("Escribe la pregunta y la respuesta.")
      return
    }

    const payload = {
      question,
      answer,
      sort_order: form.sort_order === "" ? null : Number(form.sort_order),
      is_active: Boolean(form.is_active),
    }

    try {
      setSaving(true)
      if (form.id) {
        await updateAdminContactFaq(form.id, payload)
        notifySuccess("Pregunta frecuente actualizada.")
      } else {
        await createAdminContactFaq(payload)
        notifySuccess("Pregunta frecuente creada.")
      }
      resetFaqForm()
      await loadFaqs()
    } catch (error) {
      console.error("Error al guardar pregunta frecuente:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la pregunta frecuente.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteFaq(faq) {
    if (!window.confirm(`¿Eliminar la pregunta "${faq.question}"?`)) return

    try {
      setActionLoadingId(faq.id)
      await deleteAdminContactFaq(faq.id)
      notifySuccess("Pregunta frecuente eliminada.")
      await loadFaqs()
    } catch (error) {
      console.error("Error al eliminar pregunta frecuente:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar la pregunta frecuente.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function toggleFaq(faq) {
    try {
      setActionLoadingId(faq.id)
      await toggleAdminContactFaq(faq.id)
      notifySuccess("Estado actualizado.")
      await loadFaqs()
    } catch (error) {
      console.error("Error al cambiar estado:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el estado.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function moveFaq(faq, direction) {
    const currentIndex = faqs.findIndex((item) => item.id === faq.id)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= faqs.length) return

    const reordered = [...faqs]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(nextIndex, 0, moved)

    const orderedItems = reordered.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }))

    try {
      setActionLoadingId(faq.id)
      setFaqs(orderedItems)
      await reorderAdminContactFaqs({
        faqs: orderedItems.map((item) => ({
          id: item.id,
          sort_order: item.sort_order,
        })),
      })
      notifySuccess("Orden actualizado.")
      await loadFaqs()
    } catch (error) {
      console.error("Error al reordenar preguntas frecuentes:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible actualizar el orden.")
      await loadFaqs()
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <section className="settings-page__section">
      <div className="settings-faqs__editor">
        <div className="settings-page__grid settings-page__grid--two">
          <Field
            label="Pregunta"
            name="question"
            value={form.question}
            onChange={handleFaqChange}
            placeholder="¿Hacen entregas a domicilio?"
          />

          <Field
            label="Orden"
            name="sort_order"
            type="number"
            value={form.sort_order}
            onChange={handleFaqChange}
            placeholder="1"
          />
        </div>

        <label className="settings-page__field">
          <span>Respuesta</span>
          <textarea
            name="answer"
            value={form.answer}
            onChange={handleFaqChange}
            placeholder="Sí, entregamos en las zonas disponibles."
          />
        </label>

        <div className="settings-faqs__editor-footer">
          <label className="settings-page__toggle-field settings-page__toggle-field--compact">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleFaqChange}
            />
            <span className="settings-page__toggle-control" aria-hidden="true" />
            <span className="settings-page__toggle-copy">
              <strong>Activa</strong>
            </span>
          </label>

          <div className="settings-faqs__editor-actions">
            {form.id ? (
              <button
                type="button"
                className="settings-page__danger-button"
                onClick={resetFaqForm}
                disabled={saving}
              >
                Cancelar
              </button>
            ) : null}

            <button
              type="button"
              className="settings-page__save-button"
              onClick={saveFaq}
              disabled={saving}
            >
              {saving ? "Guardando..." : form.id ? "Actualizar pregunta" : "Agregar pregunta"}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-faqs__list">
        {loading ? (
          <div className="settings-page__loading">Cargando preguntas frecuentes...</div>
        ) : faqs.length ? (
          faqs.map((faq, index) => (
            <article className="settings-faqs__item" key={faq.id}>
              <div className="settings-faqs__content">
                <div className="settings-faqs__question-row">
                  <strong>{faq.question}</strong>
                  <span className={faq.is_active ? "is-active" : ""}>
                    {faq.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <p>{faq.answer}</p>
              </div>

              <div className="settings-faqs__actions">
                <button
                  type="button"
                  onClick={() => moveFaq(faq, -1)}
                  disabled={index === 0 || actionLoadingId === faq.id}
                >
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => moveFaq(faq, 1)}
                  disabled={index === faqs.length - 1 || actionLoadingId === faq.id}
                >
                  Bajar
                </button>
                <button type="button" onClick={() => editFaq(faq)} disabled={actionLoadingId === faq.id}>
                  Editar
                </button>
                <button type="button" onClick={() => toggleFaq(faq)} disabled={actionLoadingId === faq.id}>
                  {faq.is_active ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => deleteFaq(faq)}
                  disabled={actionLoadingId === faq.id}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="settings-faqs__empty">Aún no hay preguntas frecuentes cargadas.</div>
        )}
      </div>
    </section>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  helpText = "",
}) {
  return (
    <label className="settings-page__field">
      <span>
        {label}
        {required ? <b>*</b> : null}
      </span>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
      {helpText ? <small>{helpText}</small> : null}
    </label>
  )
}

function ToggleField({ label, name, checked, onChange, helpText = "" }) {
  return (
    <label className="settings-page__toggle-field">
      <input type="checkbox" name={name} checked={Boolean(checked)} onChange={onChange} />
      <span className="settings-page__toggle-control" aria-hidden="true" />
      <span className="settings-page__toggle-copy">
        <strong>{label}</strong>
        {helpText ? <small>{helpText}</small> : null}
      </span>
    </label>
  )
}

function AssetInput({ label, name, accept, previewUrl, onChange, compact = false }) {
  return (
    <div className="settings-page__asset">
      <div className={`settings-page__asset-preview ${compact ? "is-compact" : ""}`}>
        {previewUrl ? (
          <img src={previewUrl} alt={label} />
        ) : (
          <span>Sin archivo</span>
        )}
      </div>
      <div>
        <strong>{label}</strong>
        <label className="settings-page__file-button">
          Seleccionar archivo
          <input type="file" name={name} accept={accept} onChange={onChange} />
        </label>
      </div>
    </div>
  )
}

function normalizeSettingsResponse(response) {
  if (response?.data?.id || response?.data === null) return response.data || null
  if (response?.data?.data) return response.data.data
  if (response?.id) return response
  return null
}

function normalizeFaqCollection(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.faqs)) return payload.faqs
  if (Array.isArray(payload?.contact_faqs)) return payload.contact_faqs

  return []
}

function mapSettingsToForm(settings) {
  if (!settings) return EMPTY_FORM

  const numbers = Array.isArray(settings.contact_numbers) ? settings.contact_numbers : []
  const keywords = Array.isArray(settings.meta?.keywords)
    ? settings.meta.keywords.join(", ")
    : settings.meta?.keywords || ""

  return {
    ...EMPTY_FORM,
    id: settings.id || null,
    site_title: settings.site_title || "",
    contact_numbers: [numbers[0] || "", numbers[1] || ""],
    email: settings.email || "",
    address: settings.address || "",
    social_links: {
      instagram: settings.social_links?.instagram || "",
      facebook: settings.social_links?.facebook || "",
      tiktok: settings.social_links?.tiktok || "",
    },
    forms_recipient_email: settings.forms_recipient_email || "",
    meta: {
      title: settings.meta?.title || "",
      description: settings.meta?.description || "",
      keywords,
    },
    google_analytics_pixel: settings.google_analytics_pixel || "",
    meta_pixel: settings.meta_pixel || "",
    loyalty: {
      first_purchase_discount_enabled: Boolean(
        settings.loyalty?.first_purchase_discount_enabled
      ),
      first_purchase_discount_percentage:
        settings.loyalty?.first_purchase_discount_percentage ?? "",
      cashback_enabled: Boolean(settings.loyalty?.cashback_enabled),
      cashback_earn_percentage: settings.loyalty?.cashback_earn_percentage ?? "",
      cashback_redeem_enabled: Boolean(settings.loyalty?.cashback_redeem_enabled),
      cashback_max_redeem_percentage:
        settings.loyalty?.cashback_max_redeem_percentage ?? "100",
    },
    logo: null,
    logo_url: normalizeMediaUrl(settings.logo_url || settings.logo_path),
    favicon: null,
    favicon_url: normalizeMediaUrl(settings.favicon_url || settings.favicon_path),
    og_image: null,
    og_image_url: normalizeMediaUrl(settings.og_image_url || settings.og_image_path),
  }
}

function buildSettingsPayload(form, section) {
  const numbers = form.contact_numbers.map((item) => item.trim()).filter(Boolean).slice(0, 2)
  const keywords = String(form.meta.keywords || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const hasFiles =
    (section === "identity" && (form.logo instanceof File || form.favicon instanceof File)) ||
    (section === "seo" && form.og_image instanceof File)

  if (!hasFiles) {
    const payload = {}

    if (section === "identity") {
      payload.site_title = nullableValue(form.site_title)
    }

    if (section === "contact") {
      payload.contact_numbers = numbers
      payload.email = nullableValue(form.email)
      payload.address = nullableValue(form.address)
    }

    if (section === "social") {
      payload.social_links = {
        instagram: nullableValue(form.social_links.instagram),
        facebook: nullableValue(form.social_links.facebook),
        tiktok: nullableValue(form.social_links.tiktok),
      }
    }

    if (section === "forms") {
      payload.forms_recipient_email = nullableValue(form.forms_recipient_email)
    }

    if (section === "seo") {
      payload.meta = {
        title: nullableValue(form.meta.title),
        description: nullableValue(form.meta.description),
        keywords,
      }
    }

    if (section === "tracking") {
      payload.google_analytics_pixel = nullableValue(form.google_analytics_pixel)
      payload.meta_pixel = nullableValue(form.meta_pixel)
    }

    if (section === "loyalty") {
      payload.loyalty = buildLoyaltyPayload(form.loyalty)
    }

    return payload
  }

  const payload = new FormData()

  if (section === "identity") {
    appendNullableFormData(payload, "site_title", form.site_title)
    if (form.logo instanceof File) payload.append("logo", form.logo)
    if (form.favicon instanceof File) payload.append("favicon", form.favicon)
  }

  if (section === "contact") {
    numbers.forEach((number, index) => {
      payload.append(`contact_numbers[${index}]`, number)
    })
    appendNullableFormData(payload, "email", form.email)
    appendNullableFormData(payload, "address", form.address)
  }

  if (section === "social") {
    Object.entries(form.social_links).forEach(([key, value]) => {
      appendNullableFormData(payload, `social_links[${key}]`, value)
    })
  }

  if (section === "forms") {
    appendNullableFormData(payload, "forms_recipient_email", form.forms_recipient_email)
  }

  if (section === "seo") {
    appendNullableFormData(payload, "meta[title]", form.meta.title)
    appendNullableFormData(payload, "meta[description]", form.meta.description)
    keywords.forEach((keyword, index) => {
      payload.append(`meta[keywords][${index}]`, keyword)
    })
    if (form.og_image instanceof File) payload.append("og_image", form.og_image)
  }

  if (section === "tracking") {
    appendNullableFormData(payload, "google_analytics_pixel", form.google_analytics_pixel)
    appendNullableFormData(payload, "meta_pixel", form.meta_pixel)
  }

  if (section === "loyalty") {
    const loyalty = buildLoyaltyPayload(form.loyalty)
    Object.entries(loyalty).forEach(([key, value]) => {
      payload.append(`loyalty[${key}]`, value)
    })
  }

  return payload
}

function nullableValue(value) {
  const normalizedValue = String(value ?? "").trim()

  return normalizedValue || null
}

function appendNullableFormData(payload, key, value) {
  const normalizedValue = String(value ?? "").trim()

  payload.append(key, normalizedValue)
}

function buildLoyaltyPayload(loyalty) {
  return {
    first_purchase_discount_enabled: Boolean(loyalty.first_purchase_discount_enabled),
    first_purchase_discount_percentage: numericOrNull(
      loyalty.first_purchase_discount_percentage
    ),
    cashback_enabled: Boolean(loyalty.cashback_enabled),
    cashback_earn_percentage: numericOrNull(loyalty.cashback_earn_percentage),
    cashback_redeem_enabled: Boolean(loyalty.cashback_redeem_enabled),
    cashback_max_redeem_percentage:
      numericOrNull(loyalty.cashback_max_redeem_percentage) ?? 100,
  }
}

function numericOrNull(value) {
  const normalizedValue = String(value ?? "").trim()

  if (!normalizedValue) return null

  const numberValue = Number(normalizedValue)

  return Number.isFinite(numberValue) ? numberValue : null
}

export default SettingsPage
