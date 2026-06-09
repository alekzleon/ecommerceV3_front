import { useState } from "react"
import contactImage from "../../assets/images/contact-faq-delivery.png"
import { sendContactMessage } from "../../services/api/contactService"
import "./contactpage.css"

const faqs = [
  {
    question: "¿Cómo me registro como nuevo cliente?",
    answer: "Dale click en el botón “REGISTRO” y completa el formulario.",
  },
  {
    question: "¿Puedo hacer pedidos sin estar registrado?",
    answer: "Para realizar cualquier pedido, es necesario estar registrado previamente.",
  },
  {
    question: "¿Cómo guardo mis pedidos frecuentes?",
    answer:
      "Tus pedidos frecuentes se guardan automáticamente en el sistema. Si agregas un nuevo producto asegúrate de seleccionar el icono del corazón de esta manera aparecerá en tus frecuentes la próxima vez.",
  },
  {
    question: "¿Cómo elimino un producto de mis pedidos frecuentes?",
    answer:
      "Para eliminar un producto de tu lista de pedidos frecuentes, dale click en el icono del corazón así lo estarás quitando de tu lista de frecuentes.",
  },
  {
    question: "¿Cómo elimino un producto de mi pedido pero no de mis pedidos frecuentes?",
    answer:
      "Puedes seleccionar la cantidad que deseas de un producto, si no quieres recibir ese producto en tu pedido, dale click en el “X”.",
  },
  {
    question: "¿Cómo puedo ser proveedor de Pidefácil Raúl?",
    answer: "Envíanos un correo electrónico a contacto@pidefacilraul.com.",
    email: "contacto@pidefacilraul.com",
  },
  {
    question: "¿Cómo puedo saber la fecha de entrega de mi pedido?",
    answer: "Al hacer tu pedido, te llegará un correo electrónico con la fecha de entrega.",
  },
  {
    question:
      "Si no recibí mi pedido cuando decía el correo de confirmación de pedido, ¿cómo puedo rastrearlo?",
    answer:
      "Si aún no recibes tu pedido, por favor ponte en contacto con nosotros al correo contacto@pidefacilraul.com",
  },
]

function ContactPage() {
  const [openFaq, setOpenFaq] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const form = event.currentTarget

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    }

    try {
      setSubmitting(true)
      setFormStatus(null)

      const response = await sendContactMessage(payload)

      setFormStatus({
        type: "success",
        message: response?.message || "Mensaje enviado correctamente.",
      })
      form.reset()
    } catch (error) {
      setFormStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "No fue posible enviar el mensaje. Inténtalo nuevamente.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="contact-page">
      <div className="container-main">
        <div className="contact-page__hero">
          <div className="contact-page__header">
            <p className="contact-page__breadcrumbs">Inicio &gt; Contacto</p>
            <h1>Contacto</h1>
            <p>
              Escríbenos para resolver dudas sobre pedidos, entregas, registro de clientes
              o información para proveedores.
            </p>
          </div>
        </div>

        <div className="contact-page__grid">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-section-title">
              <span />
              <h2>Enviar mensaje</h2>
            </div>

            <label className="contact-form__field">
              <span>Nombre requerido</span>
              <input type="text" name="name" autoComplete="name" required />
            </label>

            <label className="contact-form__field">
              <span>Email requerido</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>

            <label className="contact-form__field">
              <span>Mensaje requerido</span>
              <textarea name="message" rows="7" required />
            </label>

            {formStatus ? (
              <p className={`contact-form__status contact-form__status--${formStatus.type}`}>
                {formStatus.message}
              </p>
            ) : null}

            <button type="submit" className="contact-form__submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar"}
            </button>
          </form>

          <div className="contact-map">
            <div className="contact-section-title contact-section-title--soft">
              <span />
              <h2>Nuestra ubicación</h2>
            </div>

            <iframe
              title="Ubicación de PideFácil Raúl"
              src="https://www.google.com/maps?q=PIDEF%C3%81CIL%20RA%C3%9AL%20C.%208%201781%20Ferrocarril%2044440%20Guadalajara%20Jal.&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="contact-faq-layout">
          <div className="contact-faq">
            <div className="contact-section-title">
              <span />
              <h2>Preguntas frecuentes</h2>
            </div>

            <p className="contact-faq__intro">
              Información oportuna que ponemos a su consideración.
            </p>

            <div className="contact-faq__accordion">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index

                return (
                  <div className="contact-faq__item" key={faq.question}>
                    <button
                      type="button"
                      className={`contact-faq__trigger ${isOpen ? "is-open" : ""}`}
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                    >
                      <span className="contact-faq__icon">⌄</span>
                      <span>{faq.question}</span>
                    </button>

                    {isOpen ? (
                      <div className="contact-faq__answer">
                        {faq.email ? (
                          <p>
                            Envíanos un correo electrónico a{" "}
                            <a href={`mailto:${faq.email}`}>{faq.email}</a>.
                          </p>
                        ) : (
                          <p>{faq.answer}</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <figure className="contact-photo">
            <img src={contactImage} alt="PideFácil Raúl" />
          </figure>
        </div>
      </div>
    </section>
  )
}

export default ContactPage
