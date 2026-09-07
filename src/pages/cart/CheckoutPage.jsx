import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  applyCartCashback,
  clearCartCashback,
  getCart,
  getCheckoutPreview,
  validateCheckout,
} from "../../services/api/cartService.js"
import {
  createCheckoutOrder,
  createStripeCheckoutSession,
  restoreRecoverableOrderCart,
} from "../../services/api/checkoutService.js"
import {
  createAccountAddress,
  getAccountAddresses,
  getAccountCashback,
} from "../../services/api/accountService.js"
import { getPublicPaymentMethods } from "../../services/api/paymentMethodsService.js"
import AdminSidePanel from "../../components/AdminSidePanel/AdminSidePanel.jsx"
import { useSettings } from "../../context/SettingsContext.jsx"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast"
import { trackMetaInitiateCheckout } from "../../utils/metaPixel.js"
import { hasAuthSession } from "../../services/storage/authStorage.js"
import { normalizeMediaUrl } from "../../utils/mediaUrl.js"
import "./checkout.css"

const emptyAddressForm = {
  alias: "",
  contact_name: "",
  phone: "",
  email: "",
  street: "",
  address_line_2: "",
  neighborhood: "",
  state: "",
  zip_code: "",
  delivery_note: "",
  is_default: false,
}

const emptyGuestCheckoutForm = {
  phone: "",
  email: "",
  street: "",
  address_line_2: "",
  references: "",
}

const ADDRESS_PHONE_LENGTH = 10
const CHECKOUT_ITEM_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='14' fill='%23f1f5f9'/%3E%3Cpath d='M32 82h56l-11-18-12 13-15-24-18 29Z' fill='%23cbd5e1'/%3E%3Ccircle cx='80' cy='40' r='9' fill='%23cbd5e1'/%3E%3C/svg%3E"

const emptyCheckout = {
  cart_id: null,
  status: "",
  currency: "MXN",
  can_checkout: false,
  blockers: [],
  customer: null,
  shipping: null,
  items_count: 0,
  items: [],
  promotions_applied: [],
  invoice_preview: {
    document_type: "checkout_preview",
    currency: "MXN",
    totals: {},
    notes: [],
  },
  totals: {
    items_count: 0,
    subtotal: 0,
    discount: 0,
    tax: 0,
    tax_breakdown: {
      total: 0,
      items: [],
    },
    shipping: 0,
    gift_accounting_total: 0,
    total: 0,
    amount_due: 0,
    coupon: null,
  },
  coupon: null,
  loyalty: null,
}

const CART_SUMMARY_STORAGE_KEY = "ecommerce_cart_summary"
const STRIPE_SUCCESS_RETURN_STORAGE_KEY = "ecommerce_stripe_success_return"
const DEBUG_RECOVERABLE_CART = true
const DELIVERY_NOTE_MAX_LENGTH = 200
const DOCUMENT_NOTE_MAX_LENGTH = 1000

