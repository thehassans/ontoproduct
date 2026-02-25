import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'
import './styles/responsive.css'
import 'react-phone-number-input/style.css'
import saudiRiyalRegularWoff2Url from '@emran-alhaddad/saudi-riyal-font/fonts/regular/saudi_riyal.woff2?url'
import saudiRiyalRegularWoffUrl from '@emran-alhaddad/saudi-riyal-font/fonts/regular/saudi_riyal.woff?url'
import saudiRiyalBoldWoff2Url from '@emran-alhaddad/saudi-riyal-font/fonts/bold/saudi_riyal.woff2?url'
import saudiRiyalBoldWoffUrl from '@emran-alhaddad/saudi-riyal-font/fonts/bold/saudi_riyal.woff?url'
import { COUNTRY_LIST } from './utils/constants'
import { bootstrapBranding } from './util/branding.js'
import { ToastProvider } from './ui/Toast.jsx'
import { ShopifyAppBridgeProvider } from './components/ShopifyAppBridge.jsx'

// FIX: Make COUNTRY_LIST global to prevent ReferenceError in components
// that use it without importing it.
if (typeof window !== 'undefined') {
  window.COUNTRY_LIST = COUNTRY_LIST
}

if (typeof document !== 'undefined') {
  const styleId = 'saudi-riyal-symbol-font'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `@font-face{font-family:'SaudiRiyalSymbol';src:url('${saudiRiyalRegularWoff2Url}') format('woff2'),url('${saudiRiyalRegularWoffUrl}') format('woff');font-weight:400;font-style:normal;font-display:swap;unicode-range:U+20C1;}@font-face{font-family:'SaudiRiyalSymbol';src:url('${saudiRiyalBoldWoff2Url}') format('woff2'),url('${saudiRiyalBoldWoffUrl}') format('woff');font-weight:700;font-style:normal;font-display:swap;unicode-range:U+20C1;}`
    document.head.appendChild(style)
  }
}

// Root error boundary
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Root Error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px',
          background: '#0f172a',
          color: '#fff'
        }}>
          <div style={{ maxWidth: '600px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</h1>
            <h2 style={{ marginBottom: '10px' }}>Application Error</h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <ShopifyAppBridgeProvider apiKey="076a19e7291e002e51535256e2de28b3">
          <BrowserRouter>
            <ToastProvider>
              <App />
            </ToastProvider>
          </BrowserRouter>
        </ShopifyAppBridgeProvider>
      </RootErrorBoundary>
    </React.StrictMode>
  )
} else {
  console.error('Root element not found')
}

// PWA: register service worker (production only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(reg => {
        console.log('[PWA] Service worker registered')
        // Check for updates every 5 minutes
        setInterval(() => {
          reg.update().catch(() => {})
        }, 5 * 60 * 1000)
      })
      .catch(err => console.error('[PWA] Service worker registration failed:', err))
  })
  
  // Listen for service worker updates (no auto-reload: would clear in-progress cart actions)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[PWA] New service worker activated')
  })
}

// Apply backend branding to <head>
bootstrapBranding()
