import { useState } from "react"
import { sendContactLead } from "../../../services/api/contactService"
import "./footer.css"

function Footer() {
  const [submittingLead, setSubmittingLead] = useState(false)
  const [leadStatus, setLeadStatus] = useState(null)

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
                  <li><a href="tel:3313490669">33 1349 0669</a></li>
                  <li><a href="mailto:contacto@pidefacilraul.com">contacto@pidefacilraul.com</a></li>
                  <li>
                    <a
                      href="https://maps.google.com/?q=Calle+8,+Ferrocarril,+44440+Guadalajara"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Calle 8, Ferrocarril, 44440 Guadalajara
                    </a>
                  </li>
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
                  <a href="#" className="fab fa-facebook-f" aria-label="Facebook"></a>
                  <a href="#" className="fab fa-twitter" aria-label="Twitter"></a>
                  <a href="#" className="fab fa-linkedin-in" aria-label="LinkedIn"></a>
                  <a href="#" className="fab fa-pinterest-p" aria-label="Pinterest"></a>
                </div>

                <div style={{ marginTop: "24px" }}>
                  <img
                    src="https://www.pidefacilraul.com/cms/wp-content/uploads/2020/09/CC-175-PIDEFaCIL-LOGO-HORIZONTAL-e1724443779289.png"
                    alt="PideFácil Raúl"
                    style={{ maxWidth: "220px", width: "100%", height: "auto" }}
                  />
                </div>
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
              <p className="mb-0 f_400">Todos los derechos reservados PideFácil Raúl 2026</p>
            </div>

            <div className="footer_bottom_right">
              <p>Diseño por TecIOT</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
