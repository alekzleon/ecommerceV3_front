import { useSettings } from "../../context/SettingsContext"
import "./legalpages.css"

function PrivacyPolicyPage() {
  const { settings } = useSettings()
  const contactEmail = settings.email || "hola@cloudi.mx"
  const address = settings.address || "domicilio disponible en los medios oficiales de contacto de Cloudi"

  return (
    <section className="legal-document-page">
      <div className="container-narrow">
        <article className="legal-document">
          <h1>Aviso de Privacidad</h1>

          <p>
            <strong>Grupo Cloudi Software S.A. de C.V.</strong>, conocido comercialmente como{" "}
            <strong>Cloudi</strong> y operador de <strong>CloudiShop</strong>, con domicilio para
            efectos de contacto en <strong>{address}</strong>, es responsable del tratamiento, uso,
            resguardo y protección de los datos personales que recaba a través de sus sitios web,
            plataforma, paneles administrativos, tiendas en línea, formularios, contratos, canales de
            soporte, integraciones, herramientas digitales y medios de contacto.
          </p>

          <p>
            Este Aviso de Privacidad se emite en cumplimiento de la Ley Federal de Protección de Datos
            Personales en Posesión de los Particulares, su Reglamento y demás disposiciones aplicables
            en México. Al utilizar CloudiShop, crear una cuenta, contratar un plan, administrar una
            tienda o comprar en una tienda operada mediante la plataforma, usted reconoce el tratamiento
            descrito en este aviso.
          </p>

          <h2>1. Datos personales que podemos recabar</h2>

          <p>
            Podemos recabar datos de identificación, contacto, autenticación, empresa, facturación,
            domicilio, envío, pago, historial de compras, pedidos, soporte, preferencias comerciales,
            comunicación, datos fiscales, información de usuarios administradores, clientes finales,
            proveedores, colaboradores, archivos, imágenes, catálogos, productos, notas de pedido,
            mensajes y cualquier información necesaria para operar una tienda en línea.
          </p>

          <p>
            También podemos tratar datos técnicos como dirección IP, identificadores de sesión,
            navegador, dispositivo, sistema operativo, fecha y hora de acceso, cookies, actividad dentro
            de la plataforma, registros de seguridad, logs, eventos de navegación, origen de campañas,
            canales de venta y métricas de uso.
          </p>

          <p>
            En operaciones de pago, los datos financieros pueden ser procesados por pasarelas de pago,
            bancos, proveedores antifraude o terceros autorizados. CloudiShop no necesariamente almacena
            datos completos de tarjetas bancarias; cuando intervienen proveedores externos, el tratamiento
            se sujeta también a sus políticas, contratos y estándares de seguridad.
          </p>

          <h2>2. Finalidades primarias</h2>

          <p>
            Los datos personales serán utilizados para crear y administrar cuentas, tiendas y usuarios;
            validar identidad; contratar, cobrar y administrar planes; procesar pedidos, pagos,
            facturación, envíos, devoluciones y soporte; mostrar catálogos; gestionar clientes;
            configurar módulos; enviar notificaciones transaccionales; prevenir fraude; atender
            incidentes; mantener seguridad; cumplir obligaciones fiscales, contables, contractuales y
            legales; operar infraestructura tecnológica; realizar respaldos; y prestar los servicios de
            ecommerce y software solicitados.
          </p>

          <h2>3. Finalidades secundarias</h2>

          <p>
            De forma adicional, podremos utilizar datos para enviar promociones, newsletters, campañas,
            recomendaciones, encuestas, invitaciones, comunicaciones comerciales, remarketing, medición
            de campañas, segmentación, estadísticas, análisis de comportamiento, mejora de experiencia,
            desarrollo de nuevas funcionalidades y comunicación sobre productos o servicios de Cloudi.
          </p>

          <p>
            Si no desea que sus datos sean tratados para finalidades secundarias, puede solicitarlo al
            correo <strong>{contactEmail}</strong>. La negativa para estas finalidades no afectará la
            prestación de servicios contratados o solicitados.
          </p>

          <h2>4. Datos de clientes finales de tiendas</h2>

          <p>
            Cuando una tienda utiliza CloudiShop para tratar datos de sus propios compradores, dicha
            tienda actúa como responsable frente a sus clientes finales respecto de sus políticas de
            venta, avisos de privacidad, finalidades comerciales, cumplimiento legal, atención de
            derechos y obtención de consentimientos. Cloudi actúa como proveedor tecnológico y encargado
            del tratamiento en la medida necesaria para operar la plataforma.
          </p>

          <p>
            El cliente administrador de la tienda se obliga a contar con aviso de privacidad, términos de
            compra, políticas de envío, devolución y facturación aplicables a su operación, así como a
            tratar lícitamente los datos que capture, cargue o administre dentro de CloudiShop.
          </p>

          <h2>5. Cookies y tecnologías similares</h2>

          <p>
            CloudiShop puede utilizar cookies, pixeles, almacenamiento local, etiquetas, identificadores
            de sesión y herramientas de analítica para recordar preferencias, mantener sesiones, medir
            tráfico, mejorar seguridad, analizar embudos de compra, identificar canales de venta,
            recuperar carritos, personalizar contenido, evaluar campañas publicitarias y mejorar la
            plataforma. El usuario puede bloquear o eliminar estas tecnologías desde su navegador,
            aunque algunas funciones podrían verse limitadas.
          </p>

          <h2>6. Transferencias y encargados</h2>

          <p>
            Los datos podrán compartirse con proveedores necesarios para operar CloudiShop, incluyendo
            hosting, almacenamiento en nube, pasarelas de pago, bancos, facturación, paqueterías, correo
            electrónico, WhatsApp o mensajería, analítica, seguridad, soporte técnico, herramientas de
            monitoreo, consultores, asesores, autoridades competentes y terceros necesarios para cumplir
            finalidades descritas, obligaciones legales o relaciones contractuales.
          </p>

          <p>
            Cloudi procurará que los encargados y proveedores traten la información conforme a medidas
            razonables de confidencialidad, seguridad y uso limitado a las finalidades necesarias para la
            prestación del servicio.
          </p>

          <h2>7. Medidas de seguridad</h2>

          <p>
            Implementamos medidas administrativas, técnicas y físicas razonables para proteger los datos
            personales contra daño, pérdida, alteración, destrucción, uso, acceso o tratamiento no
            autorizado. Estas medidas pueden incluir controles de acceso, autenticación, separación de
            ambientes, respaldos, monitoreo, registros de actividad, validaciones de permisos, cifrado
            cuando resulte aplicable y revisión de proveedores tecnológicos.
          </p>

          <h2>8. Conservación de datos</h2>

          <p>
            Conservaremos los datos durante el tiempo necesario para cumplir las finalidades descritas,
            prestar servicios contratados, mantener evidencia de operaciones, atender soporte, cumplir
            obligaciones legales, fiscales, contables, contractuales, auditorías, prevención de fraude,
            seguridad o defensa de derechos. Una vez concluido el periodo aplicable, los datos podrán ser
            eliminados, bloqueados o anonimizados cuando sea procedente.
          </p>

          <h2>9. Respaldos, exportación y eliminación</h2>

          <p>
            Los clientes administradores podrán solicitar respaldo o exportación de información principal
            de su tienda al correo <strong>{contactEmail}</strong>, acreditando titularidad o autorización
            suficiente. La entrega se realizará en un plazo estimado de hasta <strong>5 días hábiles</strong>{" "}
            posteriores a la validación de la solicitud, salvo incidentes técnicos, volumen extraordinario
            o fuerza mayor.
          </p>

          <p>
            La eliminación de información puede estar sujeta a obligaciones legales, fiscales,
            contractuales, prevención de fraude, seguridad, registros de auditoría o conservación
            necesaria para defensa de derechos. En esos casos, la información podrá bloquearse o
            conservarse únicamente por el tiempo permitido o requerido.
          </p>

          <h2>10. Derechos ARCO y revocación del consentimiento</h2>

          <p>
            Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición, así como
            revocar su consentimiento o limitar el uso y divulgación de sus datos personales, enviando
            una solicitud a <strong>{contactEmail}</strong>. La solicitud deberá incluir nombre del
            titular, medio de contacto, descripción clara del derecho que desea ejercer, documentos que
            acrediten identidad o representación legal y cualquier elemento que facilite la localización
            de sus datos.
          </p>

          <p>
            Atenderemos las solicitudes conforme a los plazos y requisitos establecidos por la legislación
            aplicable. Cuando la solicitud resulte improcedente por disposición legal, relación
            contractual, obligación fiscal, prevención de fraude, seguridad o conservación necesaria, se
            informará al titular la razón correspondiente.
          </p>

          <h2>11. Menores de edad</h2>

          <p>
            CloudiShop está dirigido principalmente a empresas, personas emprendedoras y usuarios mayores
            de edad. No buscamos recabar datos de menores sin consentimiento de padres, madres o tutores.
            Si detectamos que se han proporcionado datos de un menor sin autorización, podremos eliminar
            o bloquear dicha información cuando corresponda.
          </p>

          <h2>12. Cambios al Aviso de Privacidad</h2>

          <p>
            Cloudi podrá modificar este Aviso de Privacidad para atender cambios legales, operativos,
            tecnológicos, comerciales o de seguridad. Las actualizaciones estarán disponibles en este
            sitio web y surtirán efectos desde su publicación, salvo que legalmente se requiera otro
            mecanismo de comunicación.
          </p>

          <p>
            Fecha de última actualización: <strong>28 de julio de 2026</strong>.
          </p>
        </article>
      </div>
    </section>
  )
}

export default PrivacyPolicyPage
