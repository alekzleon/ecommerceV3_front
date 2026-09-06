import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import HeroBanner from "../../components/home/HeroBanner/HeroBanner";
import { useSettings } from "../../context/SettingsContext";
import { getPublicPlatformPlans } from "../../services/api/platformTenantService";
import "./cloudishop-home.css";
import "./homepage.css";

const BrandBanners = lazy(() => import("../../components/home/BrandBanners/BrandBanners"));
const LatestPurchases = lazy(() => import("../../components/home/LatestPurchases/LatestPurchases"));
const MonthlyPromotions = lazy(() => import("../../components/home/MonthlyPromotions/MonthlyPromotions"));
const OffersSection = lazy(() => import("../../components/home/OffersSection/OffersSection"));

const DEFAULT_STOREFRONT = {
  is_published: false,
  construction: {
    title: "Ecommerce en construcción",
    message: "Estamos preparando la tienda. Vuelve pronto.",
  },
  active_template: "classic",
  home_template: "classic",
  visual_design: {
    home: {
      variant: "classic",
    },
  },
};

function HomePage() {
  const { settings, loading, logoUrl, brandName } = useSettings();
  const storefront = settings.storefront || DEFAULT_STOREFRONT;
  const template = storefront.active_template || storefront.home_template || "classic";
  const homeDesign = storefront.visual_design?.home || {};

  if (loading) {
    return <div className="public-home__loading" aria-label="Cargando inicio" />;
  }

  if (!storefront.is_published) {
    return <ConstructionView storefront={storefront} logoUrl={logoUrl} brandName={brandName} />;
  }

  return <TemplateHome template={template} homeDesign={homeDesign} />;
}

function TemplateHome({ template, homeDesign }) {
  const variant = homeDesign?.variant || template || "classic";

  if (variant === "minimal" || template === "minimal") {
    return (
      <main className="public-home public-home--minimal">
        <HeroBanner />
        <LazyHomeSection minHeight={320}><LatestPurchases /></LazyHomeSection>
        <LazyHomeSection minHeight={320}><BrandBanners /></LazyHomeSection>
      </main>
    );
  }

  if (variant === "showcase" || template === "showcase") {
    return (
      <main className="public-home public-home--showcase">
        <HeroBanner />
        <LazyHomeSection minHeight={360}><BrandBanners /></LazyHomeSection>
        <LazyHomeSection minHeight={320}><LatestPurchases source="favorites" /></LazyHomeSection>
        <LazyHomeSection minHeight={360}><MonthlyPromotions /></LazyHomeSection>
        <LazyHomeSection minHeight={320}><LatestPurchases /></LazyHomeSection>
      </main>
    );
  }

  if (variant === "promo_first" || template === "promo") {
    return (
      <main className="public-home public-home--promo">
        <LazyHomeSection minHeight={360}><MonthlyPromotions /></LazyHomeSection>
        <LazyHomeSection minHeight={360}><OffersSection /></LazyHomeSection>
        <HeroBanner />
        <LazyHomeSection minHeight={320}><LatestPurchases source="favorites" /></LazyHomeSection>
        <LazyHomeSection minHeight={320}><LatestPurchases /></LazyHomeSection>
        <LazyHomeSection minHeight={360}><BrandBanners /></LazyHomeSection>
      </main>
    );
  }

  return (
    <main className="public-home public-home--classic">
      <HeroBanner />
      <LazyHomeSection minHeight={360}><BrandBanners /></LazyHomeSection>
      <LazyHomeSection minHeight={320}><LatestPurchases source="favorites" /></LazyHomeSection>
      <LazyHomeSection minHeight={320}><LatestPurchases /></LazyHomeSection>
      <LazyHomeSection minHeight={360}><MonthlyPromotions /></LazyHomeSection>
      <LazyHomeSection minHeight={360}><OffersSection /></LazyHomeSection>
    </main>
  );
}

function LazyHomeSection({ children, minHeight = 320 }) {
  const sectionRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || shouldRender) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "420px 0px" }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div ref={sectionRef} style={!shouldRender ? { minHeight } : undefined}>
      {shouldRender ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}

function ConstructionView({ storefront, logoUrl, brandName }) {
  const construction = storefront.construction || DEFAULT_STOREFRONT.construction;

  return (
    <section className="construction-page">
      <div className="construction-page__inner">
        {logoUrl ? (
          <img loading="lazy"
            className="construction-page__logo"
            src={logoUrl}
            alt={brandName || "Logo"}
          />
        ) : (
          <span className="construction-page__icon">
            <i className="bi bi-shop-window" aria-hidden="true" />
          </span>
        )}
        <h1>{construction.title || DEFAULT_STOREFRONT.construction.title}</h1>
        <p>{construction.message || DEFAULT_STOREFRONT.construction.message}</p>
      </div>
    </section>
  );
}

