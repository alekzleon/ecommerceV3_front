import { Link } from "react-router-dom"
import { useSettings } from "../../context/SettingsContext"
import "./legalpages.css"

function TermsPage() {
  const { settings, brandName } = useSettings()
  const siteName = brandName || "CloudiShop"
  const contactEmail = settings.email || "hola@cloudi.mx"
  const address = settings.address || "domicilio disponible en los medios oficiales de contacto de Cloudi"

  return (
    <section className="legal-document-page">
      <div className="container-narrow">
        <article className="legal-document">
          <h1>Términos y Condiciones</h1>

          <p>
            Los presentes Términos y Condiciones regulan el acceso, contratación y uso de{" "}
            <strong>{siteName}</strong>, plataforma de comercio electrónico, administración de tiendas,
            suscripciones, módulos, integraciones, servicios digitales y herramientas relacionadas,
            operada por <strong>Grupo Cloudi Software S.A. de C.V.</strong>, conocido comercialmente
            como <strong>Cloudi</strong>, con domicilio para efectos de contacto en{" "}
            <strong>{address}</strong> y correo electrónico <strong>{contactEmail}</strong>.
          </p>

          <p>
            Al crear una cuenta, contratar un plan, usar una tienda, administrar productos, procesar
            pedidos, cargar información, conectar integraciones o utilizar cualquier módulo de la
            plataforma, el usuario acepta estos Términos y Condiciones, el{" "}
            <Link to="/aviso-privacidad">Aviso de Privacidad</Link> y las políticas operativas que
            resulten aplicables.
          </p>

          <h2>1. Definiciones</h2>

          <p>
            “Cloudi”, “nosotros” o “prestador” se refiere a Grupo Cloudi Software S.A. de C.V.;
            “CloudiShop” o “plataforma” se refiere al software, tienda en línea, panel administrativo,
            infraestructura, APIs, módulos, plantillas, automatizaciones, reportes y servicios
            relacionados; “cliente” o “tenant” se refiere a la persona física o moral que crea,
            administra o contrata una tienda; “usuario final” se refiere a compradores o visitantes de
            una tienda; y “plan” se refiere al paquete de funciones, límites y condiciones contratado.
          </p>

          <h2>2. Objeto del servicio</h2>

          <p>
            CloudiShop permite crear y operar una tienda en línea mediante herramientas para catálogo,
            productos, categorías, familias, pedidos, clientes, banners, configuración ecommerce,
            canales de venta, marketing, promociones, cobranza, reportes, usuarios, roles e
            integraciones, según el plan contratado y la configuración disponible.
          </p>

          <p>
            La plataforma se ofrece como software como servicio. Salvo pacto escrito distinto, Cloudi
            concede al cliente una licencia de uso limitada, no exclusiva, revocable, no transferible y
            condicionada al pago oportuno, al uso lícito de la plataforma y al cumplimiento de estos
            términos.
          </p>

          <h2>3. Planes, funciones y límites</h2>

          <p>
            Las funciones disponibles dependen del plan contratado. Cloudi podrá actualizar nombres,
            precios, módulos, límites y beneficios de planes para nuevas contrataciones o renovaciones,
            notificando cuando corresponda. Las funciones no incluidas en un plan pueden mostrarse como
            bloqueadas, ocultas o disponibles únicamente mediante cambio de plan.
          </p>

          <div className="legal-plan-table" role="table" aria-label="Planes CloudiShop">
            <div role="row">
              <strong role="columnheader">Plan</strong>
              <strong role="columnheader">Precio</strong>
              <strong role="columnheader">Incluye</strong>
            </div>
            <div role="row">
              <span role="cell">Free</span>
              <span role="cell">Gratis durante 14 días</span>
              <span role="cell">
                Dashboard, productos, categorías, familias, pedidos, clientes, banners, configuración
                ecommerce y front ecommerce. Incluye 1 banner principal y 1 banner de marca.
              </span>
            </div>
            <div role="row">
              <span role="cell">Básico</span>
              <span role="cell">$189.00 MXN al mes</span>
              <span role="cell">
                Catálogo, productos, carga masiva, variantes, usuarios, roles, clientes, pedidos,
                carritos, configuración básica y plantilla base. Incluye 3 banners principales y
                3 banners de marca.
              </span>
            </div>
            <div role="row">
              <span role="cell">Shop</span>
              <span role="cell">$429.00 MXN al mes</span>
              <span role="cell">
                Todo lo del plan Básico, más canales de venta, marketing, promociones, logs,
                notificaciones y personalización comercial. Incluye 6 banners principales y
                6 banners de marca.
              </span>
            </div>
            <div role="row">
              <span role="cell">Shop+</span>
              <span role="cell">$749.00 MXN al mes</span>
              <span role="cell">
                Todos los módulos disponibles, automatizaciones, conexión con envíos, recuperación de
                carritos, crédito, cobranza, Kuix.mx y banners ilimitados.
              </span>
            </div>
            <div role="row">
              <span role="cell">A la medida</span>
              <span role="cell">Cotización personalizada</span>
              <span role="cell">
                Integraciones especiales, flujos a la medida, acompañamiento operativo y condiciones
                particulares acordadas por escrito.
              </span>
            </div>
          </div>

          <p>
            Los límites de banners, módulos y funcionalidades pueden ser aplicados automáticamente por
            la plataforma. Si un cliente excede el límite de su plan, el sistema podrá impedir nuevas
            creaciones, solicitar cambio de plan o bloquear temporalmente acciones específicas sin
            afectar necesariamente la información previamente cargada.
          </p>

          <h2>4. Cobro, renovación y pagos</h2>

          <p>
            Los planes de pago se cobran de forma mensual, por adelantado, mediante los métodos de pago
            disponibles en la plataforma o por los medios acordados con Cloudi. Los precios se expresan
            en pesos mexicanos y pueden no incluir impuestos, comisiones bancarias, cargos de terceros o
            servicios profesionales adicionales, salvo que se indique expresamente.
          </p>

          <p>
            Al contratar un plan de pago, el cliente autoriza el cobro recurrente correspondiente al
            periodo contratado. Si el pago es rechazado, queda pendiente, es objeto de contracargo o no
            puede procesarse, Cloudi podrá marcar la suscripción como pendiente, vencida, suspendida o
            cancelada, limitar módulos y restringir la operación de la tienda hasta regularizar el pago.
          </p>

          <p>
            El plan Free puede estar sujeto a un periodo de prueba de 14 días. Al terminar dicho periodo,
            si el cliente no contrata un plan de pago o regulariza su suscripción, la tienda podrá quedar
            suspendida o con acceso limitado. Durante una suspensión, Cloudi podrá mantener disponible el
            acceso mínimo al panel para consultar o contratar la suscripción.
          </p>

          <h2>5. Facturación, cancelaciones y cambios de plan</h2>

          <p>
            La facturación deberá solicitarse con datos fiscales completos y correctos al correo{" "}
            <strong>{contactEmail}</strong> o por el medio habilitado en la plataforma. Los cambios de
            plan pueden surtir efecto inmediato o al cierre del periodo, según el flujo de pago,
            proveedor de cobro, reglas de Stripe o acuerdo comercial aplicable.
          </p>

          <p>
            El cliente podrá solicitar cancelación de la suscripción. La cancelación evita cobros
            futuros, pero no implica devolución automática de periodos ya pagados, implementaciones,
            desarrollos, integraciones, configuraciones, consultorías o servicios personalizados
            entregados. Cualquier reembolso se evaluará conforme al caso, forma de pago y legislación
            aplicable.
          </p>

          <h2>6. Información, base de datos y respaldos</h2>

          <p>
            El cliente conserva la responsabilidad sobre la información que carga o administra en su
            tienda, incluyendo productos, imágenes, precios, pedidos, clientes, promociones, textos,
            archivos, configuraciones e información fiscal o comercial. Cloudi actúa como proveedor de
            plataforma y encargado técnico para operar, resguardar y procesar dicha información conforme
            al servicio contratado.
          </p>

          <p>
            El cliente puede solicitar un respaldo de la información principal de su tienda enviando una
            solicitud a <strong>{contactEmail}</strong> desde el correo registrado como administrador de
            la cuenta. La solicitud deberá incluir nombre de la tienda, subdominio, nombre del solicitante,
            correo administrador y descripción de la información requerida.
          </p>

          <p>
            Salvo casos de fuerza mayor, incidentes técnicos o solicitudes extraordinariamente amplias,
            Cloudi entregará el respaldo disponible en un plazo estimado de hasta{" "}
            <strong>5 días hábiles</strong> posteriores a la validación de identidad y titularidad. El
            respaldo podrá entregarse en formatos comunes como CSV, Excel, JSON, SQL u otro formato
            técnicamente viable, según la naturaleza de la información.
          </p>

          <p>
            Los respaldos no incluyen necesariamente código fuente propietario, arquitectura interna,
            credenciales, secretos, llaves privadas, infraestructura, componentes de terceros,
            automatizaciones internas ni elementos protegidos por propiedad intelectual de Cloudi.
          </p>

          <h2>7. Responsabilidades del cliente</h2>

          <p>
            El cliente se obliga a proporcionar información veraz, mantener la confidencialidad de sus
            credenciales, usar la plataforma de forma lícita, respetar derechos de terceros, mantener
            actualizados sus datos de pago y contacto, revisar pedidos, precios, inventarios, políticas
            comerciales y contenidos publicados en su tienda.
          </p>

          <p>
            Queda prohibido usar CloudiShop para actividades ilícitas, fraude, venta de productos
            prohibidos, contenido engañoso, infracción de marcas o derechos de autor, scraping abusivo,
            ataques, malware, evasión de controles, ingeniería inversa no autorizada o cualquier uso que
            afecte la seguridad, reputación o continuidad de Cloudi, sus clientes o usuarios.
          </p>

          <h2>8. Integraciones y servicios de terceros</h2>

          <p>
            CloudiShop puede conectarse con proveedores externos como Stripe, bancos, paqueterías,
            WhatsApp, correo electrónico, facturación, analítica, mapas, redes sociales, hosting o
            herramientas externas. Cloudi no controla completamente las políticas, tiempos, rechazos,
            comisiones, disponibilidad, revisiones antifraude, errores o suspensiones de dichos terceros.
          </p>

          <h2>9. Disponibilidad, mantenimiento y soporte</h2>

          <p>
            Cloudi realizará esfuerzos razonables para mantener la plataforma disponible y funcional. Sin
            embargo, pueden existir interrupciones por mantenimiento, actualizaciones, incidentes,
            errores de conectividad, fallas de proveedores, caso fortuito, fuerza mayor, ataques,
            revisiones de seguridad o cambios técnicos necesarios.
          </p>

          <p>
            El soporte se brindará por los canales oficiales de Cloudi. Los tiempos de atención pueden
            variar según plan, severidad del incidente, horario, dependencia de terceros, complejidad
            técnica y disponibilidad de información para diagnosticar el caso.
          </p>

          <h2>10. Propiedad intelectual</h2>

          <p>
            Cloudi conserva la titularidad o licencias correspondientes sobre el software, código,
            diseño, interfaz, arquitectura, flujos, módulos, documentación, marcas, logotipos,
            procesos, plantillas, know-how, desarrollos, mejoras y automatizaciones de CloudiShop.
            Ninguna disposición transfiere derechos de propiedad intelectual al cliente, salvo acuerdo
            expreso y por escrito.
          </p>

          <h2>11. Privacidad y datos personales</h2>

          <p>
            El tratamiento de datos personales se regula por el{" "}
            <Link to="/aviso-privacidad">Aviso de Privacidad</Link>. Cuando el cliente trate datos de
            sus propios compradores dentro de CloudiShop, será responsable de contar con avisos,
            consentimientos, bases legales, políticas de venta y autorizaciones necesarias.
          </p>

          <h2>12. Suspensión o terminación</h2>

          <p>
            Cloudi podrá suspender o limitar cuentas, tiendas, módulos o servicios cuando detecte pagos
            vencidos, contracargos, incumplimiento de estos términos, riesgo de seguridad, fraude, uso
            abusivo, requerimiento de autoridad, afectación a terceros o necesidad técnica justificada.
            Cuando sea razonablemente posible, se notificará por los medios registrados.
          </p>

          <h2>13. Limitación de responsabilidad</h2>

          <p>
            En la medida permitida por la legislación aplicable, Cloudi no será responsable por daños
            indirectos, lucro cesante, pérdida de ventas, decisiones comerciales del cliente, errores en
            información cargada por usuarios, fallas de terceros, interrupciones fuera de su control,
            contracargos, rechazos bancarios, indisponibilidad de paqueterías o pérdida de datos no
            atribuible a dolo o negligencia grave.
          </p>

          <h2>14. Modificaciones</h2>

          <p>
            Cloudi podrá actualizar estos Términos y Condiciones para reflejar cambios legales,
            técnicos, comerciales, operativos o de seguridad. La versión vigente estará disponible en
            este sitio y el uso posterior de la plataforma implicará aceptación de los cambios, salvo
            que la ley exija un mecanismo distinto.
          </p>

          <h2>15. Legislación y jurisdicción</h2>

          <p>
            Estos Términos y Condiciones se rigen por las leyes aplicables de los Estados Unidos
            Mexicanos. Cualquier controversia será atendida preferentemente mediante comunicación directa
            y de buena fe. Si no fuera posible resolverla, las partes se someterán a las autoridades y
            tribunales competentes conforme a la legislación mexicana aplicable.
          </p>

          <p>
            Fecha de última actualización: <strong>28 de julio de 2026</strong>.
          </p>
        </article>
      </div>
    </section>
  )
}

export default TermsPage
