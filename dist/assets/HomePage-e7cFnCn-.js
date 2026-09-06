const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/BrandBanners-BXWQV-oI.js","assets/jsx-runtime-D-oznMWL.js","assets/api-DLYO2C0C.js","assets/react-DcCgrBX5.js","assets/bannerService-CyiVxmKc.js","assets/mediaUrl-BHZXSHvr.js","assets/brandBannerService-DdoEV9wq.js","assets/BrandBanners-DBIJVo7F.css","assets/LatestPurchases-wvka8Utn.js","assets/index-6YpvjGSq.js","assets/preload-helper-rov5CBGT.js","assets/dist-DTSG5i3q.js","assets/SettingsContext-BjA5lWzi.js","assets/settingsService-DhqqBQqt.js","assets/metaPixel-CLcQLysh.js","assets/authService-1kxHXCpt.js","assets/toast-DxsXEhqR.js","assets/index-xvlEKYhI.css","assets/accountService-CrmZVxVb.js","assets/LatestPurchases-o-V_FbV4.css","assets/MonthlyPromotions-B5AugcIp.js","assets/monthlyPromotionsService-C5DWFeB6.js","assets/MonthlyPromotions-BUWQEXmo.css","assets/OffersSection-BHslYlSl.js","assets/promotionsService-CndgvdlI.js","assets/OffersSection-B7oX0C-b.css"])))=>i.map(i=>d[i]);
import{i as e,t}from"./jsx-runtime-D-oznMWL.js";import{t as n}from"./react-DcCgrBX5.js";import{t as r}from"./preload-helper-rov5CBGT.js";import"./api-DLYO2C0C.js";import"./settingsService-DhqqBQqt.js";import{n as i}from"./SettingsContext-BjA5lWzi.js";import{a,o,s}from"./bannerService-CyiVxmKc.js";var c=t(),l=e(n(),1),u=`http://localhost:8000`;function d(e){return`${u}/api/v1/platform/tenants${e}`}function f(e){return`${u}/api/v1/platform${e}`}async function p(e,t={}){let n=await fetch(d(e),{...t,headers:{Accept:`application/json`,...t.body?{"Content-Type":`application/json`}:{},...t.headers||{}}}),r=await n.json().catch(()=>({}));if(!n.ok){let e=Error(r?.message||`No fue posible completar la solicitud.`);throw e.status=n.status,e.data=r,e}return r}function m(e){return p(`/check-subdomain?${new URLSearchParams({subdomain:e}).toString()}`)}function h(e){return p(``,{method:`POST`,body:JSON.stringify(e)})}async function g(){let e=await fetch(f(`/plans`),{headers:{Accept:`application/json`}}),t=await e.json().catch(()=>({}));if(!e.ok){let n=Error(t?.message||`No fue posible cargar los planes.`);throw n.status=e.status,n.data=t,n}return t}function _(){let[e,t]=(0,l.useState)([]),[n,r]=(0,l.useState)(0),[i,a]=(0,l.useState)(!0);(0,l.useEffect)(()=>{let e=!0;async function n(){try{a(!0);let n=y(await o({without_pagination:!0})).filter(e=>(e?.metadata?.section||`home`)===`home`&&!!e?.is_active).sort((e,t)=>Number(e.sort_order??0)-Number(t.sort_order??0)).map(v).filter(e=>e.file);if(!e)return;t(n),r(0)}catch(n){console.error(`Error al cargar banners de inicio:`,n?.response?.data||n),e&&t([])}finally{e&&a(!1)}}return n(),()=>{e=!1}},[]);let s=e[n],u=()=>{r(t=>t===0?e.length-1:t-1)},d=()=>{r(t=>t===e.length-1?0:t+1)};if(i)return(0,c.jsx)(`section`,{className:`hero-banner hero-banner--loading`});if(!s)return null;let f=s.title||s.subtitle,p=f&&s.buttonText&&s.buttonUrl,m=e.length>1;return(0,c.jsx)(`section`,{className:`hero-banner`,children:(0,c.jsxs)(`div`,{className:`hero-banner__media`,children:[s.type===`video`?(0,c.jsx)(`video`,{preload:`none`,className:`hero-banner__video`,src:s.file,autoPlay:!0,muted:!0,loop:!0,playsInline:!0}):(0,c.jsx)(`img`,{loading:`lazy`,className:`hero-banner__image`,src:s.file,alt:s.title||`Banner`}),(0,c.jsx)(`div`,{className:`hero-banner__overlay`,style:{background:`rgba(0,0,0,${s.overlay})`}}),f&&(0,c.jsx)(`div`,{className:`hero-banner__content container-main`,children:(0,c.jsxs)(`div`,{className:`hero-banner__text hero-banner__text--${s.align}`,children:[s.title&&(0,c.jsx)(`h1`,{className:`hero-banner__title`,children:s.title}),s.subtitle&&(0,c.jsx)(`p`,{className:`hero-banner__subtitle`,children:s.subtitle}),p&&(0,c.jsx)(`div`,{className:`hero-banner__actions`,children:(0,c.jsx)(`a`,{href:s.buttonUrl,className:`hero-banner__button`,children:s.buttonText})})]})}),m&&(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(`button`,{type:`button`,className:`hero-banner__nav hero-banner__nav--prev`,onClick:u,"aria-label":`Banner anterior`,children:`‹`}),(0,c.jsx)(`button`,{type:`button`,className:`hero-banner__nav hero-banner__nav--next`,onClick:d,"aria-label":`Banner siguiente`,children:`›`}),(0,c.jsx)(`div`,{className:`hero-banner__dots`,children:e.map((e,t)=>(0,c.jsx)(`button`,{type:`button`,className:`hero-banner__dot ${t===n?`is-active`:``}`,onClick:()=>r(t),"aria-label":`Ir al banner ${t+1}`},e.id))})]})]})})}function v(e){return{id:e.id,type:a(e),file:s(e),title:e.title||``,subtitle:e.subtitle||e.description||``,buttonText:e.button_text||``,buttonUrl:e.link_url||``,align:e.metadata?.align||`left`,overlay:Number(e.metadata?.overlay??.34),sortOrder:Number(e.sort_order??0)}}function y(e){let t=e?.data??e;return Array.isArray(t)?t:Array.isArray(t?.data)?t.data:Array.isArray(t?.banners)?t.banners:[]}var b=(0,l.lazy)(()=>r(()=>import(`./BrandBanners-BXWQV-oI.js`),__vite__mapDeps([0,1,2,3,4,5,6,7]))),x=(0,l.lazy)(()=>r(()=>import(`./LatestPurchases-wvka8Utn.js`),__vite__mapDeps([8,1,9,10,2,11,3,12,13,5,14,15,16,17,18,19]))),S=(0,l.lazy)(()=>r(()=>import(`./MonthlyPromotions-B5AugcIp.js`),__vite__mapDeps([20,1,2,3,21,22]))),C=(0,l.lazy)(()=>r(()=>import(`./OffersSection-BHslYlSl.js`),__vite__mapDeps([23,1,9,10,2,11,3,12,13,5,14,15,16,17,24,25]))),w={is_published:!1,construction:{title:`Ecommerce en construcción`,message:`Estamos preparando la tienda. Vuelve pronto.`},active_template:`classic`,home_template:`classic`,visual_design:{home:{variant:`classic`}}};function T(){let{settings:e,loading:t,logoUrl:n,brandName:r}=i(),a=e.storefront||w,o=a.active_template||a.home_template||`classic`,s=a.visual_design?.home||{};return t?(0,c.jsx)(`div`,{className:`public-home__loading`,"aria-label":`Cargando inicio`}):a.is_published?(0,c.jsx)(E,{template:o,homeDesign:s}):(0,c.jsx)(O,{storefront:a,logoUrl:n,brandName:r})}function E({template:e,homeDesign:t}){let n=t?.variant||e||`classic`;return n===`minimal`||e===`minimal`?(0,c.jsxs)(`main`,{className:`public-home public-home--minimal`,children:[(0,c.jsx)(_,{}),(0,c.jsx)(D,{minHeight:320,children:(0,c.jsx)(x,{})}),(0,c.jsx)(D,{minHeight:320,children:(0,c.jsx)(b,{})})]}):n===`showcase`||e===`showcase`?(0,c.jsxs)(`main`,{className:`public-home public-home--showcase`,children:[(0,c.jsx)(_,{}),(0,c.jsx)(D,{minHeight:360,children:(0,c.jsx)(b,{})}),(0,c.jsx)(D,{minHeight:320,children:(0,c.jsx)(x,{source:`favorites`})}),(0,c.jsx)(D,{minHeight:360,children:(0,c.jsx)(S,{})}),(0,c.jsx)(D,{minHeight:320,children:(0,c.jsx)(x,{})})]}):n===`promo_first`||e===`promo`?(0,c.jsxs)(`main`,{className:`public-home public-home--promo`,children:[(0,c.jsx)(D,{minHeight:360,children:(0,c.jsx)(S,{})}),(0,c.jsx)(D,{minHeight:360,children:(0,c.jsx)(C,{})}),(0,c.jsx)(_,{}),(0,c.jsx)(D,{minHeight:320,children:(0,c.jsx)(x,{source:`favorites`})}),(0,c.jsx)(D,{minHeight:320,children:(0,c.jsx)(x,{})}),(0,c.jsx)(D,{minHeight:360,children:(0,c.jsx)(b,{})})]}):(0,c.jsxs)(`main`,{className:`public-home public-home--classic`,children:[(0,c.jsx)(_,{}),(0,c.jsx)(D,{minHeight:360,children:(0,c.jsx)(b,{})}),(0,c.jsx)(D,{minHeight:320,children:(0,c.jsx)(x,{source:`favorites`})}),(0,c.jsx)(D,{minHeight:320,children:(0,c.jsx)(x,{})}),(0,c.jsx)(D,{minHeight:360,children:(0,c.jsx)(S,{})}),(0,c.jsx)(D,{minHeight:360,children:(0,c.jsx)(C,{})})]})}function D({children:e,minHeight:t=320}){let n=(0,l.useRef)(null),[r,i]=(0,l.useState)(!1);return(0,l.useEffect)(()=>{let e=n.current;if(!e||r)return;let t=new IntersectionObserver(([e])=>{e.isIntersecting&&(i(!0),t.disconnect())},{rootMargin:`420px 0px`});return t.observe(e),()=>t.disconnect()},[r]),(0,c.jsx)(`div`,{ref:n,style:r?void 0:{minHeight:t},children:r?(0,c.jsx)(l.Suspense,{fallback:null,children:e}):null})}function O({storefront:e,logoUrl:t,brandName:n}){let r=e.construction||w.construction;return(0,c.jsx)(`section`,{className:`construction-page`,children:(0,c.jsxs)(`div`,{className:`construction-page__inner`,children:[t?(0,c.jsx)(`img`,{loading:`lazy`,className:`construction-page__logo`,src:t,alt:n||`Logo`}):(0,c.jsx)(`span`,{className:`construction-page__icon`,children:(0,c.jsx)(`i`,{className:`bi bi-shop-window`,"aria-hidden":`true`})}),(0,c.jsx)(`h1`,{children:r.title||w.construction.title}),(0,c.jsx)(`p`,{children:r.message||w.construction.message})]})})}var k=String.raw`<nav class="nav" aria-label="Navegacion principal">
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
  </footer>`,A=[{key:`free`,name:`Free`,label:`Gratis por 14 dias`,price:0,currency:`MXN`,interval:null,trial_days:14,description:`Ideal para comenzar a vender sin complicarte.`,features:[`Publica tu tienda y valida tu idea.`,`Configura productos iniciales.`,`Empieza a recibir tus primeros pedidos.`]},{key:`basic`,name:`Basico`,label:`$189.00 /mes`,price:18900,currency:`MXN`,interval:`month`,description:`Lo esencial para vender con catalogo y operacion simple.`,features:[`Catalogo y productos.`,`Clientes y pedidos.`,`Configuracion basica.`,`Plantilla basica incluida.`]},{key:`shop`,name:`Shop`,label:`$429.00 /mes`,price:42900,currency:`MXN`,interval:`month`,description:`Para crecer con canales, marketing y experiencias personalizadas.`,features:[`Todo lo del plan Basico.`,`Canales de venta.`,`Fidelizacion y promociones.`,`Personalizacion y marketing.`],popular:!0},{key:`shop_plus`,name:`Shop+`,label:`$749.00 /mes`,price:74900,currency:`MXN`,interval:`month`,description:`Para equipos que necesitan automatizar, cobrar y conectar mas procesos.`,features:[`Todo lo del plan Shop.`,`Automatizaciones y usuarios.`,`Conexion con envios.`,`Recuperacion de carritos.`,`kuix.app, acceso 6 meses a facturación y cobranza.`,`Aplica al contratar plan anual.`]},{key:`custom`,name:`Ecommerce a la medida`,label:`Conoce mas`,description:`Desarrollo de software y ecommerce personalizado para empresas con procesos especiales.`,features:[`Desarrollo de software a la medida.`,`Integraciones con ERP, CRM, pagos o sistemas internos.`,`Flujos personalizados para tu operacion.`,`Acompanamiento estrategico y tecnico.`],custom:!0}];function j({createStorePath:e=`/registro`,loginPath:t=`/login`}){let n=(0,l.useRef)(null),[r,i]=(0,l.useState)(A),a=(0,l.useMemo)(()=>L(r,e,`monthly`),[e,r]),o=(0,l.useMemo)(()=>P(M(k,a).replaceAll(`href="/registro"`,`href="${e}"`).replaceAll(`href="/login"`,`href="${t}"`)),[e,t,a]);return(0,l.useEffect)(()=>{let e=n.current,t=e?.querySelector(`.nav`),i=!1,a=()=>{t&&(t.classList.toggle(`is-scrolled`,window.scrollY>18),i=!1)};a();let o=()=>{i||=(window.requestAnimationFrame(a),!0)};window.addEventListener(`scroll`,o,{passive:!0});let s=[`vender mas`,`conectar con tus clientes`,`todo lo que imagines`],c=e?.querySelector(`#heroWord`),l=0,u=window.setInterval(()=>{c&&(l=(l+1)%s.length,c.animate([{opacity:1,transform:`translateY(0)`},{opacity:0,transform:`translateY(-14px)`}],{duration:260,easing:`cubic-bezier(.22, 1, .36, 1)`}).onfinish=()=>{c.textContent=s[l],c.animate([{opacity:0,transform:`translateY(14px)`},{opacity:1,transform:`translateY(0)`}],{duration:420,easing:`cubic-bezier(.22, 1, .36, 1)`})})},2400),d=new IntersectionObserver(e=>{for(let t of e)t.isIntersecting&&(t.target.classList.add(`visible`),d.unobserve(t.target))},{threshold:.14});e?.querySelectorAll(`.reveal`).forEach(e=>d.observe(e));let f=e=>{if(e.tagName===`IMG`){let t=e.dataset.src;if(!t)return;e.onerror=()=>{e.dataset.fallbackSrc&&e.src!==e.dataset.fallbackSrc&&(e.src=e.dataset.fallbackSrc)},e.src=t,e.removeAttribute(`data-src`);return}e.querySelectorAll(`source[data-src]`).forEach(e=>{e.src=e.dataset.src,e.removeAttribute(`data-src`)}),e.load(),e.autoplay&&e.play().catch(()=>{})},p=new IntersectionObserver(e=>{for(let t of e){let e=t.target;if(t.isIntersecting){f(e),e.tagName===`VIDEO`&&e.autoplay&&e.play().catch(()=>{});continue}e.tagName===`VIDEO`&&e.pause()}},{rootMargin:`520px 0px`,threshold:.08});e?.querySelectorAll(`img[data-src], video[data-lazy-media]`).forEach(e=>{p.observe(e)});let m=e?.querySelectorAll(`[data-plan-period]`),h=t=>{let n=t.currentTarget?.dataset?.planPeriod;(n===`monthly`||n===`annual`)&&(m?.forEach(e=>{e.classList.toggle(`is-active`,e.dataset.planPeriod===n)}),W(e,r,n))};return m?.forEach(e=>{e.addEventListener(`click`,h)}),()=>{window.removeEventListener(`scroll`,o),window.clearInterval(u),d.disconnect(),p.disconnect(),m?.forEach(e=>{e.removeEventListener(`click`,h)})}},[o,r]),(0,l.useEffect)(()=>{let e=!0;return g().then(t=>{if(!e)return;let n=F(t);n.length&&i(n)}).catch(e=>{console.error(`Error cargando planes públicos:`,e?.data||e)}),()=>{e=!1}},[]),(0,c.jsx)(`div`,{ref:n,className:`cloudishop-home`,dangerouslySetInnerHTML:{__html:o}})}function M(e,t){return e.replace(/<div class="plans-billing-toggle"[\s\S]*?<\/div>\s*(?=<div class="plans-grid">)/,N(`monthly`)).replace(/<div class="plans-grid">[\s\S]*?<article class="plan-card dark reveal">[\s\S]*?<\/article>\s*<\/div>/,`<div class="plans-grid">${t}</div>`)}function N(e=`monthly`){return`
        <div class="plans-billing-toggle" role="group" aria-label="Periodo de pago">
          <button type="button" class="${e===`monthly`?`is-active`:``}" data-plan-period="monthly">Mensual</button>
          <button type="button" class="${e===`annual`?`is-active`:``}" data-plan-period="annual">Anual</button>
        </div>`}function P(e){return e.replace(/<img(?![^>]*\bloading=)([^>]*)>/g,`<img loading="lazy" decoding="async"$1>`).replace(/<video(?![^>]*\bpreload=)([^>]*)>/g,`<video preload="none"$1>`).replace(/<video preload="none"([^>]*class="hero-video"[^>]*)>/g,`<video preload="metadata"$1>`).replace(/src="(\/imgs_tiendas\/[^"]+\.webp)"/g,`data-src="$1"`).replace(/src="(\/imgs_home\/pedidoslistos\.webp)"/g,`data-src="$1"`).replace(/src="(\/dashboard-demo\.webp)"/g,`data-src="$1"`).replace(/src="(https:\/\/images\.pexels\.com\/photos\/[^"]+)"/g,`data-src="$1"`).replace(/<video preload="none"(?![^>]*class="hero-video")([^>]*)>\s*<source src="(?!https:\/\/videos\.pexels\.com\/video-files\/7855449)([^"]+)"/g,`<video preload="none" data-lazy-media$1><source data-src="$2"`).replace(/<video preload="none" data-lazy-media([^>]*)preload="none"/g,`<video preload="none" data-lazy-media$1preload="none"`)}function F(e){return I((Array.isArray(e?.data)?e.data:Array.isArray(e?.data?.plans)?e.data.plans:Array.isArray(e?.plans)?e.plans:[]).map(e=>({key:e.key||e.plan_key||e.name,name:e.name||e.label||`Plan`,label:z(e),price:e.price,currency:e.currency,interval:e.interval,default_billing_period:e.default_billing_period||`monthly`,billing_options:V(e),trial_days:e.trial_days??e.trialDays??e.free_days??e.freeDays??null,badge:e.badge||e.badge_label||e.badgeLabel||``,description:e.description||``,features:Array.isArray(e.features)?e.features:[],popular:!!(e.popular||e.is_popular||String(e.key).toLowerCase()===`shop`),custom:!!(e.custom||e.is_custom)})))}function I(e=[]){if(e.some(e=>{let t=String(e.key||``).toLowerCase(),n=String(e.name||``).toLowerCase();return e.custom||t.includes(`custom`)||t.includes(`medida`)||n.includes(`medida`)}))return e;let t=A.find(e=>e.custom);return t?[...e,t]:e}function L(e,t,n=`monthly`){return(e.length?e:A).map(e=>{let r=Number(e.price||0)===0&&!e.custom,i=e.custom||String(e.key||``).toLowerCase().includes(`custom`),a=i?`plan-card dark reveal`:`plan-card reveal`,o=i?`Conoce mas`:r?`Crea gratis`:`Contratar`,s=i?`https://wa.me/523332244005`:t,c=i?` target="_blank" rel="noopener noreferrer"`:``,l=R(e),u=e.popular?`<span class="plan-badge">${K(l)}</span><span class="plan-badge alt">Popular</span>`:`<span class="plan-badge">${K(l)}</span>`,d=U(e,n),f=n===`annual`&&d?.savings_label||``,p=(Array.isArray(e.features)&&e.features.length?e.features:[`Incluye herramientas para operar tu tienda.`]).map(e=>`<li>${K(e)}</li>`).join(``);return`
          <article class="${a}" data-plan-key="${K(e.key||e.name)}">
            <div class="plan-badges">${u}</div>
            <div class="plan-name">${K(e.name)}</div>
            <div class="plan-price">${K(z(e,n))}</div>
            <div class="plan-savings${f?``:` is-empty`}">${K(f)}</div>
            <p class="plan-desc">${K(e.description||``)}</p>
            <ul class="plan-features">${p}</ul>
            <div class="plan-action"><a class="btn" href="${K(s)}"${c}>${o}</a></div>
          </article>`}).join(``)}function R(e={}){if(e.badge)return e.badge;let t=Number(e.price||0)===0&&!e.custom,n=Number(e.trial_days??e.trialDays??e.free_days??e.freeDays??0);return t&&n>0?`Free ${n} dias`:t?`Free 14 dias`:e.name||`Plan`}function z(e={},t=`monthly`){let n=U(e,t),r=Number(n?.price??e.price??0),i=!!(e.custom||e.is_custom),a=r===0&&!i,o=Number(e.trial_days??e.trialDays??e.free_days??e.freeDays??0),s=n?.label||e.label||e.display_label||e.price_label||e.priceLabel||``;return a&&o>0?`Gratis por ${o} dias`:s||(a?`Gratis por 14 dias`:B(e,t))}function B(e={},t=`monthly`){let n=U(e,t),r=Number(n?.price??e.price??0);if(!r)return`Gratis`;let i=r>=1e3?r/100:r,a=String(n?.currency||e.currency||`MXN`).toUpperCase(),o=n?.interval||e.interval,s=o===`year`?` /año`:o===`month`?` /mes`:``;return`${new Intl.NumberFormat(`es-MX`,{style:`currency`,currency:a,minimumFractionDigits:2}).format(i)}${s}`}function V(e={}){return Array.isArray(e.billing_options)?e.billing_options.map(t=>({key:t.key||`monthly`,label:t.label||``,price:t.price,amount:t.amount,currency:t.currency||e.currency||`MXN`,interval:t.interval||(t.key===`annual`?`year`:`month`),months_charged:Number(t.months_charged??0),months_free:Number(t.months_free??0),savings_label:t.savings_label||``})):[]}function H(e={}){let t=Array.isArray(e.billing_options)?e.billing_options:[];return t.length?t.find(t=>t.key===e.default_billing_period)||t.find(e=>e.key===`monthly`)||t[0]:null}function U(e={},t=`monthly`){let n=(Array.isArray(e.billing_options)?e.billing_options:[]).find(e=>e.key===t);if(n)return n;if(t===`annual`&&Number(e.price||0)>0&&!e.custom){let t=Number(e.price||0);return{key:`annual`,label:B({...e,price:t*10,interval:`year`,billing_options:[]}),price:t*10,currency:e.currency||`MXN`,interval:`year`,months_charged:10,months_free:2,savings_label:`2 meses gratis`}}return H(e)}function W(e,t=[],n=`monthly`){(t.length?t:A).forEach(t=>{let r=String(t.key||t.name||``),i=e?.querySelector(`[data-plan-key="${G(r)}"]`);if(!i)return;let a=i.querySelector(`.plan-price`),o=i.querySelector(`.plan-savings`),s=U(t,n),c=n===`annual`&&s?.savings_label||``;a&&(a.textContent=z(t,n),a.classList.remove(`is-updating`),a.offsetWidth,a.classList.add(`is-updating`)),o&&(o.textContent=c,o.classList.toggle(`is-empty`,!c),o.classList.remove(`is-updating`),o.offsetWidth,o.classList.add(`is-updating`))})}function G(e=``){return typeof CSS<`u`&&typeof CSS.escape==`function`?CSS.escape(e):String(e).replaceAll(`"`,`\\"`).replaceAll(`\\`,`\\\\`)}function K(e=``){return String(e).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}export{j as CloudiShopMarketingHome,T as default,h as n,m as t};