const defaultLandingMarkup = String.raw`<nav class="nav" aria-label="Navegacion principal">
    <div class="shell">
      <a class="brand" href="#inicio" aria-label="CloudiShop inicio">
        <img loading="lazy" src="/logo_blanco.png" alt="CloudiShop">
      </a>
      <div class="nav-links">
        <a href="#clientes">Soluciones</a>
        <a href="#caracteristicas-resultados">Plataforma</a>
        <a href="#planes">Precios</a>
        <a href="#clientes">Grandes marcas</a>
      </div>
      <div class="nav-actions">
        <a class="btn btn-primary" href="/registro">Crear CloudiShop gratis</a>
      </div>
    </div>
  </nav>

  <main>
    <section class="hero" id="inicio">
      <video preload="none" class="hero-video" autoplay muted loop playsinline poster="https://images.pexels.com/videos/7855449/pexels-photo-7855449.jpeg?auto=compress&cs=tinysrgb&w=1800">
        <source src="https://videos.pexels.com/video-files/7855449/7855449-uhd_3840_2160_25fps.mp4" type="video/mp4">
      </video>
      <div class="shell hero-grid">
        <div class="hero-content">
          <h1>Mas que una tienda en linea.<br>Una ecommerce para <span class="hero-word" id="heroWord">vender mas</span></h1>
          <p class="hero-copy">CloudiShop convierte tu negocio en una tienda online de alto valor: veloz, elegante, confiable y lista para operar catalogo, pagos, pedidos, promociones y clientes desde un solo panel.</p>
          <div class="hero-ctas">
            <a class="btn btn-blue" href="/registro">Crea tu tienda gratis</a>
            <a class="btn btn-primary" href="#clientes">Habla con un especialista</a>
          </div>
        </div>
      </div>
    </section>

    <section class="clients-showcase" id="clientes">
      <div class="shell">
        <h2 class="center-title reveal"><span class="shine">+100 marcas</span> confian en CloudiShop</h2>
        <div class="interest-grid" aria-label="Clientes CloudiShop en formato visual">
          <article class="client-tile wide reveal">
            <video preload="none" autoplay muted loop playsinline>
              <source src="/videos_home/onlinetienda.mp4" type="video/mp4">
            </video>
            <h3 class="client-label">Empresas que venden online y en tienda</h3>
          </article>
          <article class="client-tile tall reveal">
            <img loading="lazy" src="/imgs_home/pedidoslistos.webp" alt="Marca preparando pedidos ecommerce">
            <h3 class="client-label">Pedidos listos sin perder control</h3>
          </article>
          <article class="client-tile reveal">
            <img loading="lazy" src="https://images.pexels.com/photos/5872176/pexels-photo-5872176.jpeg?auto=compress&cs=tinysrgb&w=900" alt="Promociones de ecommerce en laptop">
            <h3 class="client-label">Promociones que se sienten premium</h3>
          </article>
          <article class="client-tile reveal">
            <img loading="lazy" src="https://images.pexels.com/photos/7436476/pexels-photo-7436476.jpeg?auto=compress&cs=tinysrgb&w=900" alt="Empaques de una marca online">
            <h3 class="client-label">Productos fisicos con presencia digital</h3>
          </article>
          <article class="client-tile half reveal">
            <video preload="none" autoplay muted loop playsinline aria-label="Canales digitales conectados para ecommerce">
              <source src="/videos_home/canalesventa.mp4" type="video/mp4">
            </video>
            <h3 class="client-label">Canales de venta conectados a tus campañas</h3>
          </article>
        </div>
      </div>
    </section>

    <section class="results-section" id="caracteristicas-resultados">
      <div class="shell">
        <h2 class="center-title reveal"><span class="shine">Vende 24/7</span>, llega con todos tus clientes y registra todo en un solo lugar</h2>
        <div class="results-grid">
          <article class="result-card reveal">
            <img loading="lazy" src="https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Modelo de moda para tienda online">
            <div class="mock-window" aria-hidden="true">
              <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span></div>
              <div class="mock-body">
                <strong>Configura tu tienda con la identidad de tu marca</strong>
                <div class="mock-products"><span></span><span></span><span></span></div>
              </div>
            </div>
            <h3>Configura tu ecommerce y fideliza a tus clientes</h3>
          </article>

          <article class="result-card reveal">
            <img loading="lazy" src="https://images.pexels.com/photos/7289733/pexels-photo-7289733.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Procesamiento de pedidos ecommerce">
            <div class="sales-panel" aria-hidden="true">
              <b>Resumen semanal</b>
              <div class="sale-line"><span>Pedidos procesados</span><strong>7,000+</strong></div>
              <div class="sale-line"><span>Tickets registrados</span><strong>100%</strong></div>
              <div class="sale-line"><span>Operacion</span><strong>En vivo</strong></div>
            </div>
            <h3>Procesamos mas de 7000 pedidos a la semana</h3>
          </article>

          <article class="result-card reveal">
            <img loading="lazy" src="https://images.pexels.com/photos/5872176/pexels-photo-5872176.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Campañas para ecommerce en redes sociales">
            <div class="social-stack" aria-hidden="true">
              <span>f</span>
              <span>t</span>
              <span>p</span>
            </div>
            <h3>Canales de ventas para tus campañas en redes sociales</h3>
          </article>

          <article class="result-card reveal">
            <video preload="none" autoplay muted loop playsinline poster="https://images.pexels.com/videos/7855154/pexels-photo-7855154.jpeg?auto=compress&cs=tinysrgb&w=1200">
              <source src="https://videos.pexels.com/video-files/7855154/7855154-uhd_3840_2160_25fps.mp4" type="video/mp4">
            </video>
            <div class="whatsapp-panel" aria-hidden="true">
              <div class="whatsapp-head"><span>WhatsApp</span><span>ERP</span></div>
              <div class="whatsapp-msg">Pedido #1934 confirmado y registrado.</div>
              <div class="whatsapp-pay">Microsip sincronizado: inventario, cliente y venta.</div>
            </div>
            <h3>Vende 24/7 sin parar, integralo con ERP Microsip</h3>
          </article>
        </div>
      </div>
    </section>

    <section class="brand-builder" id="demo">
      <div class="shell brand-builder-grid">
        <div class="builder-copy">
          <div class="section-kicker reveal">Tu tienda, tu marca</div>
          <h2 class="reveal">Tu tienda, tu marca, tu personalizacion</h2>
          <p class="reveal">No pierdas tiempo ni dinero con programadores o asesorias infinitas. Registra tu tienda, sube tus productos, agrega tu logo e informacion y comienza a vender.</p>
          <div class="builder-steps reveal">
            <div class="builder-step"><span>01</span><div>Elige un diseño profesional y cambialo las veces que quieras.</div></div>
            <div class="builder-step"><span>02</span><div>Sube productos, imagenes, precios, categorias y promociones.</div></div>
            <div class="builder-step"><span>03</span><div>Publica tu tienda con tu identidad y empieza a recibir pedidos.</div></div>
          </div>
          <div class="builder-actions reveal">
            <a class="btn btn-blue" href="/registro">Crear mi tienda</a>
          </div>
        </div>

        <div class="builder-visual reveal" aria-label="Vista animada de ecommerce personalizable">
          <div class="palette-card" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
          <div class="logo-upload" aria-hidden="true">Logo cargado</div>
          <div class="store-preview">
            <div class="store-topbar"><span class="store-dot"></span><span class="store-dot"></span><span class="store-dot"></span></div>
            <div class="store-body">
              <div class="store-hero"><b>Nueva coleccion lista para vender</b></div>
              <div class="store-products">
                <article><img loading="lazy" src="https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=360" alt=""></article>
                <article><img loading="lazy" src="https://images.pexels.com/photos/5872176/pexels-photo-5872176.jpeg?auto=compress&cs=tinysrgb&w=360" alt=""></article>
                <article><img loading="lazy" src="https://images.pexels.com/photos/7436476/pexels-photo-7436476.jpeg?auto=compress&cs=tinysrgb&w=360" alt=""></article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="ecommerce-gallery" id="galeria" aria-label="Galeria de pantallas ecommerce">
      <div class="gallery-masonry">
        <article class="gallery-shot tall reveal">
          <img loading="lazy" src="/imgs_tiendas/siete.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot large reveal">
          <img loading="lazy" src="/imgs_tiendas/dos.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot wide reveal">
          <img loading="lazy" src="/imgs_tiendas/catorce.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot medium reveal">
          <img loading="lazy" src="/imgs_tiendas/uno.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot small reveal">
          <img loading="lazy" src="/imgs_tiendas/die18.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot wide reveal">
          <img loading="lazy" src="/imgs_tiendas/nueve.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot medium reveal">
          <img loading="lazy" src="/imgs_tiendas/cuatro.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot tall reveal">
          <img loading="lazy" src="/imgs_tiendas/die16.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot medium reveal">
          <img loading="lazy" src="/imgs_tiendas/trece.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot small reveal">
          <img loading="lazy" src="/imgs_tiendas/cinco.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot wide reveal">
          <img loading="lazy" src="/imgs_tiendas/veinte.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot medium reveal">
          <img loading="lazy" src="/imgs_tiendas/ocho.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot small reveal">
          <img loading="lazy" src="/imgs_tiendas/die19.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot medium reveal">
          <img loading="lazy" src="/imgs_tiendas/once.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot tall reveal">
          <img loading="lazy" src="/imgs_tiendas/tres.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot large reveal">
          <img loading="lazy" src="/imgs_tiendas/quince.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot small reveal">
          <img loading="lazy" src="/imgs_tiendas/diez.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot wide reveal">
          <img loading="lazy" src="/imgs_tiendas/seis.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot medium reveal">
          <img loading="lazy" src="/imgs_tiendas/die17.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
        <article class="gallery-shot tall reveal">
          <img loading="lazy" src="/imgs_tiendas/doce.webp" alt="Ejemplo de tienda online CloudiShop">
        </article>
      </div>
    </section>

    <section class="control-cta" id="control">
      <div class="shell control-grid">
        <div class="control-copy">
          <div class="section-kicker reveal">Control total</div>
          <h2 class="reveal">Lleva el <span class="shine">control de tu tienda</span>, no dependas de terceros</h2>
          <p class="reveal">Transforma esa idea en negocio. Si ya vendes por WhatsApp esto es para ti: ahorra tiempo, dinero y registra cada venta desde un solo lugar.</p>
          <div class="control-actions reveal">
            <a class="btn btn-primary" href="/registro">Crear CloudiShop gratis</a>
          </div>
        </div>

        <div class="dashboard-bleed reveal" aria-label="Dashboard de control CloudiShop">
          <div class="dashboard-shot">
            <img loading="lazy" src="/dashboard-demo.webp" alt="Dashboard de CloudiShop" onerror="this.onerror=null;this.src='https://images.pexels.com/photos/3184466/pexels-photo-3184466.jpeg?auto=compress&cs=tinysrgb&w=1600';">
          </div>
        </div>
      </div>
    </section>

    <section class="payments-section" id="pagos">
      <div class="shell payments-grid">
        <div class="payments-copy">
          <h2 class="reveal">Pagos seguros con <strong><span class="brand-stripe">Stripe</span>, <span class="brand-mercado">Mercado Pago</span> y <span class="brand-paypal">PayPal</span></strong></h2>
          <p class="reveal">Tu eliges tu pasarela de pago a usar. Checkout desde 3.2% de comision por venta, controla tu dinero desde el panel de Stripe, Mercado pago, sin costos ocultos y sin comisiones de CloudiShop por venta ni uso de cuentas.</p>
          <a class="btn btn-ghost reveal" href="#demo">Ver mas</a>
        </div>

      </div>
    </section>

    <section class="b2b-section" id="b2b">
      <div class="shell b2b-grid">
        <div class="b2b-copy">
          <div class="section-kicker reveal">Clientes frecuentes</div>
          <h2 class="reveal">Vende mas a tus clientes frecuentes, ideal para <strong><span class="shine">negocios B2B</span></strong></h2>
          <p class="reveal">Maneja cobranza, recupera carritos, fideliza con cupones, cashback y promociones pensadas para tu negocio. Incrementa tus ventas mes con mes.</p>
          <div class="b2b-actions reveal">
            <a class="btn btn-primary" href="#demo">Activar fidelizacion</a>
            <a class="btn btn-ghost" href="#clientes">Ver casos</a>
          </div>
        </div>
        <div class="b2b-visual reveal" aria-label="Herramientas para ventas B2B">
          <div class="loyalty-stack">
            <article class="loyalty-card" style="--meter: 82%">
              <small>Cobranza</small>
              <strong>Pagos claros</strong>
              <p>Registra saldos, pedidos y clientes recurrentes desde el panel.</p>
              <div class="loyalty-meter"><span></span></div>
            </article>
            <article class="loyalty-card" style="--meter: 64%">
              <small>Carritos</small>
              <strong>Recupera ventas</strong>
              <p>Da seguimiento a quienes preguntaron, cotizaron o abandonaron.</p>
              <div class="loyalty-meter"><span></span></div>
            </article>
            <article class="loyalty-card" style="--meter: 74%">
              <small>Cashback</small>
              <strong>Compra otra vez</strong>
              <p>Premia la recompra con saldo, cupones y beneficios por cliente.</p>
              <div class="loyalty-meter"><span></span></div>
            </article>
            <article class="loyalty-card" style="--meter: 91%">
              <small>Promociones</small>
              <strong>Mes con mes</strong>
              <p>Activa descuentos por volumen, temporada, frecuencia o canal.</p>
              <div class="loyalty-meter"><span></span></div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="plans-section" id="planes">
      <div class="shell">
        <h2 class="plans-title reveal">Encuentra el plan ideal</h2>
        <p class="plans-note reveal">No necesitas tarjeta de crédito. Los precios están expresados en pesos mexicanos (MXN).</p>
        <div class="plans-billing-toggle" role="group" aria-label="Periodo de pago">
          <button type="button" class="is-active" data-plan-period="monthly">Mensual</button>
          <button type="button" data-plan-period="annual">Anual</button>
        </div>

        <div class="plans-grid">
          <article class="plan-card reveal">
            <div class="plan-badges"><span class="plan-badge">Free 14 dias</span></div>
            <div class="plan-name">Free</div>
            <div class="plan-price">Gratis por 14 dias</div>
            <p class="plan-desc">Ideal para comenzar a vender sin complicarte.</p>
            <ul class="plan-features">
              <li>Publica tu tienda y valida tu idea.</li>
              <li>Configura productos iniciales.</li>
              <li>Empieza a recibir tus primeros pedidos.</li>
            </ul>
            <div class="plan-action"><a class="btn" href="/registro">Crea gratis</a></div>
          </article>

          <article class="plan-card reveal">
            <div class="plan-badges"><span class="plan-badge">Basico</span></div>
            <div class="plan-name">Basico</div>
            <div class="plan-price">$189.00 <small>/mes</small></div>
            <p class="plan-desc">Lo esencial para vender con catalogo y operacion simple.</p>
            <ul class="plan-features">
              <li>Catalogo y productos.</li>
              <li>Clientes y pedidos.</li>
              <li>Configuracion basica.</li>
              <li>Plantilla basica incluida.</li>
            </ul>
            <div class="plan-action"><a class="btn" href="#demo">Contratar</a></div>
          </article>

          <article class="plan-card reveal">
            <div class="plan-badges"><span class="plan-badge">Shop</span><span class="plan-badge alt">Popular</span></div>
            <div class="plan-name">Shop</div>
            <div class="plan-price">$429.00 <small>/mes</small></div>
            <p class="plan-desc">Para crecer con canales, marketing y experiencias personalizadas.</p>
            <ul class="plan-features">
              <li>Todo lo del plan Basico.</li>
              <li>Canales de venta.</li>
              <li>Fidelizacion y promociones.</li>
              <li>Personalizacion y marketing.</li>
            </ul>
            <div class="plan-action"><a class="btn" href="#demo">Contratar</a></div>
          </article>

          <article class="plan-card reveal">
            <div class="plan-badges"><span class="plan-badge">Shop+</span></div>
            <div class="plan-name">Shop+</div>
            <div class="plan-price">$749.00 <small>/mes</small></div>
            <p class="plan-desc">Para equipos que necesitan automatizar, cobrar y conectar mas procesos.</p>
            <ul class="plan-features">
              <li>Todo lo del plan Shop.</li>
              <li>Automatizaciones y usuarios.</li>
              <li>Conexion con envios.</li>
              <li>Recuperacion de carritos.</li>
              <li>kuix.app, acceso 6 meses a facturación y cobranza.</li>
              <li>Aplica al contratar plan anual.</li>
            </ul>
            <div class="plan-action"><a class="btn" href="#demo">Contratar</a></div>
          </article>

          <article class="plan-card dark reveal">
            <div class="plan-badges"><span class="plan-badge">Personalizado</span></div>
            <div class="plan-name">Ecommerce a la medida</div>
            <div class="plan-price">Conoce mas</div>
            <p class="plan-desc">Desarrollo de software y ecommerce personalizado para empresas con procesos especiales.</p>
            <ul class="plan-features">
              <li>Desarrollo de software a la medida.</li>
              <li>Integraciones con ERP, CRM, pagos o sistemas internos.</li>
              <li>Flujos personalizados para tu operacion.</li>
              <li>Acompanamiento estrategico y tecnico.</li>
            </ul>
            <div class="plan-action"><a class="btn" href="https://wa.me/523332244005" target="_blank" rel="noopener noreferrer">Conoce mas</a></div>
          </article>
        </div>
      </div>
    </section>

    <section class="final-cta" id="comenzar">
      <div class="shell">
        <h2 class="reveal"><span class="final-cta-line">No esperes mas y comienza a vender</span><span class="final-cta-line">con <span class="shine">CloudiShop</span></span></h2>
        <p class="reveal">Activa tu tienda, conecta tus ventas y empieza a operar con una experiencia que se siente a la altura de tu marca.</p>
        <div class="final-actions reveal">
          <a class="btn btn-primary" href="/registro">Crear tienda gratis</a>
          <a class="btn btn-ghost" href="#demo">Agendar demo</a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="shell footer-main">
      <div class="footer-brand">
        <img loading="lazy" src="/logo_blanco.png" alt="CloudiShop">
        <p>Infraestructura ecommerce para empresas que venden online y en tienda, con control, personalizacion y crecimiento real.</p>
      </div>

      <div class="footer-col">
        <h3>Partners</h3>
        <div class="footer-list">
          <span class="partner-item"><strong>Cloudi</strong>Consultoria de marketing y aceleracion de ventas</span>
          <span class="partner-item"><strong>Kuix</strong>Facturacion y cobranza</span>
          <span class="partner-item"><strong>Teciot</strong>ERP para control de empresas</span>
        </div>
      </div>

      <div class="footer-col">
        <h3>Contenido</h3>
        <div class="footer-list">
          <a href="#inicio">Inicio</a>
          <a href="#galeria">Clientes</a>
          <a href="#caracteristicas-resultados">Caracteristicas/resultados</a>
          <a href="#demo">Personalizacion</a>
          <a href="#galeria">Galeria ecommerce</a>
          <a href="#pagos">Pagos</a>
          <a href="#b2b">B2B</a>
          <a href="#planes">Planes</a>
        </div>
      </div>

      <div class="footer-col">
        <h3>Legal</h3>
        <div class="footer-list">
          <a href="/terminos-y-condiciones">Terminos</a>
          <a href="/aviso-privacidad">Aviso de privacidad</a>
        </div>
      </div>

      <div class="footer-col">
        <h3>CloudiShop</h3>
        <div class="footer-list">
          <span>Redes sociales</span>
          <a href="#linkedin">LinkedIn</a>
          <a href="#instagram">Instagram</a>
          <a href="#facebook">Facebook</a>
          <a href="#tiktok">TikTok</a>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="shell">
        <div class="footer-metrics">
          <span>Ecommerce con mas de 100MDP procesados</span>
          <span>+ de 100,000 pedidos</span>
          <span>Especializados en B2B</span>
        </div>
        <div class="footer-credit">Dise&ntilde;ado por Cloudi&reg;</div>
      </div>
    </div>
  </footer>`;

