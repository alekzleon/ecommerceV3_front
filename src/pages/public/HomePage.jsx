import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import HeroBanner from "../../components/home/HeroBanner/HeroBanner"
import BrandBanners from "../../components/home/BrandBanners/BrandBanners"
import LatestPurchases from "../../components/home/LatestPurchases/LatestPurchases"
import MonthlyPromotions from "../../components/home/MonthlyPromotions/MonthlyPromotions"
import OffersSection from "../../components/home/OffersSection/OffersSection"
import { useSettings } from "../../context/SettingsContext"
import { getPublicHome, getPublicStorefront } from "../../services/api/settingsService"
import {
  getBrandBannerMediaType,
  getBrandBanners,
  normalizeBrandBannerMediaUrl,
} from "../../services/api/brandBannerService"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import "./homepage.css"

const DEFAULT_STOREFRONT = {
  is_published: false,
  construction: {
    title: "Ecommerce en construcción",
    message: "Estamos preparando la tienda. Vuelve pronto.",
  },
  active_template: "classic",
  home_template: "classic",
  available_home_templates: ["classic"],
  available_templates: [],
  available_home_template_options: [],
  visual_design: {
    nav: {},
    home: {
      variant: "classic",
    },
    footer: {},
  },
  theme: {},
}

function HomePage() {
  const location = useLocation()
  const { logoUrl, brandName } = useSettings()
  const [storefront, setStorefront] = useState(DEFAULT_STOREFRONT)
  const [home, setHome] = useState(null)
  const [brandBanners, setBrandBanners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadHome() {
      try {
        setLoading(true)
        const [storefrontResponse, homeResponse, brandBannersResponse] = await Promise.allSettled([
          getPublicStorefront(),
          getPublicHome(),
          getBrandBanners({ limit: 10 }),
        ])

        if (!isMounted) return

        setStorefront(
          storefrontResponse.status === "fulfilled"
            ? normalizeStorefrontResponse(storefrontResponse.value)
            : DEFAULT_STOREFRONT
        )
        setHome(
          homeResponse.status === "fulfilled"
            ? normalizeHomeResponse(homeResponse.value)
            : null
        )
        setBrandBanners(
          brandBannersResponse.status === "fulfilled"
            ? normalizeBrandBannerCollection(brandBannersResponse.value)
            : []
        )
      } catch (error) {
        console.error("Error al cargar storefront:", error?.response?.data || error)
        if (isMounted) {
          setStorefront(DEFAULT_STOREFRONT)
          setHome(null)
          setBrandBanners([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadHome()

    return () => {
      isMounted = false
    }
  }, [])

  const previewTemplate = getPreviewTemplate(location)
  const previewStorefront = previewTemplate
    ? applyHomePreviewStorefront(storefront, previewTemplate)
    : storefront
  const previewHome = previewTemplate
    ? applyHomePreviewStorefront(home?.storefront || {}, previewTemplate)
    : home?.storefront

  if (loading) {
    return <div className="public-home__loading" aria-label="Cargando inicio" />
  }

  if (!previewStorefront.is_published) {
    return <ConstructionView storefront={previewStorefront} logoUrl={logoUrl} brandName={brandName} />
  }

  const template =
    previewStorefront.active_template ||
    previewHome?.active_template ||
    previewStorefront.home_template ||
    previewHome?.home_template ||
    "classic"
  const homeDesign = previewStorefront.visual_design?.home || previewHome?.visual_design?.home || {}

  if (template === "editorial_shop") {
    return <EditorialShopHome sections={home?.sections || {}} brandName={brandName} brandBanners={brandBanners} />
  }

  return <TemplateHome template={template} homeDesign={homeDesign} />
}

function getPreviewTemplate(location) {
  if (location.pathname !== "/preview/ecommerce") return ""

  const params = new URLSearchParams(location.search)
  return params.get("template") || ""
}

function applyHomePreviewStorefront(storefront, template) {
  return {
    ...storefront,
    is_published: true,
    active_template: template,
    home_template: template,
    template,
    visual_design: {
      ...(storefront.visual_design || DEFAULT_STOREFRONT.visual_design),
      home: {
        ...(storefront.visual_design?.home || DEFAULT_STOREFRONT.visual_design.home),
        variant: template === "promo" ? "promo_first" : template,
      },
      nav: {
        ...(storefront.visual_design?.nav || DEFAULT_STOREFRONT.visual_design.nav),
        variant: template,
      },
      footer: {
        ...(storefront.visual_design?.footer || DEFAULT_STOREFRONT.visual_design.footer),
        variant: template,
      },
    },
  }
}

function TemplateHome({ template, homeDesign }) {
  const variant = homeDesign?.variant || template || "classic"

  if (variant === "minimal" || template === "minimal") {
    return (
      <main className="public-home public-home--minimal">
        <HeroBanner />
        <LatestPurchases />
        <BrandBanners />
      </main>
    )
  }

  if (variant === "showcase" || template === "showcase") {
    return (
      <main className="public-home public-home--showcase">
        <HeroBanner />
        <BrandBanners />
        <LatestPurchases source="favorites" />
        <MonthlyPromotions />
        <LatestPurchases />
      </main>
    )
  }

  if (variant === "promo_first" || template === "promo") {
    return (
      <main className="public-home public-home--promo">
        <MonthlyPromotions />
        <OffersSection />
        <HeroBanner />
        <LatestPurchases source="favorites" />
        <LatestPurchases />
        <BrandBanners />
      </main>
    )
  }

  return (
    <main className="public-home public-home--classic">
      <HeroBanner />
      <BrandBanners />
      <LatestPurchases source="favorites" />
      <LatestPurchases />
      <MonthlyPromotions />
      <OffersSection />
    </main>
  )
}

function ConstructionView({ storefront, logoUrl, brandName }) {
  const construction = storefront.construction || DEFAULT_STOREFRONT.construction

  return (
    <section className="construction-page">
      <div className="construction-page__inner">
        {logoUrl ? (
          <img
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
  )
}

function EditorialShopHome({ sections, brandName, brandBanners }) {
  const carouselRef = useRef(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const heroBrandBanners = normalizeItems(sections.hero_brand_banners)
  const sectionBrandBanners = normalizeItems(sections.brand_banners)
  const heroBanners = heroBrandBanners.length
    ? heroBrandBanners.map(normalizeEditorialBanner)
    : sectionBrandBanners.length
    ? sectionBrandBanners.map(normalizeEditorialBanner)
    : brandBanners
  const recentProducts = normalizeItems(sections.recent_purchase_products)
  const carouselItems = recentProducts.length ? recentProducts : buildEditorialFallbackProducts()
  const lastCarouselIndex = Math.max(carouselItems.length - 1, 0)
  const currentCarouselIndex = Math.min(carouselIndex, lastCarouselIndex)
  const hero = heroBanners[0] || {}
  const hasHeroCopy = hero.eyebrow || hero.title || hero.description || hero.buttonText
  const scrollCarouselTo = (nextIndex) => {
    const row = carouselRef.current
    const firstCard = row?.querySelector(".editorial-product")

    if (!row || !firstCard) return

    const rowStyles = window.getComputedStyle(row)
    const gap = Number.parseFloat(rowStyles.columnGap || rowStyles.gap || "0") || 0
    const cardWidth = firstCard.getBoundingClientRect().width

    row.scrollTo({
      left: nextIndex * (cardWidth + gap),
      behavior: "smooth",
    })
  }

  const handleCarouselMove = (direction) => {
    const nextIndex = direction === "next"
      ? Math.min(currentCarouselIndex + 1, lastCarouselIndex)
      : Math.max(currentCarouselIndex - 1, 0)

    setCarouselIndex(nextIndex)
    scrollCarouselTo(nextIndex)
  }

  return (
    <main className="editorial-shop">
      <section className="editorial-hero">
        {hero.src ? (
          hero.type === "video" ? (
            <video
              className="editorial-hero__image"
              src={hero.src}
              poster={hero.poster}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img className="editorial-hero__image" src={hero.src} alt={hero.alt || hero.title || brandName} />
          )
        ) : null}

        {hasHeroCopy ? (
          <div className="editorial-hero__content">
            {hero.eyebrow ? <span>{hero.eyebrow}</span> : null}
            {hero.title ? <h1>{hero.title}</h1> : null}
            {hero.description ? <p>{hero.description}</p> : null}
            {hero.buttonText && hero.linkUrl ? <a href={hero.linkUrl}>{hero.buttonText}</a> : null}
          </div>
        ) : null}

        {hero.subtitle || (hero.buttonText && hero.linkUrl) ? (
          <div className="editorial-hero__meta">
            {hero.subtitle ? <span>{hero.subtitle}</span> : null}
            {hero.buttonText && hero.linkUrl ? <a href={hero.linkUrl}>{hero.buttonText}</a> : null}
          </div>
        ) : null}

        <div className="editorial-floating-tools" aria-hidden="true">
          <span><i className="bi bi-palette" /></span>
          <span><i className="bi bi-currency-dollar" /></span>
          <span><i className="bi bi-cart" /></span>
        </div>
      </section>

      <section className="editorial-carousel">
        <div className="editorial-section-head">
          <h2>Productos que te pueden interesar</h2>
          <div className="editorial-section-counter">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => handleCarouselMove("previous")}
              disabled={currentCarouselIndex === 0}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => handleCarouselMove("next")}
              disabled={currentCarouselIndex === lastCarouselIndex}
            >
              ›
            </button>
          </div>
        </div>

        <div className="editorial-product-row" ref={carouselRef}>
          {carouselItems.map((item) => (
            <EditorialProductCard key={item.id || item.slug || item.name} item={item} />
          ))}
        </div>
      </section>

    </main>
  )
}

function EditorialProductCard({ item }) {
  const product = normalizeEditorialProduct(item)

  return (
    <article className="editorial-product">
      <img src={product.image} alt={product.name} />
      <div>
        <h3>{product.name}</h3>
        <p>{product.meta}</p>
      </div>
      <a href={product.href} aria-label={`Ver ${product.name}`}>→</a>
    </article>
  )
}

function normalizeStorefrontResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const construction = data.construction && typeof data.construction === "object"
    ? data.construction
    : {}
  const visualDesign = data.visual_design && typeof data.visual_design === "object"
    ? data.visual_design
    : DEFAULT_STOREFRONT.visual_design

  return {
    ...DEFAULT_STOREFRONT,
    ...data,
    is_published: Boolean(data.is_published),
    construction: {
      ...DEFAULT_STOREFRONT.construction,
      ...construction,
      title: construction.title || data.construction_title || DEFAULT_STOREFRONT.construction.title,
      message:
        construction.message ||
        data.construction_message ||
        DEFAULT_STOREFRONT.construction.message,
    },
    active_template:
      data.active_template ||
      data.home_template ||
      data.template ||
      DEFAULT_STOREFRONT.active_template,
    home_template: data.home_template || data.template || DEFAULT_STOREFRONT.home_template,
    available_home_templates: Array.isArray(data.available_home_templates)
      ? data.available_home_templates
      : DEFAULT_STOREFRONT.available_home_templates,
    available_home_template_options: Array.isArray(data.available_home_template_options)
      ? data.available_home_template_options
      : DEFAULT_STOREFRONT.available_home_template_options,
    available_templates: Array.isArray(data.available_templates)
      ? data.available_templates
      : DEFAULT_STOREFRONT.available_templates,
    visual_design: {
      ...DEFAULT_STOREFRONT.visual_design,
      ...visualDesign,
      nav: {
        ...DEFAULT_STOREFRONT.visual_design.nav,
        ...(visualDesign.nav || {}),
      },
      home: {
        ...DEFAULT_STOREFRONT.visual_design.home,
        ...(visualDesign.home || {}),
      },
      footer: {
        ...DEFAULT_STOREFRONT.visual_design.footer,
        ...(visualDesign.footer || {}),
      },
    },
  }
}

function normalizeHomeResponse(response) {
  const data = response?.data?.data || response?.data || response || {}

  return {
    storefront: data.storefront || {},
    sections: data.sections || {},
  }
}

function normalizeItems(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.data?.data)) return value.data.data
  if (Array.isArray(value?.data?.items)) return value.data.items
  if (Array.isArray(value?.data?.banners)) return value.data.banners
  if (Array.isArray(value?.data?.brand_banners)) return value.data.brand_banners
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.banners)) return value.banners
  if (Array.isArray(value?.brand_banners)) return value.brand_banners

  return []
}

