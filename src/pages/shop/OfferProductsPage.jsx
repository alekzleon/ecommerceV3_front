import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import ProductGrid from "../../components/product/ProductGrid/ProductGrid"
import ProductListSkeleton from "../../components/product/ProductListSkeleton/ProductListSkeleton"
import { getPromotionProducts } from "../../services/api/promotionsService"
import { notifyError } from "../../utils/toast"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import "./offerspage.css"

const PRODUCTS_PER_PAGE = 16
const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"

function OfferProductsPage() {
  const { promotionKey } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page")) || 1

  const [promotion, setPromotion] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: PRODUCTS_PER_PAGE,
    total: 0,
  })

  useEffect(() => {
    const loadPromotionProducts = async () => {
      try {
        setLoading(true)
        setError("")

        const response = await getPromotionProducts(promotionKey, {
          page,
          per_page: PRODUCTS_PER_PAGE,
        })
        const rawProducts = Array.isArray(response?.data) ? response.data : []
        const normalizedProducts = rawProducts.map(normalizeProduct)

        setPromotion(response?.promotion || response?.data?.promotion || null)
        setProducts(normalizedProducts)
        setMeta({
          current_page: response?.meta?.current_page ?? 1,
          last_page: response?.meta?.last_page ?? 1,
          per_page: response?.meta?.per_page ?? PRODUCTS_PER_PAGE,
          total: response?.meta?.total ?? normalizedProducts.length,
        })

        if (!normalizedProducts.length) {
          setError("Esta promoción no tiene productos disponibles.")
        }
      } catch (err) {
        console.error("Error al cargar productos de promoción:", err?.response?.data || err)
        notifyError(err?.response?.data?.message || "No fue posible cargar los productos de la promoción.")
        setPromotion(null)
        setProducts([])
        setMeta({
          current_page: 1,
          last_page: 1,
          per_page: PRODUCTS_PER_PAGE,
          total: 0,
        })
        setError("No fue posible cargar los productos de esta promoción.")
      } finally {
        setLoading(false)
      }
    }

    loadPromotionProducts()
  }, [page, promotionKey])

  const handlePageChange = (nextPage) => {
    const nextParams = new URLSearchParams(searchParams)

    if (nextPage <= 1) {
      nextParams.delete("page")
    } else {
      nextParams.set("page", String(nextPage))
    }

    setSearchParams(nextParams, { replace: true })
  }

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
              {loading ? "Cargando productos..." : `${meta.total} producto(s)`}
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
          <>
            <ProductGrid products={products} />

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
        )}
      </div>
    </section>
  )
}

function normalizeProduct(item = {}) {
  const price = Number(item?.default_price ?? item?.final_price ?? item?.price ?? 0)
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
    image: getProductImage(item),
    price,
    oldPrice: Number(item?.default_price ?? price),
    priceInfo: item?.price_info ?? null,
    brand: item?.brand ?? "Sin marca",
    shortDescription: item?.short_description ?? "Producto disponible en catálogo.",
    description: item?.description ?? "Producto disponible en catálogo.",
    category: item?.category?.name ?? "",
    family: item?.family?.name ?? "",
    sku: item?.sku ?? "",
    rating: 4.8,
    sold: "Promoción vigente",
    shipping: "Entrega disponible",
    discountLabel: "",
    badges: promotionMessage ? [promotionMessage] : [],
    activePromotions,
    promotionMessage,
    stock: item?.stock ?? null,
    stockStatus: item?.stock_status ?? getStockStatus(item),
    stockMessage: item?.stock_message ?? "",
    isFavorite: Boolean(item?.is_favorite),
    relevanceScore: item?.relevance_score ?? null,
    matchReasons: Array.isArray(item?.match_reasons) ? item.match_reasons : [],
  }
}

function getStockStatus(item = {}) {
  if (item?.stock === null || item?.stock === undefined || item?.stock === "") {
    return "untracked"
  }

  return Number(item.stock) > 0 ? "in_stock" : "out_of_stock"
}

function getProductImage(item = {}) {
  const galleryImage = Array.isArray(item?.gallery)
    ? item.gallery.find((media) => {
        const isActive = Boolean(media?.is_active ?? true)
        const mediaType = media?.media_type || media?.type || "image"

        return isActive && mediaType !== "video" && getProductImageSource(media)
      })
    : null

  const rawImage =
    item?.image_url ||
    item?.image_path ||
    item?.main_image_url ||
    item?.main_image_path ||
    item?.media_url ||
    item?.media_path ||
    item?.thumbnail_url ||
    item?.thumbnail_path ||
    item?.file_url ||
    item?.url ||
    item?.image ||
    getProductImageSource(galleryImage)

  return normalizeMediaUrl(rawImage) || PRODUCT_IMAGE_PLACEHOLDER
}

function getProductImageSource(media = {}) {
  return (
    media?.media_url ||
    media?.media_path ||
    media?.image_url ||
    media?.image_path ||
    media?.file_url ||
    media?.url ||
    media?.path ||
    ""
  )
}

export default OfferProductsPage
