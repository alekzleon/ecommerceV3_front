import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
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
} from "../../services/api/accountService.js"
import AdminSidePanel from "../../components/AdminSidePanel/AdminSidePanel.jsx"
import { useSettings } from "../../context/SettingsContext.jsx"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast"
import "./checkout.css"

const emptyAddressForm = {
  alias: "",
  contact_name: "",
  phone: "",
  street: "",
  address_line_2: "",
  neighborhood: "",
  state: "",
  zip_code: "",
  delivery_note: "",
  is_default: false,
}

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
const DOCUMENT_NOTE_MAX_LENGTH = 200

function CheckoutPage() {
  const { brandName, logoUrl } = useSettings()
  const [checkout, setCheckout] = useState(emptyCheckout)
  const [loading, setLoading] = useState(true)
  const [addressPanelOpen, setAddressPanelOpen] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressSaving, setAddressSaving] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(emptyAddressForm)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [documentNotes, setDocumentNotes] = useState("")
  const restoringRecoverableRef = useRef(false)

  useEffect(() => {
    fetchPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      if (!nextAddresses.length) return

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
    return addresses.find((address) => address.id === selectedAddressId) || null
  }, [addresses, selectedAddressId])

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
  const canPay = canContinue && acceptedTerms

  async function handleStartStripeCheckout() {
    if (!acceptedTerms) {
      notifyWarning("Acepta los términos y condiciones para continuar con el pago.")
      return
    }

    if (!selectedAddress) {
      notifyWarning("Configura una dirección de envío para continuar.")
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

    try {
      setProcessingPayment(true)

      const validationResponse = await validateCheckout(
        buildCheckoutPayload(selectedAddress, documentNotes)
      )
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

      const orderResponse = await createCheckoutOrder(buildCheckoutPayload(selectedAddress, documentNotes))
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
      notifyError(
        error?.response?.data?.message || "No fue posible iniciar el pago con Stripe."
      )
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

    const nextResponse = await getCheckoutPreview(buildCheckoutAddressSelection(selectedAddress))
    if (DEBUG_RECOVERABLE_CART) {
      console.log("[recoverable-cart][checkout] preview after restore:", nextResponse)
    }

    const nextCheckout = applyCheckoutResponse(nextResponse)
    await syncShippingFromCartIfNeeded(nextCheckout)
  }

  function handleAddressFormChange(event) {
    const { name, value, type, checked } = event.target
    const nextValue =
      name === "delivery_note" ? value.slice(0, DELIVERY_NOTE_MAX_LENGTH) : value

    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : nextValue,
    }))
  }

  function handleDocumentNotesChange(event) {
    setDocumentNotes(event.target.value.slice(0, DOCUMENT_NOTE_MAX_LENGTH))
  }

  async function fetchAddresses() {
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

  function handleOpenAddressPanel() {
    setAddressPanelOpen(true)
    fetchAddresses()
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

    if (!addressForm.alias.trim() || !addressForm.street.trim() || !addressForm.zip_code.trim()) {
      notifyWarning("Completa alias, calle y código postal.")
      return
    }

    try {
      setAddressSaving(true)
      const response = await createAccountAddress(buildAddressPayload(addressForm, checkout))
      const createdAddress = response?.data

      notifySuccess(response?.message || "Dirección creada correctamente.")
      setAddressForm(emptyAddressForm)
      const nextPreview = await getCheckoutPreview()
      applyCheckoutResponse(nextPreview)
      await fetchAddresses()

      if (createdAddress?.id) {
        setSelectedAddressId(createdAddress.id)
      }
    } catch (error) {
      console.error("Error al crear dirección:", error?.response?.data || error)
      notifyError(error?.response?.data?.message || "No fue posible crear la dirección.")
    } finally {
      setAddressSaving(false)
    }
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

  return (
    <div className="checkout_page">
      <div className="checkout_shell">
        <header className="checkout_header checkout_invoice_header">
          <div className="checkout_header_left">
            <p className="checkout_eyebrow">Previa de factura</p>
            <h1 className="checkout_title">Checkout #{checkout.cart_id || "-"}</h1>
            <p className="checkout_meta">
              Revisa partidas, promociones aplicadas y total antes de continuar.
            </p>
          </div>

          {selectedAddress ? (
            <div className="checkout_status is-ready">
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              Dirección lista
            </div>
          ) : (
            <button
              type="button"
              className="btn btn_primary checkout_header_action"
              onClick={handleOpenAddressPanel}
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
          <div className="checkout_layout">
            <section className="checkout_main">
              <div className="checkout_invoice_meta">
                <div className="checkout_meta_card">
                  <span>Cliente</span>
                  <strong>{checkout.customer?.name || "Cliente no identificado"}</strong>
                  <small>
                    {checkout.customer?.email || "-"}
                    {checkout.customer?.username ? ` · ${checkout.customer.username}` : ""}
                  </small>
                </div>

                <div className="checkout_meta_card">
                  <span>Entrega</span>
                  {selectedAddress ? (
                    <>
                      <div className="checkout_address_meta_head">
                        <strong className="checkout_address_ready">
                          <i className="bi bi-check-circle-fill" aria-hidden="true" />
                          {selectedAddress.alias}
                        </strong>
                        <button
                          type="button"
                          className="checkout_address_clear"
                          onClick={() => setSelectedAddressId(null)}
                          aria-label="Quitar dirección seleccionada"
                        >
                          <i className="bi bi-x-lg" aria-hidden="true" />
                        </button>
                      </div>
                      <small>{formatAddress(selectedAddress)}</small>
                      <button
                        type="button"
                        className="checkout_address_change"
                        onClick={handleOpenAddressPanel}
                      >
                        Cambiar dirección
                      </button>
                    </>
                  ) : (
                    <>
                      <strong>Dirección pendiente</strong>
                      <small>Selecciona o agrega una dirección de envío para poder continuar.</small>
                    </>
                  )}
                </div>

              </div>

              {actionableBlockers.length > 0 ? (
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
                            <div className="checkout_item_info">
                              <strong>{item.name}</strong>
                              <span>
                                SKU {item.sku || "-"} · Producto #{item.product_id}
                              </span>
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

              <div className="checkout_detail_grid">
                <section className="checkout_invoice_card">
                  <div className="checkout_invoice_card_head">
                    <div>
                      <h2>Promociones aplicadas</h2>
                      <p>Descuentos calculados por el motor de promociones</p>
                    </div>
                  </div>

                  {checkout.promotions_applied.length ? (
                    <div className="checkout_promo_list">
                      {checkout.promotions_applied.map((promotion) => (
                        <article className="checkout_promo_item" key={promotion.id}>
                          <div>
                            <strong>
                              {promotion.name || formatPromotionType(promotion.type)}
                            </strong>
                          </div>
                          <div className="checkout_promo_amounts">
                            <span>Ahorro {formatMoney(promotion.total_discount)}</span>
                            {Number(promotion.gift_units || 0) > 0 ? (
                              <small>
                                {promotion.gift_units} regalo(s): {formatMoney(promotion.gift_line_total)}
                              </small>
                            ) : null}
                            {Number(promotion.gift_item_units || 0) > 0 ? (
                              <small>
                                {getSelectedGiftItem(promotion)
                                  ? `Regalo elegido: ${formatGiftItemsText(
                                      [getSelectedGiftItem(promotion)],
                                      promotion.gift_item_units
                                    )}`
                                  : `${Number(promotion.gift_item_units || 0)} regalo(s) pendiente(s) por elegir`}
                              </small>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="checkout_muted">No hay promociones aplicadas.</p>
                  )}
                </section>

                <section className="checkout_invoice_card">
                  <div className="checkout_invoice_card_head">
                    <div>
                      <h2>Notas del documento</h2>
                      <p>Agrega una nota breve para este pedido</p>
                    </div>
                  </div>

                  <div className="checkout_document_notes">
                    <textarea
                      value={documentNotes}
                      onChange={handleDocumentNotesChange}
                      maxLength={DOCUMENT_NOTE_MAX_LENGTH}
                      rows="4"
                      placeholder="Escribe notas para el documento o pedido."
                    />
                    <span className="checkout_field_counter">
                      {documentNotes.length}/{DOCUMENT_NOTE_MAX_LENGTH}
                    </span>
                  </div>

                  {checkout.invoice_preview?.notes?.length ? (
                    <div className="checkout_system_notes">
                      <strong>Notas del sistema</strong>
                      <ul className="checkout_notes">
                        {checkout.invoice_preview.notes.map((note, index) => (
                          <li key={`${note}-${index}`}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              </div>
            </section>

            <aside className="checkout_sidebar">
              <InvoiceSummary
                totals={totals}
                canCheckout={canContinue}
                processingPayment={processingPayment}
                hasPendingGiftSelection={hasPendingGiftSelection}
                onPay={handleStartStripeCheckout}
                onConfigureAddress={handleOpenAddressPanel}
                onDownloadPreview={handleDownloadPreview}
                hasAddress={Boolean(selectedAddress)}
                acceptedTerms={acceptedTerms}
                onAcceptedTermsChange={setAcceptedTerms}
                loyalty={checkout.loyalty}
                coupon={checkout.coupon || totals.coupon}
                insufficientStockBlockers={insufficientStockBlockers}
                invalidStockItems={invalidStockItems}
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

          <button
            type="button"
            className="btn btn_primary mobile_pay_btn"
            onClick={handleStartStripeCheckout}
            disabled={processingPayment || !canPay}
          >
            {processingPayment ? "Redirigiendo..." : "Pagar con Stripe"}
          </button>

          <label className="checkout_terms checkout_terms--mobile">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            <span>
              Acepto{" "}
              <Link to="/terminos-y-condiciones">términos y condiciones</Link>
            </span>
          </label>
        </div>
      ) : null}

      <AdminSidePanel
        isOpen={addressPanelOpen}
        title="Dirección de envío"
        subtitle="Selecciona una dirección guardada o agrega una nueva para continuar."
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
            <button
              type="button"
              className="btn btn_primary"
              onClick={() => setAddressPanelOpen(false)}
              disabled={!selectedAddress}
            >
              Usar dirección seleccionada
            </button>
          </div>
        )}
      >
        <div className="checkout_address_panel">
          <section className="checkout_address_panel_section">
            <h3>Direcciones disponibles</h3>
            {addressesLoading ? (
              <p className="checkout_address_empty">Cargando direcciones...</p>
            ) : addresses.length ? (
              <div className="checkout_address_list">
                {addresses.map((address) => (
                  <button
                    type="button"
                    className={`checkout_address_card ${selectedAddressId === address.id ? "is-selected" : ""}`}
                    key={address.id}
                    onClick={() => handleSelectAddress(address)}
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
              <p className="checkout_address_empty">
                No tienes direcciones guardadas. Agrega una para poder continuar.
              </p>
            )}
          </section>

          <section className="checkout_address_panel_section">
            <h3>Agregar otra dirección</h3>
            <form className="checkout_address_form" onSubmit={handleAddAddress}>
              <label>
                Alias
                <input name="alias" value={addressForm.alias} onChange={handleAddressFormChange} placeholder="Ej. Sucursal Centro" />
              </label>
              <label>
                Contacto
                <input name="contact_name" value={addressForm.contact_name} onChange={handleAddressFormChange} placeholder="Nombre de quien recibe" />
              </label>
              <label>
                Teléfono
                <input name="phone" value={addressForm.phone} onChange={handleAddressFormChange} placeholder="33 0000 0000" />
              </label>
              <label>
                Calle y número
                <input name="street" value={addressForm.street} onChange={handleAddressFormChange} placeholder="Av. Principal 123" />
              </label>
              <label className="checkout_address_form_full">
                Complemento
                <input name="address_line_2" value={addressForm.address_line_2} onChange={handleAddressFormChange} placeholder="Interior 4B, edificio azul" />
              </label>
              <label>
                Colonia
                <input name="neighborhood" value={addressForm.neighborhood} onChange={handleAddressFormChange} placeholder="Colonia" />
              </label>
              <label>
                Estado
                <input name="state" value={addressForm.state} onChange={handleAddressFormChange} placeholder="Estado" />
              </label>
              <label>
                Código postal
                <input name="zip_code" value={addressForm.zip_code} onChange={handleAddressFormChange} placeholder="00000" />
              </label>
              <label className="checkout_address_form_full">
                Instrucciones de entrega
                <textarea
                  name="delivery_note"
                  value={addressForm.delivery_note}
                  onChange={handleAddressFormChange}
                  rows="3"
                  maxLength={DELIVERY_NOTE_MAX_LENGTH}
                  placeholder="Tocar el timbre negro. Entregar en recepción."
                />
                <span className="checkout_field_counter">
                  {addressForm.delivery_note.length}/{DELIVERY_NOTE_MAX_LENGTH}
                </span>
              </label>
              <label className="checkout_address_form_full checkout_address_default_check">
                <input type="checkbox" name="is_default" checked={addressForm.is_default} onChange={handleAddressFormChange} />
                Usar como dirección predeterminada
              </label>
              <div className="checkout_address_form_actions">
                <button type="submit" className="btn btn_primary" disabled={addressSaving}>
                  {addressSaving ? "Guardando..." : "Agregar dirección"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </AdminSidePanel>
    </div>
  )
}

function InvoiceSummary({
  totals,
  canCheckout,
  processingPayment,
  hasPendingGiftSelection,
  onPay,
  onConfigureAddress,
  onDownloadPreview,
  hasAddress,
  acceptedTerms,
  onAcceptedTermsChange,
  loyalty,
  coupon,
  insufficientStockBlockers = [],
  invalidStockItems = [],
}) {
  return (
    <div className="summary_card">
      <h2 className="summary_title">Totales</h2>

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

        <div className="summary_row">
          <span>Regalos facturados</span>
          <span>{formatMoney(totals.gift_accounting_total)}</span>
        </div>

        <div className="summary_row">
          <span>Impuestos</span>
          <span>{formatMoney(totals.tax)}</span>
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

      <CheckoutLoyaltySummary loyalty={loyalty} />

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

      <label className="checkout_terms">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => onAcceptedTermsChange(event.target.checked)}
        />
        <span>
          Acepto{" "}
          <Link to="/terminos-y-condiciones">términos y condiciones</Link>
        </span>
      </label>

      <div className="summary_actions">
        {!hasAddress ? (
          <button
            type="button"
            className="btn btn_ghost"
            onClick={onConfigureAddress}
          >
            Configurar dirección de envío
          </button>
        ) : null}

        <button
          type="button"
          className="btn btn_primary"
          onClick={onPay}
          disabled={processingPayment || !canCheckout || !acceptedTerms}
        >
          {processingPayment ? "Validando checkout..." : "Pagar con Stripe"}
        </button>

        <button
          type="button"
          className="btn btn_secondary"
          onClick={onDownloadPreview}
        >
          Descargar previa de pedido
        </button>

        <Link to="/carrito" className="btn btn_ghost btn_link_like">
          Volver al carrito
        </Link>
      </div>
    </div>
  )
}

function CheckoutLoyaltySummary({ loyalty }) {
  if (!loyalty) return null

  const firstPurchase = loyalty.firstPurchaseDiscount
  const cashback = loyalty.cashback
  const hasFirstPurchase = firstPurchase?.eligible && firstPurchase?.amount > 0
  const hasCashbackApplied = cashback?.appliedAmount > 0
  const hasCashbackEarn = cashback?.earn?.amount > 0

  if (!hasFirstPurchase && !hasCashbackApplied && !hasCashbackEarn) return null

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
          <strong>-{formatMoney(cashback.appliedAmount)}</strong>
        </div>
      ) : null}

      {hasCashbackEarn ? (
        <div>
          <span>Cashback a ganar · {cashback.earn.percentage}%</span>
          <strong>{formatMoney(cashback.earn.amount)}</strong>
        </div>
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
    promotion: item.promotion
      ? {
          ...item.promotion,
          snapshot: item.promotion.snapshot ?? {},
        }
      : null,
  }
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

  return {
    firstPurchaseDiscount: {
      eligible: Boolean(loyalty.first_purchase_discount?.eligible),
      percentage: Number(loyalty.first_purchase_discount?.percentage ?? 0),
      amount: Number(loyalty.first_purchase_discount?.amount ?? 0),
    },
    cashback: {
      availableBalance: Number(loyalty.cashback?.available_balance ?? 0),
      appliedAmount: Number(loyalty.cashback?.applied_amount ?? 0),
      earn: {
        percentage: Number(loyalty.cashback?.earn?.percentage ?? 0),
        amount: Number(loyalty.cashback?.earn?.amount ?? 0),
      },
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
    alias: form.alias.trim(),
    street: form.street.trim(),
    address_line_2: form.address_line_2.trim(),
    zip_code: form.zip_code.trim(),
    neighborhood: form.neighborhood.trim(),
    state: form.state.trim(),
    delivery_note: form.delivery_note.trim().slice(0, DELIVERY_NOTE_MAX_LENGTH),
    contact_name: form.contact_name.trim() || checkout.customer?.name || "",
    phone: form.phone.trim(),
    is_default: Boolean(form.is_default),
  }
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
    ...(notes ? { notes } : {}),
  }
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
            <img src="${escapeHtml(printableLogoUrl)}" alt="${escapeHtml(brandName)}" />
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
            <div><span>Regalos facturados</span><strong>${escapeHtml(formatMoney(totals.gift_accounting_total))}</strong></div>
            <div><span>Impuestos</span><strong>${escapeHtml(formatMoney(totals.tax))}</strong></div>
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
