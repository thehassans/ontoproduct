// Analytics utility - fires events across ALL pixel platforms with prices
// Platforms: Facebook/Meta, TikTok, Snapchat, Pinterest, Twitter/X, LinkedIn, Google Analytics

function getCurrency() {
  try {
    const country = localStorage.getItem('selected_country') || 'GB'
    const map = { SA: 'SAR', AE: 'AED', OM: 'OMR', BH: 'BHD', KW: 'KWD', QA: 'QAR', IN: 'INR', PK: 'PKR', GB: 'GBP', UK: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD' }
    return map[country] || 'GBP'
  } catch { return 'GBP' }
}

// ─── Platform-specific safe callers ─────────────────────────────────────────

function fbTrack(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.fbq) return
  try { window.fbq('track', eventName, params) } catch (e) { console.warn('FB pixel error:', e) }
}

function ttqTrack(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.ttq) return
  try {
    const events = window._tiktokEvents || {}
    const key = eventName ? eventName.charAt(0).toLowerCase() + eventName.slice(1) : ''
    if (events[eventName] === false || (key && events[key] === false)) return

    const ids = Array.isArray(window._tiktokPixelIds) ? window._tiktokPixelIds : []
    if (ids.length && typeof window.ttq.instance === 'function') {
      ids.forEach((id) => { try { window.ttq.instance(id).track(eventName, params) } catch {} })
      return
    }
    window.ttq.track(eventName, params)
  } catch (e) { console.warn('TikTok pixel error:', e) }
}

function snapTrack(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.snaptr) return
  try { window.snaptr('track', eventName, params) } catch (e) { console.warn('Snap pixel error:', e) }
}

function pinTrack(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.pintrk) return
  try { window.pintrk('track', eventName, params) } catch (e) { console.warn('Pinterest pixel error:', e) }
}

function twTrack(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.twq) return
  try { window.twq('track', eventName, params) } catch (e) { console.warn('Twitter pixel error:', e) }
}

function liTrack(conversionId) {
  if (typeof window === 'undefined' || !window.lintrk) return
  try { window.lintrk('track', { conversion_id: conversionId }) } catch (e) { console.warn('LinkedIn pixel error:', e) }
}

function gaTrack(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.gtag) return
  try { window.gtag('event', eventName, params) } catch (e) { console.warn('GA error:', e) }
}

// ─── Analytics class ────────────────────────────────────────────────────────

class Analytics {
  constructor() {
    this.events = []
    this.sessionId = this.generateSessionId()
    this.userId = this.getUserId()
    this.startTime = Date.now()
    this.lastPageView = null
    this.pageViewDebounceMs = 500
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  getUserId() {
    let userId = localStorage.getItem('analytics_user_id')
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('analytics_user_id', userId)
    }
    return userId
  }

  // Track page views (debounced to prevent spam)
  trackPageView(page, title = '') {
    const now = Date.now()
    const key = `${page}|${title}`
    if (this.lastPageView && this.lastPageView.key === key && now - this.lastPageView.time < this.pageViewDebounceMs) return
    this.lastPageView = { key, time: now }
    this.trackEvent('page_view', { page, title, timestamp: now, url: window.location.href })
  }

  // Track product views → ViewContent across all platforms
  trackProductView(productId, productName, category, price) {
    const currency = getCurrency()
    const value = Number(price) || 0

    this.trackEvent('product_view', { product_id: productId, product_name: productName, category, price: value, timestamp: Date.now() })

    // Facebook/Meta - ViewContent
    fbTrack('ViewContent', {
      content_ids: [String(productId)],
      content_name: productName,
      content_category: category,
      content_type: 'product',
      value: value,
      currency: currency
    })

    // TikTok - ViewContent
    ttqTrack('ViewContent', {
      content_id: String(productId),
      contents: [{ content_id: String(productId), content_type: 'product', content_name: productName, price: value, quantity: 1 }],
      content_type: 'product',
      value: value,
      currency: currency
    })

    // Snapchat - VIEW_CONTENT
    snapTrack('VIEW_CONTENT', {
      item_ids: [String(productId)],
      item_category: category,
      price: value,
      currency: currency
    })

    // Pinterest - ViewCategory / PageVisit with product data
    pinTrack('pagevisit', {
      product_id: String(productId),
      product_name: productName,
      product_category: category,
      value: value,
      currency: currency
    })

    // Twitter/X - ViewContent
    twTrack('ViewContent', {
      content_ids: [String(productId)],
      content_name: productName,
      content_type: 'product',
      value: String(value),
      currency: currency
    })

    // Google Analytics - view_item
    gaTrack('view_item', {
      currency: currency,
      value: value,
      items: [{ item_id: String(productId), item_name: productName, item_category: category, price: value, quantity: 1 }]
    })
  }

