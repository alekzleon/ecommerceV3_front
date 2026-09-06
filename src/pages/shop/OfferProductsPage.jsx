import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import ProductGrid from "../../components/product/ProductGrid/ProductGrid"
import ProductListSkeleton from "../../components/product/ProductListSkeleton/ProductListSkeleton"
import { getAllPromotions } from "../../services/api/promotionsService"
import { notifyError } from "../../utils/toast"
import "./offerspage.css"

const PROMOTIONS_LOOKUP_PER_PAGE = 100
const MAX_PROMOTION_LOOKUP_PAGES = 20
const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"
const PRICE_UNAVAILABLE_SOURCE = "precios_articulos_default_missing"

function OfferProductsPage() {
  const { promotionKey } = useParams()
  const [promotion, setPromotion] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadPromotionProducts = async () => {
      try {
        setLoading(true)
        setError("")

        const foundPromotion = await findPromotionByKey(promotionKey)
        const normalizedProducts = normalizePromotionProducts(foundPromotion)

        setPromotion(foundPromotion)
        setProducts(normalizedProducts)

        if (!normalizedProducts.length) {
          setError("No fue posible cargar los productos de esta promoción.")
        }
      } catch (err) {
        console.error("Error al cargar productos de promoción:", err?.response?.data || err)
        notifyError(err?.response?.data?.message || "No fue posible cargar los productos de la promoción.")
        setPromotion(null)
        setProducts([])
        setError("No fue posible cargar los productos de esta promoción.")
      } finally {
        setLoading(false)
      }
    }

    loadPromotionProducts()
  }, [promotionKey])

  return (
    <section className="offer-products-page">
      <div className="container-main">
        <div className="offer-products-page__top">
          <div>
            <p className="offers-page__breadcrumbs">
              <Link to="/ofertas">Ofertas</Link> &gt; Productos
            </p>
            <h1 className="offers-page__title">
              {promotion?.name || "Productos de la promoción"}
            </h1>
            <p className="offers-page__results">
              {loading ? "Cargando productos..." : `${products.length} producto(s)`}
            </p>
          </div>
        </div>

        {loading ? (
          <ProductListSkeleton count={8} />
        ) : error ? (
          <div className="offers-page__empty">
            <h2>{error}</h2>
            <p>Regresa a ofertas para elegir otra promoción vigente.</p>
            <Link to="/ofertas" className="offers-page__empty-action">
              Ver ofertas
            </Link>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </section>
  )
}

async function findPromotionByKey(promotionKey) {
  const key = decodeURIComponent(String(promotionKey || ""))
  let currentPage = 1
  let lastPage = 1

  do {
    const response = await getAllPromotions({
      page: currentPage,
      per_page: PROMOTIONS_LOOKUP_PER_PAGE,
    })
    const promotions = Array.isArray(response?.data) ? response.data : []
    const promotion = promotions.find((item) => matchesPromotionKey(item, key))

    if (promotion) return promotion

    lastPage = Number(response?.meta?.last_page || 1)
    currentPage += 1
  } while (currentPage <= lastPage && currentPage <= MAX_PROMOTION_LOOKUP_PAGES)

  throw new Error("Promoción no encontrada.")
}

function matchesPromotionKey(promotion = {}, key = "") {
  return String(promotion?.slug || "") === key || String(promotion?.id || "") === key
}

function normalizePromotionProducts(promotion = {}) {
  const products = Array.isArray(promotion?.products) ? promotion.products : []

  return products
    .filter((product) => product?.slug)
    .map((product) => {
      const price = Number(product?.final_price || product?.default_price || product?.price || 0)
      const oldPrice = Number(product?.default_price || product?.old_price || price)

      return {
        id: product?.id ?? null,
        name: product?.name || "Producto sin nombre",
        slug: product?.slug || "",
        image: normalizeProductImage(product?.image_url || product?.image_path || product?.image),
        price,
        oldPrice,
        priceInfo: product?.price_info ?? (price > 0 ? null : { source: PRICE_UNAVAILABLE_SOURCE }),
        brand: product?.brand || product?.brand_name || "Sin marca",
        shortDescription: product?.short_description || "Producto disponible en promoción.",
        description: product?.description || "Producto disponible en promoción.",
        category: product?.category?.name || "",
        family: product?.family?.name || "",
        sku: product?.sku || "",
        rating: 4.8,
        sold: "Promoción vigente",
        shipping: "Entrega disponible",
        discountLabel: "",
        badges: [promotion?.label || promotion?.name || "Promoción"].filter(Boolean),
        activePromotions: [promotion],
        promotionMessage: promotion?.label || promotion?.name || "",
        stock: product?.stock ?? null,
        stockStatus: product?.stock_status || product?.stockStatus || "untracked",
        stockMessage: product?.stock_message || product?.stockMessage || "",
        isFavorite: Boolean(product?.is_favorite),
      }
    })
}

function normalizeProductImage(value) {
  const image = String(value || "").trim()

  if (!image) return PRODUCT_IMAGE_PLACEHOLDER

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

export default OfferProductsPage