function normalizeEditorialBanner(item = {}) {
  const title = item?.title || item?.brand_name || item?.name || ""

  return {
    id: item?.id,
    type: getBrandBannerMediaType(item),
    src: normalizeEditorialBannerImage(item),
    poster: normalizeBrandBannerMediaUrl({ media_url: item?.poster_url, media_path: item?.poster_path }),
    alt: item?.alt || title || "Banner de marcas",
    eyebrow: item.eyebrow || item.tagline || item.label || "",
    title,
    subtitle: item.subtitle || item.short_description || item.alt || "",
    description: item.description || item.text || item.copy || item.content || "",
    buttonText: item.button_text || item.cta_label || item.button_label || item.buttonText || "",
    linkUrl: item.link_url || item.link || item.href || item.redirect_url || "",
  }
}

function normalizeBrandBannerCollection(response) {
  return normalizeItems(response)
    .filter((banner) => Boolean(banner?.is_active ?? true))
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map(normalizeEditorialBanner)
    .filter((banner) => banner.src)
}

function normalizeEditorialBannerImage(item = {}) {
  const value = item.value && typeof item.value === "object" ? item.value : item
  const nestedMedia =
    value.media && typeof value.media === "object" ? value.media :
    value.image && typeof value.image === "object" ? value.image :
    value.banner && typeof value.banner === "object" ? value.banner :
    {}
  const directImage = firstString(
    value.src,
    value.image,
    value.image_url,
    value.media_url,
    value.file_url,
    value.desktop_image_url,
    value.mobile_image_url,
    value.banner_url,
    value.video_url,
    value.image_path,
    value.media_path,
    value.file_path,
    value.desktop_image_path,
    value.mobile_image_path,
    nestedMedia.src,
    nestedMedia.url,
    nestedMedia.image_url,
    nestedMedia.media_url,
    nestedMedia.file_url,
    nestedMedia.path,
    nestedMedia.image_path,
    nestedMedia.media_path,
    ""
  )

  if (directImage) {
    return normalizeMediaUrl(directImage)
  }

  return normalizeBrandBannerMediaUrl(value)
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || ""
}