const DEFAULT_PUBLIC_PLANS = [
  {
    key: "free",
    name: "Free",
    label: "Gratis por 14 dias",
    price: 0,
    currency: "MXN",
    interval: null,
    trial_days: 14,
    description: "Ideal para comenzar a vender sin complicarte.",
    features: [
      "Publica tu tienda y valida tu idea.",
      "Configura productos iniciales.",
      "Empieza a recibir tus primeros pedidos.",
    ],
  },
  {
    key: "basic",
    name: "Basico",
    label: "$189.00 /mes",
    price: 18900,
    currency: "MXN",
    interval: "month",
    description: "Lo esencial para vender con catalogo y operacion simple.",
    features: [
      "Catalogo y productos.",
      "Clientes y pedidos.",
      "Configuracion basica.",
      "Plantilla basica incluida.",
    ],
  },
  {
    key: "shop",
    name: "Shop",
    label: "$429.00 /mes",
    price: 42900,
    currency: "MXN",
    interval: "month",
    description: "Para crecer con canales, marketing y experiencias personalizadas.",
    features: [
      "Todo lo del plan Basico.",
      "Canales de venta.",
      "Fidelizacion y promociones.",
      "Personalizacion y marketing.",
    ],
    popular: true,
  },
  {
    key: "shop_plus",
    name: "Shop+",
    label: "$749.00 /mes",
    price: 74900,
    currency: "MXN",
    interval: "month",
    description: "Para equipos que necesitan automatizar, cobrar y conectar mas procesos.",
    features: [
      "Todo lo del plan Shop.",
      "Automatizaciones y usuarios.",
      "Conexion con envios.",
      "Recuperacion de carritos.",
      "kuix.app, acceso 6 meses a facturación y cobranza.",
      "Aplica al contratar plan anual.",
    ],
  },
  {
    key: "custom",
    name: "Ecommerce a la medida",
    label: "Conoce mas",
    description: "Desarrollo de software y ecommerce personalizado para empresas con procesos especiales.",
    features: [
      "Desarrollo de software a la medida.",
      "Integraciones con ERP, CRM, pagos o sistemas internos.",
      "Flujos personalizados para tu operacion.",
      "Acompanamiento estrategico y tecnico.",
    ],
    custom: true,
  },
];