  // Track add to cart → AddToCart across all platforms
  trackAddToCart(productId, productName, price, quantity = 1) {
    const currency = getCurrency()
    const unitPrice = Number(price) || 0
    const qty = Number(quantity) || 1
    const totalValue = unitPrice * qty

    this.trackEvent('add_to_cart', { product_id: productId, product_name: productName, price: unitPrice, quantity: qty, timestamp: Date.now() })

    // Facebook/Meta - AddToCart
    fbTrack('AddToCart', {
      content_ids: [String(productId)],
      content_name: productName,
      content_type: 'product',
      value: totalValue,
      currency: currency,
      num_items: qty
    })

    // TikTok - AddToCart
    ttqTrack('AddToCart', {
      content_id: String(productId),
      contents: [{ content_id: String(productId), content_type: 'product', content_name: productName, price: unitPrice, quantity: qty }],
      content_type: 'product',
      value: totalValue,
      currency: currency
    })

    // Snapchat - ADD_CART
    snapTrack('ADD_CART', {
      item_ids: [String(productId)],
      price: totalValue,
      currency: currency,
      number_items: qty
    })

    // Pinterest - AddToCart
    pinTrack('addtocart', {
      product_id: String(productId),
      product_name: productName,
      value: totalValue,
      order_quantity: qty,
      currency: currency
    })

    // Twitter/X - AddToCart
    twTrack('AddToCart', {
      content_ids: [String(productId)],
      content_name: productName,
      content_type: 'product',
      value: String(totalValue),
      currency: currency,
      num_items: String(qty)
    })

    // Google Analytics - add_to_cart
    gaTrack('add_to_cart', {
      currency: currency,
      value: totalValue,
      items: [{ item_id: String(productId), item_name: productName, price: unitPrice, quantity: qty }]
    })
  }

  // Track remove from cart
  trackRemoveFromCart(productId, productName, quantity = 1) {
    this.trackEvent('remove_from_cart', { product_id: productId, product_name: productName, quantity, timestamp: Date.now() })

    gaTrack('remove_from_cart', {
      currency: getCurrency(),
      items: [{ item_id: String(productId), item_name: productName, quantity: Number(quantity) || 1 }]
    })
  }

  // Track search events
  trackSearch(query, resultsCount = 0) {
    this.trackEvent('search', { query, results_count: resultsCount, timestamp: Date.now() })

    // Facebook - Search
    fbTrack('Search', { search_string: query, content_type: 'product' })

    // TikTok - Search
    ttqTrack('Search', { query: query })

    // Snapchat - SEARCH
    snapTrack('SEARCH', { search_string: query })

    // Pinterest - Search
    pinTrack('search', { search_query: query })

    // Google Analytics - search
    gaTrack('search', { search_term: query })
  }

  // Track checkout start → InitiateCheckout across all platforms
  trackCheckoutStart(cartValue, itemCount) {
    const currency = getCurrency()
    const value = Number(cartValue) || 0
    const count = Number(itemCount) || 0

    this.trackEvent('checkout_start', { cart_value: value, item_count: count, timestamp: Date.now() })

    // Facebook/Meta - InitiateCheckout
    fbTrack('InitiateCheckout', {
      value: value,
      currency: currency,
      num_items: count,
      content_type: 'product'
    })

    // TikTok - InitiateCheckout
    let _ttqCartContents = []
    try {
      const _cart = JSON.parse(localStorage.getItem('shopping_cart') || '[]')
      _ttqCartContents = _cart.map(i => ({ content_id: String(i._id || i.productId || i.id || ''), content_type: 'product', content_name: i.name || i.productName || '', price: Number(i.price) || 0, quantity: Number(i.quantity) || 1 })).filter(c => c.content_id)
    } catch {}
    const _ttqCheckoutFirstId = _ttqCartContents.length ? _ttqCartContents[0].content_id : 'cart'
    ttqTrack('InitiateCheckout', {
      content_id: _ttqCheckoutFirstId,
      contents: _ttqCartContents.length ? _ttqCartContents : [{ content_id: 'cart', content_type: 'product' }],
      content_type: 'product',
      quantity: count,
      value: value,
      currency: currency
    })

    // Snapchat - START_CHECKOUT
    snapTrack('START_CHECKOUT', {
      price: value,
      currency: currency,
      number_items: count
    })

    // Pinterest - Checkout
    pinTrack('checkout', {
      value: value,
      order_quantity: count,
      currency: currency
    })

    // Twitter/X - InitiateCheckout
    twTrack('InitiateCheckout', {
      value: String(value),
      currency: currency,
      num_items: String(count)
    })

    // Google Analytics - begin_checkout
    gaTrack('begin_checkout', {
      currency: currency,
      value: value
    })
  }

