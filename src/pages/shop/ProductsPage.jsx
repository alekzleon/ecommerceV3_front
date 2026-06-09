import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import ProductGrid from "../../components/product/ProductGrid/ProductGrid"
import ProductListSkeleton from "../../components/product/ProductListSkeleton/ProductListSkeleton"
import CatalogSidebar from "../../components/product/CatalogSidebar/CatalogSidebar"
import { getCatalogSidebar, getProducts } from "../../services/api/productService"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import "./productspage.css"

const PRODUCTS_PER_PAGE = 24
const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"
const PAGINATION_SIBLINGS = 1
const PAGINATION_BOUNDARIES = 1
const PAGINATION_ELLIPSIS = "ellipsis"

function getPaginationItems(currentPage, lastPage) {
  const pages = []
  const totalVisiblePages = PAGINATION_BOUNDARIES * 2 + PAGINATION_SIBLINGS * 2 + 3

  if (lastPage <= totalVisiblePages) {
    return Array.from({ length: lastPage }, (_, index) => index + 1)
  }

  const startPage = Math.max(
    PAGINATION_BOUNDARIES + 2,
    currentPage - PAGINATION_SIBLINGS
  )
  const endPage = Math.min(
    lastPage - PAGINATION_BOUNDARIES - 1,
    currentPage + PAGINATION_SIBLINGS
  )

  for (let pageNumber = 1; pageNumber <= PAGINATION_BOUNDARIES; pageNumber += 1) {
    pages.push(pageNumber)
  }

  if (startPage > PAGINATION_BOUNDARIES + 2) {
    pages.push(PAGINATION_ELLIPSIS)
  } else {
    pages.push(PAGINATION_BOUNDARIES + 1)
  }

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
    pages.push(pageNumber)
  }

  if (endPage < lastPage - PAGINATION_BOUNDARIES - 1) {
    pages.push(PAGINATION_ELLIPSIS)
  } else {
    pages.push(lastPage - PAGINATION_BOUNDARIES)
  }

  for (
    let pageNumber = lastPage - PAGINATION_BOUNDARIES + 1;
    pageNumber <= lastPage;
    pageNumber += 1
  ) {
    pages.push(pageNumber)
  }

  return pages
}

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [sidebarLoading, setSidebarLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [categoryFamilies, setCategoryFamilies] = useState([])
  const [brandOptions, setBrandOptions] = useState([])
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: PRODUCTS_PER_PAGE,
    total: 0,
  })
  const [error, setError] = useState("")

  const page = useMemo(() => Number(searchParams.get("page")) || 1, [searchParams])
  const sort = useMemo(() => searchParams.get("sort") || "relevantes", [searchParams])
  const selectedCategorySlug = useMemo(() => searchParams.get("category") || "", [searchParams])
  const selectedFamilySlug = useMemo(() => searchParams.get("family") || "", [searchParams])
  const selectedBrand = useMemo(() => searchParams.get("brand") || "", [searchParams])
  const searchTerm = useMemo(() => searchParams.get("search") || "", [searchParams])
  const paginationItems = useMemo(
    () => getPaginationItems(page, meta.last_page),
    [page, meta.last_page]
  )

  useEffect(() => {
    const fetchSidebar = async () => {
      try {
        setSidebarLoading(true)
        const response = await getCatalogSidebar()
        setCategoryFamilies(response?.data?.categoryFamilies || [])
        setBrandOptions(response?.data?.brandOptions || [])
      } catch (err) {
        console.error(err)
      } finally {
        setSidebarLoading(false)
      }
    }

    fetchSidebar()
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError("")

        const sortMap = {
          relevantes: "relevant",
          "precio-asc": "price_asc",
          "precio-desc": "price_desc",
        }

        const response = await getProducts({
          page,
          per_page: PRODUCTS_PER_PAGE,
          sort: sortMap[sort] || "relevant",
          category_slug: selectedCategorySlug || undefined,
          family_slug: selectedFamilySlug || undefined,
          brand: selectedBrand || undefined,
          search: searchTerm || undefined,
        })

        const normalizedProducts = (response?.data || []).map((item) => {
          const price = Number(item?.default_price ?? 0)
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
            image: normalizeMediaUrl(item?.image_url || item?.image_path) || PRODUCT_IMAGE_PLACEHOLDER,
            price,
            oldPrice: price,
            priceInfo: item?.price_info ?? null,
            brand: item?.brand ?? "Sin marca",
            shortDescription: item?.short_description ?? "Producto disponible en catálogo.",
            description: item?.description ?? "Producto disponible en catálogo.",
            category: item?.category?.name ?? "",
            family: item?.family?.name ?? "",
            sku: item?.sku ?? "",
            rating: 4.8,
            sold: "Alta rotación",
            shipping: "Entrega disponible",
            discountLabel: "",
            badges: promotionMessage ? [promotionMessage] : [],
            activePromotions,
            promotionMessage,
            isFavorite: Boolean(item?.is_favorite),
          }
        })

        setProducts(normalizedProducts)
        setMeta({
          current_page: response?.meta?.current_page ?? 1,
          last_page: response?.meta?.last_page ?? 1,
          per_page: response?.meta?.per_page ?? PRODUCTS_PER_PAGE,
          total: response?.meta?.total ?? 0,
        })
      } catch (err) {
        console.error(err)
        setProducts([])
        setError("No fue posible cargar los productos.")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [page, sort, selectedCategorySlug, selectedFamilySlug, selectedBrand, searchTerm])

  useEffect(() => {
    setIsMobileFiltersOpen(false)
  }, [selectedCategorySlug, selectedFamilySlug, selectedBrand, searchTerm, sort, page])

  useEffect(() => {
    if (isMobileFiltersOpen) {
      document.body.classList.add("filters-open")
    } else {
      document.body.classList.remove("filters-open")
    }

    return () => document.body.classList.remove("filters-open")
  }, [isMobileFiltersOpen])

  const updateParams = (updates = {}) => {
    const nextParams = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === undefined || value === null) {
        nextParams.delete(key)
      } else {
        nextParams.set(key, String(value))
      }
    })

    setSearchParams(nextParams, { replace: true })
  }

  const handleCategorySelect = (category) => {
    if (selectedCategorySlug === category.slug) {
      updateParams({
        page: "",
        category: "",
        family: "",
      })
      return
    }

    updateParams({
      page: "",
      category: category.slug,
      family: "",
    })
  }

  const handleFamilySelect = (category, family) => {
    if (selectedFamilySlug === family.slug) {
      updateParams({
        page: "",
        category: category.slug,
        family: "",
      })
      return
    }

    updateParams({
      page: "",
      category: category.slug,
      family: family.slug,
    })
  }

  const handleBrandSelect = (brandName) => {
    updateParams({
      page: "",
      brand: selectedBrand === brandName ? "" : brandName,
    })
  }

  const handleClearFilters = () => {
    setSearchParams({}, { replace: true })
  }

  const handleSortChange = (value) => {
    updateParams({
      page: "",
      sort: value === "relevantes" ? "" : value,
    })
  }

  const handlePageChange = (newPage) => {
    updateParams({
      page: newPage <= 1 ? "" : newPage,
    })
  }

  return (
    <section className="products-page">
      <div className="container-main">
        <div className="products-page__top">
          <div className="products-page__heading">
            <p className="products-page__breadcrumbs">
              Inicio &gt; Productos
              {selectedCategorySlug ? ` > ${selectedCategorySlug}` : ""}
              {selectedFamilySlug ? ` > ${selectedFamilySlug}` : ""}
              {searchTerm ? ` > búsqueda: ${searchTerm}` : ""}
            </p>

            <h1 className="products-page__title">
              {searchTerm ? `Resultados para "${searchTerm}"` : "Productos"}
            </h1>

            <p className="products-page__results">
              {meta.total} resultados
            </p>
          </div>

          <div className="products-page__actions">
            <button
              type="button"
              className="products-page__filters-toggle"
              onClick={() => setIsMobileFiltersOpen(true)}
            >
              Filtros
            </button>

            <div className="products-page__sort">
              <label htmlFor="sort">Ordenar por</label>
              <select
                id="sort"
                className="products-page__select"
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="relevantes">Más relevantes</option>
                <option value="precio-asc">Menor precio</option>
                <option value="precio-desc">Mayor precio</option>
              </select>
            </div>
          </div>
        </div>

        <div className="products-page__layout">
          <aside className="products-page__sidebar products-page__sidebar--desktop">
            {sidebarLoading ? (
              <div>Cargando filtros...</div>
            ) : (
              <CatalogSidebar
                categoryFamilies={categoryFamilies}
                brandOptions={brandOptions}
                selectedCategorySlug={selectedCategorySlug}
                selectedFamilySlug={selectedFamilySlug}
                selectedBrand={selectedBrand}
                onCategorySelect={handleCategorySelect}
                onFamilySelect={handleFamilySelect}
                onBrandSelect={handleBrandSelect}
                onClearFilters={handleClearFilters}
              />
            )}
          </aside>

          <div className="products-page__content">
            {loading ? (
              <ProductListSkeleton count={12} />
            ) : error ? (
              <div className="products-page__error">{error}</div>
            ) : (
              <>
                <ProductGrid products={products} />

                {!loading && !error && products.length === 0 ? (
                  <div className="products-page__empty">
                    No encontramos productos para esta búsqueda.
                  </div>
                ) : null}

                {meta.last_page > 1 ? (
                  <div className="products-page__pagination">
                    <button
                      className="products-page__page-btn"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      Anterior
                    </button>

                    {paginationItems.map((item, index) => {
                      if (item === PAGINATION_ELLIPSIS) {
                        return (
                          <span
                            key={`${item}-${index}`}
                            className="products-page__page-ellipsis"
                            aria-hidden="true"
                          >
                            ...
                          </span>
                        )
                      }

                      return (
                        <button
                          key={item}
                          className={`products-page__page-number ${
                            page === item ? "is-active" : ""
                          }`}
                          onClick={() => handlePageChange(item)}
                          aria-current={page === item ? "page" : undefined}
                        >
                          {item}
                        </button>
                      )
                    })}

                    <button
                      className="products-page__page-btn"
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
        </div>
      </div>

      <div
        className={`products-page__mobile-overlay ${
          isMobileFiltersOpen ? "is-open" : ""
        }`}
        onClick={() => setIsMobileFiltersOpen(false)}
      />

      <aside
        className={`products-page__mobile-sidebar ${
          isMobileFiltersOpen ? "is-open" : ""
        }`}
      >
        <div className="products-page__mobile-sidebar-header">
          <h3>Filtros</h3>

          <button
            type="button"
            className="products-page__mobile-sidebar-close"
            onClick={() => setIsMobileFiltersOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="products-page__mobile-sidebar-body">
          {sidebarLoading ? (
            <div>Cargando filtros...</div>
          ) : (
            <CatalogSidebar
              categoryFamilies={categoryFamilies}
              brandOptions={brandOptions}
              selectedCategorySlug={selectedCategorySlug}
              selectedFamilySlug={selectedFamilySlug}
              selectedBrand={selectedBrand}
              onCategorySelect={handleCategorySelect}
              onFamilySelect={handleFamilySelect}
              onBrandSelect={handleBrandSelect}
              onClearFilters={handleClearFilters}
            />
          )}
        </div>
      </aside>
    </section>
  )
}

export default ProductsPage
