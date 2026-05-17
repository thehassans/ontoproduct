import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useCountry } from '../contexts/CountryContext'
import { COUNTRY_LIST } from '../utils/constants'

const PANEL_PREFIXES = [
  '/user', '/manager', '/admin', '/dropshipper', '/shop-vendor', '/seo',
  '/inbox', '/customer', '/login', '/signup', '/register', '/agent',
  '/confirmer', '/commissioner', '/investor', '/partner', '/admin-login',
]

function upsertMeta(attr, attrVal, content) {
  try {
    let el = document.querySelector(`meta[${attr}="${CSS.escape(attrVal)}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, attrVal)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  } catch {}
}

function removeBySelector(selector) {
  try { document.querySelectorAll(selector).forEach((el) => el.remove()) } catch {}
}

export default function CountrySEO() {
  const { pathname } = useLocation()
  const { country } = useCountry()

  const isPanel = PANEL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  useEffect(() => {
    if (isPanel) return

    const entry = COUNTRY_LIST.find((c) => c.code === country)
    if (!entry) return

    const { name, currency, flag, domain, hreflang, locale } = entry
    const hostname = window.location.hostname
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
    const activeDomain = isLocalhost ? 'buysial.com' : hostname
    const path = pathname || '/'
    const canonicalBase = domain || activeDomain
    const canonicalUrl = `https://${canonicalBase}${path}`

    // ── Title ────────────────────────────────────────────────────────────────
    document.title = `BuySial ${name} ${flag} — Shop Online & Get Fast Delivery`

    // ── Canonical ────────────────────────────────────────────────────────────
    removeBySelector('link[rel="canonical"]')
    const canonEl = document.createElement('link')
    canonEl.setAttribute('rel', 'canonical')
    canonEl.setAttribute('href', canonicalUrl)
    document.head.appendChild(canonEl)

    // ── Meta description / keywords ──────────────────────────────────────────
    const description = `Shop premium products in ${name}. Pay in ${currency}. Free & fast local delivery. Trusted online shopping on BuySial ${name}.`
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'keywords', `online shopping ${name}, ${currency} products, BuySial ${name}, buy online ${name}, fast delivery`)
    upsertMeta('name', 'robots', 'index, follow')

    // ── Geo tags ─────────────────────────────────────────────────────────────
    upsertMeta('name', 'geo.region', country)
    upsertMeta('name', 'geo.placename', name)
    upsertMeta('name', 'content-language', (hreflang || 'en').split('-')[0])

    // ── Open Graph ───────────────────────────────────────────────────────────
    const ogLocale = (locale || 'en_US').replace('-', '_')
    upsertMeta('property', 'og:title', `BuySial ${name} ${flag} — Shop Online`)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:locale', ogLocale)
    upsertMeta('property', 'og:site_name', `BuySial ${name}`)
    upsertMeta('property', 'og:type', 'website')

    // ── Twitter Card ─────────────────────────────────────────────────────────
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', `BuySial ${name} — Online Shopping`)
    upsertMeta('name', 'twitter:description', description)

    // ── hreflang alternate links ─────────────────────────────────────────────
    removeBySelector('link[rel="alternate"][hreflang]')

    const activeCountries = COUNTRY_LIST.filter((c) => c.domain && c.enabled !== false)
    for (const c of activeCountries) {
      try {
        const hl = c.hreflang || 'en'
        const el = document.createElement('link')
        el.setAttribute('rel', 'alternate')
        el.setAttribute('hreflang', hl)
        el.setAttribute('href', `https://${c.domain}${path}`)
        document.head.appendChild(el)
      } catch {}
    }
    // x-default always points to buysial.com
    try {
      const xdef = document.createElement('link')
      xdef.setAttribute('rel', 'alternate')
      xdef.setAttribute('hreflang', 'x-default')
      xdef.setAttribute('href', `https://buysial.com${path}`)
      document.head.appendChild(xdef)
    } catch {}

    // ── JSON-LD Organization schema ──────────────────────────────────────────
    removeBySelector('script[data-country-seo]')
    try {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'BuySial',
        url: `https://${canonicalBase}`,
        sameAs: ['https://buysial.com', ...activeCountries.map((c) => `https://${c.domain}`)],
        areaServed: { '@type': 'Country', name },
        currenciesAccepted: currency,
        logo: `https://buysial.com/BSBackgroundremoved.png`,
      }
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-country-seo', 'true')
      script.text = JSON.stringify(schema, null, 0)
      document.head.appendChild(script)
    } catch {}
  }, [country, pathname, isPanel])

  return null
}
