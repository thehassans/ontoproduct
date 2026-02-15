import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { setTokenGetter } from '../api'

/**
 * Shopify App Bridge Context
 * Provides App Bridge instance and session token utilities for embedded Shopify apps
 */
const ShopifyAppBridgeContext = createContext(null)

/**
 * Hook to access App Bridge context
 */
export function useShopifyAppBridge() {
  return useContext(ShopifyAppBridgeContext)
}

/**
 * Check if running embedded in Shopify admin
 */
export function isEmbedded() {
  try {
    // Check if we're in an iframe
    if (window.self === window.top) return false
    
    // Check for Shopify URL patterns
    const ancestorOrigins = window.location.ancestorOrigins
    if (ancestorOrigins && ancestorOrigins.length > 0) {
      return ancestorOrigins[0]?.includes('shopify.com') || ancestorOrigins[0]?.includes('myshopify.com')
    }
    
    // Check URL params that indicate Shopify embedding
    const params = new URLSearchParams(window.location.search)
    return !!(params.get('host') || params.get('shop'))
  } catch {
    return false
  }
}

/**
 * Get shop and host from URL
 */
function getShopifyParams() {
  const params = new URLSearchParams(window.location.search)
  const shop = params.get('shop')
  const host = params.get('host')
  return { shop, host }
}

/**
 * ShopifyAppBridge Provider Component
 * Wraps your app to provide App Bridge functionality
 */
export function ShopifyAppBridgeProvider({ children, apiKey }) {
  const [appBridge, setAppBridge] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [embedded, setEmbedded] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (!isEmbedded()) {
      setEmbedded(false)
      setIsReady(true)
      return
    }
    
    setEmbedded(true)
    
    // Initialize App Bridge
    const initAppBridge = async () => {
      try {
        const { shop, host } = getShopifyParams()
        
        // Check if we have required params before attempting initialization
        if (!shop) {
          console.warn('Missing shop parameter - App Bridge initialization skipped')
          setEmbedded(false)
          setIsReady(true)
          return
        }

        // Load App Bridge script dynamically if not already loaded
        if (!window.shopify && !document.querySelector('script[src*="app-bridge"]')) {
          const script = document.createElement('script')
          script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js'
          script.async = true
          
          // Set data attributes for App Bridge v4 config
          if (shop) {
            script.setAttribute('data-api-key', apiKey || '076a19e7291e002e51535256e2de28b3')
            script.setAttribute('data-shop', shop)
            if (host) {
              script.setAttribute('data-host', host)
            }
          }
          
          await new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
          
          // Wait a bit for App Bridge to initialize
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        // App Bridge 4 auto-initializes via the script tag
        if (window.shopify && !window.shopify.createApp) {
          // v4 is already initialized
          setAppBridge(window.shopify)
          console.log('Shopify App Bridge (v4) initialized', { shop, host })
          setIsReady(true)
          return
        }

        if (!host) {
          console.warn('Missing host parameter for App Bridge - limited functionality')
          setIsReady(true)
          return
        }
        
        // Fallback for older App Bridge (v3) if v4 not available
        if (window.shopify && window.shopify.createApp) {
          const config = {
            apiKey: apiKey || '076a19e7291e002e51535256e2de28b3',
            host: host,
            shop: shop
          }
          
          const app = window.shopify.createApp(config)
          setAppBridge(app)
          console.log('Shopify App Bridge (v3) initialized', { shop, host })
        } else if (typeof window['app-bridge'] !== 'undefined') {
          // Older App Bridge format
          const createApp = window['app-bridge'].createApp
          const config = {
            apiKey: apiKey || '076a19e7291e002e51535256e2de28b3',
            host: host,
            shop: shop
          }
          
          const app = createApp(config)
          setAppBridge(app)
          console.log('Shopify App Bridge (legacy) initialized', { shop, host })
        } else {
          console.warn('Shopify App Bridge not available')
        }
        
        setIsReady(true)
      } catch (err) {
        console.error('Failed to initialize App Bridge:', err)
        setError(err.message)
        setIsReady(true)
      }
    }
    
    // Initialize immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAppBridge)
    } else {
      initAppBridge()
    }
    
    return () => {
      document.removeEventListener('DOMContentLoaded', initAppBridge)
    }
  }, [apiKey])
  
  /**
   * Get session token from App Bridge
   * Uses session tokens for authenticated API calls
   */
  const getSessionToken = useCallback(async () => {
    if (!appBridge) return null
    
    try {
      // Modern App Bridge (3.x+)
      if (appBridge.idToken) {
        return await appBridge.idToken()
      }
      
      // App Bridge 2.x
      if (appBridge.getSessionToken) {
        const token = await appBridge.getSessionToken()
        return token
      }
      
      // Legacy session token utils
      const sessionToken = await window.shopify?.idToken?.()
      return sessionToken
    } catch (err) {
      console.error('Failed to get session token:', err)
      return null
    }
  }, [appBridge])

  // Register token getter with API module when App Bridge is ready
  useEffect(() => {
    if (embedded && appBridge) {
      setTokenGetter(getSessionToken)
      console.log('Registered Shopify session token getter')
    }
  }, [embedded, appBridge, getSessionToken])
  
  /**
   * Make authenticated API call using session token
   */
  const authenticatedFetch = async (url, options = {}) => {
    const token = await getSessionToken()
    
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json'
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    return fetch(url, {
      ...options,
      headers
    })
  }
  
  const value = {
    appBridge,
    isEmbedded: embedded,
    isReady,
    error,
    getSessionToken,
    authenticatedFetch
  }
  
  return (
    <ShopifyAppBridgeContext.Provider value={value}>
      {children}
    </ShopifyAppBridgeContext.Provider>
  )
}

export default ShopifyAppBridgeProvider
