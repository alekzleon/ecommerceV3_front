import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  addCartPromotionGiftProduct,
  clearCartPromotionGiftSelection,
  clearCart,
  getCart,
  removeCartItem,
  selectCartPromotionGift,
  updateCartItem,
} from "../../services/api/cartService.js"
import { restoreRecoverableOrderCart } from "../../services/api/checkoutService.js"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast.js"
import { normalizeMediaUrl } from "../../utils/mediaUrl.js"
import "./cart.css"

const CART_SUMMARY_STORAGE_KEY = "pidefacil_cart_summary"
const STRIPE_SUCCESS_RETURN_STORAGE_KEY = "pidefacil_stripe_success_return"
const DEBUG_RECOVERABLE_CART = true

const emptyCartState = {
  id: null,
  status: "",
  currency: "MXN",
  items_count: 0,
  subtotal: 0,
  discount: 0,
  tax: 0,
  tax_breakdown: {
    total: 0,
    items: [],
  },
  total: 0,
  last_activity_at: null,
  promotionsApplied: [],
  items: [],
}

function CartPage() {
  const [cart, setCart] = useState(emptyCartState)
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [processingClear, setProcessingClear] = useState(false)
  const [processingRemoveSelected, setProcessingRemoveSelected] = useState(false)
  const [itemLoadingMap, setItemLoadingMap] = useState({})
  const [promotionLoadingMap, setPromotionLoadingMap] = useState({})
  const restoringRecoverableRef = useRef(false)

  const syncCartSummary = (cartData) => {
    const summary = {
      id: cartData?.id ?? null,
      items_count: Number(cartData?.items_count ?? 0),
      subtotal: Number(cartData?.subtotal ?? 0),
      discount: Number(cartData?.discount ?? 0),
      tax: Number(cartData?.tax ?? 0),
      tax_breakdown: normalizeTaxBreakdown(cartData?.tax_breakdown),
      total: Number(cartData?.total ?? 0),
    }

    localStorage.setItem(CART_SUMMARY_STORAGE_KEY, JSON.stringify(summary))

    window.dispatchEvent(
      new CustomEvent("cart:updated", {
        detail: summary,
      })
    )
  }

  const getCartPayload = useCallback((payload) => {
    const data = payload?.data ?? payload ?? emptyCartState

    return data?.cart ?? data?.summary?.cart ?? data
  }, [])

  const getRecoverableOrder = (payload) => {
    const data = payload?.data ?? payload ?? {}
    const recoverableOrder = data?.recoverable_order ?? data?.summary?.recoverable_order ?? null

    if (DEBUG_RECOVERABLE_CART) {
      console.log("[recoverable-cart][cart] normalized data:", data)
      console.log("[recoverable-cart][cart] detected recoverable_order:", recoverableOrder)
    }

    return recoverableOrder
  }

  const shouldTryImplicitRecover = useCallback((payload) => {
    if (hasRecentStripeSuccessReturn()) {
      if (DEBUG_RECOVERABLE_CART) {
        console.log("[recoverable-cart][cart] skipping implicit restore: recent Stripe success return")
      }

      return false
    }

    const cartData = getCartPayload(payload)
    const hasNoItems = Number(cartData?.items_count ?? 0) === 0
    const hasNoLines = !Array.isArray(cartData?.items) || cartData.items.length === 0
    const isActiveCart = cartData?.status === "active"

    return Boolean(isActiveCart && hasNoItems && hasNoLines)
  }, [getCartPayload])

  const normalizeCart = useCallback((payload) => {
    const cartData = getCartPayload(payload)
    const items = Array.isArray(cartData?.items) ? cartData.items : []
    const promotionsApplied = Array.isArray(
      cartData?.promotions_applied ?? cartData?.promotionsApplied
    )
      ? cartData?.promotions_applied ?? cartData?.promotionsApplied
      : []

    const normalizedItems = items.map((item) => {
      const baseUnitPrice = Number(
        item.base_unit_price ??
          item.base_unit_price_snapshot ??
          item.price ??
          item.price_snapshot ??
          0
      )

      const finalUnitPrice = Number(
        item.final_unit_price ??
          item.final_unit_price_snapshot ??
          item.price ??
          item.price_snapshot ??
          baseUnitPrice
      )

      const lineDiscount = Number(
        item.line_discount ??
          item.line_discount_snapshot ??
          item.discount_amount ??
          0
      )

      const lineSubtotal = Number(
        item.line_subtotal ??
          item.line_subtotal_snapshot ??
          finalUnitPrice * Number(item.quantity ?? 0)
      )

      const hasPromotion =
        Boolean(item.promotion_id) ||
        Boolean(item.promotion_type) ||
        Boolean(item.promotion_name_snapshot) ||
        Boolean(item.promotion)

      const promotionData = item.promotion
        ? item.promotion
        : hasPromotion
        ? {
            id: item.promotion_id ?? null,
            type: item.promotion_type ?? null,
            name: item.promotion_name_snapshot ?? null,
            snapshot: item.promotion_snapshot ?? null,
          }
        : null

      const percentOff =
        baseUnitPrice > 0 && finalUnitPrice < baseUnitPrice
          ? Math.round(((baseUnitPrice - finalUnitPrice) / baseUnitPrice) * 100)
          : 0

      const availablePromotions = Array.isArray(item.available_promotions)
        ? item.available_promotions
        : Array.isArray(item.availablePromotions)
        ? item.availablePromotions
        : []

      return {
        id: item.id ?? item.cart_item_id ?? item.product_id,
        productId: item.product_id,
        image:
          item.image ||
          item.image_snapshot ||
          "https://via.placeholder.com/400x400?text=Producto",
        name: item.name || item.name_snapshot || "Producto sin nombre",
        brand: item.brand || item.brand_snapshot || "Sin marca",
        presentation: item.presentation || item.sku || item.sku_snapshot || "",
        price: finalUnitPrice,
        oldPrice: baseUnitPrice > finalUnitPrice ? baseUnitPrice : null,
        baseUnitPrice,
        discount: percentOff,
        discountAmount: lineDiscount,
        quantity: item.quantity ?? 0,
        available: null,
        lineSubtotal,
        status: item.status || "",
        sku: item.sku || item.sku_snapshot || "",
        category: item.category || item.category_snapshot || "",
        family: item.family || item.family_snapshot || "",
        promotion: promotionData,
        availablePromotions,
        giftUnits: Number(item.gift_units ?? item.giftUnits ?? 0),
        giftItemUnits: Number(
          item.gift_item_units ??
            item.giftItemUnits ??
            promotionData?.snapshot?.gift_item_units ??
            0
        ),
        giftItems: normalizeGiftItems(
          item.gift_items ?? item.giftItems ?? promotionData?.snapshot?.gift_items
        ),
        giftUnitAccountingPrice: Number(
          item.gift_unit_accounting_price ??
            item.giftUnitAccountingPrice ??
            0
        ),
        giftLineTotal: Number(item.gift_line_total ?? item.giftLineTotal ?? 0),
        taxableBase: Number(item.taxable_base ?? item.taxableBase ?? 0),
        tax: Number(item.tax ?? item.tax_amount ?? 0),
        taxes: normalizeTaxes(item.taxes),
      }
    })

    const fallbackSubtotal = normalizedItems.reduce(
      (sum, item) => sum + Number(item.baseUnitPrice || 0) * Number(item.quantity || 0),
      0
    )
    const fallbackDiscount = normalizedItems.reduce(
      (sum, item) => sum + Number(item.discountAmount || 0),
      0
    )
    const fallbackTotal = normalizedItems.reduce(
      (sum, item) => sum + Number(item.lineSubtotal || 0),
      0
    )

    return {
      id: cartData?.id ?? cartData?.cart_id ?? null,
      status: cartData?.status ?? "",
      currency: cartData?.currency ?? "MXN",
      items_count: Number(cartData?.items_count ?? normalizedItems.length),
      subtotal: Number(
        cartData?.subtotal ??
          cartData?.subtotal_snapshot ??
          cartData?.totals?.subtotal ??
          fallbackSubtotal
      ),
      discount: Number(
        cartData?.discount ??
          cartData?.discount_snapshot ??
          cartData?.totals?.discount ??
          fallbackDiscount
      ),
      tax: Number(
        cartData?.tax ?? cartData?.tax_snapshot ?? cartData?.totals?.tax ?? 0
      ),
      tax_breakdown: normalizeTaxBreakdown(
        cartData?.tax_breakdown ?? cartData?.totals?.tax_breakdown
      ),
      total: Number(
        cartData?.total ??
          cartData?.total_snapshot ??
          cartData?.totals?.total ??
          fallbackTotal
      ),
      last_activity_at: cartData?.last_activity_at ?? null,
      promotionsApplied: promotionsApplied.map((promotion) => ({
        id: promotion.id ?? null,
        type: promotion.type ?? "",
        name: promotion.name ?? "Promoción aplicada",
        totalDiscount: Number(
          promotion.total_discount ?? promotion.totalDiscount ?? 0
        ),
        itemsCount: Number(promotion.items_count ?? promotion.itemsCount ?? 0),
        giftUnits: Number(promotion.gift_units ?? promotion.giftUnits ?? 0),
        giftItemUnits: Number(
          promotion.gift_item_units ??
            promotion.giftItemUnits ??
            promotion.snapshot?.gift_item_units ??
            0
        ),
        giftItems: normalizeGiftItems(
          promotion.gift_items ??
            promotion.giftItems ??
            promotion.snapshot?.gift_items
        ),
        giftLineTotal: Number(
          promotion.gift_line_total ?? promotion.giftLineTotal ?? 0
        ),
        snapshot: promotion.snapshot ?? null,
      })),
      items: normalizedItems,
    }
  }, [getCartPayload])
    

  const applyCartResponse = useCallback((payload, options = {}) => {
    const normalized = normalizeCart(payload)

    setCart(normalized)
    setProducts(normalized.items)
    syncCartSummary(normalized)

    if (options.keepSelected) {
      setSelected((prev) =>
        prev.filter((selectedId) =>
          normalized.items.some((item) => item.id === selectedId)
        )
      )
    } else {
      setSelected(normalized.items.map((item) => item.id))
    }

    return normalized
  }, [normalizeCart])

  const fetchCartData = useCallback(async ({ keepSelected = false } = {}) => {
    try {
      setLoading(true)

      const response = await getCart()
      if (DEBUG_RECOVERABLE_CART) {
        console.log("[recoverable-cart][cart] GET /cart response:", response)
      }

      const recoverableOrder = getRecoverableOrder(response)

      if (recoverableOrder && !restoringRecoverableRef.current) {
        restoringRecoverableRef.current = true
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][cart] restoring order:", recoverableOrder)
        }

        const restoreResponse = await restoreRecoverableOrderCart({
          order_id: recoverableOrder.id,
          reason: "user_returned_to_cart",
        })
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][cart] restore response:", restoreResponse)
        }

        applyCartResponse(restoreResponse, { keepSelected: false })
        notifySuccess(restoreResponse?.message || "Carrito recuperado correctamente.")
        return
      }

      if (!recoverableOrder && shouldTryImplicitRecover(response) && !restoringRecoverableRef.current) {
        restoringRecoverableRef.current = true
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][cart] trying implicit restore without order_id")
        }

        try {
          const restoreResponse = await restoreRecoverableOrderCart({
            reason: "user_returned_to_cart",
          })
          if (DEBUG_RECOVERABLE_CART) {
            console.log("[recoverable-cart][cart] implicit restore response:", restoreResponse)
          }

          if (restoreResponse?.data?.cart) {
            applyCartResponse(restoreResponse, { keepSelected: false })
            notifySuccess(restoreResponse?.message || "Carrito recuperado correctamente.")
            return
          }
        } catch (restoreError) {
          if (DEBUG_RECOVERABLE_CART) {
            console.log(
              "[recoverable-cart][cart] implicit restore failed:",
              restoreError?.response?.data || restoreError
            )
          }
        }
      }

      applyCartResponse(response, { keepSelected })
    } catch (error) {
      console.error("Error al cargar carrito:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message ||
          "No fue posible cargar el carrito."
      )
    } finally {
      restoringRecoverableRef.current = false
      setLoading(false)
    }
  }, [applyCartResponse, shouldTryImplicitRecover])

  useEffect(() => {
    fetchCartData()
  }, [fetchCartData])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return products

    return products.filter((product) => {
      const searchable = [
        product.name,
        product.brand,
        product.presentation,
        product.sku,
        product.category,
        product.family,
      ]
        .join(" ")
        .toLowerCase()

      return searchable.includes(term)
    })
  }, [products, search])

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0))
  }

  const getLineTotal = (product) => {
    if (product.lineSubtotal !== null && product.lineSubtotal !== undefined) {
      return Number(product.lineSubtotal || 0)
    }

    return Number(product.price || 0) * Number(product.quantity || 0)
  }

  const getGiftAccountingText = ({ giftUnits, giftUnitAccountingPrice, giftLineTotal }) => {
    const units = Number(giftUnits || 0)

    if (units <= 0) return ""

    const unitPrice = Number(giftUnitAccountingPrice || 0)
    const lineTotal = Number(giftLineTotal || 0)

    return `${units} regalo(s) facturado(s) a ${formatMoney(unitPrice)} c/u (${formatMoney(lineTotal)})`
  }

  const getGiftItemsText = (giftItems = [], giftItemUnits = 0) => {
    const units = Number(giftItemUnits || 0)
    const names = normalizeGiftItems(giftItems)
      .map((item) => item.name)
      .filter(Boolean)

    if (units <= 0 && names.length === 0) return ""

    const unitText = units > 0 ? `${units} regalo(s)` : "Regalo disponible"
    const namesText = names.length ? `: ${names.join(", ")}` : ""

    return `${unitText} de artículos promocionales${namesText}`
  }

  const getSelectedGiftItem = (promotion) => {
    return (
      normalizeGiftItems([
        promotion?.snapshot?.selected_gift_item ??
          promotion?.selectedGiftItem ??
          null,
      ])[0] || null
    )
  }

  const getPromotionDisplayGiftItems = (promotion) => {
    const selectedGiftItem = getSelectedGiftItem(promotion)

    if (selectedGiftItem) {
      return {
        giftItems: [selectedGiftItem],
        giftItemUnits: Number(promotion?.giftItemUnits || 1),
        hasSelection: true,
      }
    }

    return {
      giftItems: [],
      giftItemUnits: Number(promotion?.giftItemUnits || 0),
      hasSelection: false,
    }
  }

  const hasGiftProductInCart = (promotion) => {
    const targetProductId = Number(promotion?.snapshot?.target_product_id ?? 0)

    if (targetProductId <= 0) return false

    return products.some((item) => {
      const sameProduct = Number(item.productId) === targetProductId
      const relatedPromotion =
        Number(item.promotion?.id ?? 0) === Number(promotion?.id ?? 0) ||
        item.promotion?.type === "brand_amount_get_product"

      return sameProduct && (Number(item.giftUnits || 0) > 0 || relatedPromotion)
    })
  }

  const setItemLoading = (itemId, isLoading) => {
    setItemLoadingMap((prev) => ({
      ...prev,
      [itemId]: isLoading,
    }))
  }

  const setPromotionLoading = (promotionId, action, isLoading) => {
    const key = `${promotionId}:${action}`

    setPromotionLoadingMap((prev) => ({
      ...prev,
      [key]: isLoading,
    }))
  }

  const isPromotionLoading = (promotionId, action) =>
    Boolean(promotionLoadingMap[`${promotionId}:${action}`])

  const sanitizeQuantityInput = (value) => {
    const cleanValue = String(value).replace(/[^0-9.]/g, "")
    const parts = cleanValue.split(".")

    if (parts.length <= 2) {
      return cleanValue
    }

    return `${parts[0]}.${parts.slice(1).join("")}`
  }

  const handleQuantityInput = (id, value) => {
    const normalizedValue = sanitizeQuantityInput(value)

    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== id) return product

        return {
          ...product,
          quantity: normalizedValue,
        }
      })
    )
  }

  const commitQuantityChange = async (product) => {
    const rawValue = product?.quantity

    if (rawValue === "") {
      notifyWarning("La cantidad no puede quedar vacía.")
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Number(product.quantity || 0) || 1 }
            : item
        )
      )
      return
    }

    const parsed = Number(rawValue)

    if (Number.isNaN(parsed)) {
      notifyWarning("Ingresa una cantidad válida.")
      await fetchCartData({ keepSelected: true })
      return
    }

    if (parsed <= 0) {
      await handleRemoveItem(product.id)
      return
    }

    try {
      setItemLoading(product.id, true)

      const response = await updateCartItem(product.id, {
        quantity: parsed,
      })

      applyCartResponse(response, { keepSelected: true })
      notifySuccess(response?.message || "Cantidad actualizada correctamente.")
    } catch (error) {
      console.error(
        "Error al actualizar cantidad:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible actualizar la cantidad."
      )
      await fetchCartData({ keepSelected: true })
    } finally {
      setItemLoading(product.id, false)
    }
  }

  const updateQuantityByDelta = async (product, delta) => {
    const current = Number(product.quantity || 0)
    const nextQuantity = +(current + delta).toFixed(2)

    if (nextQuantity <= 0) {
      await handleRemoveItem(product.id)
      return
    }

    try {
      setItemLoading(product.id, true)

      const response = await updateCartItem(product.id, {
        quantity: nextQuantity,
      })

      applyCartResponse(response, { keepSelected: true })
    } catch (error) {
      console.error(
        "Error al actualizar cantidad:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible actualizar la cantidad."
      )
      await fetchCartData({ keepSelected: true })
    } finally {
      setItemLoading(product.id, false)
    }
  }

  const handleRemoveItem = async (id) => {
    try {
      setItemLoading(id, true)

      const response = await removeCartItem(id)
      applyCartResponse(response, { keepSelected: true })
      notifySuccess(response?.message || "Producto eliminado del carrito.")
    } catch (error) {
      console.error(
        "Error al eliminar producto:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible eliminar el producto."
      )
    } finally {
      setItemLoading(id, false)
    }
  }

  const handleClearCart = async () => {
    if (!products.length) {
      notifyWarning("Tu carrito ya está vacío.")
      return
    }

    try {
      setProcessingClear(true)

      const response = await clearCart()
      applyCartResponse(response, { keepSelected: false })
      notifySuccess(response?.message || "Carrito vaciado correctamente.")
    } catch (error) {
      console.error("Error al vaciar carrito:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message ||
          "No fue posible vaciar el carrito."
      )
    } finally {
      setProcessingClear(false)
    }
  }

  const handleRemoveSelected = async () => {
    if (!selected.length) {
      notifyWarning("Selecciona al menos un producto.")
      return
    }

    try {
      setProcessingRemoveSelected(true)

      for (const itemId of selected) {
        await removeCartItem(itemId)
      }

      await fetchCartData({ keepSelected: false })
      notifySuccess("Productos seleccionados eliminados correctamente.")
    } catch (error) {
      console.error(
        "Error al eliminar seleccionados:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible eliminar los productos seleccionados."
      )
      await fetchCartData({ keepSelected: true })
    } finally {
      setProcessingRemoveSelected(false)
    }
  }

  const handleSelectPromotionGift = async (promotionId, giftItemId) => {
    try {
      setPromotionLoading(promotionId, "select-gift", true)

      const response = await selectCartPromotionGift(promotionId, {
        gift_item_id: giftItemId,
      })

      notifySuccess(response?.message || "Regalo seleccionado correctamente.")
      await fetchCartData({ keepSelected: true })
    } catch (error) {
      console.error(
        "Error al seleccionar regalo de promoción:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible seleccionar el regalo."
      )
    } finally {
      setPromotionLoading(promotionId, "select-gift", false)
    }
  }

  const handleClearPromotionGiftSelection = async (promotionId) => {
    try {
      setPromotionLoading(promotionId, "clear-gift", true)

      const response = await clearCartPromotionGiftSelection(promotionId)

      notifySuccess(
        response?.message || "Selección de regalo eliminada correctamente."
      )
      await fetchCartData({ keepSelected: true })
    } catch (error) {
      console.error(
        "Error al limpiar selección de regalo:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible eliminar la selección del regalo."
      )
    } finally {
      setPromotionLoading(promotionId, "clear-gift", false)
    }
  }

  const handleAddPromotionGiftProduct = async (promotionId) => {
    try {
      setPromotionLoading(promotionId, "add-gift-product", true)

      const response = await addCartPromotionGiftProduct(promotionId)

      notifySuccess(
        response?.message || "SKU de regalo agregado al carrito correctamente."
      )
      await fetchCartData({ keepSelected: true })
    } catch (error) {
      console.error(
        "Error al agregar SKU de regalo:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible agregar el SKU de regalo."
      )
    } finally {
      setPromotionLoading(promotionId, "add-gift-product", false)
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredProducts.map((product) => product.id)
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selected.includes(id))

    if (allVisibleSelected) {
      setSelected((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }

    setSelected((prev) => [...new Set([...prev, ...visibleIds])])
  }

  const totalPieces = useMemo(() => {
    return products.reduce((acc, product) => {
      const qty = Number(product.quantity || 0)
      return acc + (Number.isNaN(qty) ? 0 : qty)
    }, 0)
  }, [products])

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) => selected.includes(product.id))

  const hasPendingGiftSelection = cart.promotionsApplied.some((promotion) => {
    if (promotion.type !== "brand_amount_choose_gift_item") return false
    if (!promotion.snapshot?.selection_required) return false

    return !getSelectedGiftItem(promotion)
  })

  const handleCheckoutNavigation = (event) => {
    if (!hasPendingGiftSelection) return

    event.preventDefault()
    notifyWarning("Selecciona tu regalo pendiente antes de continuar al checkout.")
  }

  if (loading) {
    return (
      <div className="cart_page">
        <div className="cart_shell">
          <div className="cart_empty">
            <h3>Cargando carrito...</h3>
            <p>Espera un momento mientras obtenemos tus productos.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cart_page">
      <div className="cart_shell">
        <header className="cart_header">
          <div className="cart_header_left">
            <h1 className="cart_title">Carrito</h1>
            <p className="cart_meta">
              {products.length} productos · {totalPieces.toFixed(2)} piezas
            </p>
          </div>

          <div className="cart_header_actions">
            <button
              type="button"
              className="btn btn_secondary"
              onClick={handleClearCart}
              disabled={!products.length || processingClear}
            >
              {processingClear ? "Vaciando..." : "Vaciar carrito"}
            </button>

            <button
              type="button"
              className="btn btn_secondary"
              onClick={handleRemoveSelected}
              disabled={!selected.length || processingRemoveSelected}
            >
              {processingRemoveSelected
                ? "Eliminando..."
                : "Eliminar seleccionados"}
            </button>

            <Link to="/carrito/excel" className="btn btn_secondary">
              Procesar pedido
            </Link>
          </div>
        </header>

        <div className="cart_tools">
          <div className="cart_search">
            <input
              type="text"
              placeholder="Buscar dentro del carrito"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="cart_tools_info">
            {search.trim() ? (
              <span>
                Mostrando {filteredProducts.length} de {products.length} productos
              </span>
            ) : (
              <span>Pedido rápido de mayoreo</span>
            )}
          </div>
        </div>

        {!products.length ? (
          <div className="cart_empty cart_empty--full">
            <h3>Tu carrito está vacío</h3>
            <p>
              Aún no tienes productos agregados. Explora el catálogo y comienza tu
              pedido.
            </p>

            <div className="cart_empty_actions">
              <Link to="/productos" className="btn btn_primary">
                Ir a productos
              </Link>
            </div>
          </div>
        ) : (
          <div className="cart_layout">
            <section className="cart_main">
              <div className="cart_group_card">
                <div className="cart_group_head">
                  <label className="group_checkbox">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                    />
                    <span className="group_title">Productos</span>
                  </label>

                  <span className="group_count">({filteredProducts.length})</span>
                </div>

                <div className="cart_rows">
                  {filteredProducts.length === 0 ? (
                    <div className="cart_empty">
                      <h3>No encontramos productos en tu carrito</h3>
                      <p>Prueba con otro término o ajusta tu búsqueda.</p>
                    </div>
                  ) : (
                    filteredProducts.map((product) => {
                      const isItemLoading = Boolean(itemLoadingMap[product.id])

                      return (
                        <article className="cart_item" key={product.id}>
                          <div className="cart_item_check">
                            <input
                              type="checkbox"
                              checked={selected.includes(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              aria-label={`Seleccionar ${product.name}`}
                              disabled={isItemLoading}
                            />
                          </div>

                          <div className="cart_item_image">
                            <img src={product.image} alt={product.name} />
                          </div>

                          <div className="cart_item_main">
                            <div className="cart_item_top">
                              <div className="cart_item_info">
                                <h3 className="cart_item_name">{product.name}</h3>

                                <p className="cart_item_meta">
                                  {product.brand}
                                  {product.presentation ? ` · ${product.presentation}` : ""}
                                </p>

                                {product.promotion ? (
                                  <div className="cart_item_promo_badge is-applied">
                                    Promo aplicada: {product.promotion.name || "Promoción activa"}
                                  </div>
                                ) : null}

                                {product.giftUnits > 0 ? (
                                  <div className="cart_item_gift_note">
                                    {getGiftAccountingText(product)}
                                  </div>
                                ) : null}

                                {product.giftItemUnits > 0 ||
                                product.giftItems.length > 0 ? (
                                  <div className="cart_item_gift_note cart_item_gift_note--items">
                                    {getSelectedGiftItem(product.promotion ?? product)
                                      ? `Regalo elegido: ${getGiftItemsText(
                                          [getSelectedGiftItem(product.promotion ?? product)],
                                          product.giftItemUnits
                                        )}`
                                      : `${Number(product.giftItemUnits || 0)} regalo(s) pendiente(s) por elegir`}
                                  </div>
                                ) : null}

                                {Array.isArray(product.availablePromotions) &&
                                product.availablePromotions.length > 0 ? (
                                  <div className="cart_item_available_promos">
                                    {product.availablePromotions.map((promo, index) => {
                                      const promoGiftItems = normalizeGiftItems(
                                        promo.gift_items ??
                                          promo.giftItems ??
                                          promo.snapshot?.gift_items
                                      )
                                      const promoGiftItemUnits = Number(
                                        promo.gift_item_units ??
                                          promo.giftItemUnits ??
                                          promo.snapshot?.gift_item_units ??
                                          0
                                      )

                                      return (
                                        <div
                                          key={promo.id ?? `promo-${product.id}-${index}`}
                                          className={`cart_item_available_promo ${
                                            promo.is_eligible_now ? "is-ready" : "is-pending"
                                          }`}
                                        >
                                          <strong>{promo.name || "Promoción disponible"}</strong>

                                          <span>
                                            {promo.progress_message ||
                                              promo.message ||
                                              "Este producto tiene una promoción disponible."}
                                          </span>

                                          {promoGiftItemUnits > 0 ||
                                          promoGiftItems.length > 0 ? (
                                            <small>
                                              {getGiftItemsText(
                                                promoGiftItems,
                                                promoGiftItemUnits
                                              )}
                                            </small>
                                          ) : null}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : null}
                              </div>

                              <div className="cart_item_price_block">
                                {product.oldPrice ? (
                                  <div className="cart_item_old_price">
                                    {formatMoney(product.oldPrice)}
                                  </div>
                                ) : null}

                                <div className="cart_item_price">
                                  P. Unitario {formatMoney(product.price)}
                                </div>

                                {product.discount > 0 ? (
                                  <div className="cart_item_discount">
                                    {product.discount}% OFF
                                  </div>
                                ) : null}

                                {product.discountAmount > 0 ? (
                                  <div className="cart_item_discount_amount">
                                    Ahorras {formatMoney(product.discountAmount)}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="cart_item_bottom">
                              <div className="cart_item_qty_area">
                                <div className="qty_control">
                                  <button
                                    type="button"
                                    className="qty_btn"
                                    onClick={() => updateQuantityByDelta(product, -1)}
                                    disabled={isItemLoading}
                                  >
                                    -
                                  </button>

                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={product.quantity}
                                    onChange={(e) =>
                                      handleQuantityInput(product.id, e.target.value)
                                    }
                                    onBlur={() => commitQuantityChange(product)}
                                    disabled={isItemLoading}
                                  />

                                  <button
                                    type="button"
                                    className="qty_btn"
                                    onClick={() => updateQuantityByDelta(product, 1)}
                                    disabled={isItemLoading}
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="cart_item_available">
                                  {product.status === "active"
                                    ? "Disponible"
                                    : "Revisar disponibilidad"}
                                </span>
                              </div>

                              <div className="cart_item_actions">
                                <button type="button" className="item_action_btn" disabled>
                                  Guardar en lista
                                </button>

                                <button
                                  type="button"
                                  className="item_action_btn delete"
                                  onClick={() => handleRemoveItem(product.id)}
                                  disabled={isItemLoading}
                                >
                                  {isItemLoading ? "Eliminando..." : "Eliminar"}
                                </button>
                              </div>

                              <div className="cart_item_subtotal">
                                <span className="cart_item_subtotal_label">
                                  Subtotal
                                </span>
                                <strong>{formatMoney(getLineTotal(product))}</strong>
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </div>
            </section>

            <aside className="cart_sidebar">
              <div className="summary_card">
                <h2 className="summary_title">Resumen de compra</h2>

                {Array.isArray(cart.promotionsApplied) && cart.promotionsApplied.length > 0 ? (
                <div className="summary_promotions">
                  {cart.promotionsApplied.map((promotion, index) => {
                    const giftOptions = normalizeGiftItems(
                      promotion.snapshot?.gift_items ?? promotion.giftItems
                    )
                    const selectedGiftItem = getSelectedGiftItem(promotion)
                    const brandSubtotal = Number(
                      promotion.snapshot?.brand_subtotal ?? 0
                    )
                    const minimumAmount = Number(
                      promotion.snapshot?.minimum_amount ?? 0
                    )
                    const targetProductAdded = hasGiftProductInCart(promotion)
                    const selectingGift = isPromotionLoading(
                      promotion.id,
                      "select-gift"
                    )
                    const clearingGift = isPromotionLoading(
                      promotion.id,
                      "clear-gift"
                    )
                    const addingGiftProduct = isPromotionLoading(
                      promotion.id,
                      "add-gift-product"
                    )

                    return (
                      <div
                        className="summary_promotion_item"
                        key={promotion.id ?? `promotion-${index}`}
                      >
                        <strong>{promotion.name || "Promoción aplicada"}</strong>

                        {promotion.totalDiscount > 0 ? (
                          <span>Ahorras {formatMoney(promotion.totalDiscount)}</span>
                        ) : null}

                        {brandSubtotal > 0 && minimumAmount > 0 ? (
                          <span>
                            Marca {promotion.snapshot?.brand || "-"}:{" "}
                            {formatMoney(brandSubtotal)} de {formatMoney(minimumAmount)}
                          </span>
                        ) : null}

                        {promotion.giftUnits > 0 ? (
                          <span>
                            {getGiftAccountingText({
                              giftUnits: promotion.giftUnits,
                              giftUnitAccountingPrice:
                                promotion.snapshot?.gift_unit_accounting_price,
                              giftLineTotal: promotion.giftLineTotal,
                            })}
                          </span>
                        ) : null}

                        {(() => {
                          const displayGift = getPromotionDisplayGiftItems(promotion)

                          return displayGift.giftItemUnits > 0 ? (
                            <span>
                              {displayGift.hasSelection
                                ? `Regalo elegido: ${getGiftItemsText(
                                    displayGift.giftItems,
                                    displayGift.giftItemUnits
                                  )}`
                                : `${displayGift.giftItemUnits} regalo(s) pendiente(s) por elegir`}
                            </span>
                          ) : null
                        })()}

                        {promotion.type === "brand_amount_choose_gift_item" ? (
                          <div className="summary_promotion_interactive">
                            {selectedGiftItem ? (
                              <div className="summary_selected_gift">
                                {selectedGiftItem.imageUrl ? (
                                  <img
                                    src={normalizeMediaUrl(selectedGiftItem.imageUrl)}
                                    alt={selectedGiftItem.name}
                                  />
                                ) : (
                                  <div className="summary_selected_gift_placeholder">
                                    Regalo
                                  </div>
                                )}

                                <div>
                                  <span className="summary_selected_gift_label">
                                    Regalo seleccionado
                                  </span>
                                  <strong>{selectedGiftItem.name}</strong>
                                  {selectedGiftItem.code ? (
                                    <small>{selectedGiftItem.code}</small>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <small className="summary_promotion_alert">
                                Elige tu regalo para completar esta promoción.
                              </small>
                            )}

                            {giftOptions.length > 0 ? (
                              <div className="summary_gift_options">
                                {giftOptions.map((giftItem) => {
                                  const isSelected =
                                    Number(promotion.snapshot?.selected_gift_item_id ?? 0) ===
                                    Number(giftItem.id)

                                  return (
                                    <button
                                      key={giftItem.id}
                                      type="button"
                                      className={`summary_gift_option ${
                                        isSelected ? "is-selected" : ""
                                      }`}
                                      onClick={() =>
                                        handleSelectPromotionGift(
                                          promotion.id,
                                          giftItem.id
                                        )
                                      }
                                      disabled={selectingGift || clearingGift}
                                    >
                                      {giftItem.imageUrl ? (
                                        <img
                                          src={normalizeMediaUrl(giftItem.imageUrl)}
                                          alt={giftItem.name}
                                        />
                                      ) : (
                                        <div className="summary_gift_option_placeholder">
                                          Regalo
                                        </div>
                                      )}

                                      <span>{giftItem.name}</span>
                                      {giftItem.unitLabel ? (
                                        <small>{giftItem.unitLabel}</small>
                                      ) : null}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}

                            <div className="summary_promotion_actions_inline">
                              {selectedGiftItem ? (
                                <button
                                  type="button"
                                  className="btn btn_secondary summary_promotion_button"
                                  onClick={() =>
                                    handleClearPromotionGiftSelection(promotion.id)
                                  }
                                  disabled={selectingGift || clearingGift}
                                >
                                  {clearingGift ? "Quitando..." : "Quitar selección"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {promotion.type === "brand_amount_get_product" ? (
                          <div className="summary_promotion_interactive">
                            <small>
                              SKU regalo #{promotion.snapshot?.target_product_id || "-"} ·
                              Cantidad {promotion.snapshot?.target_quantity || 0}
                            </small>

                            {targetProductAdded ? (
                              <small className="summary_promotion_success">
                                El SKU regalo ya está en tu carrito.
                              </small>
                            ) : (
                              <button
                                type="button"
                                className="btn btn_secondary summary_promotion_button"
                                onClick={() =>
                                  handleAddPromotionGiftProduct(promotion.id)
                                }
                                disabled={addingGiftProduct}
                              >
                                {addingGiftProduct ? "Agregando..." : "Agregar regalo"}
                              </button>
                            )}
                          </div>
                        ) : null}

                        {promotion.snapshot?.accounting_note ? (
                          <small>{promotion.snapshot.accounting_note}</small>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}

                <div className="summary_rows">
                  <div className="summary_row">
                    <span>Productos ({cart.items_count || products.length})</span>
                    <span>{formatMoney(cart.subtotal)}</span>
                  </div>

                  <div className="summary_row">
                    <span>Descuento</span>
                    <span>
                      {cart.discount > 0
                        ? `- ${formatMoney(cart.discount)}`
                        : formatMoney(0)}
                    </span>
                  </div>

                  <div className="summary_row">
                    <span>Impuestos</span>
                    <span>{formatMoney(cart.tax)}</span>
                  </div>

                </div>

                <div className="summary_total">
                  <span>Total</span>
                  <strong>{formatMoney(cart.total)}</strong>
                </div>

                <div className="summary_actions">
                  <Link
                    to="/checkout"
                    className={`btn btn_primary ${
                      hasPendingGiftSelection ? "is-disabled" : ""
                    }`}
                    onClick={handleCheckoutNavigation}
                    aria-disabled={hasPendingGiftSelection}
                  >
                    Continuar al checkout
                  </Link>

                  <Link to="/productos" className="btn btn_ghost">
                    Seguir comprando
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {products.length ? (
        <div className="cart_mobile_bar">
          <div className="cart_mobile_bar_info">
            <span className="mobile_bar_label">Total</span>
            <strong className="mobile_bar_total">{formatMoney(cart.total)}</strong>
          </div>

          <Link
            to="/checkout"
            className={`btn btn_primary mobile_checkout_btn ${
              hasPendingGiftSelection ? "is-disabled" : ""
            }`}
            onClick={handleCheckoutNavigation}
            aria-disabled={hasPendingGiftSelection}
          >
            Checkout
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function normalizeGiftItems(items) {
  if (!Array.isArray(items)) return []

  return items
    .filter(Boolean)
    .map((item) => ({
      id: item.id ?? item.gift_item_id ?? item.code ?? item.name,
      name: item.name ?? "Artículo de regalo",
      code: item.code ?? "",
      description: item.description ?? "",
      imageUrl: item.image_url ?? item.imageUrl ?? "",
      estimatedValue: item.estimated_value ?? item.estimatedValue ?? null,
      unitLabel: item.unit_label ?? item.unitLabel ?? "",
    }))
}

function normalizeTaxes(taxes) {
  if (!Array.isArray(taxes)) return []

  return taxes.filter(Boolean).map((tax) => ({
    impuesto_art_id: tax.impuesto_art_id ?? null,
    impuesto_id: tax.impuesto_id ?? null,
    nombre: tax.nombre ?? "",
    pctje_impuesto: Number(tax.pctje_impuesto ?? 0),
    importe: Number(tax.importe ?? 0),
  }))
}

function normalizeTaxBreakdown(taxBreakdown) {
  const items = Array.isArray(taxBreakdown?.items) ? taxBreakdown.items : []

  return {
    total: Number(taxBreakdown?.total ?? 0),
    items: items.filter(Boolean).map((item) => ({
      cart_item_id: item.cart_item_id ?? item.id ?? null,
      product_id: item.product_id ?? null,
      microsip_id: item.microsip_id ?? "",
      taxable_base: Number(item.taxable_base ?? 0),
      tax_amount: Number(item.tax_amount ?? item.tax ?? 0),
      taxes: normalizeTaxes(item.taxes),
    })),
  }
}

function hasRecentStripeSuccessReturn() {
  try {
    const raw = sessionStorage.getItem(STRIPE_SUCCESS_RETURN_STORAGE_KEY)
    if (!raw) return false

    const data = JSON.parse(raw)
    const timestamp = Number(data?.timestamp || 0)
    const fifteenMinutes = 15 * 60 * 1000

    return Boolean(timestamp && Date.now() - timestamp < fifteenMinutes)
  } catch {
    return false
  }
}

export default CartPage
