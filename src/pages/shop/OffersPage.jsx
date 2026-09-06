import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import ProductListSkeleton from "../../components/product/ProductListSkeleton/ProductListSkeleton"
import { getAllPromotions } from "../../services/api/promotionsService"
import { useSettings } from "../../context/SettingsContext"
import { notifyError } from "../../utils/toast"
import "./offerspage.css"

const OFFERS_PER_PAGE = 24
const PROMOTION_IMAGE_PLACEHOLDER = "https://monocromia.com.mx/cdn/shop/files/Monocromia-04_6366367b-3cd5-4942-89f0-62fac4475a07_2048x.jpg?v=1742501692"

function OffersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { settings } = useSettings()
  const page = Number(searchParams.get("page")) || 1

  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeOfferIndex, setActiveOfferIndex] = useState(0)
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: OFFERS_PER_PAGE,
    total: 0,
  })

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true)
        const response = await getAllPromotions({
          page,
          per_page: OFFERS_PER_PAGE,
        })

        setOffers(normalizePromotions(response?.data || []))
        setMeta({
          current_page: response?.meta?.current_page ?? 1,
          last_page: response?.meta?.last_page ?? 1,
          per_page: response?.meta?.per_page ?? OFFERS_PER_PAGE,
          total: response?.meta?.total ?? 0,
        })
      } catch (error) {
        console.error("Error al cargar ofertas:", error?.response?.data || error)
        notifyError(error?.response?.data?.message || "No fue posible cargar las ofertas.")
        setOffers([])
      } finally {
        setLoading(false)
      }
    }

    loadOffers()
  }, [page])

  useEffect(() => {
    setActiveOfferIndex(0)
  }, [page])

  const handlePageChange = (nextPage) => {
    const nextParams = new URLSearchParams(searchParams)

    if (nextPage <= 1) {
      nextParams.delete("page")
    } else {
      nextParams.set("page", String(nextPage))
    }

    setSearchParams(nextParams, { replace: true })
  }

  const isEditorialShop = settings.storefront?.active_template === "editorial_shop"

  return (
    <section className={`offers-page ${isEditorialShop ? "offers-page--editorial" : ""}`}>
      <div className="container-main">
        {!isEditorialShop ? (
          <div className="offers-page__top">
            <div>
              <p className="offers-page__breadcrumbs">Inicio &gt; Ofertas</p>
              <h1 className="offers-page__title">Ofertas</h1>
              <p className="offers-page__results">{meta.total} promoción(es) vigente(s)</p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <ProductListSkeleton count={8} />
        ) : offers.length ? (
          <>
            {isEditorialShop ? (
              <EditorialOffersShowcase
                offers={offers}
                activeIndex={activeOfferIndex}
                onActiveIndexChange={setActiveOfferIndex}
              />
            ) : (
              <div className="offers-page__grid">
                {offers.map((offer) => {
                  const hasMultipleProducts = hasMultipleOfferProducts(offer)

                  return (
                  <article className="offers-page__card" key={offer.id}>
                    <div className="offers-page__card-media">
                      <img loading="lazy" src={offer.image} alt={offer.title} />
                    </div>

                    <div className="offers-page__card-body">
                      <span className="offers-page__badge">{offer.label}</span>
                      <h2>{offer.title}</h2>
                      {offer.productName ? (
                        <h3 className="offers-page__product-name">{offer.productName}</h3>
                      ) : null}
                      {offer.description ? <p>{offer.description}</p> : null}
                      <div className="offers-page__meta">
                        <span>{offer.productsCount} producto(s)</span>
                        <strong>{offer.typeLabel}</strong>
                      </div>
                      <div className="offers-page__actions">
                        <Link to={getOfferUrl(offer)} className="offers-page__action offers-page__action--primary">
                          {hasMultipleProducts ? "Ver productos" : "Ver detalle"}
                        </Link>
                      </div>
                    </div>
                  </article>
                  )
                })}
              </div>
            )}

            {meta.last_page > 1 ? (
              <div className="offers-page__pagination">
                <button
                  type="button"
                  className="offers-page__page-btn"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </button>

                {Array.from({ length: meta.last_page }).map((_, index) => {
                  const pageNumber = index + 1

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`offers-page__page-number ${page === pageNumber ? "is-active" : ""}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  )
                })}

                <button
                  type="button"
                  className="offers-page__page-btn"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === meta.last_page}
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="offers-page__empty">
            <h2>No hay ofertas vigentes</h2>
            <p>Cuando haya promociones activas las verás en esta sección.</p>
            <Link to="/productos" className="offers-page__empty-action">
              Ver productos
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function EditorialOffersShowcase({ offers = [], activeIndex, onActiveIndexChange }) {
  const activeOffer = offers[activeIndex] || offers[0]
  const visibleOffers = getVisibleEditorialOffers(offers, activeIndex)
  const hasMultipleProducts = hasMultipleOfferProducts(activeOffer)

  const goToPrevious = () => {
    onActiveIndexChange(activeIndex === 0 ? offers.length - 1 : activeIndex - 1)
  }

  const goToNext = () => {
    onActiveIndexChange(activeIndex >= offers.length - 1 ? 0 : activeIndex + 1)
  }

  if (!activeOffer) return null

  return (
    <div className="editorial-offers-showcase">
      <div className="editorial-offers-showcase__media">
        <button
          type="button"
          className="editorial-offers-showcase__arrow editorial-offers-showcase__arrow--prev"
          onClick={goToPrevious}
          aria-label="Promoción anterior"
        >
          ‹
        </button>

        {visibleOffers.map(({ offer, sourceIndex }, imageIndex) => (
          <button
            type="button"
            className={`editorial-offers-showcase__panel ${sourceIndex === activeIndex ? "is-active" : ""}`}
            key={`${offer.id}-${imageIndex}`}
            onClick={() => onActiveIndexChange(sourceIndex)}
            aria-label={`Ver promoción ${offer.title}`}
          >
            <img loading="lazy" src={offer.image} alt={offer.productName || offer.title} />
          </button>
        ))}

        <button
          type="button"
          className="editorial-offers-showcase__arrow editorial-offers-showcase__arrow--next"
          onClick={goToNext}
          aria-label="Promoción siguiente"
        >
          ›
        </button>

        <div className="editorial-offers-showcase__info">
          <span>{activeOffer.label}</span>
          <h1>{hasMultipleProducts ? activeOffer.title : activeOffer.productName || activeOffer.title}</h1>
          {activeOffer.price > 0 ? <p>{formatMoney(activeOffer.price)}</p> : null}
          {activeOffer.description ? <small>{activeOffer.description}</small> : null}
          <Link to={getOfferUrl(activeOffer)}>
            {hasMultipleProducts ? "Ver productos" : "Ver detalle"}
          </Link>
        </div>
      </div>
    </div>
  )
}

function getVisibleEditorialOffers(offers = [], activeIndex = 0) {
  if (!offers.length) return []

  if (offers.length === 1) {
    return Array.from({ length: 3 }).map((_, index) => ({
      offer: offers[0],
      sourceIndex: 0,
      key: index,
    }))
  }

  return [-1, 0, 1].map((offset) => {
    const sourceIndex = (activeIndex + offset + offers.length) % offers.length

    return {
      offer: offers[sourceIndex],
      sourceIndex,
    }
  })
}

function normalizePromotions(items = []) {
  return items.map((item) => {
    const products = normalizePromotionProducts(item)
    const productsCount = getPromotionProductsCount(item, products)
    const hasMultipleProducts = productsCount > 1

    return {
      id: item?.id,
      title: item?.name || "Oferta disponible",
      slug: item?.slug || "",
      label: item?.label || formatPromotionType(item?.type),
      description: item?.description || "",
      image: normalizePromotionImage(item?.image_url || item?.image_path),
      productsCount,
      typeLabel: formatPromotionType(item?.type),
      isFavorite: Boolean(item?.is_favorite),
      productId: hasMultipleProducts ? null : getPromotionProductId(item),
      productName: hasMultipleProducts ? "" : getPromotionProductName(item),
      productSlug: hasMultipleProducts ? "" : getPromotionProductSlug(item),
      price: hasMultipleProducts ? 0 : getPromotionProductPrice(item),
      stock: hasMultipleProducts ? null : getPromotionProductStock(item),
      stockStatus: hasMultipleProducts ? "untracked" : getPromotionProductStockStatus(item),
      stockMessage: hasMultipleProducts ? "" : getPromotionProductStockMessage(item),
      productIds: Array.isArray(item?.product_ids) ? item.product_ids : [],
      products,
    }
  })
}

function getOfferUrl(offer) {
  if (!hasMultipleOfferProducts(offer) && offer?.productSlug) return `/producto/${offer.productSlug}`

  if (hasMultipleOfferProducts(offer) && (offer?.slug || offer?.id)) {
    return `/ofertas/${encodeURIComponent(offer.slug || offer.id)}/productos`
  }

  const params = new URLSearchParams()

  if (offer?.slug) {
    params.set("promotion", offer.slug)
  } else if (offer?.title) {
    params.set("search", offer.title)
  }

  return `/productos${params.toString() ? `?${params.toString()}` : ""}`
}

function hasMultipleOfferProducts(offer = {}) {
  return Number(offer?.productsCount || 0) > 1 || getOfferSelectableProducts(offer).length > 1
}

function getOfferSelectableProducts(offer = {}) {
  return Array.isArray(offer?.products)
    ? offer.products.filter((product) => product?.slug)
    : []
}

function normalizePromotionProducts(item = {}) {
  const products = Array.isArray(item?.products) ? item.products : []

  return products.map((product) => ({
    id: product?.id ?? null,
    name: product?.name || "Producto sin nombre",
    slug: product?.slug || "",
    image: normalizePromotionImage(product?.image_url || product?.image_path || product?.image),
    price: Number(product?.final_price || product?.default_price || product?.price || 0),
    stock: product?.stock ?? null,
    stockStatus: product?.stock_status || product?.stockStatus || "untracked",
    stockMessage: product?.stock_message || product?.stockMessage || "",
  }))
}

function getPromotionProductsCount(item = {}, products = []) {
  const explicitCount = Number(item?.products_count || 0)

  if (explicitCount > 0) return explicitCount
  if (products.length > 0) return products.length
  if (getPromotionProductId(item)) return 1

  return 0
}

function getPromotionProductId(item = {}) {
  return (
    item?.product_id ||
    item?.product?.id ||
    item?.products?.[0]?.id ||
    item?.product_ids?.[0] ||
    item?.config?.product_id ||
    item?.config?.target_product_id ||
    null
  )
}

function getPromotionProductSlug(item = {}) {
  return item?.product?.slug || item?.products?.[0]?.slug || ""
}

function getPromotionProductName(item = {}) {
  return item?.product?.name || item?.products?.[0]?.name || ""
}

function getPromotionProductPrice(item = {}) {
  return Number(
    item?.product?.final_price ||
      item?.product?.default_price ||
      item?.products?.[0]?.final_price ||
      item?.products?.[0]?.default_price ||
      item?.final_price ||
      item?.default_price ||
      0
  )
}

function getPromotionProductStock(item = {}) {
  return item?.stock ?? item?.product?.stock ?? item?.products?.[0]?.stock ?? null
}

function getPromotionProductStockStatus(item = {}) {
  return (
    item?.stock_status ||
    item?.stockStatus ||
    item?.product?.stock_status ||
    item?.product?.stockStatus ||
    item?.products?.[0]?.stock_status ||
    item?.products?.[0]?.stockStatus ||
    "untracked"
  )
}

function getPromotionProductStockMessage(item = {}) {
  return (
    item?.stock_message ||
    item?.stockMessage ||
    item?.product?.stock_message ||
    item?.product?.stockMessage ||
    item?.products?.[0]?.stock_message ||
    item?.products?.[0]?.stockMessage ||
    ""
  )
}

function normalizePromotionImage(value) {
  const image = String(value || "").trim()

  if (!image) return PROMOTION_IMAGE_PLACEHOLDER

  const nestedUrlMatch = image.match(/https?:\/\/.+?(https?:\/\/.+)$/)
  const cleanImage = nestedUrlMatch?.[1] || image
  const mediaBaseUrl = getMediaBaseUrl()

  if (/^https?:\/\//i.test(cleanImage)) {
    try {
      const parsedUrl = new URL(cleanImage)
      return `${mediaBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    } catch {
      return cleanImage
    }
  }

  return `${mediaBaseUrl}/${cleanImage.replace(/^\/+/, "")}`
}

function getMediaBaseUrl() {
  return String(
    import.meta.env.VITE_MEDIA_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      ""
  )
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/+$/, "")
}

function formatPromotionType(type) {
  const labels = {
    bundle_pay_x_take_y: "Lleva X y paga Y",
    buy_x_get_y: "Compra X y llévate Y",
    buy_x_get_discount: "Compra X y obtén descuento",
    direct_percentage: "Descuento directo",
    strikethrough_price: "Precio especial",
  }

  if (labels[type]) return labels[type]

  return String(type || "Promoción")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default OffersPage
