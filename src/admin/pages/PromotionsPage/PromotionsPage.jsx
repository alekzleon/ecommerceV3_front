import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import AdminCard from "../../components/AdminCard/AdminCard"
import {
  createAdminPromotion,
  getAdminPromotionFormOptions,
  getAdminProductsForPromotions,
  getAdminPromotions,
  updateAdminPromotion,
  toggleAdminPromotion,
} from "../../../services/api/promotionsService.js"
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "../../../utils/toast.js"
import "./PromotionsPage.css"

const PROMOTION_TYPE_OPTIONS = [
  {
    value: "direct_percentage",
    label: "Descuento directo %",
    description: "Aplica un porcentaje directo al producto seleccionado.",
  },
  {
    value: "strikethrough_price",
    label: "Precio tachado",
    description: "Define un precio promocional fijo para el producto.",
  },
  {
    value: "bundle_pay_x_take_y",
    label: "Lleva X y paga Y",
    description: "Ejemplo: lleva 3 y paga 2 del mismo producto.",
  },
  {
    value: "buy_x_get_discount",
    label: "Compra X y obtiene descuento",
    description: "Ejemplo: compra 3 unidades y aplica 10% de descuento.",
  },
  {
    value: "buy_x_get_y",
    label: "Compra X y recibe Y",
    description: "Ejemplo: compra 2 y recibe otro producto gratis o con descuento.",
  },
  {
    value: "buy_sku_get_gift_item",
    label: "Compra SKU y recibe regalo",
    description: "Al comprar el SKU seleccionado, entrega uno o varios artículos de regalo.",
  },
  {
    value: "brand_amount_choose_gift_item",
    label: "Monto por marca y elige regalo",
    description: "Al alcanzar el monto de una marca, el cliente puede elegir regalo.",
  },
  {
    value: "brand_amount_get_product",
    label: "Monto por marca y recibe SKU",
    description: "Al alcanzar el monto de una marca, entrega un producto del catálogo.",
  },
]

const emptyConfig = {
  discount_percentage: "",
  promotional_price: "",
  buy_quantity: "",
  pay_quantity: "",
  target_product_id: "",
  target_quantity: "",
  gift_quantity: "",
  brand: "",
  minimum_amount: "",
  selection_required: true,
}

const defaultForm = {
  id: null,
  name: "",
  slug: "",
  description: "",
  type: "direct_percentage",
  is_active: true,
  starts_at: "",
  ends_at: "",
  requires_login: false,
  is_general: true,
  is_combinable: false,
  priority: 100,
  product_ids: [],
  gift_item_ids: [],
  config: { ...emptyConfig },
}