export function CloudiShopMarketingHome({ createStorePath = "/registro", loginPath = "/login" }) {
  const rootRef = useRef(null);
  const [plans, setPlans] = useState(DEFAULT_PUBLIC_PLANS);

  const plansMarkup = useMemo(
    () => buildPublicPlansMarkup(plans, createStorePath, "monthly"),
    [createStorePath, plans]
  );

  const landingMarkup = useMemo(() => {
    const markup = withPublicPlans(defaultLandingMarkup, plansMarkup).replaceAll(
      'href="/registro"',
      `href="${createStorePath}"`
    ).replaceAll(
      'href="/login"',
      `href="${loginPath}"`
    );

    return optimizeLandingMedia(markup);
  }, [createStorePath, loginPath, plansMarkup]);

  useEffect(() => {
    const root = rootRef.current;
    const nav = root?.querySelector(".nav");
    let navTicking = false;

    const updateNavState = () => {
      if (!nav) return;
      nav.classList.toggle("is-scrolled", window.scrollY > 18);
      navTicking = false;
    };

    updateNavState();
    const onScroll = () => {
      if (!navTicking) {
        window.requestAnimationFrame(updateNavState);
        navTicking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const words = ["vender mas", "conectar con tus clientes", "todo lo que imagines"];
    const heroWord = root?.querySelector("#heroWord");
    let wordIndex = 0;
    const wordTimer = window.setInterval(() => {
      if (!heroWord) return;
      wordIndex = (wordIndex + 1) % words.length;
      heroWord.animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(-14px)" }
        ],
        { duration: 260, easing: "cubic-bezier(.22, 1, .36, 1)" }
      ).onfinish = () => {
        heroWord.textContent = words[wordIndex];
        heroWord.animate(
          [
            { opacity: 0, transform: "translateY(14px)" },
            { opacity: 1, transform: "translateY(0)" }
          ],
          { duration: 420, easing: "cubic-bezier(.22, 1, .36, 1)" }
        );
      };
    }, 2400);

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: .14 });

    root?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    const loadLazyMedia = (media) => {
      if (media.tagName === "IMG") {
        const nextSrc = media.dataset.src;
        if (!nextSrc) return;

        media.onerror = () => {
          if (media.dataset.fallbackSrc && media.src !== media.dataset.fallbackSrc) {
            media.src = media.dataset.fallbackSrc;
          }
        };
        media.src = nextSrc;
        media.removeAttribute("data-src");
        return;
      }

      const sources = media.querySelectorAll("source[data-src]");
      sources.forEach((source) => {
        source.src = source.dataset.src;
        source.removeAttribute("data-src");
      });
      media.load();
      if (media.autoplay) {
        media.play().catch(() => {});
      }
    };

    const mediaObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const media = entry.target;

        if (entry.isIntersecting) {
          loadLazyMedia(media);
          if (media.tagName === "VIDEO" && media.autoplay) {
            media.play().catch(() => {});
          }
          continue;
        }

        if (media.tagName === "VIDEO") {
          media.pause();
        }
      }
    }, { rootMargin: "520px 0px", threshold: .08 });

    root?.querySelectorAll("img[data-src], video[data-lazy-media]").forEach((el) => {
      mediaObserver.observe(el);
    });

    const billingButtons = root?.querySelectorAll("[data-plan-period]");
    const onBillingClick = (event) => {
      const nextPeriod = event.currentTarget?.dataset?.planPeriod;
      if (nextPeriod === "monthly" || nextPeriod === "annual") {
        billingButtons?.forEach((button) => {
          button.classList.toggle("is-active", button.dataset.planPeriod === nextPeriod);
        });
        updatePublicPlanPrices(root, plans, nextPeriod);
      }
    };
    billingButtons?.forEach((button) => {
      button.addEventListener("click", onBillingClick);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearInterval(wordTimer);
      observer.disconnect();
      mediaObserver.disconnect();
      billingButtons?.forEach((button) => {
        button.removeEventListener("click", onBillingClick);
      });
    };
  }, [landingMarkup, plans]);

  useEffect(() => {
    let isActive = true;

    getPublicPlatformPlans()
      .then((response) => {
        if (!isActive) return;

        const nextPlans = normalizePublicPlans(response);
        if (nextPlans.length) {
          setPlans(nextPlans);
        }
      })
      .catch((error) => {
        console.error("Error cargando planes públicos:", error?.data || error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return <div ref={rootRef} className="cloudishop-home" dangerouslySetInnerHTML={{ __html: landingMarkup }} />;
}

function withPublicPlans(markup, plansMarkup) {
  return markup.replace(
    /<div class="plans-billing-toggle"[\s\S]*?<\/div>\s*(?=<div class="plans-grid">)/,
    buildPlansBillingToggleMarkup("monthly")
  ).replace(
    /<div class="plans-grid">[\s\S]*?<article class="plan-card dark reveal">[\s\S]*?<\/article>\s*<\/div>/,
    `<div class="plans-grid">${plansMarkup}</div>`
  );
}

function buildPlansBillingToggleMarkup(billingPeriod = "monthly") {
  return `
        <div class="plans-billing-toggle" role="group" aria-label="Periodo de pago">
          <button type="button" class="${billingPeriod === "monthly" ? "is-active" : ""}" data-plan-period="monthly">Mensual</button>
          <button type="button" class="${billingPeriod === "annual" ? "is-active" : ""}" data-plan-period="annual">Anual</button>
        </div>`;
}

function optimizeLandingMedia(markup) {
  return markup
    .replace(/<img(?![^>]*\bloading=)([^>]*)>/g, '<img loading="lazy" decoding="async"$1>')
    .replace(/<video(?![^>]*\bpreload=)([^>]*)>/g, '<video preload="none"$1>')
    .replace(/<video preload="none"([^>]*class="hero-video"[^>]*)>/g, '<video preload="metadata"$1>')
    .replace(/src="(\/imgs_tiendas\/[^"]+\.webp)"/g, 'data-src="$1"')
    .replace(/src="(\/imgs_home\/pedidoslistos\.webp)"/g, 'data-src="$1"')
    .replace(/src="(\/dashboard-demo\.webp)"/g, 'data-src="$1"')
    .replace(/src="(https:\/\/images\.pexels\.com\/photos\/[^"]+)"/g, 'data-src="$1"')
    .replace(/<video preload="none"(?![^>]*class="hero-video")([^>]*)>\s*<source src="(?!https:\/\/videos\.pexels\.com\/video-files\/7855449)([^"]+)"/g, '<video preload="none" data-lazy-media$1><source data-src="$2"')
    .replace(/<video preload="none" data-lazy-media([^>]*)preload="none"/g, '<video preload="none" data-lazy-media$1preload="none"');
}

function normalizePublicPlans(response) {
  const rawPlans = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.plans)
    ? response.data.plans
    : Array.isArray(response?.plans)
    ? response.plans
    : [];

  const normalizedPlans = rawPlans.map((plan) => ({
    key: plan.key || plan.plan_key || plan.name,
    name: plan.name || plan.label || "Plan",
    label: formatPlanLabel(plan),
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    default_billing_period: plan.default_billing_period || "monthly",
    billing_options: normalizePublicBillingOptions(plan),
    trial_days: plan.trial_days ?? plan.trialDays ?? plan.free_days ?? plan.freeDays ?? null,
    badge: plan.badge || plan.badge_label || plan.badgeLabel || "",
    description: plan.description || "",
    features: Array.isArray(plan.features) ? plan.features : [],
    popular: Boolean(plan.popular || plan.is_popular || String(plan.key).toLowerCase() === "shop"),
    custom: Boolean(plan.custom || plan.is_custom),
  }));

  return ensureCustomPlan(normalizedPlans);
}

