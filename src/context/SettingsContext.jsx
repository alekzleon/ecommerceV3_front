/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  getPublicContactFaqImage,
  getPublicContactMapUrl,
  getPublicGeneralLogo,
  getPublicNavTitle,
  getPublicSettings,
} from "../services/api/settingsService"
import { normalizeMediaUrl } from "../utils/mediaUrl"

const DEFAULT_SETTINGS = {
  site_title: "Tienda en línea",
  nav_title: {
    title: "Todo para tu negocio, al mejor precio y con entrega garantizada.",
  },
  general_logo: {
    logo_path: "",
    logo_url: "",
  },
  contact_faq_image: {
    image_path: "",
    image_url: "",
  },
  contact_map_url: "",
  logo_url: "",
  favicon_url: "",
  contact_numbers: [],
  email: "",
  address: "",
  social_links: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },
  forms_recipient_email: "",
  meta: {
    title: "",
    description: "",
    keywords: [],
  },
  google_analytics_pixel: "",
  meta_pixel: "",
  og_image_url: "",
  loyalty: {
    first_purchase_discount_enabled: false,
    first_purchase_discount_percentage: 0,
    cashback_enabled: false,
    cashback_earn_percentage: 0,
    cashback_redeem_enabled: false,
    cashback_max_redeem_percentage: 100,
  },
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const refreshSettings = async () => {
    try {
      setLoading(true)
      const [
        settingsResponse,
        navTitleResponse,
        generalLogoResponse,
        contactFaqImageResponse,
        contactMapUrlResponse,
      ] = await Promise.allSettled([
        getPublicSettings(),
        getPublicNavTitle(),
        getPublicGeneralLogo(),
        getPublicContactFaqImage(),
        getPublicContactMapUrl(),
      ])
      const nextSettings = settingsResponse.status === "fulfilled"
        ? normalizeSettingsResponse(settingsResponse.value)
        : DEFAULT_SETTINGS
      const navTitle = navTitleResponse.status === "fulfilled"
        ? normalizeNavTitleResponse(navTitleResponse.value)
        : DEFAULT_SETTINGS.nav_title
      const generalLogo = generalLogoResponse.status === "fulfilled"
        ? normalizeGeneralLogoResponse(generalLogoResponse.value)
        : nextSettings.general_logo
      const contactFaqImage = contactFaqImageResponse.status === "fulfilled"
        ? normalizeContactFaqImageResponse(contactFaqImageResponse.value)
        : nextSettings.contact_faq_image
      const contactMapUrl = contactMapUrlResponse.status === "fulfilled"
        ? normalizeContactMapUrlResponse(contactMapUrlResponse.value)
        : nextSettings.contact_map_url

      setSettings({
        ...nextSettings,
        nav_title: navTitle,
        general_logo: generalLogo,
        contact_faq_image: contactFaqImage,
        contact_map_url: contactMapUrl,
        logo_url: generalLogo.logo_url || nextSettings.logo_url,
      })
    } catch (error) {
      console.error("Error loading public settings:", error)
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSettings()
  }, [])

  useEffect(() => {
    applyDocumentSettings(settings)
    applyTrackingSettings(settings)
  }, [settings])

  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings,
      updateLocalSetting: (key, value) => {
        setSettings((prev) => setSettingValue(prev, key, value))
      },
      brandName: settings.site_title || settings.meta?.title || DEFAULT_SETTINGS.site_title,
      logoUrl: settings.general_logo?.logo_url || settings.logo_url || "",
      faviconUrl: settings.favicon_url || "",
    }),
    [settings, loading],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error("useSettings debe usarse dentro de SettingsProvider")
  }

  return context
}

function normalizeSettingsResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const meta = data.meta && typeof data.meta === "object" ? data.meta : {}
  const socialLinks =
    data.social_links && typeof data.social_links === "object" ? data.social_links : {}
  const loyalty = data.loyalty && typeof data.loyalty === "object" ? data.loyalty : {}

  return {
    ...DEFAULT_SETTINGS,
    ...data,
    site_title: data.site_title || "",
    nav_title: normalizeNavTitleValue(data.nav_title || data.nav_title_value || data.header_tagline),
    general_logo: normalizeGeneralLogoValue(data.general_logo || data.general_logo_value || {
      logo_path: data.logo_path,
      logo_url: data.logo_url,
    }),
    contact_faq_image: normalizeContactFaqImageValue(data.contact_faq_image || data.contact_faq_image_value),
    contact_map_url: data.contact_map_url || data.google_maps_url || "",
    logo_url: normalizeMediaUrl(data.logo_url || data.logo_path),
    favicon_url: normalizeMediaUrl(data.favicon_url || data.favicon_path),
    contact_numbers: Array.isArray(data.contact_numbers) ? data.contact_numbers.slice(0, 2) : [],
    social_links: {
      ...DEFAULT_SETTINGS.social_links,
      ...socialLinks,
    },
    meta: {
      ...DEFAULT_SETTINGS.meta,
      ...meta,
      keywords: Array.isArray(meta.keywords) ? meta.keywords : [],
    },
    og_image_url: normalizeMediaUrl(data.og_image_url || data.og_image_path),
    loyalty: {
      ...DEFAULT_SETTINGS.loyalty,
      ...loyalty,
      first_purchase_discount_enabled: Boolean(loyalty.first_purchase_discount_enabled),
      first_purchase_discount_percentage: Number(
        loyalty.first_purchase_discount_percentage ?? 0,
      ),
      cashback_enabled: Boolean(loyalty.cashback_enabled),
      cashback_earn_percentage: Number(loyalty.cashback_earn_percentage ?? 0),
      cashback_redeem_enabled: Boolean(loyalty.cashback_redeem_enabled),
      cashback_max_redeem_percentage: Number(loyalty.cashback_max_redeem_percentage ?? 100),
    },
  }
}

