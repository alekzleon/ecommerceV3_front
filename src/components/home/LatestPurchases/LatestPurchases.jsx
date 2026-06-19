import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toggleAccountFavorite } from "../../../services/api/accountService"
import { getRecentPurchases } from "../../../services/api/productService"
import { useAuth } from "../../../context/AuthContext"
import { notifyError, notifySuccess } from "../../../utils/toast"
import { normalizeMediaUrl } from "../../../utils/mediaUrl"
import { getRecentSearchTerms } from "../../../utils/recentSearchTerms"
import "./latestpurchases.css"

const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"
const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"
const RECENT_PURCHASES_LIMIT = 10

function LatestPurchases() {
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(getVisibleCount)
  const [startIndex, setStartIndex] = useState(0)
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null)

  useEffect(() => {
    if (!sessionReady) return undefined

    let isMounted = true

    const fetchProducts = async () => {
      try {
        setLoading(true)
        const searchTerms = getRecentSearchTerms()
        const response = await getRecentPurchases({
          limit: RECENT_PURCHASES_LIMIT,
          search_terms: searchTerms.join(","),
        })

        if (!isMounted) return

        setProducts(normalizeProducts(response?.data || []))
        setStartIndex(0)
      } catch (error) {
        if (!isMounted) return

        console.error("Error al cargar últimos productos:", error?.response?.data || error)
        notifyError(error?.response?.data?.message || "No fue posible cargar los productos recientes.")
        setProducts([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      isMounted = false
    }
  }, [sessionReady])

  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const maxIndex = Math.max(products.length - visibleCount, 0)
  const safeStartIndex = Math.min(startIndex, maxIndex)
  const visibleProducts = products.slice(safeStartIndex, safeStartIndex + visibleCount)
  const canShowPrices = sessionReady && isAuthenticated

  const goPrev = () => {
    setStartIndex((prev) => Math.max(prev - visibleCount, 0))
  }

  const goNext = () => {
    setStartIndex((prev) => Math.min(prev + visibleCount, maxIndex))
  }

  const handleToggleFavorite = async (product) => {
    if (!product?.id || favoriteLoadingId === product.id) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    const previousProducts = products

    try {
      setFavoriteLoadingId(product.id)
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, isFavorite: !item.isFavorite } : item
        )
      )

      const response = await toggleAccountFavorite(product.id)
      const isFavorite = Boolean(response?.data?.is_favorite)

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, isFavorite } : item
        )
      )
      notifySuccess(response?.message || (isFavorite ? "Producto agregado a favoritos." : "Producto eliminado de favoritos."))
    } catch (error) {
      setProducts(previousProducts)
      notifyError(error?.response?.data?.message || "No fue posible actualizar favoritos.")
    } finally {
      setFavoriteLoadingId(null)
    }
  }

  return (
    <section className="latest-purchases">
      <div className="container-main">
        <div className="latest-purchases__wrapper">
          <div className="latest-purchases__header">
            <h2 className="latest-purchases__title">Tus últimas compras</h2>

            <div className="latest-purchases__controls">
              <button
                type="button"
                className="latest-purchases__arrow"
                onClick={goPrev}
                disabled={safeStartIndex === 0 || loading}
                aria-label="Ver productos anteriores"
              >
                ‹
              </button>

              <button
                type="button"
                className="latest-purchases__arrow"
                onClick={goNext}
                disabled={safeStartIndex >= maxIndex || loading}
                aria-label="Ver más productos"
              >
                ›
              </button>
            </div>
          </div>

          {loading ? (
            <div
              className="latest-purchases__track"
              style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: visibleCount }).map((_, index) => (
                <div className="purchase-card purchase-card--loading" key={index}>
                  <div className="purchase-card__image-wrap" />
                  <div className="purchase-card__skeleton-line" />
                  <div className="purchase-card__skeleton-line is-short" />
                </div>
              ))}
            </div>
          ) : products.length ? (
            <div
              className="latest-purchases__track"
              style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}
            >
              {visibleProducts.map((product) => (
                <article
                  className="purchase-card"
                  key={product.id}
                >
                  <button
                    type="button"
                    className={`purchase-card__favorite ${product.isFavorite ? "is-active" : ""}`}
                    onClick={() => handleToggleFavorite(product)}
                    disabled={!sessionReady || favoriteLoadingId === product.id}
                    aria-label={product.isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                    aria-pressed={product.isFavorite}
                  >
                    <i className={`bi ${product.isFavorite ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
                  </button>

                  <Link className="purchase-card__image-wrap" to={`/producto/${product.slug}`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="purchase-card__image"
                    />
                  </Link>

                  <div className="purchase-card__body">
                    <Link className="purchase-card__title-link" to={`/producto/${product.slug}`}>
                      <h3 className="purchase-card__title">{product.name}</h3>
                    </Link>

                    {canShowPrices && product.hasAvailablePrice ? (
                      <>
                        <div className="purchase-card__old-price">
                          {product.oldPrice}
                        </div>

                        <div className="purchase-card__price-row">
                          <span className="purchase-card__price">{product.price}</span>
                          {product.discount ? (
                            <span className="purchase-card__discount">
                              {product.discount}
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="purchase-card__price-login">
                        {canShowPrices ? "Precio no disponible" : "Inicia sesión para ver precios"}
                      </div>
                    )}

                    <div className="purchase-card__tags">
                      {product.tags.map((tag) => (
                        <span className="purchase-card__tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="latest-purchases__empty">
              No encontramos productos recientes por el momento.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function getVisibleCount() {
  if (typeof window === "undefined") return 6
  if (window.innerWidth <= 575) return 2
  if (window.innerWidth <= 767) return 2
  if (window.innerWidth <= 991) return 3
  if (window.innerWidth <= 1199) return 4
  return 6
}

function normalizeProducts(items = []) {
  return items.map((item) => {
    const price = Number(item?.default_price ?? 0)
    const priceInfo = item?.price_info ?? null
    const activePromotions = Array.isArray(item?.active_promotions)
      ? item.active_promotions
      : []
    const mainPromotion = activePromotions[0] || null
    const promotionMessage =
      mainPromotion?.message ||
      mainPromotion?.label ||
      mainPromotion?.name ||
      ""

    return {
      id: item?.id ?? null,
      name: item?.name ?? "Producto sin nombre",
      slug: item?.slug ?? "",
      image: normalizeProductImage(item?.image_url || item?.image_path),
      oldPrice: "",
      price: formatMoney(price),
      priceInfo,
      hasAvailablePrice: price > 0 && priceInfo?.source !== PRICE_UNAVAILABLE_SOURCE,
      discount: promotionMessage,
      isFavorite: Boolean(item?.is_favorite),
      tags: [
        item?.brand ? String(item.brand) : "",
      ].filter(Boolean),
    }
  })
}

function normalizeProductImage(value) {
  const image = String(value || "").trim()

  if (!image) return PRODUCT_IMAGE_PLACEHOLDER

  const nestedUrlMatch = image.match(/https?:\/\/.+?(https?:\/\/.+)$/)

  if (nestedUrlMatch?.[1]) {
    return nestedUrlMatch[1]
  }

  return normalizeMediaUrl(image) || PRODUCT_IMAGE_PLACEHOLDER
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default LatestPurchases
