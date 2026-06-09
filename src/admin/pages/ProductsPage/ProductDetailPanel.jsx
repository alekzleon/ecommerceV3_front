import { useMemo, useState } from "react"
import AdminSidePanel from "../../../components/AdminSidePanel/AdminSidePanel"
import RichTextEditor from "./RichTextEditor"
import "./ProductDetailPanel.css"

function RequiredMark() {
  return <span className="product-detail__required">*</span>
}

function EntityAutocomplete({
  label,
  required = false,
  value,
  entity,
  options,
  placeholder,
  type,
  onSelect,
  onCreate,
  disabled = false,
}) {
  const [query, setQuery] = useState(entity?.name || value || "")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 6)

    return options
      .filter((option) => {
        return (
          option.name.toLowerCase().includes(normalizedQuery) ||
          String(option.id).includes(normalizedQuery)
        )
      })
      .slice(0, 6)
  }, [normalizedQuery, options])
  const hasExactMatch = options.some((option) => {
    return option.name.toLowerCase() === normalizedQuery || String(option.id) === normalizedQuery
  })

  function handleSelect(option) {
    setQuery(option ? option.name : "")
    onSelect(type, option)
  }

  function handleCreate() {
    if (!query.trim()) return

    onCreate(type, query.trim())
  }

  return (
    <div className="product-detail__field product-detail__autocomplete">
      <label className="form-label">
        {label} {required ? <RequiredMark /> : null}
      </label>
      <input
        type="text"
        className="form-control"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          if (!event.target.value.trim()) handleSelect(null)
        }}
        placeholder={placeholder}
        required={required && !value}
        disabled={disabled}
      />
      <input type="hidden" name={`${type}_id`} value={value || ""} readOnly />

      {query.trim() ? (
        <div className="product-detail__autocomplete-menu">
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={Number(value) === Number(option.id) ? "is-selected" : ""}
              onClick={() => handleSelect(option)}
              disabled={disabled}
            >
              <span>{option.name}</span>
              <small>#{option.id}</small>
            </button>
          ))}

          {!hasExactMatch ? (
            <button type="button" className="is-create" onClick={handleCreate} disabled={disabled}>
              Crear “{query.trim()}”
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ProductDetailPanel({
  isOpen,
  loading,
  saving,
  mode,
  form,
  title,
  categoryOptions = [],
  familyOptions = [],
  galleryEnabled,
  galleryItems = [],
  galleryLoading,
  gallerySaving,
  galleryForm,
  variantAttributes = [],
  variants = [],
  variantsLoading,
  variantsSaving,
  variantOptionForm,
  variantForm,
  onClose,
  onChange,
  onEntitySelect,
  onEntityCreate,
  onGalleryToggle,
  onGalleryFormChange,
  onGalleryAdd,
  onGalleryItemChange,
  onGalleryItemToggle,
  onGalleryMove,
  onVariantOptionFormChange,
  onVariantOptionAdd,
  onVariantFormChange,
  onVariantValueToggle,
  onVariantSave,
  onVariantEdit,
  onVariantStatusChange,
  onSubmit,
}) {
  const isCreate = mode === "create"
  const isEditLocked = !isCreate
  const galleryBusy = galleryLoading || gallerySaving || saving
  const variantsBusy = variantsLoading || variantsSaving || saving
  const [selectedGalleryItemId, setSelectedGalleryItemId] = useState(null)
  const selectedGalleryItem = galleryItems.find((item) => item.id === selectedGalleryItemId) || null

  function handleBooleanSelect(name, value) {
    onChange({
      target: {
        name,
        value: value === "1",
        type: "checkbox",
        checked: value === "1",
      },
    })
  }

  function handleDescriptionChange(value) {
    onChange({
      target: {
        name: "description",
        value,
        type: "text",
      },
    })
  }

  const footer = !loading ? (
    <div className="product-detail__footer-actions">
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={onClose}
        disabled={saving}
      >
        Cerrar
      </button>

      <button
        type="submit"
        form="product-detail-form"
        className="btn btn-primary"
        disabled={saving || (isEditLocked && !form.image)}
      >
        {saving
          ? isCreate
            ? "Creando..."
            : "Actualizando imagen..."
          : isCreate
          ? "Crear producto"
          : "Actualizar imagen principal"}
      </button>
    </div>
  ) : null

  return (
    <AdminSidePanel
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeDisabled={saving}
      footer={footer}
      width="lg"
    >
      {loading ? (
        <div className="product-page__panel-loading">Cargando detalle del producto...</div>
      ) : (
        <form id="product-detail-form" onSubmit={onSubmit} className="product-detail">
          <fieldset className="product-detail__section product-detail__locked-section" disabled={isEditLocked}>
            <div className="product-detail__field">
              <label className="form-label">
                Título <RequiredMark />
              </label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={form.name}
                onChange={onChange}
                placeholder="Camiseta de manga corta"
                required
              />
            </div>

            <div className="product-detail__field">
              <label className="form-label">Descripción</label>
              <RichTextEditor
                value={form.description}
                onChange={handleDescriptionChange}
                disabled={saving || isEditLocked}
              />
            </div>

            <div className="product-detail__field">
              <label className="form-label">Descripción corta</label>
              <textarea
                name="short_description"
                className="form-control"
                rows="3"
                value={form.short_description}
                onChange={onChange}
                placeholder="Texto breve para el listado"
              />
            </div>
          </fieldset>

          <section className="product-detail__section">
            <div className="product-detail__section-head">
              <h4 className="product-detail__section-title">Multimedia</h4>
              <button
                type="button"
                className={`btn btn-sm ${galleryEnabled ? "btn-primary" : "btn-outline-primary"}`}
                onClick={onGalleryToggle}
              >
                Galería
              </button>
            </div>

            <div className={`product-detail__media-box ${form.image_url ? "has-preview" : ""}`}>
              <div className="product-detail__media-actions">
                <label className="btn btn-outline-secondary product-detail__upload-button">
                  Subir nuevo
                  <input
                    type="file"
                    name="image"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={onChange}
                  />
                </label>
                <button type="button" className="btn btn-link" disabled>
                  Seleccionar existente
                </button>
              </div>

              {form.image_url ? (
                <div className="product-detail__media-preview">
                  <img src={form.image_url} alt={form.name || "Vista previa del producto"} />
                </div>
              ) : null}

              <p>Acepta imágenes JPG, PNG o WEBP. Máximo 4 MB.</p>
            </div>
          </section>

          {galleryEnabled ? (
            <section className="product-detail__section">
              <h4 className="product-detail__section-title">Galería</h4>

              <div className="product-detail__media-box product-detail__gallery-upload">
                <div className="product-detail__media-actions">
                  <label className="btn btn-outline-secondary product-detail__upload-button">
                    Agregar archivo
                    <input
                      type="file"
                      name="media"
                      accept=".jpg,.jpeg,.png,.mp4,.webm,.mov,image/jpeg,image/png,video/mp4,video/webm,video/quicktime"
                      multiple={isCreate}
                      onChange={onGalleryFormChange}
                    />
                  </label>
                </div>

                {galleryForm.preview_url ? (
                  <div className="product-detail__media-preview">
                    {galleryForm.media_type === "video" ? (
                      <video src={galleryForm.preview_url} controls />
                    ) : (
                      <img src={galleryForm.preview_url} alt="Vista previa de galería" />
                    )}
                  </div>
                ) : null}

                <p>Acepta JPG, PNG, MP4, WEBM o MOV. Máximo 50 MB.</p>
              </div>

              {!isCreate ? (
                <>
                  <div className="product-detail__grid product-detail__grid--two">
                    <div className="product-detail__field">
                      <label className="form-label">Título</label>
                      <input
                        type="text"
                        name="title"
                        className="form-control"
                        value={galleryForm.title}
                        onChange={onGalleryFormChange}
                        placeholder="Vista frontal"
                        disabled={isEditLocked}
                      />
                    </div>

                    <div className="product-detail__field">
                      <label className="form-label">Orden</label>
                      <input
                        type="number"
                        name="sort_order"
                        className="form-control"
                        value={galleryForm.sort_order}
                        onChange={onGalleryFormChange}
                        placeholder={String(galleryItems.length + 1)}
                        disabled={isEditLocked}
                      />
                    </div>

                    <div className="product-detail__field product-detail__field--full">
                      <label className="form-label">Descripción</label>
                      <textarea
                        name="description"
                        className="form-control"
                        rows="2"
                        value={galleryForm.description}
                        onChange={onGalleryFormChange}
                        placeholder="Imagen principal del empaque"
                        disabled={isEditLocked}
                      />
                    </div>
                  </div>

                  <label className="product-detail__check">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={galleryForm.is_active}
                      onChange={onGalleryFormChange}
                      disabled={isEditLocked}
                    />
                    Activo
                  </label>

                  <div>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={onGalleryAdd}
                      disabled={galleryBusy || !galleryForm.media}
                    >
                      {gallerySaving ? "Guardando..." : "Agregar a galería"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="product-detail__gallery-empty">
                  Selecciona todos los archivos necesarios. El orden, estado y datos se guardarán por default.
                </div>
              )}

              <div className="product-detail__gallery-list">
                {galleryLoading ? (
                  <div className="product-detail__gallery-empty">Cargando galería...</div>
                ) : galleryItems.length === 0 ? (
                  <div className="product-detail__gallery-empty">Sin archivos en galería.</div>
                ) : (
                  galleryItems.map((item, index) => (
                    <button
                      type="button"
                      className={`product-detail__gallery-tile ${
                        selectedGalleryItemId === item.id ? "is-selected" : ""
                      }`}
                      key={item.id}
                      onClick={() => {
                        if (!isCreate) setSelectedGalleryItemId(item.id)
                      }}
                    >
                      <div className="product-detail__gallery-thumb">
                        {item.media_type === "video" ? (
                          <video src={item.media_url} />
                        ) : (
                          <img src={item.media_url} alt={item.title || "Archivo de galería"} />
                        )}
                      </div>

                      <span>{item.sort_order || index + 1}</span>
                    </button>
                  ))
                )}
              </div>

              {!isCreate && galleryItems.length > 0 && !selectedGalleryItem ? (
                <div className="product-detail__gallery-empty">
                  Selecciona una imagen de la galería para editarla.
                </div>
              ) : null}
            </section>
          ) : null}

          <fieldset className="product-detail__section product-detail__locked-section" disabled={isEditLocked}>
            <h4 className="product-detail__section-title">Variantes</h4>

            <div className="product-detail__variant-options">
              {variantAttributes.length === 0 ? (
                <div className="product-detail__gallery-empty">
                  Agrega opciones como Color, Talla, Tamaño, Sabor o cualquier atributo personalizado.
                </div>
              ) : (
                variantAttributes.map((attribute) => (
                  <div className="product-detail__variant-option" key={attribute.id}>
                    <div className="product-detail__variant-option-handle">
                      <i className="bi bi-grip-vertical" aria-hidden="true" />
                    </div>
                    <div>
                      <strong>{attribute.name}</strong>
                      <div className="product-detail__variant-chips">
                        {(attribute.values || []).map((value) => (
                          <button
                            type="button"
                            key={value.id}
                            className={`product-detail__variant-chip ${
                              variantForm.attribute_value_ids?.some(
                                (selectedValueId) => Number(selectedValueId) === Number(value.id)
                              )
                                ? "is-selected"
                                : ""
                            }`}
                            onClick={() => onVariantValueToggle(attribute.id, value.id)}
                          >
                            {value.metadata?.hex ? (
                              <span
                                className="product-detail__variant-swatch"
                                style={{ backgroundColor: value.metadata.hex }}
                              />
                            ) : null}
                            {value.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="product-detail__variant-add">
                <div className="product-detail__grid product-detail__grid--two">
                  <div className="product-detail__field">
                    <label className="form-label">Opción</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={variantOptionForm.name}
                      onChange={onVariantOptionFormChange}
                      placeholder="Color, Talla, Tipo de suela..."
                    />
                  </div>
                  <div className="product-detail__field">
                    <label className="form-label">Valores</label>
                    <input
                      type="text"
                      name="value"
                      className="form-control"
                      value={variantOptionForm.value}
                      onChange={onVariantOptionFormChange}
                      placeholder="Rojo, Azul, M, 600ml..."
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={onVariantOptionAdd}
                  disabled={variantsBusy}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Agregar otra opción
                </button>
              </div>
            </div>

            <div className="product-detail__variant-form">
              <div className="product-detail__grid product-detail__grid--two">
                <div className="product-detail__field">
                  <label className="form-label">
                    SKU variante <RequiredMark />
                  </label>
                  <input
                    type="text"
                    name="sku"
                    className="form-control"
                    value={variantForm.sku}
                    onChange={onVariantFormChange}
                    placeholder="PLAYERA-ROJA-M"
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={variantForm.name}
                    onChange={onVariantFormChange}
                    placeholder="Playera Roja M"
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    className="form-control"
                    value={variantForm.price}
                    onChange={onVariantFormChange}
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">Precio comparación</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="compare_price"
                    className="form-control"
                    value={variantForm.compare_price}
                    onChange={onVariantFormChange}
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    className="form-control"
                    value={variantForm.stock}
                    onChange={onVariantFormChange}
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">Orden</label>
                  <input
                    type="number"
                    name="sort_order"
                    className="form-control"
                    value={variantForm.sort_order}
                    onChange={onVariantFormChange}
                    placeholder={String(variants.length + 1)}
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">Código de barras</label>
                  <input
                    type="text"
                    name="metadata_barcode"
                    className="form-control"
                    value={variantForm.metadata_barcode}
                    onChange={onVariantFormChange}
                  />
                </div>
                <div className="product-detail__field">
                  <label className="form-label">Código proveedor</label>
                  <input
                    type="text"
                    name="metadata_supplier_code"
                    className="form-control"
                    value={variantForm.metadata_supplier_code}
                    onChange={onVariantFormChange}
                  />
                </div>
              </div>

              <div className="product-detail__variant-toggles">
                <label className="product-detail__check">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={variantForm.is_active}
                    onChange={onVariantFormChange}
                  />
                  Activa
                </label>
                <label className="product-detail__check">
                  <input
                    type="checkbox"
                    name="applies_promotions"
                    checked={variantForm.applies_promotions}
                    onChange={onVariantFormChange}
                  />
                  Aplica promociones
                </label>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onVariantSave}
                disabled={variantsBusy}
              >
                {variantForm.id ? "Actualizar variante" : "Agregar variante"}
              </button>
            </div>

            <div className="product-detail__variant-list">
              {variantsLoading ? (
                <div className="product-detail__gallery-empty">Cargando variantes...</div>
              ) : variants.length === 0 ? (
                <div className="product-detail__gallery-empty">Sin variantes registradas.</div>
              ) : (
                variants.map((variant) => (
                  <div className="product-detail__variant-row" key={variant.id}>
                    <div>
                      <strong>{variant.name || variant.sku}</strong>
                      <span>{variant.sku}</span>
                      <div className="product-detail__variant-chips">
                        {(variant.attribute_values || []).map((value) => (
                          <span className="product-detail__variant-chip" key={value.id}>
                            {value.value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="product-detail__variant-row-meta">
                      <span>${Number(variant.price_number ?? variant.price ?? 0).toFixed(2)}</span>
                      <span>Stock {variant.stock ?? 0}</span>
                    </div>
                    <div className="product-detail__variant-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => onVariantEdit(variant)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${variant.is_active ? "btn-warning" : "btn-success"}`}
                        onClick={() => onVariantStatusChange(variant.id, !variant.is_active)}
                        disabled={variantsBusy}
                      >
                        {variant.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </fieldset>

          <fieldset className="product-detail__section product-detail__locked-section" disabled={isEditLocked}>
            <h4 className="product-detail__section-title">Precio e inventario</h4>

            <div className="product-detail__grid product-detail__grid--two">
              <div className="product-detail__field">
                <label className="form-label">
                  Precio <RequiredMark />
                </label>
                <div className="product-detail__money-input">
                  <span>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="default_price"
                    className="form-control"
                    value={form.default_price}
                    onChange={onChange}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="product-detail__field">
                <label className="form-label">
                  SKU <RequiredMark />
                </label>
                <input
                  type="text"
                  name="sku"
                  className="form-control"
                  value={form.sku}
                  onChange={onChange}
                  placeholder="SKU-PRUEBA-001"
                  required
                />
              </div>

              <div className="product-detail__field">
                <label className="form-label">Estatus</label>
                <select
                  name="is_active"
                  className="form-select"
                  value={form.is_active ? "1" : "0"}
                  onChange={(event) => handleBooleanSelect("is_active", event.target.value)}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>

              <div className="product-detail__field">
                <label className="form-label">Procesado</label>
                <select
                  name="processed"
                  className="form-select"
                  value={form.processed ? "1" : "0"}
                  onChange={(event) => handleBooleanSelect("processed", event.target.value)}
                >
                  <option value="0">No</option>
                  <option value="1">Sí</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="product-detail__section product-detail__locked-section" disabled={isEditLocked}>
            <h4 className="product-detail__section-title">Categoría</h4>

            <div className="product-detail__grid product-detail__grid--two">
              <EntityAutocomplete
                key={`category-${form.category_id}-${form.category?.name || ""}`}
                label="Categoría"
                required
                value={form.category_id}
                entity={form.category}
                options={categoryOptions}
                placeholder="Elige una categoría de producto"
                type="category"
                onSelect={onEntitySelect}
                onCreate={onEntityCreate}
                disabled={isEditLocked}
              />

              <EntityAutocomplete
                key={`family-${form.family_id}-${form.family?.name || ""}`}
                label="Familia"
                value={form.family_id}
                entity={form.family}
                options={familyOptions}
                placeholder="Elige una familia"
                type="family"
                onSelect={onEntitySelect}
                onCreate={onEntityCreate}
                disabled={isEditLocked}
              />
            </div>

            <p className="product-detail__hint">
              Determina las tasas de impuestos y mejora la búsqueda, los filtros y las ventas multicanal.
            </p>
          </fieldset>

          <fieldset className="product-detail__section product-detail__locked-section" disabled={isEditLocked}>
            <h4 className="product-detail__section-title">Organización</h4>

            <div className="product-detail__grid product-detail__grid--two">
              <div className="product-detail__field">
                <label className="form-label">Marca</label>
                <input
                  type="text"
                  name="brand"
                  className="form-control"
                  value={form.brand}
                  onChange={onChange}
                />
              </div>

              <div className="product-detail__field">
                <label className="form-label">Slug</label>
                <input
                  type="text"
                  name="slug"
                  className="form-control"
                  value={form.slug}
                  onChange={onChange}
                  placeholder="Se puede dejar vacío"
                />
              </div>

              <div className="product-detail__field">
                <label className="form-label">Microsip ID</label>
                <input
                  type="number"
                  name="microsip_id"
                  className="form-control"
                  value={form.microsip_id}
                  onChange={onChange}
                />
              </div>

              <div className="product-detail__field">
                <label className="form-label">Keyword</label>
                <input
                  type="text"
                  name="keyword"
                  className="form-control"
                  value={form.keyword}
                  onChange={onChange}
                  placeholder="abarrotes, prueba"
                />
              </div>
            </div>
          </fieldset>
        </form>
      )}

      {!isCreate && selectedGalleryItem ? (
        <div className="product-detail__asset-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="product-detail__asset-backdrop"
            onClick={() => setSelectedGalleryItemId(null)}
            aria-label="Cerrar editor de recurso"
          />

          <div className="product-detail__asset-dialog">
            <button
              type="button"
              className="product-detail__asset-close"
              onClick={() => setSelectedGalleryItemId(null)}
              aria-label="Cerrar"
            >
              Cerrar
            </button>

            <div className="product-detail__asset-editor">
              <div className="product-detail__asset-preview">
                {selectedGalleryItem.media_type === "video" ? (
                  <video src={selectedGalleryItem.media_url} controls />
                ) : (
                  <img
                    src={selectedGalleryItem.media_url}
                    alt={selectedGalleryItem.title || "Recurso de galería"}
                  />
                )}
              </div>

              <div className="product-detail__asset-info">
                <div className="product-detail__asset-panel">
                  <h5>Información</h5>

                  <div className="product-detail__field">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedGalleryItem.title || ""}
                      onChange={(event) =>
                        onGalleryItemChange(selectedGalleryItem.id, "title", event.target.value)
                      }
                      placeholder="Vista frontal"
                      disabled={isEditLocked}
                    />
                  </div>

                  <div className="product-detail__field">
                    <label className="form-label">Texto alternativo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedGalleryItem.description || ""}
                      onChange={(event) =>
                        onGalleryItemChange(
                          selectedGalleryItem.id,
                          "description",
                          event.target.value
                        )
                      }
                      disabled={isEditLocked}
                    />
                  </div>

                  <div className="product-detail__asset-details">
                    <strong>Detalles</strong>
                    <span>{selectedGalleryItem.media_type || "image"}</span>
                    <span>Orden {selectedGalleryItem.sort_order || "-"}</span>
                    <span>{selectedGalleryItem.is_active ? "Activo" : "Inactivo"}</span>
                  </div>

                  <div className="product-detail__field">
                    <label className="form-label">Orden</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedGalleryItem.sort_order || ""}
                      onChange={(event) =>
                        onGalleryItemChange(
                          selectedGalleryItem.id,
                          "sort_order",
                          event.target.value
                        )
                      }
                      disabled={isEditLocked}
                    />
                  </div>
                </div>

                <div className="product-detail__asset-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => onGalleryMove(selectedGalleryItem.id, -1)}
                    disabled={
                      isEditLocked ||
                      galleryBusy ||
                      galleryItems.findIndex((item) => item.id === selectedGalleryItem.id) === 0
                    }
                  >
                    Subir posición
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => onGalleryMove(selectedGalleryItem.id, 1)}
                    disabled={
                      isEditLocked ||
                      galleryBusy ||
                      galleryItems.findIndex((item) => item.id === selectedGalleryItem.id) ===
                        galleryItems.length - 1
                    }
                  >
                    Bajar posición
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedGalleryItem.is_active ? "btn-warning" : "btn-success"}`}
                    onClick={() => onGalleryItemToggle(selectedGalleryItem.id)}
                    disabled={isEditLocked || galleryBusy}
                  >
                    {selectedGalleryItem.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminSidePanel>
  )
}

export default ProductDetailPanel