function normalizeContactFaqImageValue(value) {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS.contact_faq_image

  return {
    image_path: value.image_path || value.path || "",
    image_url: normalizeMediaUrl(value.image_url || value.url || value.image_path || value.path),
  }
}

function normalizeContactFaqImageResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  return normalizeContactFaqImageValue(data.value || data)
}

function normalizeContactMapUrlResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  const value = data.value || data

  if (typeof value === "string") return value
  if (value && typeof value === "object") return value.url || ""

  return ""
}

function normalizeGeneralLogoResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  return normalizeGeneralLogoValue(data.value || data)
}

function normalizeGeneralLogoValue(value) {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS.general_logo

  return {
    logo_path: value.logo_path || "",
    logo_url: normalizeMediaUrl(value.logo_url || value.logo_path),
  }
}

function normalizeNavTitleResponse(response) {
  const data = response?.data?.data || response?.data || response || {}
  return normalizeNavTitleValue(data.value || data)
}

function normalizeNavTitleValue(value) {
  if (typeof value === "string") {
    return { title: value || DEFAULT_SETTINGS.nav_title.title }
  }

  if (value && typeof value === "object") {
    return {
      title: value.title || DEFAULT_SETTINGS.nav_title.title,
    }
  }

  return DEFAULT_SETTINGS.nav_title
}

function setSettingValue(settings, key, value) {
  const parts = String(key || "").split(".").filter(Boolean)
  if (!parts.length) return settings

  const next = { ...settings }
  let cursor = next

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value
      return
    }

    cursor[part] = {
      ...(cursor[part] && typeof cursor[part] === "object" ? cursor[part] : {}),
    }
    cursor = cursor[part]
  })

  return next
}

function applyDocumentSettings(settings) {
  const title = settings.meta?.title || settings.site_title || DEFAULT_SETTINGS.site_title
  const description = settings.meta?.description || ""
  const keywords = Array.isArray(settings.meta?.keywords) ? settings.meta.keywords.join(", ") : ""

  document.title = title
  setMetaTag("description", description)
  setMetaTag("keywords", keywords)
  setMetaProperty("og:title", title)
  setMetaProperty("og:description", description)
  setMetaProperty("og:image", settings.og_image_url || settings.logo_url || "")

  if (settings.favicon_url) {
    let favicon = document.querySelector("link[rel='icon']")

    if (!favicon) {
      favicon = document.createElement("link")
      favicon.setAttribute("rel", "icon")
      document.head.appendChild(favicon)
    }

    favicon.setAttribute("href", settings.favicon_url)
  }
}

function setMetaTag(name, content) {
  if (!content) return

  let meta = document.querySelector(`meta[name='${name}']`)

  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", name)
    document.head.appendChild(meta)
  }

  meta.setAttribute("content", content)
}

function setMetaProperty(property, content) {
  if (!content) return

  let meta = document.querySelector(`meta[property='${property}']`)

  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("property", property)
    document.head.appendChild(meta)
  }

  meta.setAttribute("content", content)
}

function applyTrackingSettings(settings) {
  removeManagedTrackingNodes()

  if (settings.google_analytics_pixel) {
    const gaScript = document.createElement("script")
    gaScript.async = true
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      settings.google_analytics_pixel,
    )}`
    gaScript.dataset.settingsTracking = "google-analytics"
    document.head.appendChild(gaScript)

    const gaInline = document.createElement("script")
    gaInline.dataset.settingsTracking = "google-analytics-inline"
    gaInline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${settings.google_analytics_pixel}');
    `
    document.head.appendChild(gaInline)
  }

  if (settings.meta_pixel) {
    const metaInline = document.createElement("script")
    metaInline.dataset.settingsTracking = "meta-pixel"
    metaInline.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${settings.meta_pixel}');
      fbq('track', 'PageView');
    `
    document.head.appendChild(metaInline)
  }
}

function removeManagedTrackingNodes() {
  document.querySelectorAll("[data-settings-tracking]").forEach((node) => {
    node.remove()
  })
}