function ensureCustomPlan(plans = []) {
  const hasCustomPlan = plans.some((plan) => {
    const key = String(plan.key || "").toLowerCase();
    const name = String(plan.name || "").toLowerCase();

    return plan.custom || key.includes("custom") || key.includes("medida") || name.includes("medida");
  });

  if (hasCustomPlan) return plans;

  const customPlan = DEFAULT_PUBLIC_PLANS.find((plan) => plan.custom);
  return customPlan ? [...plans, customPlan] : plans;
}

function buildPublicPlansMarkup(plans, createStorePath, billingPeriod = "monthly") {
  const safePlans = plans.length ? plans : DEFAULT_PUBLIC_PLANS;

  return safePlans.map((plan) => {
    const isFree = Number(plan.price || 0) === 0 && !plan.custom;
    const isCustom = plan.custom || String(plan.key || "").toLowerCase().includes("custom");
    const cardClass = isCustom ? "plan-card dark reveal" : "plan-card reveal";
    const ctaText = isCustom ? "Conoce mas" : isFree ? "Crea gratis" : "Contratar";
    const ctaHref = isCustom ? "https://wa.me/523332244005" : createStorePath;
    const ctaAttrs = isCustom ? ' target="_blank" rel="noopener noreferrer"' : "";
    const badgeLabel = formatPlanBadge(plan);
    const badge = plan.popular
      ? `<span class="plan-badge">${escapeHtml(badgeLabel)}</span><span class="plan-badge alt">Popular</span>`
      : `<span class="plan-badge">${escapeHtml(badgeLabel)}</span>`;
    const selectedOption = getBillingOption(plan, billingPeriod);
    const savingsLabel = billingPeriod === "annual" ? selectedOption?.savings_label || "" : "";
    const features = (Array.isArray(plan.features) && plan.features.length ? plan.features : ["Incluye herramientas para operar tu tienda."])
      .map((feature) => `<li>${escapeHtml(feature)}</li>`)
      .join("");

    return `
          <article class="${cardClass}" data-plan-key="${escapeHtml(plan.key || plan.name)}">
            <div class="plan-badges">${badge}</div>
            <div class="plan-name">${escapeHtml(plan.name)}</div>
            <div class="plan-price">${escapeHtml(formatPlanLabel(plan, billingPeriod))}</div>
            <div class="plan-savings${savingsLabel ? "" : " is-empty"}">${escapeHtml(savingsLabel)}</div>
            <p class="plan-desc">${escapeHtml(plan.description || "")}</p>
            <ul class="plan-features">${features}</ul>
            <div class="plan-action"><a class="btn" href="${escapeHtml(ctaHref)}"${ctaAttrs}>${ctaText}</a></div>
          </article>`;
  }).join("");
}

