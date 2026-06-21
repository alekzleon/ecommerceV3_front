import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import ProductGrid from "../../components/product/ProductGrid/ProductGrid"
import ProductListSkeleton from "../../components/product/ProductListSkeleton/ProductListSkeleton"
import {
  createAccountWishlist,
  deleteAccountWishlist,
  getAccountWishlist,
  getAccountWishlists,
  removeAccountWishlistProduct,
} from "../../services/api/accountService"
import { useAuth } from "../../context/AuthContext"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast"
import { normalizeMediaUrl } from "../../utils/mediaUrl"
import "./wishlists.css"

const WISHLIST_PRODUCTS_PER_PAGE = 24
const PRODUCT_IMAGE_PLACEHOLDER = "https://via.placeholder.com/400x400?text=Producto"

function WishlistsPage() {
  const navigate = useNavigate()
  const { isAuthenticated, sessionReady } = useAuth()
  const [lists, setLists] = useState([])
  const [selectedListId, setSelectedListId] = useState(null)
  const [products, setProducts] = useState([])
  const [loadingLists, setLoadingLists] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: WISHLIST_PRODUCTS_PER_PAGE,
    total: 0,
  })

  useEffect(() => {
    if (!sessionReady) return
    if (!isAuthenticated) navigate("/login")
  }, [isAuthenticated, navigate, sessionReady])

  useEffect(() => {
    if (!sessionReady || !isAuthenticated) return
    loadLists()
  }, [isAuthenticated, sessionReady])

  useEffect(() => {
    if (!selectedListId) {
      setProducts([])
      return
    }

    loadListProducts(selectedListId)
  }, [selectedListId])

  async function loadLists(preferredListId = null) {
    try {
      setLoadingLists(true)
      const response = await getAccountWishlists()
      const nextLists = Array.isArray(response?.data) ? response.data : []
      setLists(nextLists)

      setSelectedListId((currentId) => {
        if (preferredListId && nextLists.some((list) => Number(list.id) === Number(preferredListId))) {
          return preferredListId
        }

        if (currentId && nextLists.some((list) => Number(list.id) === Number(currentId))) {
          return currentId
        }

        return nextLists[0]?.id || null
      })
    } catch (error) {
      console.error("Error al cargar listas:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar tus listas.")
      setLists([])
    } finally {
      setLoadingLists(false)
    }
  }

  async function loadListProducts(wishlistId, page = 1) {
    try {
      setLoadingProducts(true)
      const response = await getAccountWishlist(wishlistId, {
        page,
        per_page: WISHLIST_PRODUCTS_PER_PAGE,
      })
      const data = response?.data || {}

      setProducts(normalizeWishlistProducts(data.products || []))
      setMeta({
        current_page: response?.meta?.current_page ?? 1,
        last_page: response?.meta?.last_page ?? 1,
        per_page: response?.meta?.per_page ?? WISHLIST_PRODUCTS_PER_PAGE,
        total: response?.meta?.total ?? 0,
      })
    } catch (error) {
      console.error("Error al cargar productos de lista:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar los productos de la lista.")
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  async function handleCreateList(event) {
    event.preventDefault()

    const cleanName = newListName.trim()
    if (!cleanName || creating) return

    try {
      setCreating(true)
      const response = await createAccountWishlist({
        name: cleanName,
        description: "",
      })
      const createdList = response?.data || null

      notifySuccess(response?.message || "Lista creada correctamente.")
      setNewListName("")
      await loadLists(createdList?.id)
    } catch (error) {
      console.error("Error al crear lista:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible crear la lista.")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteList() {
    if (!selectedListId) return
    if (!window.confirm("¿Eliminar esta lista?")) return

    try {
      const response = await deleteAccountWishlist(selectedListId)
      notifySuccess(response?.message || "Lista eliminada correctamente.")
      setSelectedListId(null)
      setProducts([])
      await loadLists()
    } catch (error) {
      console.error("Error al eliminar lista:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible eliminar la lista.")
    }
  }

  async function handleRemoveProduct(productId) {
    if (!selectedListId || !productId) return

    try {
      const response = await removeAccountWishlistProduct(selectedListId, productId)
      notifySuccess(response?.message || "Producto eliminado de la lista.")
      setProducts((prev) => prev.filter((product) => product.id !== productId))
      await loadLists(selectedListId)
    } catch (error) {
      console.error("Error al quitar producto:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible quitar el producto.")
    }
  }

  if (!sessionReady) {
    return (
      <section className="wishlists-page">
        <div className="container-main">
          <ProductListSkeleton count={8} />
        </div>
      </section>
    )
  }

  if (!isAuthenticated) return null

  const selectedList = lists.find((list) => Number(list.id) === Number(selectedListId)) || null

  return (
    <section className="wishlists-page">
      <div className="container-main">
        <div className="wishlists-page__top">
          <div>
            <p className="wishlists-page__breadcrumbs">Inicio &gt; Listas</p>
            <h1 className="wishlists-page__title">Listas</h1>
            <p className="wishlists-page__results">{lists.length} lista(s) guardada(s)</p>
          </div>
        </div>

        <div className="wishlists-page__layout">
          <aside className="wishlists-page__sidebar">
            <form className="wishlists-page__create" onSubmit={handleCreateList}>
              <input
                type="text"
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="Nueva lista"
                maxLength={80}
              />
              <button type="submit" disabled={!newListName.trim() || creating}>
                {creating ? "Creando..." : "Crear"}
              </button>
            </form>

            {loadingLists ? (
              <div className="wishlists-page__empty-sidebar">Cargando listas...</div>
            ) : lists.length ? (
              <div className="wishlists-page__list">
                {lists.map((list) => (
                  <button
                    type="button"
                    className={`wishlists-page__list-btn ${Number(selectedListId) === Number(list.id) ? "is-active" : ""}`}
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <strong>{list.name}</strong>
                    <span>{list.products_count || 0} producto(s)</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="wishlists-page__empty-sidebar">Aún no tienes listas.</div>
            )}
          </aside>

          <main className="wishlists-page__content">
            {selectedList ? (
              <div className="wishlists-page__content-head">
                <div>
                  <h2>{selectedList.name}</h2>
                  <p>{meta.total} producto(s)</p>
                </div>
                <button type="button" onClick={handleDeleteList}>
                  Eliminar lista
                </button>
              </div>
            ) : null}

            {loadingProducts ? (
              <ProductListSkeleton count={8} />
            ) : products.length ? (
              <>
                <div className="wishlists-page__product-grid">
                  {products.map((product) => (
                    <div className="wishlists-page__product" key={product.id}>
                      <button
                        type="button"
                        className="wishlists-page__remove"
                        onClick={() => handleRemoveProduct(product.id)}
                        aria-label="Quitar de lista"
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                      <ProductGrid products={[product]} />
                    </div>
                  ))}
                </div>

                {meta.last_page > 1 ? (
                  <div className="wishlists-page__pagination">
                    <button
                      type="button"
                      onClick={() => loadListProducts(selectedListId, Math.max(meta.current_page - 1, 1))}
                      disabled={meta.current_page === 1}
                    >
                      Anterior
                    </button>
                    <span>
                      {meta.current_page} / {meta.last_page}
                    </span>
                    <button
                      type="button"
                      onClick={() => loadListProducts(selectedListId, Math.min(meta.current_page + 1, meta.last_page))}
                      disabled={meta.current_page === meta.last_page}
                    >
                      Siguiente
                    </button>
                  </div>
                ) : null}
              </>
            ) : selectedList ? (
              <div className="wishlists-page__empty">
                <h2>Lista vacía</h2>
                <p>Agrega productos desde el catálogo o el detalle de producto.</p>
                <Link to="/productos">Ver productos</Link>
              </div>
            ) : (
              <div className="wishlists-page__empty">
                <h2>Aún no tienes listas</h2>
                <p>Crea una lista para guardar productos por ocasión o compra frecuente.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  )
}

function normalizeWishlistProducts(items = []) {
  return items.map((item) => {
    const price = Number(item?.default_price ?? item?.price ?? 0)

    return {
      id: item?.id ?? null,
      name: item?.name ?? "Producto sin nombre",
      slug: item?.slug ?? "",
      image: normalizeMediaUrl(item?.image_url || item?.image_path || item?.media_url || item?.media_path) || PRODUCT_IMAGE_PLACEHOLDER,
      price,
      oldPrice: price,
      priceInfo: item?.price_info ?? null,
      brand: item?.brand ?? "Sin marca",
      sku: item?.sku ?? "",
      rating: 4.8,
      sold: "Alta rotación",
      shipping: "Entrega disponible",
      discountLabel: "",
      badges: [],
      stock: item?.stock ?? null,
      stockStatus: item?.stock_status ?? "untracked",
      stockMessage: item?.stock_message ?? "",
      isFavorite: Boolean(item?.is_favorite),
      addedToWishlistAt: item?.added_to_wishlist_at ?? null,
    }
  })
}

export default WishlistsPage
