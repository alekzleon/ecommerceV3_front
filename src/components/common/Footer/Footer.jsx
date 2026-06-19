import { useState } from "react"
import { useSettings } from "../../../context/SettingsContext"
import { sendContactLead } from "../../../services/api/contactService"
import "./footer.css"

function Footer() {
  const { settings, brandName, logoUrl } = useSettings()
  const [submittingLead, setSubmittingLead] = useState(false)
  const [leadStatus, setLeadStatus] = useState(null)
  const contactNumbers = Array.isArray(settings.contact_numbers)
    ? settings.contact_numbers.filter(Boolean)
    : []
  const socialLinks = settings.social_links || {}

  const handleLeadSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
    }

    try {
      setSubmittingLead(true)
      setLeadStatus(null)

      const response = await sendContactLead(payload)

      setLeadStatus({
        type: "success",
        message: response?.message || "Información enviada correctamente.",
      })
      form.reset()
    } catch (error) {
      setLeadStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "No fue posible enviar tu información. Inténtalo nuevamente.",
      })
    } finally {
      setSubmittingLead(false)
    }
  }

  return (
    <footer className="new_footer_area bg_color">
      <div className="new_footer_top">
        <div className="footer_container">
          <div className="footer_row">
            <div className="footer_col">
              <div
                className="f_widget company_widget wow fadeInLeft"
                data-wow-delay="0.2s"
                style={{
                  visibility: "visible",
                  animationDelay: "0.2s",
                  animationName: "fadeInLeft",
                }}
              >
                <h3 className="f-title f_600 t_color f_size_18">Regístrate</h3>
                <p>Quieres ser parte de nuestra comunidad, déjanos tus datos.</p>

                <form
                  className="f_subscribe_two mailchimp"
                  onSubmit={handleLeadSubmit}
                >
                  <input
                    type="text"
                    name="name"
                    className="form-control memail"
                    placeholder="Nombre"
                    autoComplete="name"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    className="form-control memail"
                    placeholder="Email"
                    autoComplete="email"
                    required
                  />

                  {leadStatus ? (
                    <p className={`footer_form_status footer_form_status--${leadStatus.type}`}>
                      {leadStatus.message}
                    </p>
                  ) : null}

                  <button
                    className="btn btn_get btn_get_two"
                    type="submit"
                    disabled={submittingLead}
                  >
                    {submittingLead ? "Enviando..." : "Enviar"}
                  </button>
                </form>
              </div>
            </div>

            <div className="footer_col">
              <div
                className="f_widget about-widget pl_70 wow fadeInLeft"
                data-wow-delay="0.4s"
                style={{
                  visibility: "visible",
                  animationDelay: "0.4s",
                  animationName: "fadeInLeft",
                }}
              >
                <h3 className="f-title f_600 t_color f_size_18">Contáctanos</h3>
                <ul className="list-unstyled f_list">
                  {contactNumbers.map((number) => (
                    <li key={number}>
                      <a href={`tel:${number.replace(/\s+/g, "")}`}>{number}</a>
                    </li>
                  ))}
                  {settings.email ? (
                    <li>
                      <a href={`mailto:${settings.email}`}>{settings.email}</a>
                    </li>
                  ) : null}
                  {settings.address ? (
                    <li>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {settings.address}
                      </a>
                    </li>
                  ) : null}
                  {!contactNumbers.length && !settings.email && !settings.address ? (
                    <li>Configura tus datos de contacto</li>
                  ) : null}
                </ul>
              </div>
            </div>

            <div className="footer_col">
              <div
                className="f_widget about-widget pl_70 wow fadeInLeft"
                data-wow-delay="0.6s"
                style={{
                  visibility: "visible",
                  animationDelay: "0.6s",
                  animationName: "fadeInLeft",
                }}
              >
                <h3 className="f-title f_600 t_color f_size_18">Legal</h3>
                <ul className="list-unstyled f_list">
                  <li><a href="/aviso-privacidad">Aviso de privacidad</a></li>
                  <li><a href="/terminos-y-condiciones">Términos y condiciones</a></li>
                  <li><a href="/contacto">Contacto</a></li>
                </ul>
              </div>
            </div>

            <div className="footer_col">
              <div
                className="f_widget social-widget pl_70 wow fadeInLeft"
                data-wow-delay="0.8s"
                style={{
                  visibility: "visible",
                  animationDelay: "0.8s",
                  animationName: "fadeInLeft",
                }}
              >
                <h3 className="f-title f_600 t_color f_size_18">Nuestras redes</h3>

                <div className="f_social_icon">
                  {socialLinks.facebook ? (
                    <a
                      href={socialLinks.facebook}
                      className="fab fa-facebook-f"
                      aria-label="Facebook"
                      target="_blank"
                      rel="noreferrer"
                    ></a>
                  ) : null}
                  {socialLinks.instagram ? (
                    <a
                      href={socialLinks.instagram}
                      className="fab fa-instagram"
                      aria-label="Instagram"
                      target="_blank"
                      rel="noreferrer"
                    ></a>
                  ) : null}
                  {socialLinks.tiktok ? (
                    <a
                      href={socialLinks.tiktok}
                      className="fab fa-tiktok"
                      aria-label="TikTok"
                      target="_blank"
                      rel="noreferrer"
                    ></a>
                  ) : null}
                </div>

                {logoUrl ? (
                  <div style={{ marginTop: "24px" }}>
                    <img
                      src={logoUrl}
                      alt={brandName}
                      style={{ maxWidth: "220px", width: "100%", height: "auto" }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="footer_bg">
          <div className="footer_bg_one"></div>
          <div className="footer_bg_two"></div>
        </div>
      </div>

      <div className="footer_bottom">
        <div className="footer_container">
          <div className="footer_bottom_row">
            <div className="footer_bottom_left">
              <p className="mb-0 f_400">todos los derechos reservados de {brandName}</p>
            </div>

            <div className="footer_bottom_right">
              <p>
                Diseñado por 🚀{" "}
                <a
                  href="https://cloudi.mx"
                  className="footer_cloudi_link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  cloudi
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
