import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import AdminCard from "../../components/AdminCard/AdminCard"
import {
  createAdminSettings,
  deleteAdminSettings,
  getAdminAbandonedCartSettings,
  getAdminMetaPixel,
  getAdminSaleNotificationSettings,
  getAdminSettings,
  getAdminStorefront,
  updateAdminAbandonedCartSettings,
  updateAdminMetaPixel,
  updateAdminSaleNotificationSettings,
  updateAdminStorefront,
} from "../../../services/api/settingsService"
import {
  createAdminContactFaq,
  deleteAdminContactFaq,
  getAdminContactFaqs,
  reorderAdminContactFaqs,
  toggleAdminContactFaq,
  updateAdminContactFaq,
} from "../../../services/api/contactFaqService"
import { getStripeConnectStatus } from "../../../services/api/stripeConnectService"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import { useSettings } from "../../../context/SettingsContext"
import "./SettingsPage.css"

const PHONE_FORMAT_MESSAGE = "Formato de número inválido."
const EMAIL_FORMAT_MESSAGE = "Formato de correo inválido."

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
  meta_pixel_id: "",
  loyalty: {
    first_purchase_discount_enabled: false,
    first_purchase_discount_percentage: "",
    cashback_enabled: false,
    cashback_earn_percentage: "",
    cashback_redeem_enabled: false,
    cashback_max_redeem_percentage: "100",
  },
  abandoned_cart: {
    enabled: true,
    abandon_after_minutes: 60,
    recovery_link_expires_hours: 48,
    send_email: true,
    send_whatsapp: true,
  },
  sale_notifications: {
    enabled: true,
    send_email: true,
    send_whatsapp: true,
    admin_email: "",
    admin_whatsapp: "",
  },
  storefront: {
    is_published: false,
    construction_title: "Ecommerce en construcción",
    construction_message: "Estamos preparando la tienda. Vuelve pronto.",
    template: "classic",
    available_home_templates: ["classic"],
    theme: {
      primary_color: "#111827",
      secondary_color: "#2563eb",
      accent_color: "#f59e0b",
      background_color: "#ffffff",
      surface_color: "#f8fafc",
      text_color: "#111827",
      muted_text_color: "#64748b",
      button_text_color: "#ffffff",
    },
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
    id: "storefront",
    icon: "bi-broadcast",
    title: "Publicación",
    description: "Estado público y mensaje visible cuando la tienda está en construcción.",
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
    id: "envios",
    icon: "bi-truck",
    title: "Envíos",
    description: "Opciones de cobertura, tarifas y promociones de entrega.",
  },
  {
    id: "abandoned_cart",
    icon: "bi-cart-x",
    title: "Carrito abandonado",
    description: "Tiempo de abandono, expiración y canales de recuperación.",
  },
  {
    id: "sale_notifications",
    icon: "bi-bell",
    title: "Notificaciones",
    description: "Canales y destinatarios para avisos de ventas procesadas.",
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
  const [fieldErrors, setFieldErrors] = useState({})
  const [stripeConnectStatus, setStripeConnectStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canSubmitSection = !["contact_faqs", "envios"].includes(activeSection)
  const canDeleteSettings = ![
    "contact_faqs",
    "storefront",
    "abandoned_cart",
    "sale_notifications",
    "envios",
  ].includes(activeSection)

  const activeSectionMeta = useMemo(() => {
    return SECTIONS.find((section) => section.id === activeSection) || SECTIONS[0]
  }, [activeSection])

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const [
        settingsResponse,
        metaPixelResponse,
        abandonedCartResponse,
        saleNotificationsResponse,
        storefrontResponse,
        stripeConnectResponse,
      ] = await Promise.allSettled([
        getAdminSettings(),
        getAdminMetaPixel(),
        getAdminAbandonedCartSettings(),
        getAdminSaleNotificationSettings(),
        getAdminStorefront(),
        getStripeConnectStatus(),
      ])
      const data = settingsResponse.status === "fulfilled"
        ? normalizeSettingsResponse(settingsResponse.value)
        : {}
      const metaPixelId = metaPixelResponse.status === "fulfilled"
        ? normalizeMetaPixelResponse(metaPixelResponse.value)
        : data.meta_pixel_id
      const abandonedCart = abandonedCartResponse.status === "fulfilled"
        ? normalizeAbandonedCartResponse(abandonedCartResponse.value)
        : EMPTY_FORM.abandoned_cart
      const saleNotifications = saleNotificationsResponse.status === "fulfilled"
        ? normalizeSaleNotificationResponse(saleNotificationsResponse.value)
        : EMPTY_FORM.sale_notifications
      const storefront = storefrontResponse.status === "fulfilled"
        ? normalizeStorefrontResponse(storefrontResponse.value)
        : EMPTY_FORM.storefront
      const stripeStatus = stripeConnectResponse.status === "fulfilled"
        ? normalizeStripeConnectStatus(stripeConnectResponse.value)
        : null

      setForm(mapSettingsToForm({
        ...data,
        meta_pixel_id: metaPixelId,
        abandoned_cart: abandonedCart,
        sale_notifications: saleNotifications,
        storefront,
      }))
      setStripeConnectStatus(stripeStatus)
      setFieldErrors({})
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

    if (name.startsWith("abandoned_cart.")) {
      const key = name.replace("abandoned_cart.", "")
      setForm((prev) => ({
        ...prev,
        abandoned_cart: {
          ...prev.abandoned_cart,
          [key]: type === "checkbox" ? checked : value,
        },
      }))
      return
    }

    if (name.startsWith("sale_notifications.")) {
      const key = name.replace("sale_notifications.", "")
      const nextValue = key === "admin_whatsapp" ? normalizeTenDigitPhone(value) : value

      updateFieldError(name, nextValue)
      setForm((prev) => ({
        ...prev,
        sale_notifications: {
          ...prev.sale_notifications,
          [key]: type === "checkbox" ? checked : nextValue,
        },
      }))
      return
    }

    if (name.startsWith("storefront.theme.")) {
      const key = name.replace("storefront.theme.", "")
      setForm((prev) => ({
        ...prev,
        storefront: {
          ...prev.storefront,
          theme: {
            ...prev.storefront.theme,
            [key]: value,
          },
        },
      }))
      return
    }

    if (name.startsWith("storefront.")) {
      const key = name.replace("storefront.", "")
      setForm((prev) => ({
        ...prev,
        storefront: {
          ...prev.storefront,
          [key]: type === "checkbox" ? checked : value,
        },
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    updateFieldError(name, value)
  }

  function handleContactNumberChange(index, value) {
    const nextValue = normalizeTenDigitPhone(value)

    updateFieldError(`contact_numbers.${index}`, nextValue)
    setForm((prev) => {
      const nextNumbers = [...prev.contact_numbers]
      nextNumbers[index] = nextValue

      return {
        ...prev,
        contact_numbers: nextNumbers.slice(0, 2),
      }
    })
  }

  function updateFieldError(name, value) {
    const message = getSettingsFieldError(name, value)

    setFieldErrors((prev) => {
      if (!message) {
        const nextErrors = { ...prev }
        delete nextErrors[name]
        return nextErrors
      }

      return {
        ...prev,
        [name]: message,
      }
    })
  }

  async function refreshStripeConnectStatus() {
    try {
      const response = await getStripeConnectStatus()
      const status = normalizeStripeConnectStatus(response)

      setStripeConnectStatus(status)
      return status
    } catch (error) {
      console.error("Error al validar Stripe Connect:", error?.response?.data || error)
      setStripeConnectStatus(null)
      notifyError(error?.response?.data?.message || "No fue posible validar el estado de Stripe.")
      return null
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const numbers = form.contact_numbers.map((item) => item.trim()).filter(Boolean)

    if (numbers.length > 2) {
      notifyWarning("Solo puedes guardar máximo 2 números de contacto.")
      return
    }

    const validation = validateSettingsSection(form, activeSection)

    if (validation.message) {
      setFieldErrors((prev) => ({ ...prev, ...validation.errors }))
      notifyWarning(validation.message)
      return
    }

    try {
      setSaving(true)

      if (activeSection === "abandoned_cart") {
        const payload = buildAbandonedCartPayload(form.abandoned_cart)
        const validationMessage = validateAbandonedCartPayload(payload)

        if (validationMessage) {
          notifyWarning(validationMessage)
          return
        }

        const response = await updateAdminAbandonedCartSettings(payload)
        setForm((prev) => ({
          ...prev,
          abandoned_cart: normalizeAbandonedCartResponse(response),
        }))
        setFieldErrors({})
        notifySuccess("Configuración de carrito abandonado guardada correctamente.")
        return
      }

      if (activeSection === "sale_notifications") {
        const payload = buildSaleNotificationPayload(form.sale_notifications)
        const validation = validateSaleNotificationPayload(payload)

        if (validation.message) {
          setFieldErrors((prev) => ({ ...prev, ...validation.errors }))
          notifyWarning(validation.message)
          return
        }

        const response = await updateAdminSaleNotificationSettings(payload)
        setForm((prev) => ({
          ...prev,
          sale_notifications: normalizeSaleNotificationResponse(response),
        }))
        setFieldErrors({})
        notifySuccess("Configuración de notificaciones guardada correctamente.")
        return
      }

      if (activeSection === "storefront") {
        const payload = buildStorefrontPublicationPayload(form.storefront)
        const validationMessage = validateStorefrontPublicationPayload(payload)

        if (validationMessage) {
          notifyWarning(validationMessage)
          return
        }

        if (payload.is_published) {
          const stripeStatus = await refreshStripeConnectStatus()

          if (!stripeStatus?.ready_for_charges) {
            notifyWarning(getStripePublicationBlockMessage(stripeStatus))
            return
          }
        }

        const response = await updateAdminStorefront(payload)
        setForm((prev) => ({
          ...prev,
          storefront: normalizeStorefrontResponse(response),
        }))
        refreshSettings()
        setFieldErrors({})
        notifySuccess("Storefront guardado correctamente.")
        return
      }

      const payload = buildSettingsPayload(form, activeSection)
      if (activeSection === "tracking") {
        const pixelId = String(form.meta_pixel_id || "").trim()

        if (pixelId && !/^\d+$/.test(pixelId)) {
          notifyWarning("El Meta Pixel ID debe contener solo números.")
          return
        }

        await Promise.all([
          createAdminSettings(payload),
          updateAdminMetaPixel(pixelId || null),
        ])
      } else {
        await createAdminSettings(payload)
      }

      const freshResponse = await getAdminSettings()
      const freshMetaPixelResponse = await getAdminMetaPixel()
      const data = normalizeSettingsResponse(freshResponse)
      setForm(mapSettingsToForm({
        ...data,
        meta_pixel_id: normalizeMetaPixelResponse(freshMetaPixelResponse),
        abandoned_cart: form.abandoned_cart,
        sale_notifications: form.sale_notifications,
      }))
      refreshSettings()
      setFieldErrors({})
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
      right={canSubmitSection ? (
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
        <nav className="settings-page__tabs" aria-label="Secciones de configuración">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`settings-page__tab ${activeSection === section.id ? "is-active" : ""}`}
              onClick={() => setActiveSection(section.id)}
              title={section.description}
            >
              <span className="settings-page__tab-icon">
                <i className={`bi ${section.icon}`} aria-hidden="true" />
              </span>
              <span>{section.title}</span>
            </button>
          ))}
        </nav>

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

              {activeSection === "storefront" ? (
                <StorefrontSection
                  form={form}
                  onChange={handleFieldChange}
                  stripeConnectStatus={stripeConnectStatus}
                />
              ) : null}

              {activeSection === "contact" ? (
                <ContactSection
                  form={form}
                  onChange={handleFieldChange}
                  onContactNumberChange={handleContactNumberChange}
                  errors={fieldErrors}
                />
              ) : null}

              {activeSection === "social" ? (
                <SocialSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "forms" ? (
                <FormsSection form={form} onChange={handleFieldChange} errors={fieldErrors} />
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

              {activeSection === "envios" ? (
                <ShippingSection />
              ) : null}

              {activeSection === "abandoned_cart" ? (
                <AbandonedCartSection form={form} onChange={handleFieldChange} />
              ) : null}

              {activeSection === "sale_notifications" ? (
                <SaleNotificationsSection form={form} onChange={handleFieldChange} errors={fieldErrors} />
              ) : null}

              {activeSection === "contact_faqs" ? (
                <ContactFaqsSection />
              ) : null}

              {canSubmitSection ? (
              <div className="settings-page__footer">
                <button type="submit" className="settings-page__save-button" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>

                {form.id && canDeleteSettings ? (
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

function StorefrontSection({ form, onChange, stripeConnectStatus }) {
  const settings = form.storefront || EMPTY_FORM.storefront
  const stripeGate = getStripePublicationGate(stripeConnectStatus)

  return (
    <section className="settings-page__section">
      <div className={`settings-storefront__payment-gate settings-storefront__payment-gate--${stripeGate.tone}`}>
        <span className="settings-storefront__payment-icon">
          <i className={`bi ${stripeGate.icon}`} aria-hidden="true" />
        </span>
        <div>
          <strong>{stripeGate.title}</strong>
          <p>{stripeGate.message}</p>
          {stripeGate.requirements.length ? (
            <div className="settings-storefront__payment-requirements">
              {stripeGate.requirements.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
        </div>
        {!stripeGate.ready ? (
          <Link to="/admin/payments" className="settings-storefront__payment-action">
            {stripeGate.cta}
          </Link>
        ) : null}
      </div>

      <div className="settings-storefront__status">
        <ToggleField
          label={settings.is_published ? "Ecommerce publicado" : "Ecommerce en construcción"}
          name="storefront.is_published"
          checked={settings.is_published}
          onChange={onChange}
          helpText="Cuando está apagado, la home pública muestra el mensaje de construcción."
        />
      </div>

      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Título de construcción"
          name="storefront.construction_title"
          value={settings.construction_title}
          onChange={onChange}
          placeholder="Ecommerce en construcción"
        />

        <label className="settings-page__field">
          <span>Mensaje de construcción</span>
          <textarea
            name="storefront.construction_message"
            value={settings.construction_message}
            onChange={onChange}
            placeholder="Estamos preparando la tienda. Vuelve pronto."
          />
        </label>
      </div>

      <div className="settings-storefront__note">
        <i className="bi bi-palette" aria-hidden="true" />
        <span>La plantilla y los colores ahora se administran desde Diseña tu ecommerce.</span>
      </div>
    </section>
  )
}

function ContactSection({ form, onChange, onContactNumberChange, errors = {} }) {
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
          inputMode="email"
          error={errors.email}
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
            <label
              className={`settings-page__field ${errors[`contact_numbers.${index}`] ? "is-error" : ""}`}
              key={index}
            >
              <span>Teléfono {index + 1}</span>
              <input
                type="tel"
                value={form.contact_numbers[index] || ""}
                onChange={(event) => onContactNumberChange(index, event.target.value)}
                placeholder={index === 0 ? "3312345678" : "3311223344"}
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                title="Escribe un teléfono de 10 dígitos."
                aria-invalid={Boolean(errors[`contact_numbers.${index}`])}
              />
              {errors[`contact_numbers.${index}`] ? (
                <small className="settings-page__field-error">{errors[`contact_numbers.${index}`]}</small>
              ) : null}
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

function FormsSection({ form, onChange, errors = {} }) {
  return (
    <section className="settings-page__section">
      <Field
        label="Correo receptor de formularios"
        name="forms_recipient_email"
        type="email"
        value={form.forms_recipient_email}
        onChange={onChange}
        placeholder="formularios@mitienda.com"
        inputMode="email"
        helpText="Este correo decide a dónde llegan los mensajes de formularios."
        error={errors.forms_recipient_email}
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
          label="Meta Pixel ID"
          name="meta_pixel_id"
          value={form.meta_pixel_id}
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

function AbandonedCartSection({ form, onChange }) {
  const settings = form.abandoned_cart || EMPTY_FORM.abandoned_cart

  return (
    <section className="settings-page__section">
      <div className="settings-page__abandoned-grid">
        <ToggleField
          label="Activar recuperación"
          name="abandoned_cart.enabled"
          checked={settings.enabled}
          onChange={onChange}
          helpText="Permite que el backend detecte y notifique carritos abandonados."
        />

        <ToggleField
          label="Enviar correo"
          name="abandoned_cart.send_email"
          checked={settings.send_email}
          onChange={onChange}
          helpText="Usa el link de recuperación firmado con expiración configurable."
        />

        <ToggleField
          label="Enviar WhatsApp"
          name="abandoned_cart.send_whatsapp"
          checked={settings.send_whatsapp}
          onChange={onChange}
          helpText="Mantiene el canal WhatsApp activo para pruebas del backend."
        />
      </div>

      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Minutos para considerar abandono"
          name="abandoned_cart.abandon_after_minutes"
          type="number"
          value={settings.abandon_after_minutes}
          onChange={onChange}
          min="60"
          max="10080"
          step="1"
          helpText="Mínimo 60 minutos. Máximo 10080 minutos."
        />

        <Field
          label="Horas de vigencia del link"
          name="abandoned_cart.recovery_link_expires_hours"
          type="number"
          value={settings.recovery_link_expires_hours}
          onChange={onChange}
          min="1"
          max="720"
          step="1"
          helpText="Mínimo 1 hora. Máximo 720 horas."
        />
      </div>
    </section>
  )
}

function SaleNotificationsSection({ form, onChange, errors = {} }) {
  const settings = form.sale_notifications || EMPTY_FORM.sale_notifications

  return (
    <section className="settings-page__section">
      <div className="settings-page__notifications-grid">
        <ToggleField
          label="Activar notificaciones de venta"
          name="sale_notifications.enabled"
          checked={settings.enabled}
          onChange={onChange}
          helpText="Controla si el backend envía avisos al administrador cuando se procesa una venta."
        />

        <ToggleField
          label="Enviar correo"
          name="sale_notifications.send_email"
          checked={settings.send_email}
          onChange={onChange}
          helpText="Envía el resumen de venta al correo administrador."
        />

        <ToggleField
          label="Enviar WhatsApp"
          name="sale_notifications.send_whatsapp"
          checked={settings.send_whatsapp}
          onChange={onChange}
          helpText="Envía el aviso de venta al WhatsApp administrador."
        />
      </div>

      <div className="settings-page__grid settings-page__grid--two">
        <Field
          label="Correo administrador"
          name="sale_notifications.admin_email"
          type="email"
          value={settings.admin_email}
          onChange={onChange}
          placeholder="ventas@cloudishop.mx"
          required={settings.send_email}
          inputMode="email"
          helpText="Requerido cuando el envío por correo está activo."
          error={errors["sale_notifications.admin_email"]}
        />

        <Field
          label="WhatsApp administrador"
          name="sale_notifications.admin_whatsapp"
          type="tel"
          value={settings.admin_whatsapp}
          onChange={onChange}
          placeholder="5555555555"
          required={settings.send_whatsapp}
          inputMode="numeric"
          maxLength={10}
          pattern="\d{10}"
          title="Escribe un WhatsApp de 10 dígitos."
          helpText="Requerido cuando WhatsApp está activo. Usa 10 dígitos."
          error={errors["sale_notifications.admin_whatsapp"]}
        />
      </div>
    </section>
  )
}

function ShippingSection() {
  return (
    <section className="settings-page__section">
      <div className="settings-shipping__grid">
        <article className="settings-shipping__item">
          <span className="settings-shipping__icon">
            <i className="bi bi-geo-alt" aria-hidden="true" />
          </span>
          <div>
            <h4>Cobertura</h4>
            <p>Zonas, códigos postales y regiones disponibles para entrega.</p>
          </div>
        </article>

        <article className="settings-shipping__item">
          <span className="settings-shipping__icon">
            <i className="bi bi-currency-dollar" aria-hidden="true" />
          </span>
          <div>
            <h4>Tarifas</h4>
            <p>Costos por zona, mínimos de compra y condiciones por pedido.</p>
          </div>
        </article>

        <article className="settings-shipping__item">
          <span className="settings-shipping__icon">
            <i className="bi bi-box-seam" aria-hidden="true" />
          </span>
          <div>
            <h4>Paqueterías</h4>
            <p>Opciones de entrega, tiempos estimados y métodos disponibles.</p>
          </div>
        </article>
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
  min,
  max,
  step,
  maxLength,
  inputMode,
  pattern,
  title,
  error = "",
}) {
  return (
    <label className={`settings-page__field ${error ? "is-error" : ""}`}>
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
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
        title={title}
        aria-invalid={Boolean(error)}
      />
      {error ? <small className="settings-page__field-error">{error}</small> : null}
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
          <img loading="lazy" src={previewUrl} alt={label} />
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
    meta_pixel_id: settings.meta_pixel_id || settings.meta_pixel || "",
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
    abandoned_cart: normalizeAbandonedCartValue(settings.abandoned_cart),
    sale_notifications: normalizeSaleNotificationValue(settings.sale_notifications),
    storefront: normalizeStorefrontValue(settings.storefront),
    logo: null,
    logo_url: normalizeMediaUrl(settings.logo_url || settings.logo_path),
    favicon: null,
    favicon_url: normalizeMediaUrl(settings.favicon_url || settings.favicon_path),
    og_image: null,
    og_image_url: normalizeMediaUrl(settings.og_image_url || settings.og_image_path),
  }
}

function normalizeMetaPixelResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  if (typeof value === "string" || typeof value === "number") return String(value || "").trim()
  if (value && typeof value === "object") return String(value.pixel_id || value.meta_pixel_id || value.meta_pixel || "").trim()

  return ""
}

function normalizeAbandonedCartResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return normalizeAbandonedCartValue(value)
}

function normalizeSaleNotificationResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return normalizeSaleNotificationValue(value)
}

function normalizeStorefrontResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  return normalizeStorefrontValue(value)
}

function normalizeStripeConnectStatus(response) {
  const data = response?.data?.data || response?.data || response || {}

  return data && typeof data === "object" ? data : null
}

function getStripePublicationGate(status) {
  const requirements = buildStripeBlockingRequirementList(status)
  const hasPendingReview = !status?.ready_for_charges && !requirements.length
  const disabledReasonLabel = status?.requirements?.disabled_reason_label || ""

  if (status?.ready_for_charges) {
    return {
      ready: true,
      tone: "success",
      icon: "bi-check-circle-fill",
      title: "Stripe listo para recibir pagos",
      message: "La tienda puede publicarse y procesar cobros con Stripe Connect.",
      cta: "",
      requirements,
    }
  }

  const state = String(status?.status || "not_connected")

  if (state === "onboarding_pending") {
    return {
      ready: false,
      tone: "warning",
      icon: "bi-exclamation-circle-fill",
      title: "Completa la configuración de Stripe",
      message: disabledReasonLabel || (hasPendingReview
        ? "Stripe aún está revisando o activando la cuenta. Intenta actualizar el estado en unos minutos."
        : "Para publicar la tienda y recibir pagos debes terminar el onboarding de Stripe Connect."),
      cta: "Continuar configuración de Stripe",
      requirements,
    }
  }

  if (state === "restricted") {
    return {
      ready: false,
      tone: "danger",
      icon: "bi-slash-circle-fill",
      title: "Stripe requiere información pendiente",
      message: disabledReasonLabel || (hasPendingReview
        ? "Stripe aún está revisando o activando la cuenta. Intenta actualizar el estado en unos minutos."
        : "La tienda no puede recibir pagos hasta resolver los requisitos indicados por Stripe."),
      cta: "Continuar configuración de Stripe",
      requirements,
    }
  }

  return {
    ready: false,
    tone: "warning",
    icon: "bi-cash-stack",
    title: "Conecta Stripe antes de publicar",
    message: "Para recibir pagos, la tienda debe tener Stripe Connect conectado y listo.",
    cta: "Conectar Stripe",
    requirements,
  }
}

function getStripePublicationBlockMessage(status) {
  const state = String(status?.status || "not_connected")
  const disabledReasonLabel = status?.requirements?.disabled_reason_label

  if (disabledReasonLabel) return disabledReasonLabel

  if (state === "onboarding_pending") {
    return "Completa la configuración de Stripe antes de publicar la tienda."
  }

  if (state === "restricted") {
    return "Stripe requiere información pendiente antes de publicar la tienda."
  }

  return "Conecta Stripe antes de publicar la tienda."
}

function buildStripeBlockingRequirementList(status) {
  const requirements = status?.requirements || {}
  const blockingItems = Array.isArray(requirements.items)
    ? requirements.items.filter((item) => item?.blocking)
    : []

  if (blockingItems.length) {
    return blockingItems
      .map((item) => item.label || item.field)
      .filter(Boolean)
  }

  return [
    ...(Array.isArray(requirements.blocking) ? requirements.blocking : []),
    ...(Array.isArray(requirements.past_due) ? requirements.past_due : []),
    ...(Array.isArray(requirements.currently_due) ? requirements.currently_due : []),
    ...(Array.isArray(requirements.eventually_due) ? requirements.eventually_due : []),
  ].filter(Boolean)
}

function normalizeAbandonedCartValue(value = {}) {
  return {
    enabled: booleanOrDefault(value.enabled, EMPTY_FORM.abandoned_cart.enabled),
    abandon_after_minutes: value.abandon_after_minutes ?? EMPTY_FORM.abandoned_cart.abandon_after_minutes,
    recovery_link_expires_hours:
      value.recovery_link_expires_hours ?? EMPTY_FORM.abandoned_cart.recovery_link_expires_hours,
    send_email: booleanOrDefault(value.send_email, EMPTY_FORM.abandoned_cart.send_email),
    send_whatsapp: booleanOrDefault(value.send_whatsapp, EMPTY_FORM.abandoned_cart.send_whatsapp),
  }
}

function normalizeSaleNotificationValue(value = {}) {
  return {
    enabled: booleanOrDefault(value.enabled, EMPTY_FORM.sale_notifications.enabled),
    send_email: booleanOrDefault(value.send_email, EMPTY_FORM.sale_notifications.send_email),
    send_whatsapp: booleanOrDefault(value.send_whatsapp, EMPTY_FORM.sale_notifications.send_whatsapp),
    admin_email: value.admin_email || EMPTY_FORM.sale_notifications.admin_email,
    admin_whatsapp: value.admin_whatsapp || EMPTY_FORM.sale_notifications.admin_whatsapp,
  }
}

function normalizeStorefrontValue(value = {}) {
  const construction = value.construction && typeof value.construction === "object"
    ? value.construction
    : {}
  const theme = value.theme && typeof value.theme === "object" ? value.theme : {}

  return {
    ...EMPTY_FORM.storefront,
    is_published: booleanOrDefault(value.is_published, EMPTY_FORM.storefront.is_published),
    construction_title:
      value.construction_title ||
      construction.title ||
      EMPTY_FORM.storefront.construction_title,
    construction_message:
      value.construction_message ||
      construction.message ||
      EMPTY_FORM.storefront.construction_message,
    template: value.template || value.home_template || EMPTY_FORM.storefront.template,
    available_home_templates: Array.isArray(value.available_home_templates)
      ? value.available_home_templates
      : EMPTY_FORM.storefront.available_home_templates,
    theme: {
      ...EMPTY_FORM.storefront.theme,
      ...theme,
    },
  }
}

function booleanOrDefault(value, fallback) {
  if (value === undefined || value === null) return fallback
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase())

  return Boolean(value)
}

function buildAbandonedCartPayload(settings) {
  return {
    enabled: Boolean(settings.enabled),
    abandon_after_minutes: Number(settings.abandon_after_minutes),
    recovery_link_expires_hours: Number(settings.recovery_link_expires_hours),
    send_email: Boolean(settings.send_email),
    send_whatsapp: Boolean(settings.send_whatsapp),
  }
}

function buildSaleNotificationPayload(settings) {
  return {
    enabled: Boolean(settings.enabled),
    send_email: Boolean(settings.send_email),
    send_whatsapp: Boolean(settings.send_whatsapp),
    admin_email: nullableValue(settings.admin_email),
    admin_whatsapp: onlyDigits(settings.admin_whatsapp) || null,
  }
}

function buildStorefrontPublicationPayload(settings) {
  return {
    is_published: Boolean(settings.is_published),
    construction_title: nullableValue(settings.construction_title),
    construction_message: nullableValue(settings.construction_message),
  }
}

function validateAbandonedCartPayload(payload) {
  if (!Number.isInteger(payload.abandon_after_minutes)) {
    return "Los minutos de abandono deben ser un número entero."
  }

  if (payload.abandon_after_minutes < 60 || payload.abandon_after_minutes > 10080) {
    return "Los minutos de abandono deben estar entre 60 y 10080."
  }

  if (!Number.isInteger(payload.recovery_link_expires_hours)) {
    return "Las horas de vigencia deben ser un número entero."
  }

  if (payload.recovery_link_expires_hours < 1 || payload.recovery_link_expires_hours > 720) {
    return "Las horas de vigencia deben estar entre 1 y 720."
  }

  return ""
}

function validateStorefrontPublicationPayload(payload) {
  if (!payload.construction_title) {
    return "Escribe el título de construcción."
  }

  if (!payload.construction_message) {
    return "Escribe el mensaje de construcción."
  }

  return ""
}

function validateSettingsSection(form, section) {
  const errors = {}

  if (section === "contact") {
    form.contact_numbers.forEach((number, index) => {
      const value = String(number || "").trim()
      if (value && !isValidTenDigitPhone(value)) {
        errors[`contact_numbers.${index}`] = PHONE_FORMAT_MESSAGE
      }
    })

    if (form.email && !isValidEmail(form.email)) {
      errors.email = EMAIL_FORMAT_MESSAGE
    }
  }

  if (section === "forms" && form.forms_recipient_email && !isValidEmail(form.forms_recipient_email)) {
    errors.forms_recipient_email = EMAIL_FORMAT_MESSAGE
  }

  return {
    errors,
    message: Object.values(errors)[0] || "",
  }
}

function validateSaleNotificationPayload(payload) {
  const errors = {}

  if (payload.send_email && !payload.admin_email) {
    errors["sale_notifications.admin_email"] = "Correo administrador requerido."
  }

  if (payload.admin_email && !isValidEmail(payload.admin_email)) {
    errors["sale_notifications.admin_email"] = EMAIL_FORMAT_MESSAGE
  }

  if (payload.send_whatsapp && !payload.admin_whatsapp) {
    errors["sale_notifications.admin_whatsapp"] = "WhatsApp administrador requerido."
  }

  if (payload.admin_whatsapp && !isValidTenDigitPhone(payload.admin_whatsapp)) {
    errors["sale_notifications.admin_whatsapp"] = PHONE_FORMAT_MESSAGE
  }

  return {
    errors,
    message: Object.values(errors)[0] || "",
  }
}

function normalizeTenDigitPhone(value = "") {
  return String(value || "").replace(/\D/g, "").slice(0, 10)
}

function isValidTenDigitPhone(value = "") {
  return /^\d{10}$/.test(String(value || "").trim())
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim())
}

function getSettingsFieldError(name, value) {
  const normalizedValue = String(value || "").trim()

  if (!normalizedValue) return ""

  if (name === "email" || name === "forms_recipient_email" || name === "sale_notifications.admin_email") {
    return isValidEmail(normalizedValue) ? "" : EMAIL_FORMAT_MESSAGE
  }

  if (name.startsWith("contact_numbers.") || name === "sale_notifications.admin_whatsapp") {
    return isValidTenDigitPhone(normalizedValue) ? "" : PHONE_FORMAT_MESSAGE
  }

  return ""
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

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "")
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