  // Track checkout complete / purchase → Purchase across all platforms
  trackCheckoutComplete(orderId, cartValue, itemCount, paymentMethod) {
    const currency = getCurrency()
    const value = Number(cartValue) || 0
    const count = Number(itemCount) || 0

    this.trackEvent('checkout_complete', { order_id: orderId, cart_value: value, item_count: count, payment_method: paymentMethod, timestamp: Date.now() })

    // Facebook/Meta - Purchase
    fbTrack('Purchase', {
      value: value,
      currency: currency,
      num_items: count,
      content_type: 'product'
    })

    // TikTok - CompletePayment
    let _ttqOrderContents = []
    try {
      const _cart2 = JSON.parse(localStorage.getItem('shopping_cart') || '[]')
      _ttqOrderContents = _cart2.map(i => ({ content_id: String(i._id || i.productId || i.id || ''), content_type: 'product', content_name: i.name || i.productName || '', price: Number(i.price) || 0, quantity: Number(i.quantity) || 1 })).filter(c => c.content_id)
    } catch {}
    const _ttqOrderFirstId = _ttqOrderContents.length ? _ttqOrderContents[0].content_id : String(orderId || '')
    ttqTrack('CompletePayment', {
      content_id: _ttqOrderFirstId,
      contents: _ttqOrderContents.length ? _ttqOrderContents : [{ content_id: String(orderId || ''), content_type: 'product' }],
      content_type: 'product',
      quantity: count,
      value: value,
      currency: currency
    })

    // Snapchat - PURCHASE
    snapTrack('PURCHASE', {
      price: value,
      currency: currency,
      number_items: count,
      transaction_id: String(orderId || '')
    })

    // Pinterest - Checkout (purchase)
    pinTrack('checkout', {
      value: value,
      order_quantity: count,
      currency: currency,
      order_id: String(orderId || '')
    })

    // Twitter/X - Purchase
    twTrack('Purchase', {
      value: String(value),
      currency: currency,
      num_items: String(count),
      order_id: String(orderId || '')
    })

    // LinkedIn - conversion (uses conversion ID from settings if available)
    try {
      const seo = window._seoSettings || {}
      if (seo.linkedinConversionId) {
        liTrack(seo.linkedinConversionId)
      }
    } catch {}

    // Google Analytics - purchase
    gaTrack('purchase', {
      transaction_id: String(orderId || ''),
      value: value,
      currency: currency,
      items: [{ item_id: 'order', quantity: count }]
    })
  }

  // Track filter usage
  trackFilterUsage(filterType, filterValue) {
    this.trackEvent('filter_usage', { filter_type: filterType, filter_value: filterValue, timestamp: Date.now() })
  }

  // Track sort usage
  trackSortUsage(sortBy) {
    this.trackEvent('sort_usage', { sort_by: sortBy, timestamp: Date.now() })
  }

  // Generic event tracking
  trackEvent(eventName, properties = {}) {
    const event = {
      event_name: eventName,
      session_id: this.sessionId,
      user_id: this.userId,
      timestamp: Date.now(),
      properties: {
        ...properties,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer,
        language: navigator.language
      }
    }
    this.events.push(event)
    this.saveEventsToStorage()
  }

