import { useEffect, useMemo, useRef, useState } from "react"
import AdminCard from "../../components/AdminCard/AdminCard"
import ProductDetailPanel from "./ProductDetailPanel"
import {
  getAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,
  deleteAdminProduct,
} from "../../../services/api/adminProductService.js"
import {
  createAdminProductGalleryItem,
  getAdminProductGallery,
  reorderAdminProductGallery,
  toggleAdminProductGalleryItem,
  updateAdminProductGalleryItem,
} from "../../../services/api/adminProductGalleryService.js"
import {
  createAdminProductVariant,
  createAdminProductVariantAttribute,
  createAdminProductVariantAttributeValue,
  getAdminProductVariants,
  getAdminProductVariantAttributes,
  updateAdminProductVariant,
  updateAdminProductVariantStatus,
} from "../../../services/api/adminProductVariantService.js"
import { notifyError, notifySuccess } from "../../../utils/toast.js"
import { normalizeMediaUrl } from "../../../utils/mediaUrl.js"
import "./ProductsPage.css"

const INITIAL_PRODUCT_FORM = {
  id: null,
  category_id: "",
  family_id: "",
  microsip_id: "",
  name: "",
  slug: "",
  description: "",
  short_description: "",
  default_price: "",
  sku: "",
  brand: "",
  keyword: "",
  is_active: true,
  processed: false,
  image: null,
  image_url: "",
  image_path: "",
  original_image_url: "",
  category: null,
  family: null,
  created_at: "",
  updated_at: "",
}