function CheckoutPage() {
  const { brandName, logoUrl } = useSettings()
  const isGuestCheckout = !hasAuthSession()
  const [checkout, setCheckout] = useState(emptyCheckout)
  const [loading, setLoading] = useState(true)
  const [addressPanelOpen, setAddressPanelOpen] = useState(false)
  const [addressPanelMode, setAddressPanelMode] = useState("select")
  const [addresses, setAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressSaving, setAddressSaving] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(emptyAddressForm)
  const [guestForm, setGuestForm] = useState(emptyGuestCheckoutForm)
  const [guestAddress, setGuestAddress] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState(null)
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false)
  const [documentNotes, setDocumentNotes] = useState("")
  const [documentNotesOpen, setDocumentNotesOpen] = useState(false)
  const [accountCashback, setAccountCashback] = useState(null)
  const [cashbackAmount, setCashbackAmount] = useState("")
  const [cashbackLoading, setCashbackLoading] = useState(false)
  const restoringRecoverableRef = useRef(false)
  const trackedCheckoutRef = useRef("")

  useEffect(() => {
    fetchPreview()
    fetchPaymentMethods()
    fetchAccountCashback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchAccountCashback() {
    if (!hasAuthSession()) {
      setAccountCashback(null)
      return
    }

    try {
      const response = await getAccountCashback()
      setAccountCashback(normalizeAccountCashback(response))
    } catch (error) {
      console.error("Error al cargar cashback de cuenta:", error?.response?.data || error)
      setAccountCashback(null)
    }
  }

  async function fetchPaymentMethods() {
    try {
      setPaymentMethodsLoading(true)
      const response = await getPublicPaymentMethods()
      setPaymentMethods(normalizePaymentMethods(response))
    } catch (error) {
      console.error("Error al cargar métodos de pago:", error?.response?.data || error)
      setPaymentMethods({ default_method: null, methods: [] })
    } finally {
      setPaymentMethodsLoading(false)
    }
  }

  async function fetchPreview() {
    try {
      setLoading(true)
      const response = await getCheckoutPreview()
      if (DEBUG_RECOVERABLE_CART) {
        console.log("[recoverable-cart][checkout] GET /checkout/preview response:", response)
      }

      const recoverableOrder = getRecoverableOrder(response)

      if (recoverableOrder && !restoringRecoverableRef.current) {
        restoringRecoverableRef.current = true
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][checkout] restoring from preview:", recoverableOrder)
        }

        const restoreResponse = await restoreRecoverableOrderCart({
          order_id: recoverableOrder.id,
          reason: "user_returned_to_checkout",
        })
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][checkout] restore response from preview:", restoreResponse)
        }

        syncCartSummary(restoreResponse?.data?.cart)
        notifySuccess(restoreResponse?.message || "Carrito recuperado correctamente.")

        const nextResponse = await getCheckoutPreview()
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][checkout] preview after restore:", nextResponse)
        }
        const nextCheckout = applyCheckoutResponse(nextResponse)
        await syncShippingFromCartIfNeeded(nextCheckout)
        return
      }

      if (!recoverableOrder && shouldTryImplicitRecover(response) && !restoringRecoverableRef.current) {
        restoringRecoverableRef.current = true
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][checkout] trying implicit restore without order_id")
        }

        try {
          const restoreResponse = await restoreRecoverableOrderCart({
            reason: "user_returned_to_checkout",
          })
          if (DEBUG_RECOVERABLE_CART) {
            console.log("[recoverable-cart][checkout] implicit restore response:", restoreResponse)
          }

          if (restoreResponse?.data?.cart) {
            syncCartSummary(restoreResponse.data.cart)
            notifySuccess(restoreResponse?.message || "Carrito recuperado correctamente.")

            const nextResponse = await getCheckoutPreview()
            if (DEBUG_RECOVERABLE_CART) {
              console.log("[recoverable-cart][checkout] preview after implicit restore:", nextResponse)
            }
            const nextCheckout = applyCheckoutResponse(nextResponse)
            await syncShippingFromCartIfNeeded(nextCheckout)
            return
          }
        } catch (restoreError) {
          if (DEBUG_RECOVERABLE_CART) {
            console.log(
              "[recoverable-cart][checkout] implicit restore failed:",
              restoreError?.response?.data || restoreError
            )
          }
        }
      }

      const nextCheckout = applyCheckoutResponse(response)
      await syncShippingFromCartIfNeeded(nextCheckout)
    } catch (error) {
      console.error("Error al cargar checkout:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar el checkout.")
      setCheckout(emptyCheckout)
    } finally {
      restoringRecoverableRef.current = false
      setLoading(false)
    }
  }

  async function refreshCheckoutAfterCashback(response) {
    syncCartSummary(response?.data?.cart ?? response?.data ?? response)
    await fetchPreview()
    await fetchAccountCashback()
  }

  async function handleApplyCashback(event) {
    event.preventDefault()

    const maxRedeemable = Number(checkout.loyalty?.cashback?.maxRedeemable ?? 0)
    const amount = Math.min(Number(cashbackAmount), maxRedeemable || Number(cashbackAmount))

    if (!amount || amount <= 0) {
      notifyWarning("Ingresa un monto de cashback válido.")
      return
    }

    try {
      setCashbackLoading(true)
      const response = await applyCartCashback({ amount })
      setCashbackAmount("")
      await refreshCheckoutAfterCashback(response)
      notifySuccess(response?.message || "Cashback aplicado correctamente.")
    } catch (error) {
      console.error("Error al aplicar cashback:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible aplicar el cashback.")
    } finally {
      setCashbackLoading(false)
    }
  }

  async function handleClearCashback() {
    try {
      setCashbackLoading(true)
      const response = await clearCartCashback()
      setCashbackAmount("")
      await refreshCheckoutAfterCashback(response)
      notifySuccess(response?.message || "Cashback removido correctamente.")
    } catch (error) {
      console.error("Error al quitar cashback:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible quitar el cashback.")
    } finally {
      setCashbackLoading(false)
    }
  }

  function applyCheckoutResponse(response, options = {}) {
    const nextCheckout = normalizeCheckout(response)
    const nextAddresses = normalizeShippingAddresses(nextCheckout.shipping)

    setCheckout(nextCheckout)
    applyShippingAddresses(nextAddresses, nextCheckout.shipping, options)

    return nextCheckout
  }

  function applyShippingAddresses(nextAddresses, shipping, options = {}) {
    if (!nextAddresses.length) return

    setAddresses(nextAddresses)
    setSelectedAddressId((currentId) => {
      const preferredId = options.keepSelectedAddressId
      if (preferredId && nextAddresses.some((address) => address.id === preferredId)) {
        return preferredId
      }

      if (currentId && nextAddresses.some((address) => address.id === currentId)) {
        return currentId
      }

      const selectedShippingAddress = normalizeAddress(shipping?.selected_address)
      if (selectedShippingAddress?.id) return selectedShippingAddress.id

      return nextAddresses.find((address) => address.is_default)?.id || nextAddresses[0]?.id || null
    })
  }

  async function syncShippingFromCartIfNeeded(nextCheckout) {
    if (normalizeShippingAddresses(nextCheckout.shipping).length) return

    try {
      const cartResponse = await getCart()
      const cartData = cartResponse?.data?.cart ?? cartResponse?.data ?? cartResponse ?? {}
      const cartShipping = cartData?.shipping ?? null
      const nextAddresses = normalizeShippingAddresses(cartShipping)

      if (!nextAddresses.length) {
        if (isGuestCheckout) return

        const accountResponse = await getAccountAddresses()
        const accountAddresses = normalizeAddresses(accountResponse)
        setAddresses(accountAddresses)
        setSelectedAddressId((currentId) => {
          if (currentId && accountAddresses.some((address) => address.id === currentId)) {
            return currentId
          }

          return accountAddresses.find((address) => address.is_default)?.id || accountAddresses[0]?.id || null
        })
        return
      }

      setCheckout((prev) => ({
        ...prev,
        shipping: cartShipping,
      }))
      applyShippingAddresses(nextAddresses, cartShipping)
    } catch (error) {
      console.error("Error al cargar direcciones de carrito:", error?.response?.data || error)
    }
  }

  const totals = useMemo(() => {
    return {
      ...emptyCheckout.totals,
      ...(checkout.invoice_preview?.totals || {}),
      ...(checkout.totals || {}),
    }
  }, [checkout])

  const selectedAddress = useMemo(() => {
    if (isGuestCheckout) {
      return guestAddress
    }

    return addresses.find((address) => address.id === selectedAddressId) || null
  }, [addresses, guestAddress, isGuestCheckout, selectedAddressId])

  const hasPendingGiftSelection = useMemo(() => {
    return checkout.promotions_applied.some((promotion) => {
      if (promotion.type !== "brand_amount_choose_gift_item") return false
      if (!promotion.snapshot?.selection_required) return false

      return !getSelectedGiftItem(promotion)
    })
  }, [checkout.promotions_applied])
  const invalidStockItems = useMemo(() => {
    return checkout.items.filter(isCheckoutItemStockInvalid)
  }, [checkout.items])
  const insufficientStockBlockers = useMemo(() => {
    return getActionableBlockers(checkout.blockers, invalidStockItems).filter((blocker) => {
      const code = typeof blocker === "string" ? blocker : blocker?.code || blocker?.reason
      return code === "insufficient_stock"
    })
  }, [checkout.blockers, invalidStockItems])
  const actionableBlockers = useMemo(() => {
    return getActionableBlockers(checkout.blockers, invalidStockItems)
  }, [checkout.blockers, invalidStockItems])

  const canContinue = Boolean(selectedAddress) && !hasPendingGiftSelection && insufficientStockBlockers.length === 0 && invalidStockItems.length === 0
  const stripePaymentMethod = getActivePaymentMethod(paymentMethods, "stripe")
  const hasStripePaymentMethod = Boolean(stripePaymentMethod)
  const canPay = canContinue && hasStripePaymentMethod && !paymentMethodsLoading

  useEffect(() => {
    if (!checkout.items.length) return

    const trackingKey = [
      checkout.cart_id || "cart",
      checkout.items.map((item) => `${item.product_id || item.id}:${item.quantity}`).join("|"),
      totals.total || checkout.total || 0,
    ].join(":")

    if (trackedCheckoutRef.current === trackingKey) return

    trackedCheckoutRef.current = trackingKey
    trackMetaInitiateCheckout({
      ...checkout,
      totals,
    })
  }, [checkout, totals])

  function handleStartStripeCheckout() {
    if (paymentMethodsLoading) {
      notifyWarning("Espera a que carguen los métodos de pago.")
      return
    }

    if (!hasStripePaymentMethod) {
      notifyWarning("El método de pago con Stripe no está activo para esta tienda.")
      return
    }

    if (!selectedAddress) {
      notifyWarning(isGuestCheckout
        ? "Guarda la dirección de envío para continuar."
        : "Guarda o selecciona una dirección de envío para continuar."
      )
      handleOpenAddressPanel()
      return
    }

    if (hasPendingGiftSelection) {
      notifyWarning("Debes elegir tu regalo antes de continuar con el pago.")
      return
    }

    if (insufficientStockBlockers.length || invalidStockItems.length) {
      notifyWarning("Ajusta los productos sin inventario suficiente antes de pagar.")
      return
    }

    setConfirmPaymentOpen(true)
  }

  async function handleConfirmStripeCheckout() {
    if (!selectedAddress) {
      setConfirmPaymentOpen(false)
      return
    }

    try {
      setProcessingPayment(true)
      setConfirmPaymentOpen(false)

      const checkoutPayload = isGuestCheckout
        ? buildGuestCheckoutPayload(selectedAddress, documentNotes)
        : buildCheckoutPayload(selectedAddress, documentNotes)

      if (!isGuestCheckout) {
        const validationResponse = await validateCheckout(checkoutPayload)
        if (DEBUG_RECOVERABLE_CART) {
          console.log("[recoverable-cart][checkout] validate before Stripe response:", validationResponse)
        }

        const recoverableOrder = getRecoverableOrder(validationResponse)

        if (recoverableOrder) {
          await restoreRecoverableCheckout(recoverableOrder, "user_returned_to_checkout")
          return
        }

        const nextCheckout = normalizeCheckout(validationResponse)

        setCheckout((prev) => ({
          ...prev,
          ...nextCheckout,
          customer: nextCheckout.customer || prev.customer,
          shipping: nextCheckout.shipping || prev.shipping,
          items: nextCheckout.items.length ? nextCheckout.items : prev.items,
          items_count: nextCheckout.items_count || prev.items_count,
          promotions_applied: nextCheckout.promotions_applied.length
            ? nextCheckout.promotions_applied
            : prev.promotions_applied,
          invoice_preview: hasInvoiceDetail(nextCheckout.invoice_preview)
            ? nextCheckout.invoice_preview
            : prev.invoice_preview,
          totals: hasTotals(nextCheckout.totals) ? nextCheckout.totals : prev.totals,
        }))

        const nextInvalidStockItems = nextCheckout.items.filter(isCheckoutItemStockInvalid)
        const nextActionableBlockers = getActionableBlockers(nextCheckout.blockers, nextInvalidStockItems)

        if (!nextCheckout.can_checkout && nextActionableBlockers.length) {
          notifyWarning(getBlockerMessage(nextActionableBlockers))
          return
        }
      }

      const orderResponse = await createCheckoutOrder(checkoutPayload)
      const order = orderResponse?.data

      if (!order?.id) {
        notifyError("No fue posible crear el pedido para iniciar el pago.")
        return
      }

      const stripeResponse = await createStripeCheckoutSession({
        order_id: order.id,
      })
      const stripeUrl = stripeResponse?.data?.url

      if (!stripeUrl) {
        notifyError("Stripe no devolvió una URL de pago.")
        return
      }

      window.location.assign(stripeUrl)
    } catch (error) {
      console.error("Error al iniciar pago con Stripe:", error?.response?.data || error)
      const message = error?.response?.data?.message || "No fue posible iniciar el pago con Stripe."

      if (error?.response?.status === 422) {
        notifyWarning(message)
        return
      }

      notifyError(message)
    } finally {
      setProcessingPayment(false)
    }
  }

  async function restoreRecoverableCheckout(recoverableOrder, reason) {
    if (DEBUG_RECOVERABLE_CART) {
      console.log("[recoverable-cart][checkout] restoring order:", {
        recoverableOrder,
        reason,
      })
    }

    const restoreResponse = await restoreRecoverableOrderCart({
      order_id: recoverableOrder?.id,
      reason,
    })
    if (DEBUG_RECOVERABLE_CART) {
      console.log("[recoverable-cart][checkout] restore response:", restoreResponse)
    }

    syncCartSummary(restoreResponse?.data?.cart)
    notifySuccess(restoreResponse?.message || "Carrito recuperado correctamente.")

    const nextResponse = await getCheckoutPreview(
      isGuestCheckout ? {} : buildCheckoutAddressSelection(selectedAddress)
    )
    if (DEBUG_RECOVERABLE_CART) {
      console.log("[recoverable-cart][checkout] preview after restore:", nextResponse)
    }

    const nextCheckout = applyCheckoutResponse(nextResponse)
    await syncShippingFromCartIfNeeded(nextCheckout)
  }

  function handleAddressFormChange(event) {
    const { name, value, type, checked } = event.target
    const nextValue =
      name === "delivery_note"
        ? value.slice(0, DELIVERY_NOTE_MAX_LENGTH)
        : name === "phone"
          ? onlyDigits(value, ADDRESS_PHONE_LENGTH)
          : value

    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : nextValue,
    }))
  }

  function handleGuestFormChange(event) {
    const { name, value } = event.target
    const nextValue =
      name === "phone"
        ? onlyDigits(value, ADDRESS_PHONE_LENGTH)
        : value

    setGuestForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
    setGuestAddress(null)
  }

  function handleDocumentNotesChange(event) {
    setDocumentNotes(event.target.value.slice(0, DOCUMENT_NOTE_MAX_LENGTH))
  }

  async function fetchAddresses() {
    if (isGuestCheckout) return

    try {
      setAddressesLoading(true)
      const shippingAddresses = normalizeShippingAddresses(checkout.shipping)
      const response = shippingAddresses.length ? null : await getAccountAddresses()
      const nextAddresses = shippingAddresses.length ? shippingAddresses : normalizeAddresses(response)
      setAddresses(nextAddresses)

      setSelectedAddressId((currentId) => {
        if (currentId && nextAddresses.some((address) => address.id === currentId)) {
          return currentId
        }

        return nextAddresses.find((address) => address.is_default)?.id || null
      })
    } catch (error) {
      console.error("Error al cargar direcciones:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible cargar tus direcciones.")
      setAddresses([])
    } finally {
      setAddressesLoading(false)
    }
  }

  function handleOpenAddressPanel(mode = "select") {
    if (isGuestCheckout) return

    setAddressPanelMode(mode)
    setAddressPanelOpen(true)
    fetchAddresses()
  }

  function handleOpenCreateAddressPanel() {
    setAddressForm(emptyAddressForm)
    handleOpenAddressPanel("create")
  }

  async function handleSelectAddress(address) {
    setSelectedAddressId(address.id)

    try {
      const response = await getCheckoutPreview(buildCheckoutAddressSelection(address))
      applyCheckoutResponse(response, { keepSelectedAddressId: address.id })
    } catch (error) {
      console.error("Error al recalcular checkout:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible recalcular el checkout con esa dirección.")
    }
  }

  async function handleAddAddress(event) {
    event.preventDefault()

    if (!addressForm.street.trim() || !addressForm.phone.trim()) {
      notifyWarning("Completa dirección y teléfono.")
      return
    }

    const validationMessage = validateAddressForm(addressForm)

    if (validationMessage) {
      notifyWarning(validationMessage)
      return
    }

    try {
      setAddressSaving(true)
      const response = await createAccountAddress(buildAddressPayload(addressForm, checkout))
      const createdAddress = response?.data

      notifySuccess(response?.message || "Dirección creada correctamente.")
      setAddressForm(emptyAddressForm)

      if (createdAddress?.id) {
        setSelectedAddressId(createdAddress.id)
        const nextPreview = await getCheckoutPreview(buildCheckoutAddressSelection(createdAddress))
        applyCheckoutResponse(nextPreview, { keepSelectedAddressId: createdAddress.id })
        setAddressPanelOpen(false)
        setAddressPanelMode("select")
      } else {
        const nextPreview = await getCheckoutPreview()
        applyCheckoutResponse(nextPreview)
      }

      await fetchAddresses()
    } catch (error) {
      console.error("Error al crear dirección:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible crear la dirección.")
    } finally {
      setAddressSaving(false)
    }
  }

  function handleSaveGuestAddress(event) {
    event.preventDefault()

    const validationMessage = validateGuestAddressForm(guestForm)

    if (validationMessage) {
      notifyWarning(validationMessage)
      return
    }

    setGuestAddress(buildGuestAddress(guestForm))
    notifySuccess("Dirección de envío guardada.")
  }

  function handleDownloadPreview() {
    const printWindow = window.open("", "_blank", "width=980,height=720")

    if (!printWindow) {
      notifyWarning("Permite ventanas emergentes para generar la previa en PDF.")
      return
    }

    printWindow.document.write(
      buildPreviewPdfHtml(checkout, totals, selectedAddress, {
        brandName,
        logoUrl,
        documentNotes,
      }),
    )
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 350)
  }

  if (loading) {
    return (
      <div className="checkout_page">
        <div className="checkout_shell">
          <div className="checkout_empty_state">
            <h3>Cargando previa de factura...</h3>
            <p>Estamos calculando partidas, promociones y totales.</p>
          </div>
        </div>
      </div>
    )
  }

  const hasItems = checkout.items.length > 0
  const showLegacyInvoiceTable = false
  const showLegacyInlineAddressForm = false

  return (
    <div className={`checkout_page ${isGuestCheckout ? "checkout_page--guest" : "checkout_page--compact"}`}>
      <div className="checkout_shell">
        <header className="checkout_header checkout_invoice_header">
          <div className="checkout_header_left">
            <p className="checkout_eyebrow">Previa de factura</p>
            <h1 className="checkout_title">Checkout</h1>
            <p className="checkout_meta">
              Revisa partidas, promociones aplicadas y total antes de continuar.
            </p>
          </div>

          <Link to="/carrito" className="checkout_header_back">
            Volver al carrito
          </Link>

          {selectedAddress ? (
            <div className="checkout_status is-ready">
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              Dirección lista
            </div>
          ) : isGuestCheckout ? (
            <div className="checkout_status is-warning">
              <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
              Dirección pendiente
            </div>
          ) : (
            <button
              type="button"
              className="btn btn_primary checkout_header_action"
              onClick={() => handleOpenAddressPanel()}
            >
              Configurar dirección de envío
            </button>
          )}
        </header>

        {!hasItems ? (
          <div className="checkout_empty_state">
            <h3>Tu carrito está vacío</h3>
            <p>Agrega productos para generar la previa de factura.</p>
            <Link to="/productos" className="btn btn_primary btn_link_like">
              Ir a productos
            </Link>
          </div>
        ) : (
          <div className="checkout_layout checkout_layout--compact">
            <section className="checkout_main">
              <CheckoutOrderItems items={checkout.items} />

              {isGuestCheckout ? (
                <GuestCheckoutFlow
                  form={guestForm}
                  selectedAddress={selectedAddress}
                  onChange={handleGuestFormChange}
                  onSaveAddress={handleSaveGuestAddress}
                  onClearAddress={() => {
                    setGuestForm(emptyGuestCheckoutForm)
                    setGuestAddress(null)
                  }}
                />
              ) : null}

              {!isGuestCheckout ? (
                <AuthenticatedCheckoutFlow
                  customer={checkout.customer}
                  addresses={addresses}
                  shipping={checkout.shipping}
                  selectedAddress={selectedAddress}
                  selectedAddressId={selectedAddressId}
                  addressesLoading={addressesLoading}
                  onSelectAddress={handleSelectAddress}
                  onAddAddress={handleOpenCreateAddressPanel}
                  onChangeAddress={() => handleOpenAddressPanel("select")}
                />
              ) : null}

              <CheckoutOrderDetails
                promotions={checkout.promotions_applied}
                documentNotes={documentNotes}
                documentNotesOpen={documentNotesOpen}
                onDocumentNotesChange={handleDocumentNotesChange}
                onToggleDocumentNotes={() => setDocumentNotesOpen((current) => !current)}
              />

              {!isGuestCheckout && actionableBlockers.length > 0 ? (
                <div className="checkout_blockers">
                  <h2>Pendientes para completar tu pedido</h2>
                  <ul>
                    {actionableBlockers.map((blocker, index) => (
                      <li key={`${String(blocker)}-${index}`}>{formatBlocker(blocker)}</li>
                    ))}
                  </ul>
                  {insufficientStockBlockers.length || invalidStockItems.length ? (
                    <Link to="/carrito" className="btn btn_secondary checkout_stock_link">
                      Ajustar cantidades en carrito
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {showLegacyInvoiceTable ? (
              <section className="checkout_invoice_card">
                <div className="checkout_invoice_card_head">
                  <div>
                    <h2>Detalle de productos</h2>
                    <p>{totals.items_count || checkout.items_count} pieza(s) en el documento</p>
                  </div>
                </div>

                <div className="checkout_invoice_table_wrap">
                  <table className="checkout_invoice_table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th className="text-end">Cant.</th>
                        <th className="text-end">Precio</th>
                        <th className="text-end">Regular</th>
                        <th className="text-end">Regalo</th>
                        <th className="text-end">Descuento</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkout.items.map((item) => (
                        <tr key={item.cart_item_id || `${item.product_id}-${item.line_number}`}>
                          <td>{item.line_number}</td>
                          <td>
                            <div className="checkout_item_product">
                              <img src={item.image} alt={item.name} loading="lazy" />
                              <div className="checkout_item_info">
                                <strong>{item.name}</strong>
                                <span>
                                  SKU {item.sku || "-"} · Producto #{item.product_id}
                                </span>
                                {item.selected_attributes.length ? (
                                  <small>{formatSelectedAttributes(item.selected_attributes)}</small>
                                ) : null}
                                {item.promotion ? (
                                  <small>
                                    Promo:{" "}
                                    {item.promotion.name ||
                                      formatPromotionType(item.promotion.type)}
                                  </small>
                                ) : null}
                                {formatScaleSnapshot(item.promotion?.snapshot) ? (
                                  <small>{formatScaleSnapshot(item.promotion.snapshot)}</small>
                                ) : null}
                                {(() => {
                                  const selectedGiftItem = getSelectedGiftItem(
                                    item.promotion ?? item
                                  )
                                  const giftItemsToShow = selectedGiftItem
                                    ? [selectedGiftItem]
                                    : []

                                  return Number(item.gift_item_units || 0) > 0 ||
                                    giftItemsToShow.length > 0 ? (
                                    <small className="checkout_gift_items_note">
                                      {selectedGiftItem
                                        ? `Regalo elegido: ${formatGiftItemsText(
                                            giftItemsToShow,
                                            item.gift_item_units
                                          )}`
                                        : `${Number(item.gift_item_units || 0)} regalo(s) pendiente(s) por elegir`}
                                    </small>
                                  ) : null
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="text-end">{formatQuantity(item.quantity)}</td>
                          <td className="text-end">{formatMoney(item.unit_price)}</td>
                          <td className="text-end">
                            <div className="checkout_line_stack">
                              <strong>{formatMoney(item.regular_line_total)}</strong>
                              <span>
                                {formatQuantity(item.regular_units)} x {formatMoney(item.unit_price)}
                              </span>
                            </div>
                          </td>
                          <td className="text-end">
                            {Number(item.gift_units || 0) > 0 ||
                            Number(item.gift_item_units || 0) > 0 ||
                            getSelectedGiftItem(item.promotion ?? item) ? (
                              <div className="checkout_line_stack checkout_line_stack--gift">
                                {Number(item.gift_units || 0) > 0 ? (
                                  <>
                                    <strong>{formatMoney(item.gift_line_total)}</strong>
                                    <span>
                                      {formatQuantity(item.gift_units)} x {formatMoney(item.gift_unit_accounting_price)}
                                    </span>
                                  </>
                                ) : null}
                                {Number(item.gift_item_units || 0) > 0 ? (
                                  <span>
                                    {getSelectedGiftItem(item.promotion ?? item)
                                      ? `Elegido: ${formatGiftItemsText(
                                          [getSelectedGiftItem(item.promotion ?? item)],
                                          item.gift_item_units
                                        )}`
                                      : `${Number(item.gift_item_units || 0)} regalo(s) pendiente(s) por elegir`}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-end checkout_discount">
                            -{formatMoney(item.discount)}
                          </td>
                          <td className="text-end checkout_line_total">
                            {formatMoney(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              ) : null}

            </section>

            <aside className="checkout_sidebar">
              {showLegacyInlineAddressForm ? (
                <CheckoutShippingForm
                  isGuestCheckout={isGuestCheckout}
                  guestForm={guestForm}
                  addressForm={addressForm}
                  addressSaving={addressSaving}
                  selectedAddress={selectedAddress}
                  onGuestChange={handleGuestFormChange}
                  onAddressChange={handleAddressFormChange}
                  onSaveGuestAddress={handleSaveGuestAddress}
                  onSaveAddress={handleAddAddress}
                  onClearGuestAddress={() => {
                    setGuestForm(emptyGuestCheckoutForm)
                    setGuestAddress(null)
                  }}
                />
              ) : null}
              <InvoiceSummary
                totals={totals}
                canCheckout={canContinue}
                processingPayment={processingPayment}
                hasPendingGiftSelection={hasPendingGiftSelection}
                onPay={handleStartStripeCheckout}
                onDownloadPreview={handleDownloadPreview}
                hasAddress={Boolean(selectedAddress)}
                loyalty={checkout.loyalty}
                accountCashback={accountCashback}
                cashbackAmount={cashbackAmount}
                cashbackLoading={cashbackLoading}
                onCashbackAmountChange={setCashbackAmount}
                onApplyCashback={handleApplyCashback}
                onClearCashback={handleClearCashback}
                coupon={checkout.coupon || totals.coupon}
                insufficientStockBlockers={insufficientStockBlockers}
                invalidStockItems={invalidStockItems}
                hasStripePaymentMethod={hasStripePaymentMethod}
                paymentMethodsLoading={paymentMethodsLoading}
                shipping={checkout.shipping}
              />
            </aside>
          </div>
        )}
      </div>

      {hasItems ? (
        <div className="checkout_mobile_bar">
          <div className="checkout_mobile_bar_info">
            <span className="mobile_bar_label">Total a pagar</span>
            <strong className="mobile_bar_total">{formatMoney(totals.amount_due)}</strong>
          </div>

          {paymentMethodsLoading ? (
            <p className="checkout_muted">Cargando métodos de pago...</p>
          ) : hasStripePaymentMethod ? (
            <button
              type="button"
              className="btn btn_primary mobile_pay_btn"
              onClick={handleStartStripeCheckout}
              disabled={processingPayment || !canPay}
            >
              {processingPayment ? "Redirigiendo..." : "Pagar"}
            </button>
          ) : (
            <p className="checkout_muted checkout_muted--warning">
              No hay métodos de pago disponibles.
            </p>
          )}

        </div>
      ) : null}

      <PaymentConfirmationModal
        isOpen={confirmPaymentOpen}
        address={selectedAddress}
        processing={processingPayment}
        onCancel={() => setConfirmPaymentOpen(false)}
        onConfirm={handleConfirmStripeCheckout}
      />

      <AdminSidePanel
        isOpen={addressPanelOpen}
        title={addressPanelMode === "create" ? "Agregar dirección" : "Dirección de envío"}
        subtitle={addressPanelMode === "create" ? "Guarda una nueva dirección sin salir del checkout." : "Selecciona una dirección guardada para continuar."}
        onClose={() => setAddressPanelOpen(false)}
        width="lg"
        footer={(
          <div className="checkout_address_panel_footer">
            <button
              type="button"
              className="btn btn_ghost"
              onClick={() => setAddressPanelOpen(false)}
            >
              Cerrar
            </button>
            {addressPanelMode === "select" ? (
              <button
                type="button"
                className="btn btn_primary"
                onClick={() => setAddressPanelOpen(false)}
                disabled={!selectedAddress}
              >
                Usar dirección seleccionada
              </button>
            ) : null}
          </div>
        )}
      >
        <div className="checkout_address_panel">
          {addressPanelMode === "select" ? (
            <AddressSelectionList
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              addressesLoading={addressesLoading}
              onSelectAddress={handleSelectAddress}
              onAddAddress={handleOpenCreateAddressPanel}
            />
          ) : (
            <CheckoutShippingForm
              isGuestCheckout={false}
              guestForm={guestForm}
              addressForm={addressForm}
              addressSaving={addressSaving}
              selectedAddress={null}
              onGuestChange={handleGuestFormChange}
              onAddressChange={handleAddressFormChange}
              onSaveGuestAddress={handleSaveGuestAddress}
              onSaveAddress={handleAddAddress}
              onClearGuestAddress={() => null}
            />
          )}
        </div>
      </AdminSidePanel>
    </div>
  )
}

function GuestCheckoutFlow({
  form,
  selectedAddress,
  onChange,
  onSaveAddress,
  onClearAddress,
}) {
  const isReady = isCheckoutAddressFormValid(form)

  return (
    <section className="checkout_guest_flow" aria-label="Datos de checkout">
      <CheckoutStep number={1} title="Datos de contacto">
        <div className="checkout_guest_grid">
          <label>
            <span>Teléfono *</span>
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              inputMode="numeric"
              maxLength={ADDRESS_PHONE_LENGTH}
            />
          </label>

          <label>
            <span>Correo</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
            />
          </label>
        </div>
      </CheckoutStep>

      <CheckoutStep number={2} title="Forma de entrega">
        {selectedAddress ? (
          <div className="checkout_delivery_option checkout_delivery_option--guest">
            <i className="bi bi-geo-alt-fill" aria-hidden="true" />
            <div>
              <strong>{formatAddress(selectedAddress)}</strong>
              {selectedAddress.address_line_2 ? <span>{selectedAddress.address_line_2}</span> : null}
              {selectedAddress.phone ? <small>{selectedAddress.phone}</small> : null}
              <button type="button" onClick={onClearAddress}>
                Cambiar dirección
              </button>
            </div>
          </div>
        ) : (
          <form className="checkout_guest_grid" onSubmit={onSaveAddress}>
            <label className="checkout_guest_field_full">
              <span>Dirección *</span>
              <input
                name="street"
                value={form.street}
                onChange={onChange}
              />
            </label>

            <label>
              <span>Línea 2</span>
              <input
                name="address_line_2"
                value={form.address_line_2}
                onChange={onChange}
              />
            </label>

            <label>
              <span>Referencia</span>
              <input
                name="references"
                value={form.references}
                onChange={onChange}
                maxLength={DELIVERY_NOTE_MAX_LENGTH}
              />
            </label>

            <div className="checkout_guest_actions">
              <button type="submit" className="btn btn_primary" disabled={!isReady}>
                Guardar dirección para envío
              </button>
            </div>
          </form>
        )}
      </CheckoutStep>
    </section>
  )
}

function AuthenticatedCheckoutFlow({
  customer,
  addresses,
  shipping,
  selectedAddress,
  selectedAddressId,
  addressesLoading,
  onSelectAddress,
  onAddAddress,
  onChangeAddress,
}) {
  return (
    <section className="checkout_guest_flow" aria-label="Datos de checkout">
      <CheckoutStep number={1} title="Datos de contacto">
        <div className="checkout_customer_snapshot">
          <div>
            <small>Cliente</small>
            <span>{customer?.name || "Cliente"}</span>
          </div>
          <div>
            <small>Correo</small>
            <span>{customer?.email || "-"}</span>
          </div>
        </div>
      </CheckoutStep>

      <CheckoutStep number={2} title="Forma de entrega">
        <AddressSelectionList
          addresses={addresses}
          selectedAddress={selectedAddress}
          selectedAddressId={selectedAddressId}
          addressesLoading={addressesLoading}
          onSelectAddress={onSelectAddress}
          onAddAddress={onAddAddress}
          onChangeAddress={onChangeAddress}
        />
        <CheckoutFreeShippingProgress shipping={shipping} />
      </CheckoutStep>
    </section>
  )
}

function AddressSelectionList({
  addresses,
  selectedAddress,
  selectedAddressId,
  addressesLoading,
  onSelectAddress,
  onAddAddress,
  onChangeAddress,
}) {
  if (addressesLoading) {
    return <p className="checkout_address_empty">Cargando direcciones...</p>
  }

  if (selectedAddress && onChangeAddress) {
    return (
      <div className="checkout_delivery_option">
        <i className="bi bi-geo-alt-fill" aria-hidden="true" />
        <div>
          <strong>{formatAddress(selectedAddress)}</strong>
          <button type="button" onClick={onChangeAddress}>
            Cambiar dirección
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout_address_selector">
      {addresses.length ? (
        <div className="checkout_address_selector_list">
          {addresses.map((address) => (
            <button
              type="button"
              className={`checkout_address_card ${selectedAddressId === address.id ? "is-selected" : ""}`}
              key={address.id}
              onClick={() => onSelectAddress(address)}
            >
              <span className="checkout_address_radio">
                {selectedAddressId === address.id ? (
                  <i className="bi bi-check-lg" aria-hidden="true" />
                ) : null}
              </span>
              <span className="checkout_address_content">
                <strong>{address.alias}</strong>
                <small>{address.contact_name || "Sin contacto"} · {address.phone || "Sin teléfono"}</small>
                <span>{formatAddress(address)}</span>
                {address.is_default ? <em>Predeterminada</em> : null}
                {address.delivery_note ? <em>{address.delivery_note}</em> : null}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="checkout_address_empty">No tienes direcciones guardadas.</p>
      )}

      <button type="button" className="checkout_add_address_button" onClick={onAddAddress}>
        <i className="bi bi-plus-lg" aria-hidden="true" />
        Agregar dirección
      </button>
    </div>
  )
}

function CheckoutOrderItems({ items = [] }) {
  if (!items.length) return null

  return (
    <section className="checkout_products_card">
      <div className="checkout_products_head">
        <h2>Productos</h2>
        <span>{items.length} producto(s)</span>
      </div>
      <div className="checkout_order_items checkout_order_items--main">
        {items.map((item) => (
          <article className="checkout_order_item" key={item.cart_item_id || `${item.product_id}-${item.line_number}`}>
            <img src={item.image} alt={item.name} loading="lazy" />
            <div>
              <strong>{item.name}</strong>
              <span>{formatMoney(item.unit_price)}</span>
              <small>Cantidad {formatQuantity(item.quantity)}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function CheckoutOrderDetails({
  promotions = [],
  documentNotes,
  documentNotesOpen,
  onDocumentNotesChange,
  onToggleDocumentNotes,
}) {
  return (
    <section className="checkout_post_delivery">
      {promotions.length ? (
        <div className="checkout_summary_promotions">
          {promotions.map((promotion) => (
            <article key={promotion.id}>
              <strong>{promotion.name || formatPromotionType(promotion.type)}</strong>
              <span>Ahorro {formatMoney(promotion.total_discount)}</span>
            </article>
          ))}
        </div>
      ) : null}

      <div className="checkout_summary_note">
        <button type="button" onClick={onToggleDocumentNotes}>
          {documentNotesOpen || documentNotes ? "Editar nota del envío" : "Agregar nota del envío"}
        </button>

        {documentNotesOpen ? (
          <div className="checkout_summary_note_field">
            <textarea
              value={documentNotes}
              onChange={onDocumentNotesChange}
              maxLength={DOCUMENT_NOTE_MAX_LENGTH}
              rows="3"
              placeholder="Escribe una nota para el envío."
            />
            <span>{documentNotes.length}/{DOCUMENT_NOTE_MAX_LENGTH}</span>
          </div>
        ) : documentNotes ? (
          <p>{documentNotes}</p>
        ) : null}
      </div>
    </section>
  )
}

function CheckoutStep({ number, title, children }) {
  return (
    <div className="checkout_step">
      <div className="checkout_step_head">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function CheckoutShippingForm({
  isGuestCheckout,
  guestForm,
  addressForm,
  addressSaving,
  selectedAddress,
  onGuestChange,
  onAddressChange,
  onSaveGuestAddress,
  onSaveAddress,
  onClearGuestAddress,
}) {
  const form = isGuestCheckout ? guestForm : addressForm
  const onChange = isGuestCheckout ? onGuestChange : onAddressChange
  const onSubmit = isGuestCheckout ? onSaveGuestAddress : onSaveAddress
  const isReady = isCheckoutAddressFormValid(form)
  const buttonText = isGuestCheckout
    ? selectedAddress
      ? "Dirección temporal guardada"
      : "Guardar dirección para envío"
    : addressSaving
    ? "Guardando..."
    : "Guardar dirección para envío"

  return (
    <section className="checkout_shipping_form_card">
      <div className="checkout_invoice_card_head">
        <div>
          <h2>Dirección de envío</h2>
          <p>{selectedAddress ? "Lista para continuar con el pago." : "Completa los datos obligatorios para continuar."}</p>
        </div>
      </div>

      <form className="checkout_address_form checkout_address_form--compact" onSubmit={onSubmit}>
        <label>
          <span>Dirección *</span>
          <input name="street" value={form.street} onChange={onChange} placeholder="Calle, número, colonia, ciudad" />
        </label>
        <label>
          <span>Línea 2</span>
          <input name="address_line_2" value={form.address_line_2} onChange={onChange} placeholder="Depto, interior, piso" />
        </label>
        <label>
          <span>Teléfono *</span>
          <input name="phone" value={form.phone} onChange={onChange} placeholder="9611234567" inputMode="numeric" maxLength={ADDRESS_PHONE_LENGTH} />
        </label>
        {isGuestCheckout ? (
          <label>
            <span>Correo</span>
            <input name="email" type="email" value={form.email} onChange={onChange} placeholder="cliente@correo.com" />
          </label>
        ) : null}
        <label>
          <span>Referencia</span>
          <textarea name={isGuestCheckout ? "references" : "delivery_note"} value={isGuestCheckout ? form.references : form.delivery_note} onChange={onChange} placeholder="Entre calles, color de fachada, indicaciones" rows="3" maxLength={DELIVERY_NOTE_MAX_LENGTH} />
        </label>

        <button type="submit" className="btn btn_primary" disabled={!isReady || addressSaving}>
          {buttonText}
        </button>

        {selectedAddress ? (
          <div className="checkout_saved_address">
            <strong>{formatAddress(selectedAddress)}</strong>
            {selectedAddress.address_line_2 ? <span>{selectedAddress.address_line_2}</span> : null}
            <small>{selectedAddress.phone}</small>
            {isGuestCheckout ? (
              <button type="button" className="btn btn_ghost" onClick={onClearGuestAddress}>
                Cambiar dirección
              </button>
            ) : null}
          </div>
        ) : null}
      </form>
    </section>
  )
}

function InvoiceSummary({
  totals,
  canCheckout,
  processingPayment,
  hasPendingGiftSelection,
  onPay,
  onDownloadPreview,
  loyalty,
  accountCashback,
  cashbackAmount,
  cashbackLoading,
  onCashbackAmountChange,
  onApplyCashback,
  onClearCashback,
  coupon,
  insufficientStockBlockers = [],
  invalidStockItems = [],
  hasStripePaymentMethod,
  paymentMethodsLoading,
  shipping,
}) {
  const shippingLabel = shipping?.method?.label || "Envío"

  return (
    <div className="summary_card">
      <h2 className="summary_title">Resumen de compra</h2>

      <div className="summary_rows">
        <div className="summary_row">
          <span>Subtotal</span>
          <span>{formatMoney(totals.subtotal)}</span>
        </div>

        {Number(totals.discount || 0) > 0 ? (
          <div className="summary_row">
            <span>Descuento</span>
            <span className="summary_discount">-{formatMoney(totals.discount)}</span>
          </div>
        ) : null}

        {coupon?.code ? (
          <div className={`summary_row checkout_coupon_row ${coupon.is_valid === false ? "is-invalid" : ""}`}>
            <span>Cupón {coupon.code}</span>
            <span className="summary_discount">-{formatMoney(coupon.discount_amount)}</span>
          </div>
        ) : null}

        {Number(totals.gift_accounting_total || 0) > 0 ? (
          <div className="summary_row">
            <span>Regalos facturados</span>
            <span>{formatMoney(totals.gift_accounting_total)}</span>
          </div>
        ) : null}

        {Number(totals.tax || 0) > 0 ? (
          <div className="summary_row">
            <span>Impuestos</span>
            <span>{formatMoney(totals.tax)}</span>
          </div>
        ) : null}

        <div className="summary_row">
          <span>{shippingLabel}</span>
          <span>{Number(totals.shipping || 0) > 0 ? formatMoney(totals.shipping) : "Gratis"}</span>
        </div>

      </div>

      <div className="summary_total">
        <span>Total</span>
        <strong>{formatMoney(totals.total)}</strong>
      </div>

      <div className="summary_amount_due">
        <span>Importe a pagar</span>
        <strong>{formatMoney(totals.amount_due)}</strong>
      </div>

      <CheckoutLoyaltySummary
        loyalty={loyalty}
        accountCashback={accountCashback}
        cashbackAmount={cashbackAmount}
        cashbackLoading={cashbackLoading}
        onCashbackAmountChange={onCashbackAmountChange}
        onApplyCashback={onApplyCashback}
        onClearCashback={onClearCashback}
      />

      {hasPendingGiftSelection ? (
        <p className="checkout_muted">
          Debes elegir el regalo pendiente para poder continuar.
        </p>
      ) : null}

      {insufficientStockBlockers.length || invalidStockItems.length ? (
        <p className="checkout_muted checkout_muted--warning">
          Hay productos sin inventario suficiente. Ajusta cantidades en carrito.
        </p>
      ) : null}

      <div className="summary_actions">
        {paymentMethodsLoading ? (
          <p className="checkout_muted">Cargando métodos de pago...</p>
        ) : hasStripePaymentMethod ? (
          <button
            type="button"
            className="btn btn_primary"
            onClick={onPay}
            disabled={processingPayment || !canCheckout}
          >
            {processingPayment ? "Validando checkout..." : "Pagar"}
          </button>
        ) : (
          <p className="checkout_muted checkout_muted--warning">
            No hay métodos de pago disponibles para esta tienda.
          </p>
        )}

        <button
          type="button"
          className="btn btn_secondary"
          onClick={onDownloadPreview}
        >
          Descargar previa de pedido
        </button>

      </div>
    </div>
  )
}

function PaymentConfirmationModal({ isOpen, address, processing, onCancel, onConfirm }) {
  if (!isOpen) return null

  return (
    <div className="checkout_confirm_overlay" role="presentation">
      <div className="checkout_confirm_modal" role="dialog" aria-modal="true" aria-labelledby="checkout-confirm-title">
        <h2 id="checkout-confirm-title">Confirmar dirección</h2>
        <p>
          Confirma la dirección de envío antes de pagar su pedido, una vez realizado el pago no podrá modificar la dirección.
        </p>
        <div className="checkout_confirm_address">
          <strong>{address?.street || "Dirección pendiente"}</strong>
          {address?.address_line_2 ? <span>{address.address_line_2}</span> : null}
        </div>
        <div className="checkout_confirm_actions">
          <button type="button" className="btn btn_ghost checkout_confirm_cancel" onClick={onCancel} disabled={processing}>
            Cancelar
          </button>
          <button type="button" className="btn btn_primary checkout_confirm_accept" onClick={onConfirm} disabled={processing}>
            {processing ? "Procesando..." : "Acepto y continuar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckoutFreeShippingProgress({ shipping }) {
  const normalizedShipping = normalizeCheckoutShipping(shipping)
  if (!normalizedShipping?.enabled || !normalizedShipping.free_shipping_minimum_enabled) return null

  const minimum = Number(normalizedShipping.free_shipping_minimum || 0)
  if (minimum <= 0) return null

  const remaining = Math.max(Number(normalizedShipping.remaining_for_free_shipping || 0), 0)
  const qualifyingAmount = Math.max(Number(normalizedShipping.qualifying_amount || 0), 0)
  const progress = Math.max(0, Math.min(100, (qualifyingAmount / minimum) * 100))
  const isFree = remaining <= 0 || toBoolean(normalizedShipping.is_free)

  return (
    <div className={`checkout_shipping_progress ${isFree ? "is-complete" : ""}`}>
      <div className="checkout_shipping_progress_head">
        <strong>{isFree ? "Alcanzaste el mínimo para envío gratis" : `Te falta ${formatMoney(remaining)} para envío gratis`}</strong>
        <span>{formatMoney(qualifyingAmount)} / {formatMoney(minimum)}</span>
      </div>
      <div className="checkout_shipping_progress_track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p>
        {isFree
          ? "El costo de envío ya está bonificado en este pedido."
          : "El mínimo se calcula con subtotal menos descuentos, antes de sumar envío."}
      </p>
    </div>
  )
}

function toBoolean(value) {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
  }

  return false
}

function CheckoutLoyaltySummary({
  loyalty,
  accountCashback,
  cashbackAmount,
  cashbackLoading,
  onCashbackAmountChange,
  onApplyCashback,
  onClearCashback,
}) {
  const firstPurchase = loyalty?.firstPurchaseDiscount ?? {}
  const cartCashback = loyalty?.cashback ?? {}
  const accountSettings = accountCashback?.settings
  const accountBalance = accountCashback?.balance
  const cashback = {
    ...cartCashback,
    availableBalance: Number(accountBalance?.available ?? cartCashback?.availableBalance ?? 0),
  }
  const maxRedeemable = Number(cartCashback?.maxRedeemable ?? 0)
  const appliedAmount = Number(cartCashback?.appliedAmount ?? 0)
  const hasFirstPurchase = firstPurchase?.eligible && firstPurchase?.amount > 0
  const hasCashbackApplied = appliedAmount > 0
  const hasCashbackEarn = cartCashback?.earn?.amount > 0
  const canShowCashback =
    accountSettings?.cashbackEnabled === true &&
    accountSettings?.redeemEnabled === true &&
    cashback.availableBalance > 0 &&
    maxRedeemable > 0
  const cashbackInputMax = Math.min(cashback.availableBalance, maxRedeemable)

  if (!hasFirstPurchase && !hasCashbackApplied && !hasCashbackEarn && !canShowCashback) return null

  return (
    <div className="checkout_loyalty_summary">
      <div className="checkout_loyalty_summary_head">
        <i className="bi bi-stars" aria-hidden="true" />
        <strong>Fidelidad</strong>
      </div>

      {hasFirstPurchase ? (
        <div>
          <span>Primera compra · {firstPurchase.percentage}%</span>
          <strong>-{formatMoney(firstPurchase.amount)}</strong>
        </div>
      ) : null}

      {hasCashbackApplied ? (
        <div>
          <span>Cashback usado</span>
          <strong>-{formatMoney(appliedAmount)}</strong>
        </div>
      ) : null}

      {hasCashbackEarn ? (
        <div>
          <span>Cashback a ganar · {cartCashback.earn.percentage}%</span>
          <strong>{formatMoney(cartCashback.earn.amount)}</strong>
        </div>
      ) : null}

      {canShowCashback || hasCashbackApplied ? (
        <div>
          <span>Cashback disponible</span>
          <strong>{formatMoney(cashback.availableBalance)}</strong>
        </div>
      ) : null}

      {canShowCashback || hasCashbackApplied ? (
        <form className="checkout_cashback_form" onSubmit={onApplyCashback}>
          {canShowCashback ? (
            <input
              type="number"
              min="0"
              max={cashbackInputMax}
              step="0.01"
              value={cashbackAmount}
              onChange={(event) => {
                const value = event.target.value
                const numericValue = Number(value)
                onCashbackAmountChange(
                  numericValue > cashbackInputMax ? String(cashbackInputMax) : value
                )
              }}
              placeholder={String(cashbackInputMax)}
              aria-label="Monto de cashback a usar"
              disabled={cashbackLoading}
            />
          ) : null}

          {canShowCashback ? (
            <button type="submit" className="btn btn_secondary" disabled={cashbackLoading}>
              {cashbackLoading ? "Aplicando..." : "Aplicar"}
            </button>
          ) : null}

          {hasCashbackApplied ? (
            <button type="button" className="btn btn_ghost checkout_cashback_clear" onClick={onClearCashback} disabled={cashbackLoading}>
              Quitar
            </button>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

function normalizeCheckout(response) {
  const data = response?.data || response || emptyCheckout

  return {
    ...emptyCheckout,
    ...data,
    blockers: Array.isArray(data.blockers) ? data.blockers : [],
    items: Array.isArray(data.items)
      ? data.items.map(normalizeCheckoutItem)
      : [],
    promotions_applied: Array.isArray(data.promotions_applied)
      ? data.promotions_applied.map((promotion) => ({
          ...promotion,
          gift_item_units: Number(
            promotion.gift_item_units ??
              promotion.snapshot?.gift_item_units ??
              0
          ),
          gift_items: normalizeGiftItems(
            promotion.gift_items ?? promotion.snapshot?.gift_items
          ),
          snapshot: promotion.snapshot ?? {},
        }))
      : [],
    invoice_preview: {
      ...emptyCheckout.invoice_preview,
      ...(data.invoice_preview || {}),
      totals: {
        ...emptyCheckout.totals,
        ...(data.invoice_preview?.totals || {}),
        tax_breakdown: normalizeTaxBreakdown(data.invoice_preview?.totals?.tax_breakdown),
      },
      notes: Array.isArray(data.invoice_preview?.notes) ? data.invoice_preview.notes : [],
    },
    totals: {
      ...emptyCheckout.totals,
      ...(data.totals || data.invoice_preview?.totals || {}),
      tax_breakdown: normalizeTaxBreakdown(
        data.totals?.tax_breakdown ?? data.invoice_preview?.totals?.tax_breakdown
      ),
      coupon: normalizeCheckoutCoupon(data.totals?.coupon ?? data.coupon),
    },
    coupon: normalizeCheckoutCoupon(data.coupon ?? data.totals?.coupon),
    loyalty: normalizeCheckoutLoyalty(data.loyalty),
    shipping: normalizeCheckoutShipping(data.shipping),
  }
}

function normalizeCheckoutShipping(shipping) {
  if (!shipping || typeof shipping !== "object") return shipping ?? null

  const value = shipping.value || shipping
  const method = value.method || {}
  const freeShippingMinimumEnabled =
    value.free_shipping_minimum_enabled ??
    value.freeShippingMinimumEnabled ??
    value.free_minimum_enabled ??
    value.freeMinimumEnabled
  const freeShippingMinimum =
    value.free_shipping_minimum ??
    value.freeShippingMinimum ??
    value.free_minimum ??
    value.freeMinimum
  const qualifyingAmount =
    value.qualifying_amount ??
    value.qualifyingAmount ??
    value.free_shipping_basis_amount ??
    value.freeShippingBasisAmount
  const remainingForFreeShipping =
    value.remaining_for_free_shipping ??
    value.remainingForFreeShipping ??
    value.amount_remaining_for_free_shipping ??
    value.amountRemainingForFreeShipping

  return {
    ...value,
    enabled: toBoolean(value.enabled),
    method: {
      ...method,
      label: method.label || value.label || "Envío",
    },
    amount: Number(value.amount ?? value.shipping_amount ?? value.shippingAmount ?? 0),
    is_free: toBoolean(value.is_free ?? value.isFree),
    free_shipping_minimum_enabled: toBoolean(freeShippingMinimumEnabled),
    free_shipping_minimum: Number(freeShippingMinimum ?? 0),
    qualifying_amount: Number(qualifyingAmount ?? 0),
    remaining_for_free_shipping: Number(remainingForFreeShipping ?? 0),
  }
}

function normalizeCheckoutCoupon(coupon) {
  if (!coupon || typeof coupon !== "object") return null

  return {
    ...coupon,
    discount_amount: Number(coupon.discount_amount ?? 0),
    is_valid: coupon.is_valid !== false,
  }
}

function normalizeCheckoutItem(item = {}) {
  const quantity = Number(item.quantity ?? 0)
  const unitPrice = Number(item.unit_price ?? item.base_unit_price ?? 0)
  const discount = Number(item.discount ?? item.line_discount ?? 0)
  const total = Number(item.total ?? item.line_subtotal ?? unitPrice * quantity - discount)
  const regularUnits = Number(item.regular_units ?? quantity)

  return {
    ...item,
    quantity,
    image: getCheckoutItemImage(item),
    unit_price: unitPrice,
    discount,
    total,
    regular_units: regularUnits,
    regular_line_total: Number(item.regular_line_total ?? unitPrice * regularUnits),
    gift_item_units: Number(
      item.gift_item_units ??
        item.promotion?.snapshot?.gift_item_units ??
        0
    ),
    gift_items: normalizeGiftItems(
      item.gift_items ?? item.promotion?.snapshot?.gift_items
    ),
    taxable_base: Number(item.taxable_base ?? 0),
    tax: Number(item.tax ?? item.tax_amount ?? 0),
    taxes: normalizeTaxes(item.taxes),
    stock: normalizeCheckoutItemStock(item),
    selected_attributes: normalizeSelectedAttributes(item.selected_attributes ?? item.metadata?.selected_attributes),
    promotion: item.promotion
      ? {
          ...item.promotion,
          snapshot: item.promotion.snapshot ?? {},
        }
      : null,
  }
}

function getCheckoutItemImage(item = {}) {
  const rawImage =
    item.image_url ??
    item.image_path ??
    item.image ??
    item.thumbnail_url ??
    item.thumbnail ??
    item.product?.image_url ??
    item.product?.image_path ??
    item.product?.image ??
    item.product?.thumbnail_url ??
    item.product?.thumbnail ??
    item.product?.default_image?.url ??
    item.product?.default_image?.path ??
    item.product?.media?.[0]?.url ??
    item.product?.media?.[0]?.path ??
    item.product?.images?.[0]?.url ??
    item.product?.images?.[0]?.path ??
    item.variant?.image_url ??
    item.variant?.image_path

  return normalizeMediaUrl(rawImage) || CHECKOUT_ITEM_IMAGE_PLACEHOLDER
}

function normalizeCheckoutItemStock(item = {}) {
  const stock = item.stock

  if (stock && typeof stock === "object") {
    const rawAvailableStock =
      stock.available_stock ??
      stock.availableStock ??
      item.available_stock ??
      item.stock_available ??
      item.product?.stock ??
      null
    const hasAvailableStockValue =
      rawAvailableStock !== null && rawAvailableStock !== undefined && rawAvailableStock !== ""
    const availableStock = hasAvailableStockValue ? Number(rawAvailableStock) : null
    const requestedQuantity = Number(stock.requested_quantity ?? item.quantity ?? 0)
    const isValid =
      stock.is_valid === false
        ? false
        : hasAvailableStockValue
        ? Number.isFinite(availableStock) && availableStock > 0 && requestedQuantity <= availableStock
        : true

    return {
      is_tracked: true,
      is_valid: isValid,
      available_stock: Number.isFinite(availableStock) ? availableStock : null,
      requested_quantity: requestedQuantity,
      message:
        stock.message ||
        item.stock_message ||
        item.product?.stock_message ||
        (Number(availableStock || 0) <= 0
          ? "Producto sin inventario disponible."
          : `Solo hay ${availableStock} pieza(s) disponibles.`),
    }
  }

  const rawAvailableStock =
    stock ??
    item.available_stock ??
    item.stock_available ??
    item.product?.stock ??
    null

  if (rawAvailableStock === null || rawAvailableStock === undefined || rawAvailableStock === "") {
    return null
  }

  const availableStock =
    Number(rawAvailableStock)
  const requestedQuantity = Number(item.quantity ?? 0)

  return {
    is_tracked: true,
    is_valid: Number.isFinite(availableStock) && availableStock > 0 && requestedQuantity <= availableStock,
    available_stock: Number.isFinite(availableStock) ? availableStock : 0,
    requested_quantity: requestedQuantity,
    message:
      item.stock_message ||
      item.product?.stock_message ||
      (availableStock <= 0
        ? "Producto sin inventario disponible."
        : `Solo hay ${availableStock} pieza(s) disponibles.`),
  }
}

function isCheckoutItemStockInvalid(item = {}) {
  if (item.stock?.is_valid === false) return true

  const stockStatus =
    item.stock_status ||
    item.stockStatus ||
    item.product?.stock_status ||
    item.product?.stockStatus ||
    ""

  return stockStatus === "out_of_stock"
}

function normalizeCheckoutLoyalty(loyalty) {
  if (!loyalty || typeof loyalty !== "object") return null
  const firstPurchase = loyalty.first_purchase_discount ?? loyalty.firstPurchaseDiscount ?? {}
  const cashback = loyalty.cashback ?? {}
  const earn = cashback.earn ?? {}

  return {
    firstPurchaseDiscount: {
      eligible: toBoolean(firstPurchase.eligible),
      percentage: Number(firstPurchase.percentage ?? 0),
      amount: Number(firstPurchase.amount ?? 0),
    },
    cashback: {
      availableBalance: Number(cashback.available_balance ?? cashback.availableBalance ?? 0),
      maxRedeemable: Number(cashback.max_redeemable ?? cashback.maxRedeemable ?? 0),
      appliedAmount: Number(cashback.applied_amount ?? cashback.appliedAmount ?? 0),
      earn: {
        percentage: Number(earn.percentage ?? 0),
        amount: Number(earn.amount ?? 0),
      },
    },
  }
}

function normalizeAccountCashback(payload) {
  const data = payload?.data ?? payload ?? {}
  const settings = data.settings && typeof data.settings === "object" ? data.settings : {}
  const balance = data.balance && typeof data.balance === "object" ? data.balance : {}

  return {
    currency: String(data.currency || "MXN").toUpperCase(),
    settings: {
      cashbackEnabled: toBoolean(settings.cashback_enabled ?? settings.cashbackEnabled),
      earnPercentage: Number(settings.cashback_earn_percentage ?? settings.cashbackEarnPercentage ?? 0),
      redeemEnabled: toBoolean(settings.cashback_redeem_enabled ?? settings.cashbackRedeemEnabled),
      maxRedeemPercentage: Number(settings.cashback_max_redeem_percentage ?? settings.cashbackMaxRedeemPercentage ?? 0),
    },
    balance: {
      available: Number(balance.available ?? 0),
      pending: Number(balance.pending ?? 0),
    },
  }
}

function getRecoverableOrder(response) {
  const data = response?.data || response || {}
  const recoverableOrder = data?.recoverable_order || null

  if (DEBUG_RECOVERABLE_CART) {
    console.log("[recoverable-cart][checkout] normalized data:", data)
    console.log("[recoverable-cart][checkout] detected recoverable_order:", recoverableOrder)
  }

  return recoverableOrder
}

function shouldTryImplicitRecover(response) {
  if (hasRecentStripeSuccessReturn()) {
    if (DEBUG_RECOVERABLE_CART) {
      console.log("[recoverable-cart][checkout] skipping implicit restore: recent Stripe success return")
    }

    return false
  }

  const data = response?.data || response || {}
  const cartData = data?.cart || data
  const hasNoItems = Number(cartData?.items_count ?? 0) === 0
  const hasNoLines = !Array.isArray(cartData?.items) || cartData.items.length === 0
  const isActiveCart = cartData?.status === "active"

  return Boolean(isActiveCart && hasNoItems && hasNoLines)
}

function syncCartSummary(cart) {
  if (!cart) return

  const summary = {
    id: cart?.id ?? null,
    items_count: Number(cart?.items_count ?? 0),
    subtotal: Number(cart?.subtotal ?? 0),
    tax: Number(cart?.tax ?? cart?.totals?.tax ?? 0),
    tax_breakdown: normalizeTaxBreakdown(cart?.tax_breakdown ?? cart?.totals?.tax_breakdown),
    total: Number(cart?.total ?? 0),
  }

  localStorage.setItem(CART_SUMMARY_STORAGE_KEY, JSON.stringify(summary))
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: summary }))
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

function normalizeAddresses(response) {
  const data = response?.data || response || []
  return Array.isArray(data) ? data.map(normalizeAddress).filter(Boolean) : []
}

function normalizeShippingAddresses(shipping) {
  const addresses = Array.isArray(shipping?.addresses) ? shipping.addresses : []
  const selectedAddress = shipping?.selected_address
  const addressMap = new Map()

  addresses.map(normalizeAddress).filter(Boolean).forEach((address) => {
    addressMap.set(address.id, address)
  })

  const normalizedSelectedAddress = normalizeAddress(selectedAddress)
  if (normalizedSelectedAddress) {
    addressMap.set(normalizedSelectedAddress.id, {
      ...(addressMap.get(normalizedSelectedAddress.id) || {}),
      ...normalizedSelectedAddress,
    })
  }

  return Array.from(addressMap.values()).sort((a, b) => Number(b.is_default) - Number(a.is_default))
}

function normalizeAddress(address) {
  if (!address) return null

  const id = address.id ?? address.address_id ?? null

  if (!id) return null

  return {
    ...address,
    id,
    alias: address.alias || (address.is_default ? "Dirección predeterminada" : "Dirección de envío"),
    is_default: Boolean(address.is_default),
  }
}

function buildAddressPayload(form, checkout) {
  return {
    alias: form.alias.trim() || "Dirección de envío",
    street: form.street.trim(),
    address_line_2: form.address_line_2.trim(),
    zip_code: form.zip_code.trim(),
    neighborhood: form.neighborhood.trim(),
    state: form.state.trim(),
    delivery_note: form.delivery_note.trim().slice(0, DELIVERY_NOTE_MAX_LENGTH),
    contact_name: form.contact_name.trim() || checkout.customer?.name || form.email.trim() || "Cliente",
    phone: form.phone.trim(),
    email: form.email.trim(),
    is_default: Boolean(form.is_default),
  }
}

function onlyDigits(value, maxLength) {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength)
}

function validateAddressForm(form) {
  if (!form.street.trim()) {
    return "Ingresa la dirección de envío."
  }

  if (!/^\d{10}$/.test(form.phone)) {
    return "El teléfono debe tener 10 dígitos numéricos."
  }

  if (form.email.trim() && !isValidOptionalEmail(form.email)) {
    return "Ingresa un correo válido o deja el campo vacío."
  }

  return ""
}

function normalizePaymentMethods(response) {
  const value = response?.data?.value || response?.data?.data?.value || response?.value || {}

  return {
    default_method: value.default_method || null,
    methods: Array.isArray(value.methods) ? value.methods : [],
  }
}

function getActivePaymentMethod(paymentMethods, key) {
  return paymentMethods?.methods?.find((method) => {
    return method.key === key && method.active !== false
  }) || null
}

function buildCheckoutAddressSelection(address) {
  if (!address?.id) return {}

  return {
    address_id: address.id,
  }
}

function buildCheckoutPayload(address, documentNotes = "") {
  const notes = String(documentNotes || "").trim().slice(0, DOCUMENT_NOTE_MAX_LENGTH)

  return {
    ...buildCheckoutAddressSelection(address),
    ...(notes ? { document_notes: notes } : {}),
  }
}

function buildGuestCheckoutPayload(address, documentNotes = "") {
  const notes = String(documentNotes || "").trim().slice(0, DOCUMENT_NOTE_MAX_LENGTH)
  const shippingAddress = buildGuestShippingAddress(address)

  return {
    shipping_address: shippingAddress,
    guest: {
      name: address.contact_name || address.email || "Cliente invitado",
      email: address.email || "",
      phone: address.phone,
      shipping_address: shippingAddress,
    },
    ...(notes ? { document_notes: notes } : {}),
  }
}

function buildGuestAddress(form) {
  return {
    id: "guest",
    alias: "Dirección temporal",
    contact_name: form.email.trim() || "Cliente invitado",
    phone: form.phone.trim(),
    email: form.email.trim(),
    street: form.street.trim(),
    address_line_2: form.address_line_2.trim(),
    references: form.references.trim().slice(0, DELIVERY_NOTE_MAX_LENGTH),
    full_address: [form.street.trim(), form.address_line_2.trim()].filter(Boolean).join(", "),
  }
}

function buildGuestShippingAddress(address) {
  return {
    contact_name: address.contact_name || "Cliente invitado",
    phone: address.phone.trim(),
    email: address.email?.trim() || "",
    street: address.street.trim(),
    address_line_2: address.address_line_2?.trim() || "",
    references: (address.references || address.delivery_note || "").trim().slice(0, DELIVERY_NOTE_MAX_LENGTH),
  }
}

function validateGuestAddressForm(form) {
  return validateAddressForm({
    ...emptyAddressForm,
    phone: form.phone,
    email: form.email,
    street: form.street,
    address_line_2: form.address_line_2,
    delivery_note: form.references,
  })
}

function isCheckoutAddressFormValid(form) {
  return Boolean(
    form.street?.trim() &&
      /^\d{10}$/.test(form.phone || "") &&
      isValidOptionalEmail(form.email || "")
  )
}

function isValidOptionalEmail(email) {
  const value = String(email || "").trim()
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getBlockerMessage(blockers = []) {
  if (!blockers.length) return "El checkout no puede continuar por el momento."
  return blockers.map(formatBlocker).join(" ")
}

function getActionableBlockers(blockers = [], invalidStockItems = []) {
  if (!Array.isArray(blockers)) return []

  return blockers.filter((blocker) => {
    const code = typeof blocker === "string" ? blocker : blocker?.code || blocker?.reason

    if (code === "missing_dir_cli_id") return false

    if (code !== "insufficient_stock") return true

    if (invalidStockItems.length > 0) return true

    const rawAvailableStock =
      typeof blocker === "object"
        ? blocker.available_stock ?? blocker.availableStock ?? blocker.stock ?? null
        : null
    const rawRequestedQuantity =
      typeof blocker === "object"
        ? blocker.requested_quantity ?? blocker.requestedQuantity ?? blocker.quantity ?? null
        : null

    if (rawAvailableStock === null || rawAvailableStock === undefined || rawAvailableStock === "") {
      return false
    }

    const availableStock = Number(rawAvailableStock)
    const requestedQuantity = Number(rawRequestedQuantity ?? 1)

    return Number.isFinite(availableStock) && availableStock > 0
      ? requestedQuantity > availableStock
      : true
  })
}

function hasInvoiceDetail(invoicePreview) {
  return Boolean(invoicePreview?.notes?.length || hasTotals(invoicePreview?.totals))
}

function hasTotals(totals) {
  if (!totals) return false

  return [
    "items_count",
    "subtotal",
    "discount",
    "tax",
    "shipping",
    "gift_accounting_total",
    "total",
    "amount_due",
  ].some((key) => Number(totals[key] || 0) !== 0)
}

function formatBlocker(blocker) {
  const blockerCode = typeof blocker === "string" ? blocker : blocker?.code || blocker?.reason
  if (blockerCode === "missing_dir_cli_id") {
    return "Selecciona una dirección de envío para continuar."
  }

  if (typeof blocker === "string") return blocker
  return blocker?.message || blocker?.reason || "Hay un pendiente por resolver."
}

function formatPromotionType(type) {
  const labels = {
    bundle_pay_x_take_y: "2x1 / 3x2",
    buy_sku_get_gift_item: "Compra SKU y recibe regalo",
    brand_amount_choose_gift_item: "Monto por marca y elige regalo",
    brand_amount_get_product: "Monto por marca y recibe SKU",
    buy_x_get_y: "Compra X y llévate Y",
    buy_x_get_discount: "Compra X y obtén % OFF",
    direct_percentage: "Descuento directo",
    strikethrough_price: "Precio tachado",
    price_scale_percentage: "Escalas por volumen",
  }

  if (labels[type]) return labels[type]

  return String(type || "Promoción")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatScaleSnapshot(snapshot = {}) {
  const scale = snapshot.scale || snapshot.current_scale || snapshot
  const discount = Number(scale?.discount_percentage ?? 0)
  const fromQuantity = Number(scale?.from_quantity ?? 0)
  const rawToQuantity = scale?.to_quantity
  const toQuantity =
    rawToQuantity === null || rawToQuantity === undefined || rawToQuantity === ""
      ? null
      : Number(rawToQuantity)

  if (!discount || !fromQuantity) return ""

  const discountText = Number.isInteger(discount) ? String(discount) : discount.toFixed(2)
  const rangeText = toQuantity
    ? fromQuantity === toQuantity
      ? `${fromQuantity} pieza(s)`
      : `de ${fromQuantity} a ${toQuantity} pieza(s)`
    : `desde ${fromQuantity} pieza(s)`

  return `${discountText}% de descuento ${rangeText}`
}

function getSelectedGiftItem(source) {
  return (
    normalizeGiftItems([
      source?.snapshot?.selected_gift_item ??
        source?.selected_gift_item ??
        null,
    ])[0] || null
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

function normalizeSelectedAttributes(attributes) {
  if (!Array.isArray(attributes)) return []

  return attributes
    .filter(Boolean)
    .map((attribute) => ({
      attribute: attribute.attribute ?? attribute.name ?? "",
      value: attribute.value ?? "",
    }))
    .filter((attribute) => attribute.attribute && attribute.value)
}

function formatSelectedAttributes(attributes = []) {
  return attributes.map((attribute) => `${attribute.attribute}: ${attribute.value}`).join(" / ")
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
      taxable_base: Number(item.taxable_base ?? 0),
      tax_amount: Number(item.tax_amount ?? item.tax ?? 0),
      taxes: normalizeTaxes(item.taxes),
    })),
  }
}

function formatGiftItemsText(giftItems = [], giftItemUnits = 0) {
  const units = Number(giftItemUnits || 0)
  const names = normalizeGiftItems(giftItems)
    .map((item) => item.name)
    .filter(Boolean)

  if (units <= 0 && names.length === 0) return ""

  const unitText = units > 0 ? `${units} regalo(s)` : "Regalo disponible"
  const namesText = names.length ? `: ${names.join(", ")}` : ""

  return `${unitText} de artículos promocionales${namesText}`
}

function formatAddress(address) {
  if (!address) return "Dirección pendiente"

  if (address.full_address) return address.full_address

  return [
    address.street,
    address.address_line_2,
    address.neighborhood,
    address.zip_code ? `CP ${address.zip_code}` : "",
    address.state,
  ].filter(Boolean).join(", ")
}

function buildPreviewPdfHtml(checkout, totals, selectedAddress, settings = {}) {
  const brandName = settings.brandName || "Tienda en línea"
  const logoUrl = settings.logoUrl || ""
  const documentNotes = String(settings.documentNotes || "").trim()
  const printableLogoUrl = logoUrl || `${window.location.origin}/favicon.svg`
  const rows = checkout.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.line_number)}</td>
      <td>
        <strong>${escapeHtml(item.name)}</strong>
        <span>SKU ${escapeHtml(item.sku || "-")} · Producto #${escapeHtml(item.product_id)}</span>
        ${item.promotion ? `<em>${escapeHtml(item.promotion.name || formatPromotionType(item.promotion.type))}</em>` : ""}
        ${formatScaleSnapshot(item.promotion?.snapshot) ? `<em>${escapeHtml(formatScaleSnapshot(item.promotion.snapshot))}</em>` : ""}
        ${(() => {
          const selectedGiftItem = getSelectedGiftItem(item.promotion ?? item)

          if (selectedGiftItem) {
            return `<em>${escapeHtml(
              `Regalo elegido: ${formatGiftItemsText(
                [selectedGiftItem],
                item.gift_item_units
              )}`
            )}</em>`
          }

          if (Number(item.gift_item_units || 0) > 0) {
            return `<em>${escapeHtml(
              `${Number(item.gift_item_units || 0)} regalo(s) pendiente(s) por elegir`
            )}</em>`
          }

          return ""
        })()}
      </td>
      <td class="right">${escapeHtml(formatQuantity(item.quantity))}</td>
      <td class="right">${escapeHtml(formatMoney(item.unit_price))}</td>
      <td class="right">${escapeHtml(formatMoney(item.regular_line_total))}</td>
      <td class="right">
        ${escapeHtml(formatMoney(item.gift_line_total))}
        ${(() => {
          const selectedGiftItem = getSelectedGiftItem(item.promotion ?? item)

          if (selectedGiftItem) {
            return `<br><small>${escapeHtml(
              `Regalo elegido: ${formatGiftItemsText(
                [selectedGiftItem],
                item.gift_item_units
              )}`
            )}</small>`
          }

          if (Number(item.gift_item_units || 0) > 0) {
            return `<br><small>${escapeHtml(
              `${Number(item.gift_item_units || 0)} regalo(s) pendiente(s) por elegir`
            )}</small>`
          }

          return ""
        })()}
      </td>
      <td class="right discount">-${escapeHtml(formatMoney(item.discount))}</td>
      <td class="right total">${escapeHtml(formatMoney(item.total))}</td>
    </tr>
  `).join("")

  const promotions = checkout.promotions_applied.length
    ? checkout.promotions_applied.map((promotion) => `
      <li>
        <strong>${escapeHtml(promotion.name || formatPromotionType(promotion.type))}</strong>
        <span>Ahorro ${escapeHtml(formatMoney(promotion.total_discount))}</span>
        ${(() => {
          const selectedGiftItem = getSelectedGiftItem(promotion)

          if (selectedGiftItem) {
            return `<span>${escapeHtml(
              `Regalo elegido: ${formatGiftItemsText(
                [selectedGiftItem],
                promotion.gift_item_units
              )}`
            )}</span>`
          }

          if (Number(promotion.gift_item_units || 0) > 0) {
            return `<span>${escapeHtml(
              `${Number(promotion.gift_item_units || 0)} regalo(s) pendiente(s) por elegir`
            )}</span>`
          }

          return ""
        })()}
      </li>
    `).join("")
    : "<li>Sin promociones aplicadas.</li>"

  const systemNotes = checkout.invoice_preview?.notes?.length
    ? checkout.invoice_preview.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")
    : ""
  const notes = [
    documentNotes ? `<li>${escapeHtml(documentNotes)}</li>` : "",
    systemNotes,
  ].filter(Boolean).join("") || "<li>Sin notas adicionales.</li>"
  const discountSummaryRow =
    Number(totals.discount || 0) > 0
      ? `<div><span>Descuento</span><strong>${escapeHtml(formatMoney(totals.discount))}</strong></div>`
      : ""
  const coupon = normalizeCheckoutCoupon(checkout.coupon ?? totals.coupon)
  const couponSummaryRow = coupon?.code
    ? `<div><span>Cupón ${escapeHtml(coupon.code)}</span><strong>${escapeHtml(formatMoney(coupon.discount_amount))}</strong></div>`
    : ""
  const giftAccountingSummaryRow =
    Number(totals.gift_accounting_total || 0) > 0
      ? `<div><span>Regalos facturados</span><strong>${escapeHtml(formatMoney(totals.gift_accounting_total))}</strong></div>`
      : ""
  const taxSummaryRow =
    Number(totals.tax || 0) > 0
      ? `<div><span>Impuestos</span><strong>${escapeHtml(formatMoney(totals.tax))}</strong></div>`
      : ""

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Previa de pedido #${escapeHtml(checkout.cart_id || "-")}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; color: #111827; font-family: Arial, sans-serif; background: #ffffff; }
          .head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #111827; padding-bottom: 18px; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand img { width: 42px; height: 42px; }
          .brand strong { display: block; font-size: 20px; }
          .brand span, .meta span { color: #6b7280; font-size: 12px; }
          .meta { text-align: right; }
          .meta h1 { margin: 0 0 6px; font-size: 22px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
          .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .box span { display: block; margin-bottom: 5px; color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .box strong { display: block; margin-bottom: 5px; font-size: 14px; }
          .box p { margin: 0; color: #374151; font-size: 12px; line-height: 1.45; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { padding: 9px; background: #f3f4f6; color: #4b5563; font-size: 10px; text-align: left; text-transform: uppercase; }
          td { padding: 10px 9px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 12px; vertical-align: top; }
          td strong { display: block; color: #111827; }
          td span, td em { display: block; margin-top: 3px; color: #6b7280; font-size: 11px; font-style: normal; }
          .right { text-align: right; }
          .discount { color: #dc2626; font-weight: 700; }
          .total { color: #111827; font-weight: 800; }
          .lower { display: grid; grid-template-columns: 1fr 320px; gap: 16px; margin-top: 18px; align-items: start; }
          ul { margin: 8px 0 0; padding-left: 18px; color: #374151; font-size: 12px; line-height: 1.55; }
          li span { float: right; font-weight: 700; }
          .summary { border: 1px solid #111827; border-radius: 8px; padding: 12px; }
          .summary div { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; font-size: 12px; }
          .summary .due { margin-top: 12px; padding-top: 12px; border-top: 2px solid #111827; font-size: 15px; font-weight: 800; }
          @media print { body { padding: 18px; } button { display: none; } }
        </style>
      </head>
      <body>
        <header class="head">
          <div class="brand">
            <img loading="lazy" src="${escapeHtml(printableLogoUrl)}" alt="${escapeHtml(brandName)}" />
            <div>
              <strong>${escapeHtml(brandName)}</strong>
              <span>Previa de pedido para validación</span>
            </div>
          </div>
          <div class="meta">
            <h1>Checkout #${escapeHtml(checkout.cart_id || "-")}</h1>
            <span>${escapeHtml(new Date().toLocaleString("es-MX"))}</span>
          </div>
        </header>

        <section class="grid">
          <div class="box">
            <span>Cliente</span>
            <strong>${escapeHtml(checkout.customer?.name || "Cliente no identificado")}</strong>
            <p>${escapeHtml(checkout.customer?.email || "-")}</p>
          </div>
          <div class="box">
            <span>Entrega</span>
            <strong>${escapeHtml(selectedAddress?.alias || "Dirección pendiente")}</strong>
            <p>${escapeHtml(formatAddress(selectedAddress))}</p>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th class="right">Cant.</th>
              <th class="right">Precio</th>
              <th class="right">Regular</th>
              <th class="right">Regalo</th>
              <th class="right">Descuento</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <section class="lower">
          <div>
            <div class="box">
              <span>Promociones aplicadas</span>
              <ul>${promotions}</ul>
            </div>
            <div class="box" style="margin-top: 12px;">
              <span>Notas</span>
              <ul>${notes}</ul>
            </div>
          </div>
          <aside class="summary">
            <div><span>Subtotal</span><strong>${escapeHtml(formatMoney(totals.subtotal))}</strong></div>
            ${discountSummaryRow}
            ${couponSummaryRow}
            ${giftAccountingSummaryRow}
            ${taxSummaryRow}
            <div class="due"><span>Importe a pagar</span><strong>${escapeHtml(formatMoney(totals.amount_due))}</strong></div>
          </aside>
        </section>
      </body>
    </html>
  `
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatQuantity(value) {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export default CheckoutPage
