import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  createAdminCustomDomain,
  deleteAdminCustomDomain,
  getAdminCustomDomains,
  refreshAdminCustomDomain,
} from "../../../services/api/customDomainsService"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import "./CustomDomainsPage.css"

const EMPTY_FORM = {
  domain: "",
}

const STATUS_META = {
  pending_dns: {
    label: "Esperando configuracion DNS",
    tone: "warning",
    icon: "bi-diagram-3",
    description: "El cliente debe crear el registro CNAME indicado.",
  },
  pending_validation: {
    label: "Validando",
    tone: "info",
    icon: "bi-hourglass-split",
    description: "Cloudflare esta verificando el hostname.",
  },
  pending_ssl: {
    label: "Generando certificado SSL",
    tone: "info",
    icon: "bi-shield-lock",
    description: "El dominio ya valido DNS y espera certificado.",
  },
  active: {
    label: "Conectado",
    tone: "success",
    icon: "bi-check-circle",
    description: "El dominio esta listo para recibir visitas.",
  },
  error: {
    label: "Error de configuracion",
    tone: "danger",
    icon: "bi-exclamation-triangle",
    description: "Hay errores de validacion o certificado.",
  },
}

function CustomDomainsPage() {
  const [domains, setDomains] = useState([])
  const [selectedDomainId, setSelectedDomainId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState("")
  const [accessBlocked, setAccessBlocked] = useState(false)
  const [domainPendingDisconnect, setDomainPendingDisconnect] = useState(null)
  const [helpModalOpen, setHelpModalOpen] = useState(false)

  const selectedDomain = useMemo(() => {
    return domains.find((domain) => String(domain.id) === String(selectedDomainId)) || domains[0] || null
  }, [domains, selectedDomainId])

  const readyCount = useMemo(() => domains.filter((domain) => domain.is_ready).length, [domains])
  const pendingCount = useMemo(() => domains.filter((domain) => !domain.is_ready).length, [domains])

  const loadDomains = useCallback(async () => {
    try {
      setLoading(true)
      setAccessBlocked(false)
      const response = await getAdminCustomDomains()
      const nextDomains = normalizeDomainsResponse(response)

      setDomains(nextDomains)
      setSelectedDomainId((currentId) => {
        if (nextDomains.some((domain) => String(domain.id) === String(currentId))) return currentId
        return nextDomains[0]?.id || null
      })
    } catch (error) {
      const status = error?.response?.status
      console.error("Error cargando dominios personalizados:", error?.response?.data || error)

      if (status === 402 || status === 403) {
        setAccessBlocked(true)
        setDomains([])
        return
      }

      notifyError(error?.response?.data?.message || "No fue posible cargar los dominios.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDomains()
  }, [loadDomains])

  async function handleSubmit(event) {
    event.preventDefault()

    if (domains.length > 0) {
      notifyWarning("Desconecta el dominio actual antes de agregar otro.")
      return
    }

    const domain = form.domain.trim()

    if (!domain) {
      notifyWarning("Escribe el dominio que quieres conectar.")
      return
    }

    try {
      setCreating(true)
      const response = await createAdminCustomDomain(domain)
      const nextDomain = normalizeDomain(response?.data || response)

      setForm(EMPTY_FORM)

      if (nextDomain?.id) {
        setDomains((current) => upsertDomain(current, nextDomain))
        setSelectedDomainId(nextDomain.id)
      } else {
        await loadDomains()
      }

      notifySuccess(response?.message || "Dominio registrado correctamente.")
    } catch (error) {
      const status = error?.response?.status
      const currentDomain = normalizeDomain(error?.response?.data?.data?.current_domain)

      console.error("Error creando dominio personalizado:", error?.response?.data || error)

      if (status === 422 && currentDomain?.id) {
        setDomains([currentDomain])
        setSelectedDomainId(currentDomain.id)
        setForm(EMPTY_FORM)
      }

      notifyError(error?.response?.data?.message || "No fue posible registrar el dominio.")
    } finally {
      setCreating(false)
    }
  }

  async function handleRefresh(domainId) {
    try {
      setActionLoadingId(`refresh:${domainId}`)
      const response = await refreshAdminCustomDomain(domainId)
      const nextDomain = normalizeDomain(response?.data || response)

      if (nextDomain?.id) {
        setDomains((current) => upsertDomain(current, nextDomain))
        setSelectedDomainId(nextDomain.id)
      } else {
        await loadDomains()
      }

      notifySuccess(response?.message || "Estado actualizado.")
    } catch (error) {
      console.error("Error refrescando dominio personalizado:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible refrescar el dominio.")
    } finally {
      setActionLoadingId("")
    }
  }

  function handleDelete(domain) {
    setDomainPendingDisconnect(domain)
  }

  async function handleConfirmDisconnect() {
    if (!domainPendingDisconnect?.id) return

    try {
      const domainId = domainPendingDisconnect.id
      setActionLoadingId(`delete:${domainId}`)
      const response = await deleteAdminCustomDomain(domainId)

      setDomains((current) => current.filter((item) => String(item.id) !== String(domainId)))
      setSelectedDomainId((currentId) => (String(currentId) === String(domainId) ? null : currentId))
      setDomainPendingDisconnect(null)
      notifySuccess(response?.message || "Dominio desconectado.")
    } catch (error) {
      console.error("Error desconectando dominio personalizado:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible desconectar el dominio.")
    } finally {
      setActionLoadingId("")
    }
  }

  async function handleCopy(value) {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      notifySuccess("Copiado al portapapeles.")
    } catch (error) {
      console.error("Error copiando valor DNS:", error)
      notifyWarning("No se pudo copiar automaticamente.")
    }
  }

  if (loading) return <CustomDomainsSkeleton />

  if (accessBlocked) {
    return (
      <div className="custom-domains-page">
        <section className="custom-domains-upgrade">
          <div className="custom-domains-upgrade__icon">
            <i className="bi bi-stars" aria-hidden="true" />
          </div>
          <div>
            <span>Shop+</span>
            <h1>Dominios personalizados</h1>
            <p>Esta funcion esta disponible para tiendas con plan Shop+.</p>
          </div>
          <Link to="/admin/subscription">Ver suscripcion</Link>
        </section>
      </div>
    )
  }

  return (
    <div className="custom-domains-page">
      <header className="custom-domains-header">
        <div>
          <span>Shop+</span>
          <h1>Dominios personalizados</h1>
          <p>Conecta dominios propios y revisa el estado de DNS, validacion y SSL.</p>
        </div>
        <div className="custom-domains-header__actions">
          <button type="button" className="is-secondary" onClick={() => setHelpModalOpen(true)}>
            <i className="bi bi-question-circle" aria-hidden="true" />
            Ayuda
          </button>
          <button type="button" onClick={loadDomains}>
            <i className="bi bi-arrow-repeat" aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </header>

      <section className="custom-domains-summary" aria-label="Resumen de dominios">
        <SummaryCard label="Dominios" value={domains.length} icon="bi-globe2" />
        <SummaryCard label="Activos" value={readyCount} icon="bi-check2-circle" />
        <SummaryCard label="Pendientes" value={pendingCount} icon="bi-clock-history" />
      </section>

      {domains.length === 0 ? (
        <section className="custom-domains-create">
          <div className="custom-domains-create__copy">
            <h2>Registrar dominio</h2>
            <p>No incluyas https:// ni rutas. Usa preferentemente www.tudominio.com.</p>
          </div>
          <form onSubmit={handleSubmit}>
            <label>
              <span>Dominio personalizado</span>
              <input
                type="text"
                value={form.domain}
                onChange={(event) => setForm({ domain: event.target.value })}
                placeholder="Ejemplo: www.mimarca.com"
                autoComplete="off"
              />
            </label>
            <button type="submit" disabled={creating}>
              <i className="bi bi-plus-circle" aria-hidden="true" />
              {creating ? "Registrando..." : "Agregar"}
            </button>
          </form>
        </section>
      ) : (
        <section className="custom-domains-limit">
          <div>
            <span>Limite activo</span>
            <h2>Una tienda puede tener un dominio personalizado.</h2>
            <p>Para cambiarlo, desconecta el dominio actual y registra el nuevo despues.</p>
          </div>
        </section>
      )}

      <section className="custom-domains-layout">
        <div className="custom-domains-list">
          <div className="custom-domains-list__head">
            <h2>Dominios</h2>
            <span>{domains.length}</span>
          </div>

          {domains.length ? (
            domains.map((domain) => (
              <DomainListItem
                key={domain.id}
                domain={domain}
                isActive={String(selectedDomain?.id) === String(domain.id)}
                onSelect={setSelectedDomainId}
              />
            ))
          ) : (
            <div className="custom-domains-empty">
              <i className="bi bi-globe-americas" aria-hidden="true" />
              <h3>Sin dominios registrados</h3>
              <p>Agrega el primer dominio para generar las instrucciones DNS.</p>
            </div>
          )}
        </div>

        <DomainDetail
          actionLoadingId={actionLoadingId}
          domain={selectedDomain}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onRefresh={handleRefresh}
        />
      </section>

      <DisconnectDomainModal
        actionLoadingId={actionLoadingId}
        domain={domainPendingDisconnect}
        onCancel={() => setDomainPendingDisconnect(null)}
        onConfirm={handleConfirmDisconnect}
      />

      <DomainHelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  )
}

function SummaryCard({ label, value, icon }) {
  return (
    <article className="custom-domains-summary__card">
      <span>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  )
}

function DomainListItem({ domain, isActive, onSelect }) {
  const statusMeta = getStatusMeta(domain.status || domain.app_status)

  return (
    <button
      type="button"
      className={`custom-domains-item ${isActive ? "is-active" : ""}`}
      onClick={() => onSelect(domain.id)}
    >
      <span className={`custom-domains-status custom-domains-status--${statusMeta.tone}`}>
        <i className={`bi ${statusMeta.icon}`} aria-hidden="true" />
      </span>
      <span className="custom-domains-item__copy">
        <strong>{domain.domain}</strong>
        <small>{statusMeta.label}</small>
      </span>
      <i className="bi bi-chevron-right" aria-hidden="true" />
    </button>
  )
}

function DomainDetail({ actionLoadingId, domain, onCopy, onDelete, onRefresh }) {
  if (!domain) {
    return (
      <aside className="custom-domains-detail custom-domains-detail--empty">
        <i className="bi bi-window-sidebar" aria-hidden="true" />
        <h2>Selecciona un dominio</h2>
        <p>Cuando registres o selecciones un dominio veras el DNS y el estado tecnico.</p>
      </aside>
    )
  }

  const statusMeta = getStatusMeta(domain.status || domain.app_status)
  const dns = domain.dns || {}
  const verificationErrors = Array.isArray(domain.verification_errors) ? domain.verification_errors : []

  return (
    <aside className="custom-domains-detail">
      <div className="custom-domains-detail__head">
        <div>
          <span className={`custom-domains-status custom-domains-status--${statusMeta.tone}`}>
            <i className={`bi ${statusMeta.icon}`} aria-hidden="true" />
          </span>
          <div>
            <h2>{domain.domain}</h2>
            <p>{statusMeta.description}</p>
          </div>
        </div>

        <div className="custom-domains-detail__actions">
          <button
            type="button"
            onClick={() => onRefresh(domain.id)}
            disabled={Boolean(actionLoadingId)}
          >
            <i className="bi bi-arrow-repeat" aria-hidden="true" />
            {actionLoadingId === `refresh:${domain.id}` ? "Verificando..." : "Verificar estado"}
          </button>
          <button
            type="button"
            className="is-danger"
            onClick={() => onDelete(domain)}
            disabled={Boolean(actionLoadingId)}
          >
            <i className="bi bi-trash3" aria-hidden="true" />
            {actionLoadingId === `delete:${domain.id}` ? "Desconectando..." : "Desconectar"}
          </button>
        </div>
      </div>

      <div className="custom-domains-detail__grid">
        <InfoItem label="Estado app" value={formatStatus(domain.app_status || domain.status)} />
        <InfoItem label="Hostname" value={formatStatus(domain.hostname_status)} />
        <InfoItem label="SSL" value={formatStatus(domain.ssl_status)} />
        <InfoItem label="Cloudflare" value={domain.cloudflare_configured ? "Configurado" : "Pendiente"} />
      </div>

      <section className="custom-domains-dns">
        <div className="custom-domains-dns__head">
          <h3>Registro DNS</h3>
          <span>{dns.type || "CNAME"}</span>
        </div>

        <DnsRow label="Nombre" value={dns.name || getFallbackDnsName(domain.domain)} onCopy={onCopy} />
        <DnsRow label="Hostname" value={dns.hostname || domain.domain} onCopy={onCopy} />
        <DnsRow label="Destino" value={dns.target || "domains.cloudishop.mx"} onCopy={onCopy} />

        {dns.note ? <p>{dns.note}</p> : null}
      </section>

      {verificationErrors.length ? (
        <section className="custom-domains-errors">
          <h3>Errores de verificacion</h3>
          <ul>
            {verificationErrors.map((error) => (
              <li key={String(error)}>{String(error)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="custom-domains-detail__dates">
        <InfoItem label="Verificado" value={formatDate(domain.verified_at)} />
        <InfoItem label="Ultima revision" value={formatDate(domain.last_checked_at)} />
      </div>
    </aside>
  )
}

function DisconnectDomainModal({ actionLoadingId, domain, onCancel, onConfirm }) {
  if (!domain) return null

  const isDisconnecting = actionLoadingId === `delete:${domain.id}`

  return (
    <div className="custom-domains-modal" role="presentation">
      <div
        className="custom-domains-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-domains-disconnect-title"
      >
        <div className="custom-domains-modal__icon">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
        </div>

        <div className="custom-domains-modal__copy">
          <span>Desconectar dominio</span>
          <h2 id="custom-domains-disconnect-title">{domain.domain}</h2>
          <p>
            Al desconectarlo, este dominio dejara de estar asociado a la tienda y ya no podra usarse
            como dominio personalizado en CloudiShop.
          </p>
        </div>

        <div className="custom-domains-modal__notice">
          <strong>Que va a pasar</strong>
          <ul>
            <li>La tienda volvera a operar con su dominio de CloudiShop.</li>
            <li>El registro DNS del proveedor del cliente no se modifica automaticamente.</li>
            <li>Para conectar otro dominio, primero debe terminar esta desconexion.</li>
          </ul>
        </div>

        <div className="custom-domains-modal__actions">
          <button type="button" onClick={onCancel} disabled={isDisconnecting}>
            Cancelar
          </button>
          <button type="button" className="is-danger" onClick={onConfirm} disabled={isDisconnecting}>
            {isDisconnecting ? "Desconectando..." : "Desconectar dominio"}
          </button>
        </div>
      </div>
    </div>
  )
}

function DomainHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="custom-domains-modal" role="presentation">
      <div
        className="custom-domains-modal__dialog custom-domains-modal__dialog--help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-domains-help-title"
      >
        <div className="custom-domains-help__header">
          <div className="custom-domains-modal__icon custom-domains-modal__icon--help">
            <i className="bi bi-question-circle" aria-hidden="true" />
          </div>
          <div>
            <span>Ayuda</span>
            <h2 id="custom-domains-help-title">Ayuda para conectar tu dominio</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar ayuda">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="custom-domains-help">
          <section>
            <p>
              Para conectar tu dominio personalizado, entra al panel donde compraste o administras
              tu dominio y abre la seccion de DNS.
            </p>
            <p>Crea o edita el siguiente registro:</p>
            <div className="custom-domains-help__dns">
              <HelpRow label="Tipo" value="CNAME" />
              <HelpRow label="Nombre" value="www" />
              <HelpRow label="Destino" value="domains.cloudishop.mx" />
              <HelpRow label="TTL" value="Automatico o 300" />
            </div>
            <p>
              Si ya existe un registro con nombre www, editalo y cambia su destino a
              domains.cloudishop.mx. Si no te permite editarlo, eliminalo y crea uno nuevo tipo
              CNAME.
            </p>
            <p>
              Despues de guardar el cambio, vuelve a esta pantalla y presiona Verificar estado. La
              validacion puede tardar entre unos minutos y hasta 24 horas, dependiendo del proveedor
              del dominio.
            </p>
            <p>
              Mientras el dominio este en validacion, tu tienda seguira funcionando con su dominio
              original de CloudiShop.
            </p>
          </section>

          <section>
            <h3>Notas importantes</h3>
            <ul>
              <li>No uses una direccion IP como destino.</li>
              <li>No apuntes www a cloudishop.mx.</li>
              <li>El destino correcto es siempre domains.cloudishop.mx.</li>
              <li>Si usas Cloudflare en tu propio dominio, el registro www debe estar en Solo DNS, no con proxy activo.</li>
              <li>Por ahora conecta el dominio con www, por ejemplo www.mitienda.com.</li>
            </ul>
          </section>

          <section>
            <h3>Estados</h3>
            <div className="custom-domains-help__statuses">
              <HelpStatus title="Esperando configuracion DNS" text="El dominio todavia no apunta correctamente a CloudiShop." />
              <HelpStatus title="Validando" text="Cloudflare esta verificando el dominio y preparando el certificado SSL." />
              <HelpStatus title="Activo" text="El dominio ya esta conectado y listo para usarse." />
              <HelpStatus title="Error" text="Hay un problema con el registro DNS. Revisa que el CNAME apunte a domains.cloudishop.mx." />
            </div>
          </section>

          <section className="custom-domains-help__error">
            <h3>Mensaje para error DNS</h3>
            <p>
              El dominio todavia no apunta a CloudiShop. Revisa que el registro CNAME de www apunte
              exactamente a domains.cloudishop.mx.
            </p>
          </section>
        </div>

        <div className="custom-domains-modal__actions">
          <button type="button" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

function HelpRow({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function HelpStatus({ title, text }) {
  return (
    <article>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  )
}

function DnsRow({ label, value, onCopy }) {
  return (
    <div className="custom-domains-dns__row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
      <button type="button" onClick={() => onCopy(value)} disabled={!value} aria-label={`Copiar ${label}`}>
        <i className="bi bi-clipboard" aria-hidden="true" />
      </button>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="custom-domains-info">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  )
}

function CustomDomainsSkeleton() {
  return (
    <div className="custom-domains-page">
      <div className="custom-domains-skeleton custom-domains-skeleton--header" />
      <div className="custom-domains-skeleton custom-domains-skeleton--summary" />
      <div className="custom-domains-skeleton custom-domains-skeleton--content" />
    </div>
  )
}

function normalizeDomainsResponse(response) {
  const source = response?.data?.items
    || response?.data?.domains
    || response?.data
    || response?.items
    || response?.domains
    || response

  if (!Array.isArray(source)) return []

  return source.map(normalizeDomain).filter(Boolean)
}

function normalizeDomain(domain) {
  if (!domain || typeof domain !== "object") return null

  return {
    ...domain,
    id: domain.id,
    domain: domain.domain || domain.hostname || "",
    status: domain.status || domain.app_status || "pending_dns",
    is_ready: Boolean(domain.is_ready),
  }
}

function upsertDomain(domains, nextDomain) {
  const exists = domains.some((domain) => String(domain.id) === String(nextDomain.id))

  if (!exists) return [nextDomain, ...domains]

  return domains.map((domain) => (String(domain.id) === String(nextDomain.id) ? nextDomain : domain))
}

function getStatusMeta(status) {
  return STATUS_META[String(status || "").toLowerCase()] || STATUS_META.pending_dns
}

function formatStatus(status) {
  if (!status) return "Pendiente"

  return getStatusMeta(status).label || String(status).replaceAll("_", " ")
}

function getFallbackDnsName(domain = "") {
  const parts = String(domain).split(".")

  return parts.length > 2 ? parts[0] : "@"
}

function formatDate(value) {
  if (!value) return "Sin registro"

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

export default CustomDomainsPage