function PromotionsPage() {
  const navigate = useNavigate()
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [giftItems, setGiftItems] = useState([])
  const [brandOptions, setBrandOptions] = useState([])
  const [apiPromotionTypes, setApiPromotionTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingFormOptions, setLoadingFormOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [search, setSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [giftSearch, setGiftSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPromotionId, setEditingPromotionId] = useState(null)
  const [form, setForm] = useState(defaultForm)

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const response = await getAdminPromotions()
      const rows = normalizeCollectionResponse(response)
      setPromotions(rows)
    } catch (error) {
      console.error("Error al cargar promociones:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message ||
          "No fue posible cargar las promociones."
      )
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      setLoadingProducts(true)

      const response = await getAdminProductsForPromotions({
        per_page: 300,
      })

      const rows = normalizeCollectionResponse(response)

      const normalized = Array.isArray(rows)
        ? rows.map((product) => ({
            id: Number(product.id),
            name: product.name ?? "Sin nombre",
            sku: product.sku ?? "",
            price: product.price ?? null,
            is_active: product.is_active ?? true,
          }))
        : []

      setProducts(normalized)
    } catch (error) {
      console.error(
        "Error al cargar productos para promociones:",
        error?.response?.data || error
      )
      notifyWarning(
        error?.response?.data?.message ||
          "No fue posible cargar el catálogo de productos para promociones."
      )
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadFormOptions = async () => {
    try {
      setLoadingFormOptions(true)
      const response = await getAdminPromotionFormOptions()
      const data = response?.data ?? {}

      setApiPromotionTypes(
        Array.isArray(data.promotion_types) ? data.promotion_types : []
      )
      setBrandOptions(Array.isArray(data.brand_options) ? data.brand_options : [])
      setGiftItems(
        Array.isArray(data.gift_items)
          ? data.gift_items.map((item) => ({
              id: Number(item.id),
              name: item.name ?? "Regalo sin nombre",
              code: item.code ?? "",
              estimated_value: item.estimated_value ?? null,
              unit_label: item.unit_label ?? "",
              is_active: item.is_active ?? true,
            }))
          : []
      )
    } catch (error) {
      console.error(
        "Error al cargar opciones del formulario de promociones:",
        error?.response?.data || error
      )
      notifyWarning(
        error?.response?.data?.message ||
          "No fue posible cargar regalos y marcas para promociones."
      )
      setApiPromotionTypes([])
      setBrandOptions([])
      setGiftItems([])
    } finally {
      setLoadingFormOptions(false)
    }
  }

  useEffect(() => {
    loadPromotions()
    loadProducts()
    loadFormOptions()
  }, [])

  const filteredPromotions = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return promotions

    return promotions.filter((promotion) => {
      const text = [
        promotion.name,
        promotion.slug,
        promotion.type,
        promotion.description,
      ]
        .join(" ")
        .toLowerCase()

      return text.includes(term)
    })
  }, [promotions, search])

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()

    if (!term) return products

    return products.filter((product) => {
      const text = [product.name, product.sku].join(" ").toLowerCase()
      return text.includes(term)
    })
  }, [products, productSearch])

  const filteredGiftItems = useMemo(() => {
    const term = giftSearch.trim().toLowerCase()

    if (!term) return giftItems

    return giftItems.filter((item) => {
      const text = [item.name, item.code].join(" ").toLowerCase()
      return text.includes(term)
    })
  }, [giftItems, giftSearch])

  const promotionTypeOptions = useMemo(() => {
    const merged = [...PROMOTION_TYPE_OPTIONS]

    apiPromotionTypes.forEach((option) => {
      if (!option?.value) return

      const existingIndex = merged.findIndex((item) => item.value === option.value)

      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          label: option.label ?? merged[existingIndex].label,
        }
        return
      }

      merged.push({
        value: option.value,
        label: option.label ?? option.value,
        description: "Tipo de promoción disponible desde el administrador.",
      })
    })

    return merged
  }, [apiPromotionTypes])

  const selectedProducts = useMemo(() => {
    if (!Array.isArray(form.product_ids) || form.product_ids.length === 0) return []

    return products.filter((product) => form.product_ids.includes(product.id))
  }, [products, form.product_ids])

  const selectedGiftItems = useMemo(() => {
    if (!Array.isArray(form.gift_item_ids) || form.gift_item_ids.length === 0) {
      return []
    }

    return giftItems.filter((item) => form.gift_item_ids.includes(item.id))
  }, [giftItems, form.gift_item_ids])

  const selectedTypeMeta = useMemo(() => {
    return promotionTypeOptions.find((item) => item.value === form.type)
  }, [promotionTypeOptions, form.type])

  const resetForm = () => {
    setForm({
      ...defaultForm,
      config: { ...emptyConfig },
      product_ids: [],
      gift_item_ids: [],
    })
    setEditingPromotionId(null)
    setProductSearch("")
    setGiftSearch("")
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (promotion) => {
    setEditingPromotionId(promotion.id)

    setForm({
      id: promotion.id,
      name: promotion.name ?? "",
      slug: promotion.slug ?? "",
      description: promotion.description ?? "",
      type: promotion.type ?? "direct_percentage",
      is_active: Boolean(promotion.is_active),
      starts_at: toDateTimeLocalValue(promotion.starts_at),
      ends_at: toDateTimeLocalValue(promotion.ends_at),
      requires_login: Boolean(promotion.requires_login),
      is_general: Boolean(promotion.is_general),
      is_combinable: Boolean(promotion.is_combinable),
      priority: Number(promotion.priority ?? 100),
      product_ids: Array.isArray(promotion.products)
        ? promotion.products.map((item) => Number(item.id))
        : Array.isArray(promotion.product_ids)
        ? promotion.product_ids.map((id) => Number(id))
        : [],
      gift_item_ids: Array.isArray(promotion.gift_items)
        ? promotion.gift_items.map((item) => Number(item.id))
        : Array.isArray(promotion.gift_item_ids)
        ? promotion.gift_item_ids.map((id) => Number(id))
        : [],
      config: {
        ...emptyConfig,
        discount_percentage: promotion?.config?.discount_percentage ?? "",
        promotional_price: promotion?.config?.promotional_price ?? "",
        buy_quantity: promotion?.config?.buy_quantity ?? "",
        pay_quantity: promotion?.config?.pay_quantity ?? "",
        target_product_id: promotion?.config?.target_product_id ?? "",
        target_quantity: promotion?.config?.target_quantity ?? "",
        gift_quantity: promotion?.config?.gift_quantity ?? "",
        brand: promotion?.config?.brand ?? "",
        minimum_amount: promotion?.config?.minimum_amount ?? "",
        selection_required: promotion?.config?.selection_required ?? true,
      },
    })

    setProductSearch("")
    setGiftSearch("")
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setIsModalOpen(false)
    resetForm()
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConfigChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }))
  }

  const handleTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      type: value,
      product_ids: promotionTypeRequiresProducts(value) ? prev.product_ids : [],
      gift_item_ids: promotionTypeRequiresGiftItems(value)
        ? prev.gift_item_ids
        : [],
      config: { ...emptyConfig },
    }))
  }

  const toggleProductSelection = (productId) => {
    setForm((prev) => {
      const exists = prev.product_ids.includes(productId)

      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((id) => id !== productId)
          : [...prev.product_ids, productId],
      }
    })
  }

  const clearSelectedProducts = () => {
    setForm((prev) => ({
      ...prev,
      product_ids: [],
    }))
  }

  const toggleGiftSelection = (giftItemId) => {
    setForm((prev) => {
      const exists = prev.gift_item_ids.includes(giftItemId)

      return {
        ...prev,
        gift_item_ids: exists
          ? prev.gift_item_ids.filter((id) => id !== giftItemId)
          : [...prev.gift_item_ids, giftItemId],
      }
    })
  }

  const clearSelectedGiftItems = () => {
    setForm((prev) => ({
      ...prev,
      gift_item_ids: [],
    }))
  }

  const buildPayload = () => {
    const payload = {
      name: String(form.name || "").trim(),
      slug: String(form.slug || "").trim(),
      description: String(form.description || "").trim() || null,
      type: form.type,
      is_active: Boolean(form.is_active),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      requires_login: Boolean(form.requires_login),
      is_general: Boolean(form.is_general),
      is_combinable: Boolean(form.is_combinable),
      priority: Number(form.priority || 0),
      config: {},
    }

    if (promotionTypeRequiresProducts(form.type)) {
      payload.product_ids = form.product_ids.map((id) => Number(id))
    }

    if (promotionTypeRequiresGiftItems(form.type)) {
      payload.gift_item_ids = form.gift_item_ids.map((id) => Number(id))
    }

    switch (form.type) {
      case "direct_percentage":
        payload.config = {
          discount_percentage: Number(form.config.discount_percentage || 0),
        }
        break

      case "strikethrough_price":
        payload.config = {
          promotional_price: Number(form.config.promotional_price || 0),
        }
        break

      case "bundle_pay_x_take_y":
        payload.config = {
          buy_quantity: Number(form.config.buy_quantity || 0),
          pay_quantity: Number(form.config.pay_quantity || 0),
        }
        break

      case "buy_x_get_discount":
        payload.config = {
          buy_quantity: Number(form.config.buy_quantity || 0),
          discount_percentage: Number(form.config.discount_percentage || 0),
        }
        break

      case "buy_x_get_y":
        payload.config = {
          buy_quantity: Number(form.config.buy_quantity || 0),
          target_product_id: Number(form.config.target_product_id || 0),
          target_quantity: Number(form.config.target_quantity || 0),
          discount_percentage: Number(form.config.discount_percentage || 100),
        }
        break

      case "buy_sku_get_gift_item":
        payload.config = {
          buy_quantity: Number(form.config.buy_quantity || 0),
          gift_quantity: Number(form.config.gift_quantity || 0),
        }
        break

      case "brand_amount_choose_gift_item":
        payload.config = {
          brand: String(form.config.brand || "").trim(),
          minimum_amount: Number(form.config.minimum_amount || 0),
          gift_quantity: Number(form.config.gift_quantity || 0),
          selection_required: Boolean(form.config.selection_required),
        }
        break

      case "brand_amount_get_product":
        payload.config = {
          brand: String(form.config.brand || "").trim(),
          minimum_amount: Number(form.config.minimum_amount || 0),
          target_product_id: Number(form.config.target_product_id || 0),
          target_quantity: Number(form.config.target_quantity || 0),
        }
        break

      default:
        payload.config = {}
        break
    }

    return payload
  }

  const validateBeforeSubmit = (payload) => {
    if (!payload.name) {
      notifyWarning("Escribe el nombre de la promoción.")
      return false
    }

    if (!payload.slug) {
      notifyWarning("Escribe el slug de la promoción.")
      return false
    }

    if (!payload.type) {
      notifyWarning("Selecciona el tipo de promoción.")
      return false
    }

    if (
      promotionTypeRequiresProducts(payload.type) &&
      !payload.product_ids?.length
    ) {
      notifyWarning("Selecciona al menos un producto para la promoción.")
      return false
    }

    if (
      promotionTypeRequiresGiftItems(payload.type) &&
      !payload.gift_item_ids?.length
    ) {
      notifyWarning("Selecciona al menos un regalo para la promoción.")
      return false
    }

    if (
      payload.starts_at &&
      payload.ends_at &&
      new Date(payload.ends_at).getTime() < new Date(payload.starts_at).getTime()
    ) {
      notifyWarning("La fecha final no puede ser menor que la fecha inicial.")
      return false
    }

    if (
      payload.type === "direct_percentage" &&
      payload.config.discount_percentage <= 0
    ) {
      notifyWarning("Ingresa un porcentaje válido.")
      return false
    }

    if (
      payload.type === "strikethrough_price" &&
      payload.config.promotional_price <= 0
    ) {
      notifyWarning("Ingresa un precio promocional válido.")
      return false
    }

    if (payload.type === "bundle_pay_x_take_y") {
      if (
        payload.config.buy_quantity <= 0 ||
        payload.config.pay_quantity < 0 ||
        payload.config.pay_quantity >= payload.config.buy_quantity
      ) {
        notifyWarning("Revisa la configuración de lleva X y paga Y.")
        return false
      }
    }

    if (payload.type === "buy_x_get_discount") {
      if (
        payload.config.buy_quantity <= 0 ||
        payload.config.discount_percentage <= 0
      ) {
        notifyWarning("Revisa la configuración de compra X y descuento.")
        return false
      }
    }

    if (payload.type === "buy_x_get_y") {
      if (
        payload.config.buy_quantity <= 0 ||
        payload.config.target_product_id <= 0 ||
        payload.config.target_quantity <= 0 ||
        payload.config.discount_percentage <= 0
      ) {
        notifyWarning("Revisa la configuración de compra X y recibe Y.")
        return false
      }
    }

    if (payload.type === "buy_sku_get_gift_item") {
      if (payload.config.buy_quantity <= 0 || payload.config.gift_quantity <= 0) {
        notifyWarning("Revisa la configuración de compra SKU y regalo.")
        return false
      }
    }

    if (payload.type === "brand_amount_choose_gift_item") {
      if (
        !payload.config.brand ||
        payload.config.minimum_amount <= 0 ||
        payload.config.gift_quantity <= 0
      ) {
        notifyWarning("Revisa marca, monto mínimo y cantidad de regalos.")
        return false
      }
    }

    if (payload.type === "brand_amount_get_product") {
      if (
        !payload.config.brand ||
        payload.config.minimum_amount <= 0 ||
        payload.config.target_product_id <= 0 ||
        payload.config.target_quantity <= 0
      ) {
        notifyWarning("Revisa marca, monto mínimo y SKU a entregar.")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = buildPayload()

    if (!validateBeforeSubmit(payload)) {
      return
    }

    try {
      setSaving(true)

      if (editingPromotionId) {
        await updateAdminPromotion(editingPromotionId, payload)
        notifySuccess("Promoción actualizada correctamente.")
      } else {
        await createAdminPromotion(payload)
        notifySuccess("Promoción creada correctamente.")
      }

      await loadPromotions()
      closeModal()
    } catch (error) {
      console.error("Error al guardar promoción:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message ||
          "No fue posible guardar la promoción."
      )
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePromotion = async (promotion) => {
    try {
      setTogglingId(promotion.id)
      await toggleAdminPromotion(promotion.id)
      notifySuccess("Estado de la promoción actualizado.")
      await loadPromotions()
    } catch (error) {
      console.error(
        "Error al cambiar estado de promoción:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible actualizar el estado."
      )
    } finally {
      setTogglingId(null)
    }
  }

  const rightActions = (
    <div className="promotions_toolbar">
      <div className="promotions_actions">
        <div className="promotions_search">
          <input
            type="text"
            placeholder="Buscar promoción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn_primary"
          onClick={openCreateModal}
        >
          Nueva promoción
        </button>
        <button
          type="button"
          className="btn_secondary"
          onClick={() => navigate("/admin/promotions/gift-items")}
        >
          Regalos
        </button>
      </div>
    </div>
  )

  return (
    <>
      <AdminCard
        title="Promociones"
        subtitle="Crea, edita y controla promociones sin salir de esta ruta."
        right={rightActions}
      >
        <div className="promotions_page">
          {loading ? (
            <div className="promotions_empty">
              <h3>Cargando promociones...</h3>
              <p>Espera un momento mientras obtenemos la información.</p>
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="promotions_empty">
              <h3>No hay promociones registradas</h3>
              <p>
                Todavía no existen promociones o no coinciden con tu búsqueda.
              </p>
            </div>
          ) : (
            <div className="promotions_table_wrapper">
              <table className="promotions_table">
                <thead>
                  <tr>
                    <th>Promoción</th>
                    <th>Tipo</th>
                    <th>Configuración</th>
                    <th>Vigencia</th>
                    <th>Relaciones</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPromotions.map((promotion) => (
                    <tr key={promotion.id}>
                      <td>
                        <div className="promotion-main-cell">
                          <strong>{promotion.name}</strong>
                          <span>{promotion.slug}</span>
                          {promotion.description ? (
                            <small>{promotion.description}</small>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <span className="promo_type">
                          {getPromotionTypeLabel(promotion.type)}
                        </span>
                      </td>

                      <td>
                        <div className="promotion-config-preview">
                          {formatPromotionConfig(promotion, products)}
                        </div>
                      </td>

                      <td>
                        <div className="promotion-dates">
                          <span>
                            <strong>Inicio:</strong>{" "}
                            {promotion.starts_at
                              ? formatDateTime(promotion.starts_at)
                              : "Sin fecha"}
                          </span>
                          <span>
                            <strong>Fin:</strong>{" "}
                            {promotion.ends_at
                              ? formatDateTime(promotion.ends_at)
                              : "Sin fecha"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="promotion-products-cell">
                          <strong>{promotion.products_count ?? promotion.products?.length ?? 0} producto(s)</strong>

                          {Array.isArray(promotion.products) && promotion.products.length > 0 ? (
                            <div className="promotion-products-preview">
                              {promotion.products.slice(0, 3).map((product) => (
                                <span key={product.id} className="promotion-product-badge">
                                  {product.name}
                                </span>
                              ))}

                              {promotion.products.length > 3 ? (
                                <small>+{promotion.products.length - 3} más</small>
                              ) : null}
                            </div>
                          ) : (
                            <small className="promotion-products-empty-text">
                              Sin detalle de productos
                            </small>
                          )}

                          {promotion.gift_items_count || promotion.gift_items?.length ? (
                            <div className="promotion-products-preview">
                              <strong>
                                {promotion.gift_items_count ??
                                  promotion.gift_items?.length ??
                                  0}{" "}
                                regalo(s)
                              </strong>

                              {Array.isArray(promotion.gift_items)
                                ? promotion.gift_items.slice(0, 3).map((item) => (
                                    <span
                                      key={item.id}
                                      className="promotion-product-badge"
                                    >
                                      {item.name}
                                    </span>
                                  ))
                                : null}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td>{promotion.priority ?? 0}</td>

                      <td>
                        <div className="promotion-status-cell">
                          <span
                            className={`promo_status ${
                              promotion.is_active ? "active" : "inactive"
                            }`}
                          >
                            {promotion.is_active ? "Activa" : "Inactiva"}
                          </span>

                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={Boolean(promotion.is_active)}
                              onChange={() => handleTogglePromotion(promotion)}
                              disabled={togglingId === promotion.id}
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="btn_secondary"
                          onClick={() => openEditModal(promotion)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminCard>

      {isModalOpen ? (
        <div className="promo_modal_overlay" onClick={closeModal}>
          <div className="promo_modal promo_modal_compact" onClick={(e) => e.stopPropagation()}>
            <div className="promotion-modal-header">
              <div>
                <h3>{editingPromotionId ? "Editar promoción" : "Nueva promoción"}</h3>
                <p>
                  Configura reglas, vigencia y productos desde un solo lugar.
                </p>
              </div>

              <button
                type="button"
                className="promotion-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form className="promo_form" onSubmit={handleSubmit}>
              <div className="promo_admin_layout">
                <div className="promo_admin_main">
                  <section className="promo_block">
                    <div className="promo_block_header">
                      <h4>Datos generales</h4>
                      <span>Identificación básica de la promoción</span>
                    </div>

                    <div className="promo_form_row">
                      <div className="promo_form_group">
                        <label>Nombre</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => {
                            handleChange("name", e.target.value)
                            if (!editingPromotionId) {
                              handleChange("slug", slugify(e.target.value))
                            }
                          }}
                          placeholder="Ej. Promo cubeta 10%"
                        />
                      </div>

                      <div className="promo_form_group">
                        <label>Slug</label>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) => handleChange("slug", slugify(e.target.value))}
                          placeholder="promo-cubeta-10"
                        />
                      </div>
                    </div>

                    <div className="promo_form_group">
                      <label>Descripción</label>
                      <textarea
                        rows="3"
                        value={form.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder="Describe brevemente qué hace esta promoción."
                      />
                    </div>
                  </section>

                  <section className="promo_block">
                    <div className="promo_block_header">
                      <h4>Regla de promoción</h4>
                      <span>Cómo se calcula o aplica el beneficio</span>
                    </div>

                    <div className="promo_form_row">
                      <div className="promo_form_group">
                        <label>Tipo de promoción</label>
                        <select
                          value={form.type}
                          onChange={(e) => handleTypeChange(e.target.value)}
                        >
                          {promotionTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <small>{selectedTypeMeta?.description ?? ""}</small>
                      </div>

                      <div className="promo_form_group">
                        <label>Prioridad</label>
                        <input
                          type="number"
                          value={form.priority}
                          onChange={(e) => handleChange("priority", e.target.value)}
                          min="0"
                          placeholder="100"
                        />
                        <small>Menor número = mayor prioridad.</small>
                      </div>
                    </div>

                    <div className="promo_config_box">
                      <div className="promotion-section">
                        {form.type === "direct_percentage" ? (
                          <div className="promo_form_row">
                            <div className="promo_form_group">
                              <label>Porcentaje de descuento</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.config.discount_percentage}
                                onChange={(e) =>
                                  handleConfigChange("discount_percentage", e.target.value)
                                }
                                placeholder="10"
                              />
                            </div>
                          </div>
                        ) : null}

                        {form.type === "strikethrough_price" ? (
                          <div className="promo_form_row">
                            <div className="promo_form_group">
                              <label>Precio promocional</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.config.promotional_price}
                                onChange={(e) =>
                                  handleConfigChange("promotional_price", e.target.value)
                                }
                                placeholder="199.90"
                              />
                            </div>
                          </div>
                        ) : null}

                        {form.type === "bundle_pay_x_take_y" ? (
                          <div className="promo_form_row">
                            <div className="promo_form_group">
                              <label>Lleva</label>
                              <input
                                type="number"
                                min="1"
                                value={form.config.buy_quantity}
                                onChange={(e) =>
                                  handleConfigChange("buy_quantity", e.target.value)
                                }
                                placeholder="3"
                              />
                            </div>

                            <div className="promo_form_group">
                              <label>Paga</label>
                              <input
                                type="number"
                                min="0"
                                value={form.config.pay_quantity}
                                onChange={(e) =>
                                  handleConfigChange("pay_quantity", e.target.value)
                                }
                                placeholder="2"
                              />
                            </div>
                          </div>
                        ) : null}

                        {form.type === "buy_x_get_discount" ? (
                          <div className="promo_form_row">
                            <div className="promo_form_group">
                              <label>Compra mínimo</label>
                              <input
                                type="number"
                                min="1"
                                value={form.config.buy_quantity}
                                onChange={(e) =>
                                  handleConfigChange("buy_quantity", e.target.value)
                                }
                                placeholder="3"
                              />
                            </div>

                            <div className="promo_form_group">
                              <label>Descuento %</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.config.discount_percentage}
                                onChange={(e) =>
                                  handleConfigChange("discount_percentage", e.target.value)
                                }
                                placeholder="10"
                              />
                            </div>
                          </div>
                        ) : null}

                        {form.type === "buy_x_get_y" ? (
                          <>
                            <div className="promo_form_row">
                              <div className="promo_form_group">
                                <label>Compra mínimo</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={form.config.buy_quantity}
                                  onChange={(e) =>
                                    handleConfigChange("buy_quantity", e.target.value)
                                  }
                                  placeholder="2"
                                />
                              </div>

                              <div className="promo_form_group">
                                <label>Producto objetivo</label>
                                <select
                                  value={form.config.target_product_id}
                                  onChange={(e) =>
                                    handleConfigChange("target_product_id", e.target.value)
                                  }
                                >
                                  <option value="">Selecciona un producto</option>
                                  {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                      {product.name} {product.sku ? `· ${product.sku}` : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="promo_form_row">
                              <div className="promo_form_group">
                                <label>Cantidad objetivo</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={form.config.target_quantity}
                                  onChange={(e) =>
                                    handleConfigChange("target_quantity", e.target.value)
                                  }
                                  placeholder="1"
                                />
                              </div>

                              <div className="promo_form_group">
                                <label>Descuento % sobre producto objetivo</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={form.config.discount_percentage}
                                  onChange={(e) =>
                                    handleConfigChange("discount_percentage", e.target.value)
                                  }
                                  placeholder="100"
                                />
                              </div>
                            </div>
                          </>
                        ) : null}

                        {form.type === "buy_sku_get_gift_item" ? (
                          <div className="promo_form_row">
                            <div className="promo_form_group">
                              <label>Cantidad a comprar</label>
                              <input
                                type="number"
                                min="1"
                                value={form.config.buy_quantity}
                                onChange={(e) =>
                                  handleConfigChange("buy_quantity", e.target.value)
                                }
                                placeholder="1"
                              />
                            </div>

                            <div className="promo_form_group">
                              <label>Cantidad de regalo</label>
                              <input
                                type="number"
                                min="1"
                                value={form.config.gift_quantity}
                                onChange={(e) =>
                                  handleConfigChange("gift_quantity", e.target.value)
                                }
                                placeholder="1"
                              />
                            </div>
                          </div>
                        ) : null}

                        {form.type === "brand_amount_choose_gift_item" ? (
                          <>
                            <div className="promo_form_row">
                              <div className="promo_form_group">
                                <label>Marca</label>
                                <select
                                  value={form.config.brand}
                                  onChange={(e) =>
                                    handleConfigChange("brand", e.target.value)
                                  }
                                >
                                  <option value="">Selecciona una marca</option>
                                  {form.config.brand &&
                                  !brandOptions.includes(form.config.brand) ? (
                                    <option value={form.config.brand}>
                                      {form.config.brand}
                                    </option>
                                  ) : null}
                                  {brandOptions.map((brand) => (
                                    <option key={brand} value={brand}>
                                      {brand}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="promo_form_group">
                                <label>Monto mínimo</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={form.config.minimum_amount}
                                  onChange={(e) =>
                                    handleConfigChange("minimum_amount", e.target.value)
                                  }
                                  placeholder="500"
                                />
                              </div>
                            </div>

                            <div className="promo_form_row">
                              <div className="promo_form_group">
                                <label>Cantidad de regalo</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={form.config.gift_quantity}
                                  onChange={(e) =>
                                    handleConfigChange("gift_quantity", e.target.value)
                                  }
                                  placeholder="1"
                                />
                              </div>

                              <div className="promo_form_group">
                                <label>Selección</label>
                                <label className="promotion-check promotion-check-inline">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(form.config.selection_required)}
                                    onChange={(e) =>
                                      handleConfigChange(
                                        "selection_required",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <span>El cliente elige regalo</span>
                                </label>
                              </div>
                            </div>
                          </>
                        ) : null}

                        {form.type === "brand_amount_get_product" ? (
                          <>
                            <div className="promo_form_row">
                              <div className="promo_form_group">
                                <label>Marca</label>
                                <select
                                  value={form.config.brand}
                                  onChange={(e) =>
                                    handleConfigChange("brand", e.target.value)
                                  }
                                >
                                  <option value="">Selecciona una marca</option>
                                  {form.config.brand &&
                                  !brandOptions.includes(form.config.brand) ? (
                                    <option value={form.config.brand}>
                                      {form.config.brand}
                                    </option>
                                  ) : null}
                                  {brandOptions.map((brand) => (
                                    <option key={brand} value={brand}>
                                      {brand}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="promo_form_group">
                                <label>Monto mínimo</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={form.config.minimum_amount}
                                  onChange={(e) =>
                                    handleConfigChange("minimum_amount", e.target.value)
                                  }
                                  placeholder="750"
                                />
                              </div>
                            </div>

                            <div className="promo_form_row">
                              <div className="promo_form_group">
                                <label>SKU a entregar</label>
                                <select
                                  value={form.config.target_product_id}
                                  onChange={(e) =>
                                    handleConfigChange("target_product_id", e.target.value)
                                  }
                                >
                                  <option value="">Selecciona un producto</option>
                                  {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                      {product.name} {product.sku ? `· ${product.sku}` : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="promo_form_group">
                                <label>Cantidad a entregar</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={form.config.target_quantity}
                                  onChange={(e) =>
                                    handleConfigChange("target_quantity", e.target.value)
                                  }
                                  placeholder="1"
                                />
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className="promo_block">
                    <div className="promo_block_header">
                      <h4>Vigencia y comportamiento</h4>
                      <span>Controla cuándo aplica y cómo convive con otras promociones</span>
                    </div>

                    <div className="promo_form_row">
                      <div className="promo_form_group">
                        <label>Inicio</label>
                        <input
                          type="datetime-local"
                          value={form.starts_at}
                          onChange={(e) => handleChange("starts_at", e.target.value)}
                        />
                      </div>

                      <div className="promo_form_group">
                        <label>Fin</label>
                        <input
                          type="datetime-local"
                          value={form.ends_at}
                          onChange={(e) => handleChange("ends_at", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="promotion-switches">
                      <label className="promotion-check">
                        <input
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(e) => handleChange("is_active", e.target.checked)}
                        />
                        <span>Activa</span>
                      </label>

                      <label className="promotion-check">
                        <input
                          type="checkbox"
                          checked={form.is_general}
                          onChange={(e) => handleChange("is_general", e.target.checked)}
                        />
                        <span>General</span>
                      </label>

                      <label className="promotion-check">
                        <input
                          type="checkbox"
                          checked={form.requires_login}
                          onChange={(e) =>
                            handleChange("requires_login", e.target.checked)
                          }
                        />
                        <span>Requiere login</span>
                      </label>

                      <label className="promotion-check">
                        <input
                          type="checkbox"
                          checked={form.is_combinable}
                          onChange={(e) =>
                            handleChange("is_combinable", e.target.checked)
                          }
                        />
                        <span>Combinable</span>
                      </label>
                    </div>
                  </section>

                  {promotionTypeRequiresProducts(form.type) ? (
                    <section className="promo_block">
                      <div className="promo_block_header">
                        <h4>Productos asignados</h4>
                        <span>Selecciona los productos que activan la promoción</span>
                      </div>

                      <div className="promotion-products-toolbar">
                        <div className="promotions_search promotions_search_products">
                          <input
                            type="text"
                            placeholder="Buscar producto por nombre o SKU"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                          />
                        </div>

                        <div className="promotion-products-toolbar-actions">
                          <span className="promotion-products-counter">
                            {selectedProducts.length} seleccionado(s)
                          </span>

                          {selectedProducts.length > 0 ? (
                            <button
                              type="button"
                              className="btn_secondary"
                              onClick={clearSelectedProducts}
                            >
                              Limpiar selección
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="promotion-products-list">
                        {loadingProducts ? (
                          <div className="promotion-products-empty">
                            Cargando productos...
                          </div>
                        ) : products.length === 0 ? (
                          <div className="promotion-products-empty">
                            No hay productos disponibles para asignar.
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="promotion-products-empty">
                            No hay coincidencias con tu búsqueda.
                          </div>
                        ) : (
                          filteredProducts.map((product) => {
                            const checked = form.product_ids.includes(product.id)

                            return (
                              <label
                                key={product.id}
                                className={`promotion-product-option ${
                                  checked ? "is-selected" : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleProductSelection(product.id)}
                                />

                                <span>
                                  {product.name}
                                  {product.sku ? <small>SKU: {product.sku}</small> : null}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </section>
                  ) : null}

                  {promotionTypeRequiresGiftItems(form.type) ? (
                    <section className="promo_block">
                      <div className="promo_block_header">
                        <h4>Artículos de regalo</h4>
                        <span>Selecciona los regalos disponibles para esta promoción</span>
                      </div>

                      <div className="promotion-products-toolbar">
                        <div className="promotions_search promotions_search_products">
                          <input
                            type="text"
                            placeholder="Buscar regalo por nombre o código"
                            value={giftSearch}
                            onChange={(e) => setGiftSearch(e.target.value)}
                          />
                        </div>

                        <div className="promotion-products-toolbar-actions">
                          <span className="promotion-products-counter">
                            {selectedGiftItems.length} seleccionado(s)
                          </span>

                          {selectedGiftItems.length > 0 ? (
                            <button
                              type="button"
                              className="btn_secondary"
                              onClick={clearSelectedGiftItems}
                            >
                              Limpiar selección
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="promotion-products-list">
                        {loadingFormOptions ? (
                          <div className="promotion-products-empty">
                            Cargando regalos...
                          </div>
                        ) : giftItems.length === 0 ? (
                          <div className="promotion-products-empty">
                            No hay artículos de regalo disponibles.
                          </div>
                        ) : filteredGiftItems.length === 0 ? (
                          <div className="promotion-products-empty">
                            No hay coincidencias con tu búsqueda.
                          </div>
                        ) : (
                          filteredGiftItems.map((item) => {
                            const checked = form.gift_item_ids.includes(item.id)

                            return (
                              <label
                                key={item.id}
                                className={`promotion-product-option ${
                                  checked ? "is-selected" : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleGiftSelection(item.id)}
                                />

                                <span>
                                  {item.name}
                                  {item.code ? <small>Código: {item.code}</small> : null}
                                  {item.estimated_value ? (
                                    <small>
                                      Valor: ${Number(item.estimated_value).toFixed(2)}
                                      {item.unit_label ? ` / ${item.unit_label}` : ""}
                                    </small>
                                  ) : null}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </section>
                  ) : null}
                </div>

                <aside className="promo_admin_aside">
                  <section className="promo_resume_card">
                    <h4>Resumen</h4>

                    <div className="promo_resume_item">
                      <span>Tipo</span>
                      <strong>{selectedTypeMeta?.label ?? "Sin tipo"}</strong>
                    </div>

                    <div className="promo_resume_item">
                      <span>Productos</span>
                      <strong>{selectedProducts.length}</strong>
                    </div>

                    {promotionTypeRequiresGiftItems(form.type) ? (
                      <div className="promo_resume_item">
                        <span>Regalos</span>
                        <strong>{selectedGiftItems.length}</strong>
                      </div>
                    ) : null}

                    {promotionTypeUsesBrand(form.type) ? (
                      <div className="promo_resume_item">
                        <span>Marca</span>
                        <strong>{form.config.brand || "Sin marca"}</strong>
                      </div>
                    ) : null}

                    <div className="promo_resume_item">
                      <span>Estado</span>
                      <strong>{form.is_active ? "Activa" : "Inactiva"}</strong>
                    </div>

                    <div className="promo_resume_item">
                      <span>Prioridad</span>
                      <strong>{form.priority || 0}</strong>
                    </div>

                    <div className="promo_resume_note">
                      Verifica la regla, vigencia y selección antes de guardar.
                    </div>
                  </section>

                  {selectedProducts.length > 0 ? (
                    <section className="promo_resume_card">
                      <h4>Productos seleccionados</h4>

                      <div className="promo_selected_products">
                        {selectedProducts.slice(0, 8).map((product) => (
                          <div key={product.id} className="promo_selected_product_item">
                            <strong>{product.name}</strong>
                            {product.sku ? <span>{product.sku}</span> : null}
                          </div>
                        ))}

                        {selectedProducts.length > 8 ? (
                          <div className="promo_selected_product_more">
                            +{selectedProducts.length - 8} más
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ) : null}

                  {selectedGiftItems.length > 0 ? (
                    <section className="promo_resume_card">
                      <h4>Regalos seleccionados</h4>

                      <div className="promo_selected_products">
                        {selectedGiftItems.slice(0, 8).map((item) => (
                          <div key={item.id} className="promo_selected_product_item">
                            <strong>{item.name}</strong>
                            {item.code ? <span>{item.code}</span> : null}
                          </div>
                        ))}

                        {selectedGiftItems.length > 8 ? (
                          <div className="promo_selected_product_more">
                            +{selectedGiftItems.length - 8} más
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                </aside>
              </div>

              <div className="promo_modal_footer">
                <button
                  type="button"
                  className="btn_secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button type="submit" className="btn_primary" disabled={saving}>
                  {saving
                    ? editingPromotionId
                      ? "Guardando..."
                      : "Creando..."
                    : editingPromotionId
                    ? "Guardar cambios"
                    : "Crear promoción"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

function normalizeCollectionResponse(response) {
  if (Array.isArray(response)) return response

  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.data)) return response.data.data
  if (Array.isArray(response?.rows)) return response.rows
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.items)) return response.items

  return []
}

function promotionTypeRequiresProducts(type) {
  return [
    "direct_percentage",
    "strikethrough_price",
    "bundle_pay_x_take_y",
    "buy_x_get_discount",
    "buy_x_get_y",
    "buy_sku_get_gift_item",
  ].includes(type)
}

function promotionTypeRequiresGiftItems(type) {
  return ["buy_sku_get_gift_item", "brand_amount_choose_gift_item"].includes(type)
}

function promotionTypeUsesBrand(type) {
  return ["brand_amount_choose_gift_item", "brand_amount_get_product"].includes(
    type
  )
}

function getPromotionTypeLabel(type) {
  const option = PROMOTION_TYPE_OPTIONS.find((item) => item.value === type)
  return option?.label ?? type
}

function formatPromotionConfig(promotion, products = []) {
  const config = promotion?.config ?? {}

  switch (promotion?.type) {
    case "direct_percentage":
      return `${config.discount_percentage ?? 0}% de descuento`

    case "strikethrough_price":
      return `Precio promo: $${Number(config.promotional_price ?? 0).toFixed(2)}`

    case "bundle_pay_x_take_y":
      return `Lleva ${config.buy_quantity ?? 0} y paga ${config.pay_quantity ?? 0}`

    case "buy_x_get_discount":
      return `Compra ${config.buy_quantity ?? 0} y obtén ${config.discount_percentage ?? 0}%`

    case "buy_x_get_y": {
      const targetId = Number(config.target_product_id ?? 0)
      const targetProduct = products.find((item) => Number(item.id) === targetId)

      return `Compra ${config.buy_quantity ?? 0}, recibe ${
        config.target_quantity ?? 0
      } de ${targetProduct?.name ?? `producto #${targetId || "-"}`}`
    }

    case "buy_sku_get_gift_item":
      return `Compra ${config.buy_quantity ?? 0}, regalo ${
        config.gift_quantity ?? 0
      }`

    case "brand_amount_choose_gift_item":
      return `Marca ${config.brand ?? "-"}: mínimo $${Number(
        config.minimum_amount ?? 0
      ).toFixed(2)}, elige ${config.gift_quantity ?? 0} regalo(s)`

    case "brand_amount_get_product": {
      const targetId = Number(config.target_product_id ?? 0)
      const targetProduct = products.find((item) => Number(item.id) === targetId)

      return `Marca ${config.brand ?? "-"}: mínimo $${Number(
        config.minimum_amount ?? 0
      ).toFixed(2)}, recibe ${config.target_quantity ?? 0} de ${
        targetProduct?.name ?? `producto #${targetId || "-"}`
      }`
    }

    default:
      return "Sin configuración"
  }
}

function formatDateTime(value) {
  if (!value) return "Sin fecha"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Fecha inválida"

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function toDateTimeLocalValue(value) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export default PromotionsPage
