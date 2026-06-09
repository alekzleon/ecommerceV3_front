import { useEffect, useMemo, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { getProductDetail } from "../../services/api/productService"
import { addCartItem } from "../../services/api/cartService"
import { toggleAccountFavorite } from "../../services/api/accountService"
import { useAuth } from "../../context/AuthContext"
import { notifySuccess, notifyError } from "../../utils/toast"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import "./productdetailpage.css"

const CART_SUMMARY_STORAGE_KEY = "pidefacil_cart_summary"
const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"

function ProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()

  const [productData, setProductData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFavorite, setTogglingFavorite] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [selectedAttributeValueIds, setSelectedAttributeValueIds] = useState({})

  const product = useMemo(() => {
    if (!productData) return null

    const mainImage = normalizeMediaUrl(productData.image_url || productData.image_path)
    const galleryItems = Array.isArray(productData.gallery)
      ? productData.gallery
          .filter((item) => Boolean(item.is_active ?? true))
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
          .map((item) => ({
            id: `gallery-${item.id}`,
            type: item.media_type || "image",
            url: normalizeMediaUrl(item.media_url || item.media_path),
            title: item.title || productData.name,
          }))
          .filter((item) => item.url)
      : []
    const mediaItems = [
      ...(mainImage
        ? [
            {
              id: "main-image",
              type: "image",
              url: mainImage,
              title: productData.name,
            },
          ]
        : []),
      ...galleryItems,
    ].filter((item, index, items) => {
      return items.findIndex((candidate) => candidate.url === item.url) === index
    })
    const variants = Array.isArray(productData.variants)
      ? productData.variants
          .filter((variant) => Boolean(variant.is_active ?? true))
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      : []
    const variantOptions =
      Array.isArray(productData.variant_attributes) &&
      Array.isArray(productData.variant_attribute_values)
        ? buildVariantOptionsFromAttributes(
            productData.variant_attributes,
            productData.variant_attribute_values
          )
        : Array.isArray(productData.variant_options)
        ? normalizeVariantOptions(productData.variant_options)
        : buildVariantOptions(variants)
    const defaultPrice = Number(productData.default_price || 0)

    return {
      id: productData.id,
      name: productData.name,
      slug: productData.slug,
      brand: productData.brand || "Sin marca",
      sku: productData.sku || "",
      image: mainImage,
      mediaItems,
      images: mediaItems.filter((item) => item.type === "image").map((item) => item.url),
      price: defaultPrice,
      oldPrice: defaultPrice,
      priceInfo: productData.price_info ?? null,
      discountLabel: "",
      category: productData.category?.name || "Productos",
      family: productData.family?.name || "",
      shortDescription:
        productData.short_description ||
        "Producto ideal para negocio, hogar o compra por volumen.",
      description:
        productData.description ||
        "Este producto forma parte del catálogo base del ecommerce.",
      descriptionHtml: sanitizeDescriptionHtml(
        productData.description ||
          "Este producto forma parte del catálogo base del ecommerce."
      ),
      activePromotions: Array.isArray(productData.active_promotions)
        ? productData.active_promotions
        : [],
      variants,
      variantOptions,
      technicalSpecs: [
        { label: "Marca", value: productData.brand || "Sin marca" },
        { label: "SKU", value: productData.sku || "N/D" },
        { label: "Categoría", value: productData.category?.name || "N/D" },
        { label: "Familia", value: productData.family?.name || "N/D" },
        { label: "Microsip", value: productData.microsip_id || "N/D" },
        { label: "Keyword", value: productData.keyword || "N/D" },
        { label: "Estado", value: productData.is_active ? "Activo" : "Inactivo" },
      ],
      rating: 4.8,
      sold: "Alta rotación",
      badges: [],
      isFavorite: Boolean(productData.is_favorite),
    }
  }, [productData])

  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null

    return product.variants.find((variant) => Number(variant.id) === Number(selectedVariantId)) || null
  }, [product, selectedVariantId])
  const displayPrice = Number(product?.price ?? 0)
  const comparePrice = Number(product?.oldPrice ?? 0)
  const selectedVariantStock = selectedVariant?.stock
  const canShowPrices = sessionReady && isAuthenticated
  const hasAvailablePrice =
    displayPrice > 0 && product?.priceInfo?.source !== PRICE_UNAVAILABLE_SOURCE

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const response = await getProductDetail(slug)
        setProductData(response.data)
        setIsFavorite(Boolean(response.data?.is_favorite))
      } catch (error) {
        console.error(error)
        setProductData(null)
        setIsFavorite(false)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slug])

  useEffect(() => {
    if (product?.mediaItems?.length) {
      setActiveMediaIndex(0)
      setLightboxIndex(0)
    }
  }, [product])

  useEffect(() => {
    if (!product?.variants?.length) {
      setSelectedVariantId(null)
      setSelectedAttributeValueIds({})
      return
    }

    const firstVariant = product.variants[0]
    setSelectedVariantId(firstVariant.id)
    setSelectedAttributeValueIds(buildSelectedMapFromVariant(firstVariant))
  }, [product])

  const increaseQty = () => setQuantity((prev) => prev + 1)
  const decreaseQty = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1))

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

  const handleAddToCart = async () => {
    if (!product?.id || addingToCart) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    if (!hasAvailablePrice) {
      notifyError("Precio no disponible para este producto.")
      return
    }

    try {
      setAddingToCart(true)
      const payload = {
        product_id: product.id,
        quantity,
        ...(selectedVariant?.id ? { product_variant_id: selectedVariant.id } : {}),
      }
      const response = await addCartItem(payload)
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
      notifyError(
        error?.response?.data?.message || "No fue posible agregar el producto al carrito."
      )
    } finally {
      setAddingToCart(false)
    }
  }

  const handleVariantOptionSelect = (attributeId, valueId) => {
    const nextSelected = {
      ...selectedAttributeValueIds,
      [attributeId]: valueId,
    }
    const nextVariant = findVariantForSelection(product.variants, Object.values(nextSelected))

    setSelectedAttributeValueIds(nextSelected)

    if (nextVariant) {
      setSelectedVariantId(nextVariant.id)
      setSelectedAttributeValueIds(buildSelectedMapFromVariant(nextVariant))
    } else {
      setSelectedVariantId(null)
    }
  }

  const handleToggleFavorite = async () => {
    if (!product?.id || togglingFavorite) return

    if (!isAuthenticated) {
      navigate("/login")
      return
    }

    const previousFavorite = isFavorite
    const nextFavorite = !previousFavorite

    try {
      setTogglingFavorite(true)
      setIsFavorite(nextFavorite)

      const response = await toggleAccountFavorite(product.id)
      const favoriteFromApi = Boolean(response?.data?.is_favorite)

      setIsFavorite(favoriteFromApi)
      notifySuccess(
        response?.message ||
          (favoriteFromApi ? "Producto agregado a favoritos." : "Producto eliminado de favoritos.")
      )
    } catch (error) {
      setIsFavorite(previousFavorite)
      notifyError(error?.response?.data?.message || "No fue posible actualizar favoritos.")
    } finally {
      setTogglingFavorite(false)
    }
  }

  const handleMouseMove = (e) => {
    if (window.innerWidth < 992) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZoomPosition({ x, y })
  }

  const openLightbox = (index = 0) => {
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  const goPrevLightbox = () => {
    setLightboxIndex((prev) =>
      prev === 0 ? product.mediaItems.length - 1 : prev - 1
    )
  }

  const goNextLightbox = () => {
    setLightboxIndex((prev) =>
      prev === product.mediaItems.length - 1 ? 0 : prev + 1
    )
  }

  if (loading) {
    return (
      <section className="product-detail-page">
        <div className="container-main">
          <div className="product-detail-page__not-found">
            <h1>Cargando producto...</h1>
          </div>
        </div>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="product-detail-page">
        <div className="container-main">
          <div className="product-detail-page__not-found">
            <h1>Producto no encontrado</h1>
            <p>El producto que intentas ver no existe o ya no está disponible.</p>
            <Link to="/productos" className="product-detail__primary-btn">
              Volver a productos
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const activeMedia = product.mediaItems[activeMediaIndex] || product.mediaItems[0]

  return (
    <section className="product-detail-page">
      <div className="container-main">
        <div className="product-detail-page__breadcrumbs">
          Inicio &gt; Productos &gt; {product.category} &gt; {product.name}
        </div>

        <div className="shop-product-detail">
          <div className="product-detail__gallery-card">
            <div className="product-detail__gallery">
              <div className="product-detail__thumbs">
                {product.mediaItems.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    className={`product-detail__thumb ${
                      activeMediaIndex === index ? "is-active" : ""
                    }`}
                    onClick={() => {
                      setActiveMediaIndex(index)
                      setLightboxIndex(index)
                    }}
                  >
                    {media.type === "video" ? (
                      <>
                        <video src={media.url} muted />
                        <span className="product-detail__thumb-play">▶</span>
                      </>
                    ) : (
                      <img src={media.url} alt={`${product.name} ${index + 1}`} />
                    )}
                  </button>
                ))}
              </div>

              <div
                className={`product-detail__main-image ${isZoomed ? "is-zoomed" : ""}`}
                onMouseEnter={() => {
                  if (window.innerWidth >= 992) setIsZoomed(true)
                }}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
                onClick={() =>
                  openLightbox(activeMediaIndex)
                }
              >
                {activeMedia?.type === "video" ? (
                  <video src={activeMedia.url} controls />
                ) : (
                  <img
                    src={activeMedia?.url}
                    alt={product.name}
                    style={{
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="product-detail__info-card">
            <div className="product-detail__topline">
              <span className="product-detail__category">{product.category}</span>
              <button
                type="button"
                className={`product-detail__favorite ${isFavorite ? "is-active" : ""}`}
                onClick={handleToggleFavorite}
                disabled={togglingFavorite || !sessionReady}
                aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                aria-pressed={isFavorite}
              >
                <i className={`bi ${isFavorite ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
              </button>
            </div>

            {product.badges?.length ? (
              <div className="product-detail__badges">
                {product.badges.map((badge) => (
                  <span
                    key={badge}
                    className={`product-detail__badge product-detail__badge--${badge.toLowerCase()}`}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}

            <h1 className="product-detail__title">{product.name}</h1>

            <div className="product-detail__meta-row">
              <span className="product-detail__brand">Marca: {product.brand}</span>
              {product.family ? <span>{product.family}</span> : null}
              <span>{product.sku ? `SKU base: ${product.sku}` : "Sin SKU base"}</span>
            </div>

            <div className="product-detail__price-block">
              {canShowPrices && hasAvailablePrice ? (
                <>
                  {comparePrice > displayPrice ? (
                    <div className="product-detail__old-price">
                      ${comparePrice.toLocaleString("es-MX")}
                    </div>
                  ) : null}

                  <div className="product-detail__price-row">
                    <span className="product-detail__price">
                      ${displayPrice.toLocaleString("es-MX")}
                    </span>
                    <span className="product-detail__discount">{product.discountLabel}</span>
                  </div>
                </>
              ) : (
                <div className="product-detail__price-login">
                  {canShowPrices ? "Precio no disponible" : "Inicia sesión para ver precios"}
                </div>
              )}
              {selectedVariant ? (
                <div className="product-detail__variant-summary">
                  <span>{selectedVariant.name || selectedVariant.sku}</span>
                  <span>SKU: {selectedVariant.sku}</span>
                  {selectedVariantStock !== null && selectedVariantStock !== undefined ? (
                    <span>{Number(selectedVariantStock) > 0 ? `${selectedVariantStock} disponibles` : "Sin stock"}</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {product.variantOptions.length ? (
              <div className="product-detail__variants-box">
                <h3 className="product-detail__box-title">Presentación</h3>
                {product.variantOptions.map((option) => (
                  <div className="product-detail__variant-option" key={option.attribute.id}>
                    <div className="product-detail__variant-option-title">
                      {option.attribute.name}
                    </div>
                    <div className="product-detail__variant-values">
                      {option.values.map((value) => {
                        const selected = Number(selectedAttributeValueIds[option.attribute.id]) === Number(value.id)
                        const available = isVariantValueAvailable(
                          product.variants,
                          selectedAttributeValueIds,
                          option.attribute.id,
                          value.id
                        )

                        return (
                          <button
                            type="button"
                            key={value.id}
                            className={`product-detail__variant-value ${selected ? "is-selected" : ""}`}
                            onClick={() => handleVariantOptionSelect(option.attribute.id, value.id)}
                            disabled={!available}
                          >
                            {value.metadata?.hex ? (
                              <span
                                className="product-detail__variant-swatch"
                                style={{ backgroundColor: value.metadata.hex }}
                              />
                            ) : null}
                            {value.value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : product.variants.length ? (
              <div className="product-detail__variants-box">
                <h3 className="product-detail__box-title">Presentación</h3>
                <div className="product-detail__variant-card-list">
                  {product.variants.map((variant) => (
                    <button
                      type="button"
                      key={variant.id}
                      className={`product-detail__variant-card ${
                        Number(selectedVariantId) === Number(variant.id) ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedVariantId(variant.id)
                        setSelectedAttributeValueIds(buildSelectedMapFromVariant(variant))
                      }}
                    >
                      <strong>{variant.name || variant.sku}</strong>
                      <span>{variant.sku}</span>
                      {canShowPrices && hasAvailablePrice ? (
                        <small>${displayPrice.toLocaleString("es-MX")}</small>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="product-detail__purchase-box">
              <div className="product-detail__qty-row">
                <span className="product-detail__qty-label">Cantidad</span>

                <div className="product-detail__qty-control">
                  <button type="button" onClick={decreaseQty}>
                    −
                  </button>
                  <span>{quantity}</span>
                  <button type="button" onClick={increaseQty}>
                    +
                  </button>
                </div>
              </div>

              <div className="product-detail__actions">
                {!sessionReady ? (
                  <button type="button" className="product-detail__primary-btn" disabled>
                    Cargando...
                  </button>
                ) : isAuthenticated ? (
                  <button
                    type="button"
                    className="product-detail__primary-btn"
                    onClick={handleAddToCart}
                    disabled={
                      addingToCart ||
                      !hasAvailablePrice ||
                      (product.variants.length > 0 && !selectedVariant) ||
                      Number(selectedVariantStock ?? 1) <= 0
                    }
                  >
                    {addingToCart
                      ? "Agregando..."
                      : hasAvailablePrice
                      ? "Agregar al carrito"
                      : "Precio no disponible"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="product-detail__primary-btn"
                    onClick={() => navigate("/login")}
                  >
                    Inicia sesión para comprar
                  </button>
                )}

                <button type="button" className="product-detail__secondary-btn">
                  Agregar a una lista
                </button>
              </div>
            </div>

            <div className="product-detail__promo-box">
              <h3 className="product-detail__box-title">Promociones</h3>
              <ul className="product-detail__promo-list">
                {product.activePromotions.length > 0 ? (
                  product.activePromotions.map((promotion) => (
                    <li key={promotion.id}>
                      <span className="product-detail__promo-icon">%</span>
                      <span>
                        <strong>{promotion.message || promotion.name}</strong>
                        {promotion.description ? (
                          <small>{promotion.description}</small>
                        ) : null}
                      </span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span className="product-detail__promo-icon">%</span>
                    <span>Este producto no tiene promociones activas por el momento.</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="product-detail__scale">
              <h3 className="product-detail__box-title">Información de compra</h3>
              <div className="product-detail__specs">
                <div className="product-detail__spec-row">
                  <span>Promociones activas</span>
                  <strong>{productData.has_active_promotions ? productData.active_promotions_count || product.activePromotions.length : 0}</strong>
                </div>
                <div className="product-detail__spec-row">
                  <span>Variante seleccionada</span>
                  <strong>{selectedVariant ? selectedVariant.name || selectedVariant.sku : "Producto base"}</strong>
                </div>
                <div className="product-detail__spec-row">
                  <span>Aplica promociones</span>
                  <strong>{selectedVariant ? (selectedVariant.applies_promotions ? "Sí" : "No") : "Sí"}</strong>
                </div>
              </div>
            </div>

            <div className="product-detail__content-section">
              <h2>Descripción</h2>
              <p>{product.shortDescription}</p>
              <div
                className="product-detail__html-description"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </div>

            <div className="product-detail__content-section">
              <h2>Ficha técnica</h2>
              <div className="product-detail__specs">
                {product.technicalSpecs.map((spec) => (
                  <div className="product-detail__spec-row" key={spec.label}>
                    <span>{spec.label}</span>
                    <strong>{spec.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <div className="product-lightbox" onClick={closeLightbox}>
          <div
            className="product-lightbox__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="product-lightbox__close"
              onClick={closeLightbox}
              aria-label="Cerrar vista completa"
            >
              ×
            </button>

            {product.mediaItems.length > 1 && (
              <>
                <button
                  type="button"
                  className="product-lightbox__nav product-lightbox__nav--prev"
                  onClick={goPrevLightbox}
                  aria-label="Imagen anterior"
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="product-lightbox__nav product-lightbox__nav--next"
                  onClick={goNextLightbox}
                  aria-label="Imagen siguiente"
                >
                  ›
                </button>
              </>
            )}

            <div className="product-lightbox__image-wrap">
              {product.mediaItems[lightboxIndex]?.type === "video" ? (
                <video
                  src={product.mediaItems[lightboxIndex].url}
                  controls
                  className="product-lightbox__image"
                />
              ) : (
                <img
                  src={product.mediaItems[lightboxIndex]?.url}
                  alt={`${product.name} vista ${lightboxIndex + 1}`}
                  className="product-lightbox__image"
                />
              )}
            </div>

            {product.mediaItems.length > 1 && (
              <div className="product-lightbox__thumbs">
                {product.mediaItems.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    className={`product-lightbox__thumb ${
                      lightboxIndex === index ? "is-active" : ""
                    }`}
                    onClick={() => setLightboxIndex(index)}
                  >
                    {media.type === "video" ? (
                      <video src={media.url} muted />
                    ) : (
                      <img src={media.url} alt={`${product.name} miniatura ${index + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default ProductDetailPage

function buildVariantOptions(variants = []) {
  const optionMap = new Map()

  variants.forEach((variant) => {
    const values = Array.isArray(variant.attribute_values) ? variant.attribute_values : []

    values.forEach((attributeValue) => {
      const attribute = normalizeVariantAttribute(attributeValue)

      if (!attribute?.id) return

      if (!optionMap.has(attribute.id)) {
        optionMap.set(attribute.id, {
          attribute,
          values: new Map(),
        })
      }

      optionMap.get(attribute.id).values.set(attributeValue.id, attributeValue)
    })
  })

  return Array.from(optionMap.values()).map((option) => ({
    attribute: option.attribute,
    values: Array.from(option.values.values()),
  }))
}

function normalizeVariantOptions(options = []) {
  return options.map((option) => ({
    attribute: {
      id: option.id,
      name: option.name,
      slug: option.slug,
    },
    values: Array.isArray(option.values) ? option.values : [],
  }))
}

function buildVariantOptionsFromAttributes(attributes = [], values = []) {
  return attributes
    .filter((attribute) => Boolean(attribute.is_active ?? true))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((attribute) => ({
      attribute,
      values: values
        .filter((value) => {
          return (
            Number(value.variant_attribute_id) === Number(attribute.id) &&
            Boolean(value.is_active ?? true)
          )
        })
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    }))
    .filter((option) => option.values.length > 0)
}

function buildSelectedMapFromVariant(variant) {
  const selected = {}
  const values = Array.isArray(variant?.attribute_values) ? variant.attribute_values : []

  values.forEach((attributeValue) => {
    const attribute = normalizeVariantAttribute(attributeValue)
    const attributeId = attribute?.id || attributeValue.variant_attribute_id

    if (attributeId) {
      selected[attributeId] = attributeValue.id
    }
  })

  return selected
}

function findVariantForSelection(variants = [], selectedValueIds = []) {
  const selectedIds = selectedValueIds.map(Number).filter(Boolean)

  return variants.find((variant) => {
    const variantIds = Array.isArray(variant.attribute_value_ids)
      ? variant.attribute_value_ids.map(Number)
      : []

    return selectedIds.every((valueId) => variantIds.includes(valueId))
  })
}

function isVariantValueAvailable(variants = [], selectedMap = {}, attributeId, valueId) {
  const nextSelectedIds = Object.entries({
    ...selectedMap,
    [attributeId]: valueId,
  })
    .map(([, selectedValueId]) => Number(selectedValueId))
    .filter(Boolean)

  return variants.some((variant) => {
    const variantIds = Array.isArray(variant.attribute_value_ids)
      ? variant.attribute_value_ids.map(Number)
      : []

    return nextSelectedIds.every((selectedValueId) => variantIds.includes(selectedValueId))
  })
}

function normalizeVariantAttribute(attributeValue = {}) {
  if (attributeValue.attribute?.id) return attributeValue.attribute

  if (attributeValue.variant_attribute?.id) return attributeValue.variant_attribute

  const id =
    attributeValue.variant_attribute_id ||
    attributeValue.attribute_id ||
    attributeValue.attribute?.id

  if (!id) return null

  return {
    id,
    name:
      attributeValue.attribute_name ||
      attributeValue.variant_attribute_name ||
      attributeValue.attribute?.name ||
      `Opción ${id}`,
    slug:
      attributeValue.attribute_slug ||
      attributeValue.variant_attribute_slug ||
      attributeValue.attribute?.slug ||
      `opcion-${id}`,
  }
}

function sanitizeDescriptionHtml(html = "") {
  const template = document.createElement("template")
  template.innerHTML = html

  template.content.querySelectorAll("script, iframe, object, embed").forEach((node) => {
    node.remove()
  })

  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value || ""

      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name)
        return
      }

      if ((name === "href" || name === "src") && value.trim().toLowerCase().startsWith("javascript:")) {
        node.removeAttribute(attribute.name)
      }
    })
  })

  return template.innerHTML
}