const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const PRODUCT_IMAGE_MAX_SIZE = 4 * 1024 * 1024
const GALLERY_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]
const GALLERY_MEDIA_MAX_SIZE = 50 * 1024 * 1024
const INITIAL_GALLERY_FORM = {
  media: null,
  preview_url: "",
  media_type: "",
  title: "",
  description: "",
  sort_order: "",
  is_active: true,
}
const INITIAL_VARIANT_OPTION_FORM = {
  name: "",
  value: "",
}
const INITIAL_VARIANT_FORM = {
  id: null,
  sku: "",
  name: "",
  price: "",
  compare_price: "",
  stock: "",
  sort_order: "",
  is_active: true,
  applies_promotions: true,
  attribute_value_ids: [],
  metadata_barcode: "",
  metadata_supplier_code: "",
}

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const [filters, setFilters] = useState({
    search: "",
    is_active: "",
    page: 1,
    per_page: 10,
  })

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  })

  const [selectedProductId, setSelectedProductId] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelSaving, setPanelSaving] = useState(false)
  const [panelMode, setPanelMode] = useState("edit") // create | edit
  const [panelForm, setPanelForm] = useState(INITIAL_PRODUCT_FORM)
  const [galleryEnabled, setGalleryEnabled] = useState(false)
  const [galleryItems, setGalleryItems] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [gallerySaving, setGallerySaving] = useState(false)
  const [galleryForm, setGalleryForm] = useState(INITIAL_GALLERY_FORM)
  const [variantAttributes, setVariantAttributes] = useState([])
  const [variants, setVariants] = useState([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variantsSaving, setVariantsSaving] = useState(false)
  const [variantOptionForm, setVariantOptionForm] = useState(INITIAL_VARIANT_OPTION_FORM)
  const [variantForm, setVariantForm] = useState(INITIAL_VARIANT_FORM)
  const imagePreviewUrlRef = useRef("")
  const galleryPreviewUrlRef = useRef("")
  const gallerySaveTimersRef = useRef({})

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current)
      }

      if (galleryPreviewUrlRef.current) {
        URL.revokeObjectURL(galleryPreviewUrlRef.current)
      }

      clearGallerySaveTimers()
    }
  }, [])

  const categoryOptions = useMemo(() => {
    return buildEntityOptions(products, "category", panelForm.category)
  }, [products, panelForm.category])

  const familyOptions = useMemo(() => {
    return buildEntityOptions(products, "family", panelForm.family)
  }, [products, panelForm.family])

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page, filters.is_active])

  async function fetchProducts(customSearch = null) {
    try {
      setLoading(true)

      const params = {
        page: filters.page,
        per_page: filters.per_page,
      }

      const searchValue = customSearch !== null ? customSearch : filters.search

      if (searchValue?.trim()) {
        params.search = searchValue.trim()
      }

      if (filters.is_active !== "") {
        params.is_active = filters.is_active
      }

      const response = await getAdminProducts(params)

      const items = Array.isArray(response?.data) ? response.data.map(normalizeProductMedia) : []
      const meta = response?.meta || {}

      setProducts(items)
      setPagination({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        per_page: Number(meta.per_page || filters.per_page),
        total: meta.total || 0,
        from: meta.from || 0,
        to: meta.to || 0,
      })
    } catch (error) {
      console.error("Error al obtener productos:", error)
      notifyError("No fue posible cargar los productos.")
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchVariantAttributes(productId) {
    if (!productId) return

    try {
      const response = await getAdminProductVariantAttributes(productId)
      const items = Array.isArray(response?.data) ? response.data : []

      setVariantAttributes(sortVariantAttributes(items))
    } catch (error) {
      console.error("Error al cargar atributos de variantes:", error)
      setVariantAttributes([])
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }))
  }

  function handleSearchSubmit(event) {
    event.preventDefault()

    setFilters((prev) => ({
      ...prev,
      page: 1,
    }))

    fetchProducts(filters.search)
  }

  function handleClearFilters() {
    const resetFilters = {
      search: "",
      is_active: "",
      page: 1,
      per_page: 10,
    }

    setFilters(resetFilters)
    fetchProducts("")
  }

  function mapProductToForm(product = {}) {
    const normalizedProduct = normalizeProductMedia(product)

    return {
      id: normalizedProduct.id || null,
      category_id: normalizedProduct.category_id ?? "",
      family_id: normalizedProduct.family_id ?? "",
      microsip_id: normalizedProduct.microsip_id ?? "",
      name: normalizedProduct.name || "",
      slug: normalizedProduct.slug || "",
      description: normalizedProduct.description || "",
      short_description: normalizedProduct.short_description || "",
      default_price: normalizedProduct.default_price_number ?? normalizedProduct.default_price ?? "",
      sku: normalizedProduct.sku || "",
      brand: normalizedProduct.brand || "",
      keyword: normalizedProduct.keyword || "",
      is_active: Boolean(normalizedProduct.is_active),
      processed: Boolean(normalizedProduct.processed),
      image: null,
      image_url: normalizedProduct.image_url || "",
      image_path: normalizedProduct.image_path || "",
      original_image_url: normalizedProduct.image_url || "",
      category: normalizedProduct.category || null,
      family: normalizedProduct.family || null,
      created_at: normalizedProduct.created_at || "",
      updated_at: normalizedProduct.updated_at || "",
    }
  }

  async function handleOpenPanel(productId) {
    try {
      revokeImagePreview()
      clearGallerySaveTimers()
      setPanelMode("edit")
      setPanelOpen(true)
      setSelectedProductId(productId)
      setPanelLoading(true)

      const response = await getAdminProduct(productId)
      const product = normalizeProductMedia(response?.data || {})
      const loadedGallery = sortGalleryItems(Array.isArray(product.gallery) ? product.gallery : [])
      const loadedVariants = sortVariants(Array.isArray(product.variants) ? product.variants : [])
      const loadedVariantAttributes = buildProductVariantAttributes(product)

      setPanelForm(mapProductToForm(product))
      setGalleryEnabled(loadedGallery.length > 0)
      setGalleryItems(loadedGallery)
      setVariants(loadedVariants)
      setVariantAttributes(loadedVariantAttributes)
      resetVariantForms()
      resetGalleryForm()

      if (!loadedVariantAttributes.length) {
        await fetchVariantAttributes(productId)
      }
    } catch (error) {
      console.error("Error al cargar detalle del producto:", error)
      notifyError("No fue posible cargar el detalle del producto.")
      setPanelOpen(false)
      setSelectedProductId(null)
    } finally {
      setPanelLoading(false)
    }
  }

  function handleOpenCreatePanel() {
    revokeImagePreview()
    clearGallerySaveTimers()
    setPanelMode("create")
    setSelectedProductId(null)
    setPanelForm(INITIAL_PRODUCT_FORM)
    setGalleryEnabled(false)
    setGalleryItems([])
    setVariants([])
    setVariantAttributes([])
    resetVariantForms()
    resetGalleryForm()
    setPanelOpen(true)
    setPanelLoading(false)
  }

  function handleClosePanel() {
    if (panelSaving) return

    revokeImagePreview()
    clearGallerySaveTimers()
    setPanelOpen(false)
    setSelectedProductId(null)
    setPanelForm(INITIAL_PRODUCT_FORM)
    setGalleryEnabled(false)
    setGalleryItems([])
    setVariants([])
    setVariantAttributes([])
    resetVariantForms()
    resetGalleryForm()
    setPanelMode("edit")
  }

  function revokeImagePreview() {
    if (!imagePreviewUrlRef.current) return

    URL.revokeObjectURL(imagePreviewUrlRef.current)
    imagePreviewUrlRef.current = ""
  }

  function revokeGalleryPreview() {
    if (!galleryPreviewUrlRef.current) return

    URL.revokeObjectURL(galleryPreviewUrlRef.current)
    galleryPreviewUrlRef.current = ""
  }

  function resetGalleryForm() {
    revokeGalleryPreview()
    setGalleryForm(INITIAL_GALLERY_FORM)
  }

  function resetVariantForms() {
    setVariantOptionForm(INITIAL_VARIANT_OPTION_FORM)
    setVariantForm(INITIAL_VARIANT_FORM)
  }

  function clearGallerySaveTimers() {
    Object.values(gallerySaveTimersRef.current).forEach((timerId) => {
      clearTimeout(timerId)
    })
    gallerySaveTimersRef.current = {}
  }

  function handlePanelChange(event) {
    const { name, value, type, checked, files } = event.target

    if (type === "file") {
      const file = files?.[0] || null

      revokeImagePreview()

      if (!file) {
        setPanelForm((prev) => ({
          ...prev,
          image: null,
          image_url: prev.original_image_url || "",
        }))
        return
      }

      if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
        event.target.value = ""
        notifyError("La imagen debe ser JPG, PNG o WEBP.")
        setPanelForm((prev) => ({
          ...prev,
          image: null,
          image_url: prev.original_image_url || "",
        }))
        return
      }

      if (file.size > PRODUCT_IMAGE_MAX_SIZE) {
        event.target.value = ""
        notifyError("La imagen no debe superar 4 MB.")
        setPanelForm((prev) => ({
          ...prev,
          image: null,
          image_url: prev.original_image_url || "",
        }))
        return
      }

      const previewUrl = URL.createObjectURL(file)
      imagePreviewUrlRef.current = previewUrl

      setPanelForm((prev) => ({
        ...prev,
        image: file,
        image_url: previewUrl,
      }))
      return
    }

    setPanelForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function handleEntitySelect(type, option) {
    setPanelForm((prev) => ({
      ...prev,
      [`${type}_id`]: option?.id ?? "",
      [type]: option ? { id: option.id, name: option.name } : null,
    }))
  }

  function handleEntityCreate(type, name) {
    notifyError(
      `Aún falta conectar el endpoint para crear ${type === "category" ? "categorías" : "familias"}: ${name}.`
    )
  }

  async function handleGalleryToggle() {
    const nextEnabled = !galleryEnabled

    setGalleryEnabled(nextEnabled)

    if (!nextEnabled || !selectedProductId || galleryItems.length > 0) return

    await fetchGallery(selectedProductId)
  }

  async function fetchGallery(productId) {
    try {
      setGalleryLoading(true)

      const response = await getAdminProductGallery(productId)
      const items = Array.isArray(response?.data) ? response.data.map(normalizeGalleryItemMedia) : []

      setGalleryItems(sortGalleryItems(items))
    } catch (error) {
      console.error("Error al cargar galería:", error)
      notifyError("No fue posible cargar la galería del producto.")
      setGalleryItems([])
    } finally {
      setGalleryLoading(false)
    }
  }

  async function fetchVariants(productId) {
    try {
      setVariantsLoading(true)

      const response = await getAdminProductVariants(productId)
      const items = Array.isArray(response?.data) ? response.data : []

      setVariants(sortVariants(items))
    } catch (error) {
      console.error("Error al cargar variantes:", error)
      notifyError("No fue posible cargar las variantes del producto.")
      setVariants([])
    } finally {
      setVariantsLoading(false)
    }
  }

  function handleGalleryFormChange(event) {
    const { name, value, type, checked, files } = event.target

    if (type === "file") {
      const selectedFiles = Array.from(files || [])

      revokeGalleryPreview()

      if (!selectedFiles.length) {
        setGalleryForm((prev) => ({
          ...prev,
          media: null,
          preview_url: "",
          media_type: "",
        }))
        return
      }

      const invalidFile = selectedFiles.find((file) => !GALLERY_MEDIA_TYPES.includes(file.type))

      if (invalidFile) {
        event.target.value = ""
        notifyError("La galería acepta JPG, PNG, MP4, WEBM o MOV.")
        return
      }

      const oversizedFile = selectedFiles.find((file) => file.size > GALLERY_MEDIA_MAX_SIZE)

      if (oversizedFile) {
        event.target.value = ""
        notifyError("El archivo de galería no debe superar 50 MB.")
        return
      }

      if (!selectedProductId) {
        const nextItems = selectedFiles.map((file, index) => ({
          id: `pending-${Date.now()}-${index}`,
          pending: true,
          media: file,
          media_type: file.type.startsWith("image/") ? "image" : "video",
          media_url: URL.createObjectURL(file),
          title: "",
          description: "",
          sort_order: galleryItems.length + index + 1,
          is_active: true,
        }))

        setGalleryItems((prev) => sortGalleryItems([...prev, ...nextItems]))
        setGalleryForm(INITIAL_GALLERY_FORM)
        event.target.value = ""
        return
      }

      const file = selectedFiles[0]
      const previewUrl = URL.createObjectURL(file)
      galleryPreviewUrlRef.current = previewUrl

      setGalleryForm((prev) => ({
        ...prev,
        media: file,
        preview_url: previewUrl,
        media_type: file.type.startsWith("image/") ? "image" : "video",
      }))
      return
    }

    setGalleryForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function handleGalleryAdd() {
    if (!galleryForm.media) {
      notifyError("Selecciona un archivo para agregarlo a la galería.")
      return
    }

    if (!selectedProductId) {
      const pendingItem = {
        id: `pending-${Date.now()}`,
        pending: true,
        media: galleryForm.media,
        media_type: galleryForm.media_type,
        media_url: galleryForm.preview_url,
        title: galleryForm.title,
        description: galleryForm.description,
        sort_order: Number(galleryForm.sort_order || galleryItems.length + 1),
        is_active: Boolean(galleryForm.is_active),
      }

      setGalleryItems((prev) => sortGalleryItems([...prev, pendingItem]))
      setGalleryForm(INITIAL_GALLERY_FORM)
      galleryPreviewUrlRef.current = ""
      return
    }

    try {
      setGallerySaving(true)

      await createGalleryItem(selectedProductId, galleryForm)
      notifySuccess("Archivo agregado a la galería.")
      resetGalleryForm()
      fetchGallery(selectedProductId)
    } catch (error) {
      console.error("Error al agregar galería:", error)
      notifyError(error?.response?.data?.message || "No fue posible agregar el archivo a la galería.")
    } finally {
      setGallerySaving(false)
    }
  }

  function handleGalleryItemChange(itemId, field, value) {
    let nextItem = null

    setGalleryItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item

        nextItem = {
          ...item,
          [field]: value,
        }

        return nextItem
      })
    )

    if (nextItem) {
      scheduleGalleryItemSave(nextItem)
    }
  }

  function scheduleGalleryItemSave(item) {
    if (!selectedProductId || item.pending) return

    if (gallerySaveTimersRef.current[item.id]) {
      clearTimeout(gallerySaveTimersRef.current[item.id])
    }

    gallerySaveTimersRef.current[item.id] = setTimeout(async () => {
      try {
        await updateAdminProductGalleryItem(selectedProductId, item.id, {
          title: item.title || "",
          description: item.description || "",
          sort_order: Number(item.sort_order || 0),
          is_active: Boolean(item.is_active),
        })
      } catch (error) {
        console.error("Error al guardar galería:", error)
        notifyError(error?.response?.data?.message || "No fue posible guardar la información de galería.")
      } finally {
        delete gallerySaveTimersRef.current[item.id]
      }
    }, 700)
  }

  async function handleGalleryItemToggle(itemId) {
    if (!selectedProductId) {
      setGalleryItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                is_active: !item.is_active,
              }
            : item
        )
      )
      return
    }

    try {
      setGallerySaving(true)
      await toggleAdminProductGalleryItem(selectedProductId, itemId)
      await fetchGallery(selectedProductId)
      notifySuccess("Estatus de galería actualizado.")
    } catch (error) {
      console.error("Error al alternar galería:", error)
      notifyError("No fue posible actualizar el estatus de la galería.")
    } finally {
      setGallerySaving(false)
    }
  }

  async function handleGalleryMove(itemId, direction) {
    const currentIndex = galleryItems.findIndex((item) => item.id === itemId)
    const nextIndex = currentIndex + direction

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= galleryItems.length) return

    const nextItems = [...galleryItems]
    const [item] = nextItems.splice(currentIndex, 1)
    nextItems.splice(nextIndex, 0, item)

    const normalizedItems = nextItems.map((galleryItem, index) => ({
      ...galleryItem,
      sort_order: index + 1,
    }))

    setGalleryItems(normalizedItems)

    if (!selectedProductId || normalizedItems.some((galleryItem) => galleryItem.pending)) return

    try {
      setGallerySaving(true)
      await reorderAdminProductGallery(
        selectedProductId,
        normalizedItems.map((galleryItem) => ({
          id: galleryItem.id,
          sort_order: galleryItem.sort_order,
        }))
      )
      notifySuccess("Orden de galería actualizado.")
    } catch (error) {
      console.error("Error al reordenar galería:", error)
      notifyError("No fue posible actualizar el orden de la galería.")
      fetchGallery(selectedProductId)
    } finally {
      setGallerySaving(false)
    }
  }

  async function createGalleryItem(productId, form) {
    const payload = new FormData()

    payload.append("media", form.media)

    if (form.media_type) payload.append("media_type", form.media_type)
    if (form.title) payload.append("title", form.title)
    if (form.description) payload.append("description", form.description)
    payload.append("sort_order", String(form.sort_order || galleryItems.length + 1))
    payload.append("is_active", form.is_active ? "1" : "0")

    return createAdminProductGalleryItem(productId, payload)
  }

  async function uploadPendingGallery(productId) {
    const pendingItems = galleryItems.filter((item) => item.pending && item.media)

    if (!pendingItems.length) return

    await Promise.all(
      pendingItems.map((item, index) =>
        createGalleryItem(productId, {
          media: item.media,
          media_type: item.media_type,
          sort_order: item.sort_order || index + 1,
          is_active: true,
        })
      )
    )
  }

  function handleVariantOptionFormChange(event) {
    const { name, value } = event.target

    setVariantOptionForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleVariantOptionAdd() {
    const attributeName = variantOptionForm.name.trim()
    const valueName = variantOptionForm.value.trim()

    if (!attributeName || !valueName) {
      notifyError("Escribe el nombre de la opción y al menos un valor.")
      return
    }

    try {
      setVariantsSaving(true)

      let attribute = findVariantAttributeByName(variantAttributes, attributeName)

      if (!selectedProductId) {
        const valueNames = valueName
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)

        setVariantAttributes((prev) => {
          const existingAttribute = findVariantAttributeByName(prev, attributeName)

          if (existingAttribute) {
            return prev.map((item) =>
              item.id === existingAttribute.id
                ? {
                    ...item,
                    values: [
                      ...(item.values || []),
                      ...valueNames.map((value, index) => ({
                        id: `pending-value-${Date.now()}-${index}`,
                        pending: true,
                        value,
                        slug: slugify(value),
                        sort_order: (item.values?.length || 0) + index + 1,
                        is_active: true,
                        metadata: {},
                      })),
                    ],
                  }
                : item
            )
          }

          return [
            ...prev,
            {
              id: `pending-attribute-${Date.now()}`,
              pending: true,
              name: attributeName,
              slug: slugify(attributeName),
              sort_order: prev.length + 1,
              is_active: true,
              values: valueNames.map((value, index) => ({
                id: `pending-value-${Date.now()}-${index}`,
                pending: true,
                value,
                slug: slugify(value),
                sort_order: index + 1,
                is_active: true,
                metadata: {},
              })),
            },
          ]
        })

        setVariantOptionForm(INITIAL_VARIANT_OPTION_FORM)
        notifySuccess("Opción de variante agregada. Se guardará al crear el producto.")
        return
      }

      if (!attribute || attribute.pending) {
        const response = await createAdminProductVariantAttribute(selectedProductId, {
          name: attributeName,
          slug: slugify(attributeName),
          sort_order: variantAttributes.length + 1,
          is_active: true,
        })
        attribute = response?.data
      }

      if (!attribute?.id) {
        throw new Error("No fue posible crear la opción.")
      }

      const valueNames = valueName
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)

      await Promise.all(
        valueNames.map((item, index) =>
          createAdminProductVariantAttributeValue(selectedProductId, attribute.id, {
            value: item,
            slug: slugify(item),
            sort_order: (attribute.values?.length || 0) + index + 1,
            is_active: true,
            metadata: {},
          })
        )
      )

      await fetchVariantAttributes(selectedProductId)
      setVariantOptionForm(INITIAL_VARIANT_OPTION_FORM)
      notifySuccess("Opción de variante agregada.")
    } catch (error) {
      console.error("Error al agregar opción de variante:", error)
      notifyError(error?.response?.data?.message || "No fue posible agregar la opción de variante.")
    } finally {
      setVariantsSaving(false)
    }
  }

  function handleVariantFormChange(event) {
    const { name, value, type, checked } = event.target

    setVariantForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function handleVariantValueToggle(attributeId, valueId) {
    setVariantForm((prev) => {
      const valueIdsForOtherAttributes = prev.attribute_value_ids.filter((selectedValueId) => {
        const selectedAttribute = findAttributeByValueId(variantAttributes, selectedValueId)
        return Number(selectedAttribute?.id) !== Number(attributeId)
      })

      const alreadySelected = prev.attribute_value_ids.some(
        (selectedValueId) => Number(selectedValueId) === Number(valueId)
      )

      return {
        ...prev,
        attribute_value_ids: alreadySelected
          ? valueIdsForOtherAttributes
          : [...valueIdsForOtherAttributes, Number(valueId)],
      }
    })
  }

  async function handleVariantSave() {
    if (!variantForm.sku.trim()) {
      notifyError("El SKU de la variante es obligatorio.")
      return
    }

    if (!selectedProductId) {
      notifyError("Primero guarda el producto. Después podrás crear variantes con SKU, precio y stock.")
      return
    }

    const payload = buildVariantPayload(variantForm, variants.length + 1)

    try {
      setVariantsSaving(true)

      if (variantForm.id) {
        await updateAdminProductVariant(selectedProductId, variantForm.id, payload)
        notifySuccess("Variante actualizada.")
      } else {
        await createAdminProductVariant(selectedProductId, payload)
        notifySuccess("Variante creada.")
      }

      setVariantForm(INITIAL_VARIANT_FORM)
      fetchVariants(selectedProductId)
    } catch (error) {
      console.error("Error al guardar variante:", error)
      notifyError(error?.response?.data?.message || "No fue posible guardar la variante.")
    } finally {
      setVariantsSaving(false)
    }
  }

  function handleVariantEdit(variant) {
    setVariantForm({
      id: variant.id,
      sku: variant.sku || "",
      name: variant.name || "",
      price: variant.price_number ?? variant.price ?? "",
      compare_price: variant.compare_price_number ?? variant.compare_price ?? "",
      stock: variant.stock ?? "",
      sort_order: variant.sort_order ?? "",
      is_active: Boolean(variant.is_active),
      applies_promotions: Boolean(variant.applies_promotions),
      attribute_value_ids: Array.isArray(variant.attribute_value_ids)
        ? variant.attribute_value_ids.map(Number)
        : [],
      metadata_barcode: variant.metadata?.barcode || "",
      metadata_supplier_code: variant.metadata?.supplier_code || "",
    })
  }

  async function handleVariantStatusChange(variantId, nextStatus) {
    if (!selectedProductId) {
      setVariants((prev) =>
        prev.map((variant) =>
          variant.id === variantId ? { ...variant, is_active: nextStatus } : variant
        )
      )
      return
    }

    try {
      setVariantsSaving(true)
      await updateAdminProductVariantStatus(selectedProductId, variantId, nextStatus)
      fetchVariants(selectedProductId)
    } catch (error) {
      console.error("Error al actualizar variante:", error)
      notifyError("No fue posible actualizar la variante.")
    } finally {
      setVariantsSaving(false)
    }
  }

  async function uploadPendingVariants(productId) {
    const pendingVariants = variants.filter((variant) => variant.pending)

    if (!pendingVariants.length) return

    await Promise.all(
      pendingVariants.map((variant, index) =>
        createAdminProductVariant(
          productId,
          buildVariantPayload(
            {
              ...variant,
              attribute_value_ids: variant.attribute_value_ids || [],
              metadata_barcode: variant.metadata?.barcode || "",
              metadata_supplier_code: variant.metadata?.supplier_code || "",
            },
            index + 1
          )
        )
      )
    )
  }

  async function uploadPendingVariantAttributes(productId) {
    const pendingAttributes = variantAttributes.filter((attribute) => attribute.pending)
    const existingAttributes = variantAttributes.filter((attribute) => !attribute.pending)

    await Promise.all(
      existingAttributes.map(async (attribute) => {
        const pendingValues = (attribute.values || []).filter((value) => value.pending)

        if (!pendingValues.length) return

        await Promise.all(
          pendingValues.map((value, index) =>
            createAdminProductVariantAttributeValue(productId, attribute.id, {
              value: value.value,
              slug: value.slug || slugify(value.value),
              sort_order: value.sort_order || (attribute.values?.length || 0) + index + 1,
              is_active: Boolean(value.is_active ?? true),
              metadata: value.metadata || {},
            })
          )
        )
      })
    )

    await Promise.all(
      pendingAttributes.map(async (attribute) => {
        const attributeResponse = await createAdminProductVariantAttribute(productId, {
          name: attribute.name,
          slug: attribute.slug || slugify(attribute.name),
          sort_order: attribute.sort_order || variantAttributes.length + 1,
          is_active: Boolean(attribute.is_active ?? true),
        })
        const createdAttribute = attributeResponse?.data

        if (!createdAttribute?.id) return

        await Promise.all(
          (attribute.values || []).map((value, index) =>
            createAdminProductVariantAttributeValue(productId, createdAttribute.id, {
              value: value.value,
              slug: value.slug || slugify(value.value),
              sort_order: value.sort_order || index + 1,
              is_active: Boolean(value.is_active ?? true),
              metadata: value.metadata || {},
            })
          )
        )
      })
    )
  }

  function buildProductPayload(form, { imageOnly = false } = {}) {
    const hasImage = form.image instanceof File
    const payload = hasImage ? new FormData() : {}

    if (imageOnly) {
      if (hasImage) {
        payload.append("image", form.image)
      }

      return payload
    }

    function appendField(key, value) {
      if (value === "" || value === null || value === undefined) return

      if (hasImage) {
        payload.append(key, value)
        return
      }

      payload[key] = value
    }

    const fields = {
      category_id: form.category_id === "" ? "" : Number(form.category_id),
      family_id: form.family_id === "" ? "" : Number(form.family_id),
      microsip_id: form.microsip_id === "" ? "" : Number(form.microsip_id),
      name: form.name,
      slug: form.slug,
      description: form.description,
      short_description: form.short_description,
      default_price: Number(form.default_price),
      sku: form.sku,
      brand: form.brand,
      keyword: form.keyword,
      is_active: hasImage ? (form.is_active ? "1" : "0") : Boolean(form.is_active),
      processed: hasImage ? (form.processed ? "1" : "0") : Boolean(form.processed),
    }

    Object.entries(fields).forEach(([key, value]) => {
      appendField(key, value)
    })

    if (hasImage) {
      payload.append("image", form.image)
    }

    return payload
  }

  async function handlePanelSubmit(event) {
    event.preventDefault()

    if (panelMode === "edit" && !(panelForm.image instanceof File)) {
      notifyError("Selecciona una imagen principal para actualizar el producto.")
      return
    }

    if (panelMode === "create" && !panelForm.category_id) {
      notifyError("Selecciona una categoría existente o crea una cuando el endpoint esté disponible.")
      return
    }

    try {
      setPanelSaving(true)

      const payload = buildProductPayload(panelForm, { imageOnly: panelMode === "edit" })

      if (panelMode === "create") {
        const response = await createAdminProduct(payload)
        const productId = response?.data?.id

        if (galleryEnabled && productId) {
          await uploadPendingGallery(productId)
        }

        if (productId) {
          await uploadPendingVariantAttributes(productId)
          await uploadPendingVariants(productId)
        }

        notifySuccess(response?.message || "Producto creado correctamente.")
      } else {
        if (!selectedProductId) return

        const response = await updateAdminProduct(selectedProductId, payload)
        const updatedGallery = response?.data?.gallery
        const updatedVariants = response?.data?.variants
        const updatedVariantAttributes = buildProductVariantAttributes(response?.data || {})

        if (Array.isArray(updatedGallery)) {
          setGalleryItems(sortGalleryItems(updatedGallery.map(normalizeGalleryItemMedia)))
          setGalleryEnabled(updatedGallery.length > 0 || galleryEnabled)
        }

        if (Array.isArray(updatedVariants)) {
          setVariants(sortVariants(updatedVariants))
        }

        if (updatedVariantAttributes.length) {
          setVariantAttributes(updatedVariantAttributes)
        }

        notifySuccess(response?.message || "Producto actualizado correctamente.")
      }

      handleClosePanel()
      fetchProducts()
    } catch (error) {
      console.error("Error al guardar producto:", error)
      notifyError(error?.response?.data?.message || "No fue posible guardar el producto.")
    } finally {
      setPanelSaving(false)
    }
  }

  async function handleStatusChange(productId, nextStatus) {
    try {
      setActionLoadingId(productId)

      await updateAdminProductStatus(productId, nextStatus)

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                is_active: nextStatus,
              }
            : product
        )
      )

      if (selectedProductId === productId) {
        setPanelForm((prev) => ({
          ...prev,
          is_active: nextStatus,
        }))
      }

      notifySuccess("Estatus actualizado correctamente.")
    } catch (error) {
      console.error("Error al actualizar status del producto:", error)
      notifyError("No fue posible actualizar el estatus.")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDelete(productId) {
    try {
      setActionLoadingId(productId)

      await deleteAdminProduct(productId)

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                is_active: false,
              }
            : product
        )
      )

      if (selectedProductId === productId) {
        setPanelForm((prev) => ({
          ...prev,
          is_active: false,
        }))
      }

      notifySuccess("Producto dado de baja correctamente.")
    } catch (error) {
      console.error("Error al dar de baja producto:", error)
      notifyError("No fue posible dar de baja el producto.")
    } finally {
      setActionLoadingId(null)
    }
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.last_page) return

    setFilters((prev) => ({
      ...prev,
      page: nextPage,
    }))
  }

  function renderPagination() {
    if (pagination.last_page <= 1) return null

    const pages = []
    const start = Math.max(1, pagination.current_page - 2)
    const end = Math.min(pagination.last_page, pagination.current_page + 2)

    for (let i = start; i <= end; i += 1) {
      pages.push(i)
    }

    return (
      <div className="product-page__pagination">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handlePageChange(pagination.current_page - 1)}
          disabled={pagination.current_page === 1 || loading}
        >
          Anterior
        </button>

        <div className="product-page__pagination-pages">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={`btn btn-sm ${
                page === pagination.current_page ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => handlePageChange(page)}
              disabled={loading}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handlePageChange(pagination.current_page + 1)}
          disabled={pagination.current_page === pagination.last_page || loading}
        >
          Siguiente
        </button>
      </div>
    )
  }

  return (
    <>
      <AdminCard
        title="Productos"
        subtitle="Listado general de productos registrados"
        right={
          <button type="button" className="btn btn-primary" onClick={handleOpenCreatePanel}>
            <i className="bi bi-plus-lg" aria-hidden="true" />{" "}
            Nuevo producto
          </button>
        }
      >
        <div className="product-page">
          <form className="product-page__filters row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-md-5">
              <label className="form-label">Buscar producto</label>
              <input
                type="text"
                name="search"
                className="form-control"
                placeholder="Nombre, SKU, marca, slug..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Estatus</label>
              <select
                name="is_active"
                className="form-select"
                value={filters.is_active}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label">Mostrar</label>
              <select
                name="per_page"
                className="form-select"
                value={filters.per_page}
                onChange={handleFilterChange}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="col-6 col-md-2">
              <div className="product-page__filter-actions">
                <button type="submit" className="btn btn-primary">
                  Buscar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClearFilters}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>

          <div className="product-page__summary">
            <div className="product-page__summary-text">
              {loading ? (
                <span>Cargando productos...</span>
              ) : (
                <span>
                  Mostrando <strong>{pagination.from || 0}</strong> - <strong>{pagination.to || 0}</strong> de{" "}
                  <strong>{pagination.total}</strong> productos
                </span>
              )}
            </div>
          </div>

          <div className="table-responsive product-page__table-wrapper">
            <table className="table table-hover align-middle product-page__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Precio</th>
                  <th>Categoría</th>
                  <th>Estatus</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      Cargando información...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      No se encontraron productos.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const isActive = Boolean(product.is_active)

                    return (
                      <tr
                        key={product.id}
                        className="product-page__row"
                        onClick={() => handleOpenPanel(product.id)}
                      >
                        <td className="fw-semibold">{product.id}</td>
                        <td>
                          <div className="product-page__thumb">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} />
                            ) : (
                              <span>Sin imagen</span>
                            )}
                          </div>
                        </td>
                        <td>{product.name}</td>
                        <td>{product.brand || "-"}</td>
                        <td>${Number(product.default_price_number || 0).toFixed(2)}</td>
                        <td>{product.category?.name || "-"}</td>
                        <td>
                          <span className={`badge text-bg-${isActive ? "success" : "secondary"}`}>
                            {isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="text-end">
                          <div
                            className="product-page__actions"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={`product-page__icon-action ${
                                isActive ? "is-warning" : "is-success"
                              }`}
                              onClick={() => handleStatusChange(product.id, !isActive)}
                              disabled={actionLoadingId === product.id}
                              title={isActive ? "Desactivar" : "Activar"}
                              aria-label={isActive ? "Desactivar producto" : "Activar producto"}
                            >
                              <i
                                className={`bi ${
                                  isActive ? "bi-toggle-on" : "bi-toggle-off"
                                }`}
                                aria-hidden="true"
                              />
                            </button>

                            <button
                              type="button"
                              className="product-page__icon-action is-danger"
                              onClick={() => handleDelete(product.id)}
                              disabled={actionLoadingId === product.id}
                              title="Dar de baja"
                              aria-label="Dar de baja producto"
                            >
                              <i className="bi bi-trash3" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
      </AdminCard>

      <ProductDetailPanel
        isOpen={panelOpen}
        loading={panelLoading}
        saving={panelSaving}
        mode={panelMode}
        form={panelForm}
        title={buildPanelTitle(panelMode, panelForm)}
        categoryOptions={categoryOptions}
        familyOptions={familyOptions}
        galleryEnabled={galleryEnabled}
        galleryItems={galleryItems}
        galleryLoading={galleryLoading}
        gallerySaving={gallerySaving}
        galleryForm={galleryForm}
        variantAttributes={variantAttributes}
        variants={variants}
        variantsLoading={variantsLoading}
        variantsSaving={variantsSaving}
        variantOptionForm={variantOptionForm}
        variantForm={variantForm}
        onClose={handleClosePanel}
        onChange={handlePanelChange}
        onEntitySelect={handleEntitySelect}
        onEntityCreate={handleEntityCreate}
        onGalleryToggle={handleGalleryToggle}
        onGalleryFormChange={handleGalleryFormChange}
        onGalleryAdd={handleGalleryAdd}
        onGalleryItemChange={handleGalleryItemChange}
        onGalleryItemToggle={handleGalleryItemToggle}
        onGalleryMove={handleGalleryMove}
        onVariantOptionFormChange={handleVariantOptionFormChange}
        onVariantOptionAdd={handleVariantOptionAdd}
        onVariantFormChange={handleVariantFormChange}
        onVariantValueToggle={handleVariantValueToggle}
        onVariantSave={handleVariantSave}
        onVariantEdit={handleVariantEdit}
        onVariantStatusChange={handleVariantStatusChange}
        onSubmit={handlePanelSubmit}
      />
    </>
  )
}

export default ProductsPage

function buildEntityOptions(products, key, currentEntity) {
  const map = new Map()

  products.forEach((product) => {
    const entity = product?.[key]

    if (!entity?.id || !entity?.name) return

    map.set(Number(entity.id), {
      id: Number(entity.id),
      name: entity.name,
    })
  })

  if (currentEntity?.id && currentEntity?.name) {
    map.set(Number(currentEntity.id), {
      id: Number(currentEntity.id),
      name: currentEntity.name,
    })
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function sortGalleryItems(items = []) {
  return [...items].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
}

function sortVariants(items = []) {
  return [...items].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
}

function sortVariantAttributes(items = []) {
  return [...items]
    .map((attribute) => ({
      ...attribute,
      values: Array.isArray(attribute.values)
        ? [...attribute.values].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        : [],
    }))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
}

function buildProductVariantAttributes(product = {}) {
  if (Array.isArray(product.variant_attributes) && Array.isArray(product.variant_attribute_values)) {
    return sortVariantAttributes(
      product.variant_attributes.map((attribute) => ({
        ...attribute,
        values: product.variant_attribute_values.filter(
          (value) => Number(value.variant_attribute_id) === Number(attribute.id)
        ),
      }))
    )
  }

  if (Array.isArray(product.variant_options)) {
    return sortVariantAttributes(
      product.variant_options.map((option, index) => ({
        id: option.id,
        name: option.name,
        slug: option.slug,
        sort_order: option.sort_order ?? index + 1,
        is_active: true,
        values: Array.isArray(option.values) ? option.values : [],
      }))
    )
  }

  return []
}

function buildPanelTitle(mode, form) {
  const name = form.name?.trim()

  if (name) return name

  return mode === "create" ? "Nuevo producto" : "Detalle del producto"
}

function normalizeProductMedia(product = {}) {
  return {
    ...product,
    image_url: normalizeMediaUrl(product.image_url),
    gallery: Array.isArray(product.gallery)
      ? product.gallery.map(normalizeGalleryItemMedia)
      : product.gallery,
  }
}

function findVariantAttributeByName(attributes = [], name = "") {
  const normalizedName = name.trim().toLowerCase()

  return attributes.find((attribute) => attribute.name?.trim().toLowerCase() === normalizedName)
}

function findAttributeByValueId(attributes = [], valueId) {
  return attributes.find((attribute) => {
    return (attribute.values || []).some((value) => Number(value.id) === Number(valueId))
  })
}

function buildVariantPayload(form, defaultSortOrder = 1) {
  const metadata = {}

  if (form.metadata_barcode) metadata.barcode = form.metadata_barcode
  if (form.metadata_supplier_code) metadata.supplier_code = form.metadata_supplier_code

  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    price: form.price === "" ? null : Number(form.price),
    compare_price: form.compare_price === "" ? null : Number(form.compare_price),
    stock: form.stock === "" ? null : Number(form.stock),
    sort_order: Number(form.sort_order || defaultSortOrder),
    is_active: Boolean(form.is_active),
    applies_promotions: Boolean(form.applies_promotions),
    attribute_value_ids: (form.attribute_value_ids || []).map(Number),
    metadata,
  }
}

function slugify(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeGalleryItemMedia(item = {}) {
  return {
    ...item,
    media_url: normalizeMediaUrl(item.media_url),
  }
}
