import { useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  downloadCartExcelLayout,
  importCartExcelFile,
} from "../../services/api/cartService.js"
import { notifyError, notifySuccess, notifyWarning } from "../../utils/toast.js"
import "./cartexcel.css"

function CartExcelImportPage() {
  const { isAuthenticated, sessionReady } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [file, setFile] = useState(null)
  const [importResult, setImportResult] = useState(null)

  const importedItems = useMemo(() => {
    return Array.isArray(importResult?.summary?.imported_items)
      ? importResult.summary.imported_items
      : []
  }, [importResult])

  const importErrors = useMemo(() => {
    return Array.isArray(importResult?.summary?.errors)
      ? importResult.summary.errors
      : []
  }, [importResult])

  if (!sessionReady) {
    return (
      <div className="cart_excel_page">
        <div className="cart_excel_shell">
          <div className="cart_excel_empty">
            <h1>Cargando...</h1>
            <p>Estamos preparando la carga de carrito por Excel.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const handleDownloadLayout = async () => {
    try {
      setDownloading(true)

      const response = await downloadCartExcelLayout()
      const blob = new Blob([response.data], {
        type:
          response.headers["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = getFilenameFromHeaders(response.headers) || "layout-carga-carrito.xlsx"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      notifySuccess("Layout descargado correctamente.")
    } catch (error) {
      console.error(
        "Error al descargar layout de Excel:",
        error?.response?.data || error
      )
      notifyError(
        error?.response?.data?.message ||
          "No fue posible descargar el layout de Excel."
      )
    } finally {
      setDownloading(false)
    }
  }

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null
    setFile(nextFile)
  }

  const handleImport = async (event) => {
    event.preventDefault()

    if (!file) {
      notifyWarning("Selecciona un archivo Excel para procesarlo.")
      return
    }

    try {
      setImporting(true)
      const response = await importCartExcelFile(file)
      const data = response?.data ?? {}

      setImportResult(data)
      syncCartSummary(data.cart)

      notifySuccess(response?.message || "Archivo Excel procesado correctamente.")
    } catch (error) {
      console.error("Error al importar carrito por Excel:", error?.response?.data || error)
      notifyError(
        error?.response?.data?.message ||
          "No fue posible procesar el archivo Excel."
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="cart_excel_page">
      <div className="cart_excel_shell">
        <header className="cart_excel_header">
          <div>
            <p className="cart_excel_eyebrow">Carrito por Excel</p>
            <h1 className="cart_excel_title">Carga masiva de pedido</h1>
            <p className="cart_excel_subtitle">
              Descarga el layout, llena la hoja <strong>CargaCarrito</strong> y
              sube el archivo para actualizar tu carrito actual.
            </p>
          </div>

          <div className="cart_excel_header_actions">
            <Link to="/carrito" className="btn btn_ghost">
              Volver al carrito
            </Link>
          </div>
        </header>

        <div className="cart_excel_layout">
          <section className="cart_excel_main">
            <div className="cart_excel_card">
              <div className="cart_excel_card_head">
                <div>
                  <h2>1. Descargar layout</h2>
                  <p>
                    El archivo incluye la hoja <strong>CargaCarrito</strong> y una
                    hoja de <strong>Inventario</strong> para referencia.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn_primary"
                  onClick={handleDownloadLayout}
                  disabled={downloading}
                >
                  {downloading ? "Descargando..." : "Descargar layout"}
                </button>
              </div>

              <div className="cart_excel_steps">
                <div className="cart_excel_step">
                  <span>Hoja editable</span>
                  <strong>CargaCarrito</strong>
                  <small>Llena sólo `sku` y `quantity`.</small>
                </div>

                <div className="cart_excel_step">
                  <span>Hoja de apoyo</span>
                  <strong>Inventario</strong>
                  <small>Consulta SKUs, marcas y precios vigentes.</small>
                </div>
              </div>
            </div>

            <form className="cart_excel_card" onSubmit={handleImport}>
              <div className="cart_excel_card_head">
                <div>
                  <h2>2. Subir archivo</h2>
                  <p>
                    Procesamos SKUs repetidos, sumamos cantidades y actualizamos el
                    carrito con promociones recalculadas.
                  </p>
                </div>
              </div>

              <label className="cart_excel_dropzone">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />

                <i className="bi bi-file-earmark-excel" aria-hidden="true" />
                <strong>{file ? file.name : "Selecciona tu archivo Excel"}</strong>
                <span>
                  Formatos permitidos: `.xlsx` y `.xls`. Usa el layout descargado.
                </span>
              </label>

              <div className="cart_excel_form_actions">
                <button
                  type="submit"
                  className="btn btn_primary"
                  disabled={importing || !file}
                >
                  {importing ? "Procesando..." : "Procesar carrito"}
                </button>

                {file ? (
                  <button
                    type="button"
                    className="btn btn_secondary"
                    onClick={() => setFile(null)}
                    disabled={importing}
                  >
                    Quitar archivo
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <aside className="cart_excel_sidebar">
            <div className="cart_excel_card">
              <h2>Qué sucede al importar</h2>

              <ul className="cart_excel_notes">
                <li>Se lee la hoja `CargaCarrito`.</li>
                <li>Los SKUs repetidos se agrupan y suman.</li>
                <li>Se agregan al carrito actual.</li>
                <li>Se recalculan promociones y totales al final.</li>
              </ul>
            </div>

            {importResult ? (
              <div className="cart_excel_card">
                <h2>Resumen del proceso</h2>

                <div className="cart_excel_summary_grid">
                  <div className="cart_excel_summary_item">
                    <span>Filas procesadas</span>
                    <strong>{importResult.summary?.processed_rows ?? 0}</strong>
                  </div>
                  <div className="cart_excel_summary_item">
                    <span>Filas importadas</span>
                    <strong>{importResult.summary?.imported_rows ?? 0}</strong>
                  </div>
                  <div className="cart_excel_summary_item">
                    <span>Filas omitidas</span>
                    <strong>{importResult.summary?.skipped_rows ?? 0}</strong>
                  </div>
                  <div className="cart_excel_summary_item">
                    <span>Items en carrito</span>
                    <strong>{importResult.cart?.items_count ?? 0}</strong>
                  </div>
                </div>

                {importedItems.length ? (
                  <div className="cart_excel_result_block">
                    <h3>Items importados</h3>

                    <div className="cart_excel_result_list">
                      {importedItems.map((item) => (
                        <article
                          key={`${item.product_id}-${item.sku}`}
                          className="cart_excel_result_item is-success"
                        >
                          <strong>{item.name}</strong>
                          <span>
                            {item.sku} · {item.quantity} pieza(s)
                          </span>
                          {Array.isArray(item.rows) && item.rows.length ? (
                            <small>Filas: {item.rows.join(", ")}</small>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {importErrors.length ? (
                  <div className="cart_excel_result_block">
                    <h3>Filas rechazadas</h3>

                    <div className="cart_excel_result_list">
                      {importErrors.map((error, index) => (
                        <article
                          key={`${error.row}-${error.sku}-${index}`}
                          className="cart_excel_result_item is-error"
                        >
                          <strong>{error.sku || "Sin SKU"}</strong>
                          <span>{error.message || "No fue posible importar la fila."}</span>
                          <small>Fila {error.row || "-"}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="cart_excel_result_footer">
                  <Link to="/carrito" className="btn btn_primary">
                    Ver carrito actualizado
                  </Link>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

function getFilenameFromHeaders(headers = {}) {
  const disposition =
    headers["content-disposition"] || headers["Content-Disposition"] || ""

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1])

  const plainMatch = disposition.match(/filename="?([^"]+)"?/i)
  if (plainMatch?.[1]) return plainMatch[1]

  return ""
}

function syncCartSummary(cartData) {
  const summary = {
    id: cartData?.id ?? null,
    items_count: Number(cartData?.items_count ?? 0),
    subtotal: Number(cartData?.subtotal ?? 0),
    discount: Number(cartData?.discount ?? 0),
    tax: Number(cartData?.tax ?? 0),
    tax_breakdown: cartData?.tax_breakdown ?? null,
    total: Number(cartData?.total ?? 0),
  }

  localStorage.setItem("ecommerce_cart_summary", JSON.stringify(summary))
  window.dispatchEvent(
    new CustomEvent("cart:updated", {
      detail: summary,
    })
  )
}

export default CartExcelImportPage
