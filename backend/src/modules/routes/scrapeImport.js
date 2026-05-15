import express from 'express'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { auth, allowRoles } from '../middleware/auth.js'
import Product from '../models/Product.js'
import User from '../models/User.js'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCRAPER_SCRIPT = path.resolve(__dirname, '../../../../scraper/crawl_product.py')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ── Python subprocess runner ──────────────────────────────────────────────────
function runPython(params, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [SCRAPER_SCRIPT], { cwd: path.dirname(SCRAPER_SCRIPT) })
    let out = '', err = ''
    const timer = setTimeout(() => { py.kill(); reject(new Error('Scraper timed out after 90s')) }, timeoutMs)
    py.stdout.on('data', d => { out += d })
    py.stderr.on('data', d => { err += d })
    py.on('close', code => {
      clearTimeout(timer)
      if (!out.trim()) {
        reject(new Error(err.split('\n').filter(Boolean).pop() || `Python exited ${code}`))
        return
      }
      try { resolve(JSON.parse(out)) } catch { reject(new Error('Invalid JSON from scraper')) }
    })
    py.on('error', e => { clearTimeout(timer); reject(new Error(`Python not found: ${e.message}`)) })
    py.stdin.write(JSON.stringify(params))
    py.stdin.end()
  })
}

async function fetchHtml(url, extraHeaders = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 18000)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(t)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err) {
    clearTimeout(t)
    throw err
  }
}

function extractJsonLd(html) {
  const results = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const m of html.matchAll(re)) {
    try { results.push(JSON.parse(m[1])) } catch {}
  }
  return results
}

function extractOg(html) {
  const get = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']*)`,'i'))
      || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)[^>]*property=["']og:${prop}["']`,'i'))
    return m ? m[1].trim() : null
  }
  return {
    title: get('title'),
    description: get('description'),
    image: get('image'),
    price: get('price:amount'),
    currency: get('price:currency'),
  }
}

function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

function cleanHtml(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim()
}

function parseProductFromJsonLd(html) {
  const lds = extractJsonLd(html)
  let p = null
  for (const ld of lds) {
    if (ld['@type'] === 'Product') { p = ld; break }
    if (Array.isArray(ld['@graph'])) {
      const found = ld['@graph'].find(g => g['@type'] === 'Product')
      if (found) { p = found; break }
    }
  }
  if (!p) return null
  const offer = p.offers ? (Array.isArray(p.offers) ? p.offers[0] : p.offers) : null
  const imgs = p.image ? (Array.isArray(p.image) ? p.image : [p.image]) : []
  return {
    name: cleanHtml(p.name || ''),
    description: cleanHtml(p.description || ''),
    images: imgs.filter(Boolean).slice(0, 8),
    price: offer ? (parseFloat(offer.price) || 0) : 0,
    currency: offer?.priceCurrency || 'SAR',
    stock: offer?.availability?.includes('InStock') ? 100 : 0,
    sku: p.sku || p.mpn || '',
    brand: typeof p.brand === 'string' ? p.brand : (p.brand?.name || ''),
    category: cleanHtml(typeof p.category === 'string' ? p.category : ''),
  }
}

// ─── Platform parsers ──────────────────────────────────────────────────────────

function parseNoonProducts(html) {
  const nd = extractNextData(html)
  if (!nd) return []
  // try multiple paths where noon stores hits
  const hits =
    nd?.props?.pageProps?.hits ||
    nd?.props?.pageProps?.initialData?.hits ||
    nd?.props?.pageProps?.catalogPageData?.hits ||
    []
  return hits.slice(0, 24).map(h => {
    const imgKey = (h.image_keys || [])[0]
    const img = imgKey ? `https://f.nooncdn.com/p/${imgKey}_A26.jpg` : (h.thumbnail || '')
    return {
      name: cleanHtml(h.name || h.title || ''),
      price: parseFloat(h.price?.raw || h.sale_price || h.price || 0),
      originalPrice: parseFloat(h.was_price?.raw || h.original_price || 0),
      images: img ? [img] : [],
      category: h.brand_name || '',
      brand: h.brand_name || '',
      stock: h.qty_for_shipping ?? 100,
      delivery: h.delivery_text || '',
      description: cleanHtml(h.description || h.name || ''),
      sourceUrl: h.sku ? `https://www.noon.com/saudi-en/${h.sku}/p/` : '',
      sku: h.sku || '',
      platform: 'noon',
    }
  }).filter(p => p.name)
}

