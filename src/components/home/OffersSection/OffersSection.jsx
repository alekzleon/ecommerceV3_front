import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { addCartItem } from "../../../services/api/cartService"
import {
  getRandomPromotion,
  getRandomSixPromotions,
} from "../../../services/api/promotionsService"
import { useAuth } from "../../../context/AuthContext"
import { notifyError, notifySuccess, notifyWarning } from "../../../utils/toast"
import "./offerssection.css"

const PROMOTION_IMAGE_PLACEHOLDER = "https://monocromia.com.mx/cdn/shop/files/Monocromia-04_6366367b-3cd5-4942-89f0-62fac4475a07_2048x.jpg?v=1742501692"
const CART_SUMMARY_STORAGE_KEY = "pidefacil_cart_summary"

function OffersSection() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [dailyOffer, setDailyOffer] = useState(null)
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(getVisibleCount)
  const [startIndex, setStartIndex] = useState(0)
  const [addingOfferId, setAddingOfferId] = useState(null)

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true)
        const [randomResponse, randomSixResponse] = await Promise.all([
          getRandomPromotion(),
          getRandomSixPromotions(),
        ])

        setDailyOffer(randomResponse?.data ? normalizePromotion(randomResponse.data) : null)
        setOffers(normalizePromotions(randomSixResponse?.data || []))
        setStartIndex(0)
      } catch (error) {
        console.error("Error al cargar ofertas:", error?.response?.data || error)
        setDailyOffer(null)
        setOffers([])
      } finally {
        setLoading(false)
      }
    }

    loadOffers()
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const maxIndex = Math.max(offers.length - visibleCount, 0)
  const safeStartIndex = Math.min(startIndex, maxIndex)
  const visibleOffers = offers.slice(safeStartIndex, safeStartIndex + visibleCount)

  const goPrev = () => {
    setStartIndex((prev) => Math.max(prev - 1, 0))
  }

  const goNext = () => {
    setStartIndex((prev) => Math.min(prev + 1, maxIndex))
  }

  const syncCartSummary = (payload) => {
    const summary = {
      id: payload?.id ?? null,
      items_count: Number(payload?.items_count ?? 0),
      subtotal: Number(payload?.subtotal ?? 0),
      discount: Number(payload?.discount ?? 0),
      tax: Number(payload?.tax ?? 0),
      tax_breakdown: payload?.tax_breakdown ?? null,
      total: Number(payload?.total ?? 0),
    }

    localStorage.setItem(CART_SUMMARY_STORAGE_KEY, JSON.stringify(summary))
    window.dispatchEvent(new CustomEvent("cart:updated", { detail: summary }))
  }

  const handleAddOfferToCart = async (offer) => {
    if (!offer?.id || addingOfferId === offer.id) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    if (!offer.productId) {
      notifyWarning("Elige un producto de esta promoción para agregarlo al carrito.")
      navigate(getOfferUrl(offer))
      return
    }

    try {
      setAddingOfferId(offer.id)
      const response = await addCartItem({
        product_id: offer.productId,
        quantity: 1,
      })
      const cartSummary =
        response?.data?.cart ||
        response?.data?.summary ||
        response?.cart ||
        response?.summary ||
        response?.data

      if (cartSummary && typeof cartSummary === "object") {
        syncCartSummary(cartSummary)
      }

      notifySuccess(response?.message || "Producto agregado al carrito correctamente.")
    } catch (error) {
      notifyError(error?.response?.data?.message || "No fue posible agregar el producto al carrito.")
    } finally {
      setAddingOfferId(null)
    }
  }

  if (!loading && !dailyOffer && offers.length === 0) return null

  return (
    <section className="offers-section">
      <div className="container-main">
        <div className="offers-section__grid">
          <article className={`daily-offer-card ${loading ? "is-loading" : ""}`}>
            <div className="daily-offer-card__header">
              <h2 className="daily-offer-card__title">Oferta del día</h2>
            </div>

            {loading ? (
              <OfferSkeleton compact />
            ) : dailyOffer ? (
              <>
                <div className="daily-offer-card__image-wrap">
                  <img
                    src={dailyOffer.image}
                    alt={dailyOffer.title}
                    className="daily-offer-card__image"
                  />
                </div>

                <div className="daily-offer-card__body">
                  <span className="daily-offer-card__badge">{dailyOffer.label}</span>
                  <h3 className="daily-offer-card__product-title">{dailyOffer.title}</h3>
                  {dailyOffer.productName ? (
                    <p className="daily-offer-card__product-name">{dailyOffer.productName}</p>
                  ) : null}
                  <p className="daily-offer-card__extra">{dailyOffer.description}</p>
                  <div className="daily-offer-card__actions">
                    <Link to={getOfferUrl(dailyOffer)} className="offer-action offer-action--secondary">
                      Ver
                    </Link>
                    <button
                      type="button"
                      className="offer-action offer-action--primary"
                      onClick={() => handleAddOfferToCart(dailyOffer)}
                      disabled={addingOfferId === dailyOffer.id}
                    >
                      {addingOfferId === dailyOffer.id ? "Agregando..." : "Agregar al carrito"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="daily-offer-card__empty">Sin oferta disponible.</div>
            )}
          </article>

          <div className="offers-carousel-card">
            <div className="offers-carousel-card__header">
              <div className="offers-carousel-card__title-wrap">
                <h2 className="offers-carousel-card__title">Ofertas</h2>
                <Link to="/ofertas" className="offers-carousel-card__link">
                  Mostrar todas las ofertas
                </Link>
              </div>

              <div className="offers-carousel-card__controls">
                <button
                  type="button"
                  className="offers-carousel-card__arrow"
                  onClick={goPrev}
                  disabled={safeStartIndex === 0 || loading}
                  aria-label="Ver ofertas anteriores"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="offers-carousel-card__arrow"
                  onClick={goNext}
                  disabled={safeStartIndex >= maxIndex || loading}
                  aria-label="Ver más ofertas"
                >
                  ›
                </button>
              </div>
            </div>

            <div
              className="offers-carousel-card__track"
              style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}
            >
              {loading
                ? Array.from({ length: visibleCount }).map((_, index) => (
                  <OfferSkeleton key={index} />
                ))
                : visibleOffers.map((offer) => (
                  <article className="offer-item-card" key={offer.id}>
                    <div className="offer-item-card__image-wrap">
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="offer-item-card__image"
                      />
                    </div>

                    <div className="offer-item-card__body">
                      <span className="offer-item-card__discount">{offer.label}</span>
                      <h3 className="offer-item-card__title">{offer.title}</h3>
                      {offer.productName ? (
                        <div className="offer-item-card__product-name">{offer.productName}</div>
                      ) : null}

                      {offer.description ? (
                        <div className="offer-item-card__promo-text">{offer.description}</div>
                      ) : null}

                      <div className="offer-item-card__actions">
                        <Link to={getOfferUrl(offer)} className="offer-action offer-action--secondary">
                          Ver
                        </Link>
                        <button
                          type="button"
                          className="offer-action offer-action--primary"
                          onClick={() => handleAddOfferToCart(offer)}
                          disabled={addingOfferId === offer.id}
                        >
                          {addingOfferId === offer.id ? "..." : "Agregar"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function OfferSkeleton({ compact = false }) {
  return (
    <div className={`offer-skeleton ${compact ? "offer-skeleton--compact" : ""}`}>
      <div className="offer-skeleton__image" />
      <div className="offer-skeleton__line" />
      <div className="offer-skeleton__line is-short" />
    </div>
  )
}

function getVisibleCount() {
  if (typeof window === "undefined") return 4
  if (window.innerWidth <= 575) return 2
  if (window.innerWidth <= 767) return 2
  if (window.innerWidth <= 991) return 4
  return 4
}

function normalizePromotions(items = []) {
  return items.map(normalizePromotion)
}

function normalizePromotion(item = {}) {
  return {
    id: item?.id,
    title: item?.name || "Oferta disponible",
    slug: item?.slug || "",
    label: item?.label || formatPromotionType(item?.type),
    description: item?.description || "",
    image: normalizePromotionImage(item?.image_url || item?.image_path),
    productsCount: Number(item?.products_count || 0),
    typeLabel: formatPromotionType(item?.type),
    isFavorite: Boolean(item?.is_favorite),
    productId: getPromotionProductId(item),
    productName: getPromotionProductName(item),
    productSlug: getPromotionProductSlug(item),
    productIds: Array.isArray(item?.product_ids) ? item.product_ids : [],
    products: Array.isArray(item?.products) ? item.products : [],
  }
}

function getOfferUrl(offer) {
  if (offer?.productSlug) return `/producto/${offer.productSlug}`

  const params = new URLSearchParams()

  if (offer?.slug) {
    params.set("promotion", offer.slug)
  } else if (offer?.title) {
    params.set("search", offer.title)
  }

  return `/productos${params.toString() ? `?${params.toString()}` : ""}`
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

export default OffersSection