  // Save events to localStorage
  saveEventsToStorage() {
    try {
      const existingEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]')
      const allEvents = [...existingEvents, ...this.events]
      const recentEvents = allEvents.slice(-1000)
      localStorage.setItem('analytics_events', JSON.stringify(recentEvents))
      this.events = []
    } catch (error) {
      console.error('Error saving analytics events:', error)
    }
  }

  // Get all stored events
  getAllEvents() {
    try { return JSON.parse(localStorage.getItem('analytics_events') || '[]') } catch { return [] }
  }

  // Clear all stored events
  clearEvents() {
    localStorage.removeItem('analytics_events')
    this.events = []
  }

  // Get session summary
  getSessionSummary() {
    const events = this.getAllEvents()
    const sessionEvents = events.filter(event => event.session_id === this.sessionId)
    return {
      session_id: this.sessionId,
      user_id: this.userId,
      start_time: this.startTime,
      duration: Date.now() - this.startTime,
      event_count: sessionEvents.length,
      page_views: sessionEvents.filter(e => e.event_name === 'page_view').length,
      product_views: sessionEvents.filter(e => e.event_name === 'product_view').length,
      add_to_cart_events: sessionEvents.filter(e => e.event_name === 'add_to_cart').length,
      searches: sessionEvents.filter(e => e.event_name === 'search').length
    }
  }
}

// ─── Platform page view tracking (used by DynamicPixels on route change) ─────

function isPageViewEnabled(platformKey) {
  if (typeof window === 'undefined') return true
  const et = window._seoSettings?.eventTracking
  if (!et || typeof et !== 'object') return true
  const platform = et?.[platformKey]
  if (!platform || typeof platform !== 'object') return true
  return platform?.pageView !== false
}

export function trackAllPlatformPageView(pathname) {
  // TikTok Pixel page view
  if (typeof window !== 'undefined' && window.ttq) {
    try {
      const ids = Array.isArray(window._tiktokPixelIds) ? window._tiktokPixelIds : []
      const enabled = (window._tiktokEvents || {}).pageView !== false
      if (enabled) {
        if (ids.length && typeof window.ttq.instance === 'function') {
          ids.forEach((id) => { try { window.ttq.instance(id).page() } catch {} })
        } else {
          window.ttq.page()
        }
      }
    } catch {}
  }

  // Facebook/Meta Pixel page view
  if (typeof window !== 'undefined' && window.fbq && isPageViewEnabled('facebook')) {
    try { window.fbq('track', 'PageView') } catch {}
  }

  // Snapchat Pixel page view
  if (typeof window !== 'undefined' && window.snaptr && isPageViewEnabled('snapchat')) {
    try { window.snaptr('track', 'PAGE_VIEW') } catch {}
  }

  // Pinterest page view
  if (typeof window !== 'undefined' && window.pintrk && isPageViewEnabled('pinterest')) {
    try { window.pintrk('page') } catch {}
  }

  // Twitter/X page view
  if (typeof window !== 'undefined' && window.twq) {
    try { window.twq('track', 'PageView') } catch {}
  }

  // Google Analytics page view
  if (typeof window !== 'undefined' && window.gtag && isPageViewEnabled('google')) {
    try { window.gtag('event', 'page_view', { page_path: pathname }) } catch {}
  }
}

// Create and export a singleton instance
const analytics = new Analytics()

export default analytics

// Export individual tracking functions for convenience
export const trackPageView = (page, title) => analytics.trackPageView(page, title)
export const trackProductView = (productId, productName, category, price) => 
  analytics.trackProductView(productId, productName, category, price)
export const trackAddToCart = (productId, productName, price, quantity) => 
  analytics.trackAddToCart(productId, productName, price, quantity)
export const trackRemoveFromCart = (productId, productName, quantity) => 
  analytics.trackRemoveFromCart(productId, productName, quantity)
export const trackSearch = (query, resultsCount) => analytics.trackSearch(query, resultsCount)
export const trackCheckoutStart = (cartValue, itemCount) => analytics.trackCheckoutStart(cartValue, itemCount)
export const trackCheckoutComplete = (orderId, cartValue, itemCount, paymentMethod) => 
  analytics.trackCheckoutComplete(orderId, cartValue, itemCount, paymentMethod)
export const trackFilterUsage = (filterType, filterValue) => analytics.trackFilterUsage(filterType, filterValue)
export const trackSortUsage = (sortBy) => analytics.trackSortUsage(sortBy)