function parseAliExpressProducts(html) {
  const m = html.match(/window\.runParams\s*=\s*(\{[\s\S]*?\});\s*(?:window|var|let|const|<)/)
  if (!m) return []
  try {
    const data = JSON.parse(m[1])
    const items = data?.data?.result?.mods?.itemList?.content || []
    return items.slice(0, 24).map(item => ({
      name: cleanHtml(item.title?.displayTitle || item.title?.raw || ''),
      price: parseFloat(item.prices?.salePrice?.minPrice || 0),
      originalPrice: parseFloat(item.prices?.originalPrice?.minPrice || 0),
      images: item.image?.imgUrl ? [`https:${item.image.imgUrl}`] : [],
      category: '',
      brand: item.store?.storeName || '',
      stock: 100,
      delivery: item.delivery?.displayString || '',
      description: cleanHtml(item.title?.displayTitle || ''),
      sourceUrl: item.productId ? `https://www.aliexpress.com/item/${item.productId}.html` : '',
      sku: String(item.productId || ''),
      platform: 'aliexpress',
    })).filter(p => p.name)
  } catch { return [] }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Search products — Python crawl4ai primary, Node.js fetch fallback
router.post('/search', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  const { platform, query, page = 1 } = req.body || {}
  if (!query || !platform) return res.status(400).json({ message: 'platform and query are required' })

  // Try Python crawl4ai first
  try {
    const pyResult = await runPython({ mode: 'search', platform, query, page: Number(page) })
    if (!pyResult.error && Array.isArray(pyResult.products)) {
      return res.json(pyResult)
    }
    if (pyResult.warning && Array.isArray(pyResult.products)) {
      return res.json(pyResult)
    }
  } catch (pyErr) {
    console.warn('[scrape] Python unavailable, using Node.js fallback:', pyErr.message)
  }

  // Node.js fetch fallback
  try {
    let products = []
    let hasMore = false
    let warning = null

    if (platform === 'noon') {
      const url = `https://www.noon.com/saudi-en/search/?q=${encodeURIComponent(query)}&page=${page}`
      try {
        const html = await fetchHtml(url, { 'Cookie': 'lng=en; country=SAU; device=desktop' })
        products = parseNoonProducts(html)
        hasMore = products.length >= 20
        if (products.length === 0) warning = 'Noon returned no results for this query. Try different keywords.'
      } catch (e) {
        warning = `Noon search unavailable (${e.message}). Paste product URLs in the URL Import tab.`
      }
    }

    else if (platform === 'aliexpress') {
      const url = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}&page=${page}`
      try {
        const html = await fetchHtml(url)
        products = parseAliExpressProducts(html)
        hasMore = products.length >= 20
        if (products.length === 0) warning = 'AliExpress results could not be parsed. Paste product URLs in the URL Import tab.'
      } catch (e) {
        warning = `AliExpress blocked the request. Paste product URLs in the URL Import tab.`
      }
    }

    else if (platform === 'shein') {
      warning = 'Shein uses bot protection. Copy product page URLs from Shein and paste them in the URL Import tab below.'
    }

    else if (platform === 'amazon') {
      const url = `https://www.amazon.sa/s?k=${encodeURIComponent(query)}&page=${page}`
      try {
        const html = await fetchHtml(url, { 'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8' })
        // Amazon embeds products in data-component-type="s-search-result"
        const blocks = [...html.matchAll(/data-asin="([^"]+)"[\s\S]*?class="[^"]*s-image[^"]*"[^>]*src="([^"]+)"[\s\S]*?<span[^>]*a-price[^>]*>[\s\S]*?<span[^>]*a-offscreen[^>]*>([^<]+)/g)]
        products = blocks.slice(0, 20).map(([, asin, img, price]) => ({
          name: '',
          price: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
          images: [img],
          category: '',
          brand: '',
          stock: 100,
          delivery: '',
          description: '',
          sourceUrl: `https://www.amazon.sa/dp/${asin}`,
          sku: asin,
          platform: 'amazon',
        }))
        // Names come from separate regex
        const names = [...html.matchAll(/class="[^"]*s-title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/g)]
        products.forEach((p, i) => { if (names[i]) p.name = cleanHtml(names[i][1]) })
        products = products.filter(p => p.name)
        if (products.length === 0) warning = 'Amazon SA could not be parsed. Try pasting product URLs directly.'
      } catch (e) {
        warning = `Amazon SA blocked the request. Try pasting product URLs in the URL Import tab.`
      }
    }

    return res.json({ products, hasMore, warning, page, platform })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Search failed' })
  }
})