function formatPlanBadge(plan = {}) {
  if (plan.badge) return plan.badge;

  const amount = Number(plan.price || 0);
  const isFree = amount === 0 && !plan.custom;
  const trialDays = Number(plan.trial_days ?? plan.trialDays ?? plan.free_days ?? plan.freeDays ?? 0);

  if (isFree && trialDays > 0) return `Free ${trialDays} dias`;
  if (isFree) return "Free 14 dias";

  return plan.name || "Plan";
}

function formatPlanLabel(plan = {}, billingPeriod = "monthly") {
  const selectedOption = getBillingOption(plan, billingPeriod);
  const amount = Number(selectedOption?.price ?? plan.price ?? 0);
  const isCustom = Boolean(plan.custom || plan.is_custom);
  const isFree = amount === 0 && !isCustom;
  const trialDays = Number(plan.trial_days ?? plan.trialDays ?? plan.free_days ?? plan.freeDays ?? 0);
  const rawLabel = selectedOption?.label || plan.label || plan.display_label || plan.price_label || plan.priceLabel || "";

  if (isFree && trialDays > 0) return `Gratis por ${trialDays} dias`;
  if (rawLabel) return rawLabel;
  if (isFree) return "Gratis por 14 dias";

  return formatPlanPrice(plan, billingPeriod);
}

