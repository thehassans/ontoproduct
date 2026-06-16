import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost } from '../api'

/*
  SiteConfigContext — Centralized editable content for the entire storefront.
  Every piece of text, header, footer, headline, banner config lives here.
  Pages read from this context; the designer writes to it.
*/

const initialConfig = {
  // ── Global Header ──
  header: {
    logo: '/logo.png',
    searchPlaceholder: 'Search for anything…',
    navLinks: [
      { label: 'Home', path: '/' },
      { label: 'Categories', path: '/categories' },
      { label: 'Brands', path: '/brands' },
      { label: 'New Arrivals', path: '/new-arrivals' },
    ],
    showWishlist: true,
    showCart: true,
    showAccount: true,
  },

  // ── Global Footer ──
  footer: {
    brandText: 'Buysial — Premium shopping, delivered fast.',
    copyright: '© 2026 Buysial. All rights reserved.',
    links: [
      { label: 'Privacy Policy', path: '/privacy' },
      { label: 'Terms of Service', path: '/terms' },
      { label: 'Contact Us', path: '/contact' },
    ],
    social: { instagram: '', facebook: '', twitter: '' },
  },

  // ── Home Page ──
  home: {
    headline: {
      enabled: true,
      badge: 'Premium Shopping',
      title: 'Discover premium products, delivered fast',
      subtitle: 'Curated collections, trusted quality, and seamless shopping across the Gulf.',
      chip1: 'Free Delivery',
      chip2: 'Authentic Products',
      chip3: '24/7 Support',
      chip4: 'Easy Returns',
      speed: '18',
      bg1: '#0b5ed7',
      bg2: '#f97316',
      textColor: '#ffffff',
    },
    banners: {
      items: [],
    },
    miniBanners: {
      items: [],
    },
    videoProducts: {
      enabled: true,
      title: 'Trending Now',
    },
    exploreMore: {
      enabled: true,
      title: 'Explore More',
    },
    newArrivals: {
      enabled: true,
      title: 'New Arrivals',
      subtitle: 'Fresh drops curated just for you',
    },
  },

  // ── Product Page ──
  product: {
    headline: {
      enabled: true,
      title: 'Product Catalog',
      subtitle: 'Browse our curated collection',
    },
  },

  // ── Theme Tokens (override defaults) ──
  themeOverrides: {},

  // ── Meta ──
  meta: {
    siteTitle: 'Buysial',
    siteDescription: 'Premium products, delivered fast across the Middle East.',
    favicon: '/favicon.png',
  },
}

const LOAD_CONFIG = 'LOAD_CONFIG'
const UPDATE_SECTION = 'UPDATE_SECTION'
const UPDATE_HEADER = 'UPDATE_HEADER'
const UPDATE_FOOTER = 'UPDATE_FOOTER'
const UPDATE_META = 'UPDATE_META'
const UPDATE_THEME = 'UPDATE_THEME'

function configReducer(state, action) {
  switch (action.type) {
    case LOAD_CONFIG:
      return { ...state, ...action.payload }
    case UPDATE_SECTION:
      return {
        ...state,
        [action.section]: { ...state[action.section], ...action.payload },
      }
    case UPDATE_HEADER:
      return { ...state, header: { ...state.header, ...action.payload } }
    case UPDATE_FOOTER:
      return { ...state, footer: { ...state.footer, ...action.payload } }
    case UPDATE_META:
      return { ...state, meta: { ...state.meta, ...action.payload } }
    case UPDATE_THEME:
      return { ...state, themeOverrides: { ...state.themeOverrides, ...action.payload } }
    default:
      return state
  }
}

const SiteConfigContext = createContext(null)

export function SiteConfigProvider({ children }) {
  const [config, dispatch] = useReducer(configReducer, initialConfig)
  const [loading, setLoading] = useState(true)

  // Load from backend on mount
  useEffect(() => {
    apiGet('/api/site-config')
      .then((res) => {
        if (res?.config) dispatch({ type: LOAD_CONFIG, payload: res.config })
      })
      .catch(() => {
        // Fallback: try localStorage
        try {
          const saved = localStorage.getItem('__designer_site_config')
          if (saved) dispatch({ type: LOAD_CONFIG, payload: JSON.parse(saved) })
        } catch {}
      })
      .finally(() => setLoading(false))
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('__designer_site_config', JSON.stringify(config))
    } catch {}
  }, [config])

  const updateSection = useCallback((section, payload) => {
    dispatch({ type: UPDATE_SECTION, section, payload })
  }, [])

  const updateHeader = useCallback((payload) => {
    dispatch({ type: UPDATE_HEADER, payload })
  }, [])

  const updateFooter = useCallback((payload) => {
    dispatch({ type: UPDATE_FOOTER, payload })
  }, [])

  const updateMeta = useCallback((payload) => {
    dispatch({ type: UPDATE_META, payload })
  }, [])

  const updateTheme = useCallback((payload) => {
    dispatch({ type: UPDATE_THEME, payload })
  }, [])

  const saveToBackend = useCallback(async () => {
    await apiPost('/api/site-config', { config })
  }, [config])

  const value = {
    config,
    loading,
    updateSection,
    updateHeader,
    updateFooter,
    updateMeta,
    updateTheme,
    saveToBackend,
  }

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext)
  if (!ctx) throw new Error('useSiteConfig must be used inside SiteConfigProvider')
  return ctx
}

export default SiteConfigContext