// Fetch a single product URL and extract data
router.post('/fetch-url', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  const { url } = req.body || {}
  if (!url || !url.startsWith('http')) return res.status(400).json({ message: 'Valid URL is required' })
  try {
    const html = await fetchHtml(url)
    let product = parseProductFromJsonLd(html)

    if (!product) {
      const og = extractOg(html)
      product = {
        name: og.title || '',
        description: og.description || '',
        images: og.image ? [og.image] : [],
        price: parseFloat(og.price || 0),
        currency: og.currency || 'SAR',
        stock: 100,
        sku: '',
        brand: '',
        category: '',
      }
    }

    // Fill missing name from title tag
    if (!product.name) {
      const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      if (m) product.name = cleanHtml(m[1]).split('|')[0].split('-')[0].trim()
    }

    if (!product.name) return res.status(422).json({ message: 'Could not extract product data from this URL' })

    product.sourceUrl = url
    product.platform = 'url'
    return res.json({ product })
  } catch (err) {
    return res.status(500).json({ message: `Failed to fetch URL: ${err.message}` })
  }
})

// Fetch multiple URLs — Python crawl4ai primary, Node.js fetch fallback
router.post('/fetch-urls', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  const { urls } = req.body || {}
  if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ message: 'urls array is required' })

  // Try Python crawl4ai first
  try {
    const pyResult = await runPython({ mode: 'fetch-urls', urls: urls.slice(0, 20) })
    if (Array.isArray(pyResult.results) && pyResult.results.length > 0) {
      return res.json(pyResult)
    }
  } catch (pyErr) {
    console.warn('[scrape] Python unavailable for fetch-urls, falling back:', pyErr.message)
  }

  // Node.js fetch fallback
  const results = []
  for (const url of urls.slice(0, 20)) {
    try {
      const html = await fetchHtml(String(url).trim())
      let product = parseProductFromJsonLd(html) || {}
      const og = extractOg(html)
      if (!product.name && og.title) product.name = cleanHtml(og.title).split('|')[0].split('-')[0].trim()
      if (!product.description && og.description) product.description = og.description
      if (!product.images?.length && og.image) product.images = [og.image]
      if (!product.price && og.price) product.price = parseFloat(og.price) || 0
      if (!product.name) {
        const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
        if (m) product.name = cleanHtml(m[1]).split('|')[0].split('-')[0].trim()
      }
      product.sourceUrl = url
      product.platform = 'url'
      results.push({ url, success: true, product })
    } catch (err) {
      results.push({ url, success: false, error: err.message })
    }
  }
  return res.json({ results })
})

// Import scraped products into the store
router.post('/import', auth, allowRoles('admin', 'user', 'manager'), async (req, res) => {
  const { products } = req.body || {}
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: 'products array is required' })
  }

  let ownerId = req.user.id
  if (req.user.role === 'manager') {
    try {
      const mgr = await User.findById(req.user.id).select('createdBy managerPermissions').lean()
      if (!mgr?.managerPermissions?.canManageProducts) {
        return res.status(403).json({ message: 'Manager not allowed to manage products' })
      }
      ownerId = String(mgr.createdBy || req.user.id)
    } catch {}
  }

  const results = []
  for (const p of products.slice(0, 50)) {
    try {
      const doc = new Product({
        owner: ownerId,
        name: String(p.name || '').trim().slice(0, 250),
        price: parseFloat(p.price) || 0,
        dropshippingPrice: parseFloat(p.dropshippingPrice || p.price) || 0,
        description: String(p.description || '').trim().slice(0, 5000),
        category: String(p.category || '').trim(),
        images: (Array.isArray(p.images) ? p.images : []).filter(u => typeof u === 'string' && u.startsWith('http')).slice(0, 8),
        stockKSA: parseInt(p.stock || p.stockKSA || 0),
        displayOnWebsite: false,
        notes: p.sourceUrl ? `Imported from: ${p.sourceUrl}` : 'Bulk imported',
      })
      await doc.save()
      results.push({ success: true, id: doc._id, name: doc.name })
    } catch (err) {
      results.push({ success: false, name: p.name, error: err.message })
    }
  }

  const saved = results.filter(r => r.success).length
  return res.json({ imported: saved, total: products.length, results })
})

export default router