function formatPlanPrice(plan = {}, billingPeriod = "monthly") {
  const selectedOption = getBillingOption(plan, billingPeriod);
  const amount = Number(selectedOption?.price ?? plan.price ?? 0);
  if (!amount) return "Gratis";

  const normalizedAmount = amount >= 1000 ? amount / 100 : amount;
  const currency = String(selectedOption?.currency || plan.currency || "MXN").toUpperCase();
  const intervalValue = selectedOption?.interval || plan.interval;
  const interval = intervalValue === "year" ? " /año" : intervalValue === "month" ? " /mes" : "";

  return `${new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(normalizedAmount)}${interval}`;
}

function normalizePublicBillingOptions(plan = {}) {
  if (!Array.isArray(plan.billing_options)) return [];

  return plan.billing_options.map((option) => ({
    key: option.key || "monthly",
    label: option.label || "",
    price: option.price,
    amount: option.amount,
    currency: option.currency || plan.currency || "MXN",
    interval: option.interval || (option.key === "annual" ? "year" : "month"),
    months_charged: Number(option.months_charged ?? 0),
    months_free: Number(option.months_free ?? 0),
    savings_label: option.savings_label || "",
  }));
}

function getDefaultBillingOption(plan = {}) {
  const options = Array.isArray(plan.billing_options) ? plan.billing_options : [];
  if (!options.length) return null;

  return (
    options.find((option) => option.key === plan.default_billing_period) ||
    options.find((option) => option.key === "monthly") ||
    options[0]
  );
}