function normalizeEditorialProduct(item = {}) {
  const image = normalizeMediaUrl(
    item.image_url ||
      item.main_image_url ||
      item.media_url ||
      item.image_path ||
      item.main_image_path ||
      item.media_path ||
      ""
  )
  const slug = item.slug || item.product_slug || ""

  return {
    id: item.id,
    name: item.name || item.title || "Producto",
    meta: item.items_count ? `${item.items_count} items` : item.brand || item.category || "6 items",
    image: image || "https://placehold.co/640x760/f1f1f1/222?text=Producto",
    href: slug ? `/producto/${slug}` : item.link_url || "/productos",
  }
}

function buildEditorialFallbackProducts() {
  return [
    { id: "fallback-glasses", name: "Glasses", items_count: 6, image_url: "https://placehold.co/640x760/f1f1f1/222?text=Glasses" },
    { id: "fallback-knit", name: "Knit Wears", items_count: 19, image_url: "https://placehold.co/640x760/f1f1f1/222?text=Knit+Wears" },
    { id: "fallback-bags", name: "Summer Bags", items_count: 32, image_url: "https://placehold.co/640x760/f1f1f1/222?text=Summer+Bags" },
    { id: "fallback-sneakers", name: "Sneakers", items_count: 6, image_url: "https://placehold.co/640x760/f1f1f1/222?text=Sneakers" },
  ]
}

export default HomePage