function getBillingOption(plan = {}, billingPeriod = "monthly") {
  const options = Array.isArray(plan.billing_options) ? plan.billing_options : [];
  const selectedOption = options.find((option) => option.key === billingPeriod);

  if (selectedOption) return selectedOption;

  if (billingPeriod === "annual" && Number(plan.price || 0) > 0 && !plan.custom) {
    const monthlyPrice = Number(plan.price || 0);

    return {
      key: "annual",
      label: formatPlanPrice({
        ...plan,
        price: monthlyPrice * 10,
        interval: "year",
        billing_options: [],
      }),
      price: monthlyPrice * 10,
      currency: plan.currency || "MXN",
      interval: "year",
      months_charged: 10,
      months_free: 2,
      savings_label: "2 meses gratis",
    };
  }

  return getDefaultBillingOption(plan);
}

function updatePublicPlanPrices(root, plans = [], billingPeriod = "monthly") {
  const safePlans = plans.length ? plans : DEFAULT_PUBLIC_PLANS;

  safePlans.forEach((plan) => {
    const key = String(plan.key || plan.name || "");
    const card = root?.querySelector(`[data-plan-key="${cssEscape(key)}"]`);
    if (!card) return;

    const price = card.querySelector(".plan-price");
    const savings = card.querySelector(".plan-savings");
    const selectedOption = getBillingOption(plan, billingPeriod);
    const savingsLabel = billingPeriod === "annual" ? selectedOption?.savings_label || "" : "";

    if (price) {
      price.textContent = formatPlanLabel(plan, billingPeriod);
      price.classList.remove("is-updating");
      void price.offsetWidth;
      price.classList.add("is-updating");
    }

    if (savings) {
      savings.textContent = savingsLabel;
      savings.classList.toggle("is-empty", !savingsLabel);
      savings.classList.remove("is-updating");
      void savings.offsetWidth;
      savings.classList.add("is-updating");
    }
  });
}

function cssEscape(value = "") {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return String(value).replaceAll('"', '\\"').replaceAll("\\", "\\\\");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default HomePage;
