import React, { useEffect, useState } from 'react'
import { apiGet, apiDelete } from '../../api'
import { useLocation, useNavigate } from 'react-router-dom'
import { useShopifyAppBridge, isEmbedded } from '../../components/ShopifyAppBridge'

export default function ShopifyConnect() {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [store, setStore] = useState(null)
  const [appConfigured, setAppConfigured] = useState(false)
  const [shopDomain, setShopDomain] = useState('')
  const [msg, setMsg] = useState({ text: '', type: '' })
  
  // App Bridge for embedded Shopify apps
  const appBridge = useShopifyAppBridge()
  const embedded = isEmbedded()
  
  const location = useLocation()
  const navigate = useNavigate()
  
  useEffect(() => {
    // Check if returning from OAuth success
    const params = new URLSearchParams(location.search)
    if (params.get('success') === 'true') {
      setMsg({ text: '🎉 Shopify store connected successfully!', type: 'success' })
      // Clear the URL params
      navigate('/dropshipper/shopify-connect', { replace: true })
    }
    
    loadData()
  }, [])
  
  async function loadData() {
    try {
      // Check if Shopify is configured by admin
      const status = await apiGet('/api/shopify/status')
      setAppConfigured(status.configured)
      
      // Get connected store
      const storeData = await apiGet('/api/shopify/my-store')
      setStore(storeData.connected ? storeData : null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  async function handleConnect(e) {
    e.preventDefault()
    
    if (!shopDomain.trim()) {
      setMsg({ text: 'Please enter your Shopify store domain', type: 'error' })
      return
    }
    
    setConnecting(true)
    setMsg({ text: '', type: '' })
    
    try {
      const response = await apiGet(`/api/shopify/connect-url?shop=${encodeURIComponent(shopDomain)}`)
      
      if (response.url) {
        // Redirect to Shopify OAuth
        window.location.href = response.url
      } else {
        setMsg({ text: response.error || 'Failed to start connection', type: 'error' })
      }
    } catch (err) {
      setMsg({ text: err.message || 'Failed to connect', type: 'error' })
      setConnecting(false)
    }
  }
  
  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect your Shopify store?')) return
    
    try {
      await apiDelete('/api/shopify/disconnect')
      setStore(null)
      setMsg({ text: 'Store disconnected successfully', type: 'success' })
    } catch (err) {
      setMsg({ text: err.message || 'Failed to disconnect', type: 'error' })
    }
  }
  
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: 400, color: 'var(--ds-text-secondary)' }}>
        <div className="spinner" style={{ border: '3px solid var(--ds-border)', borderTopColor: 'var(--ds-accent)' }} />
      </div>
    )
  }
  
  // App not configured by admin
  if (!appConfigured) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: 'var(--ds-text-primary)' }}>
            Connect Shopify Store
          </h1>
        </div>
        
        <div style={{
          padding: 32,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.05))',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 16,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
            Shopify Integration Not Available
          </h2>
          <p style={{ color: 'var(--ds-text-secondary)', margin: 0, fontSize: 15 }}>
            The admin has not configured Shopify integration yet. Please contact support.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: 'var(--ds-text-primary)' }}>
          Connect Shopify Store
        </h1>
        <p style={{ color: 'var(--ds-text-secondary)', marginTop: 8, fontSize: 16 }}>
          Connect your Shopify store to push products with one click
        </p>
      </div>
      
      {/* Message */}
      {msg.text && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: msg.type === 'success' ? '#10b981' : '#ef4444',
          fontWeight: 500
        }}>
          {msg.text}
        </div>
      )}
      
      {/* Connected Store */}
      {store ? (
        <div style={{
          background: 'var(--ds-panel)',
          border: '1px solid var(--ds-border)',
          borderRadius: 16,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))',
            borderBottom: '1px solid rgba(16,185,129,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(16,185,129,0.15)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 28
            }}>
              ✓
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
                Store Connected
              </div>
              <div style={{ fontSize: 14, color: 'var(--ds-text-secondary)', marginTop: 4 }}>
                {store.shopDomain}
              </div>
            </div>
          </div>
          
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'var(--ds-glass)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ds-accent)' }}>{store.productsListed || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', marginTop: 4 }}>Products Listed</div>
              </div>
              <div style={{ background: 'var(--ds-glass)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-primary)' }}>
                  {store.connectedAt ? new Date(store.connectedAt).toLocaleDateString() : 'N/A'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', marginTop: 4 }}>Connected Since</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/dropshipper/products')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                }}
              >
                📦 Go to Products
              </button>
              <button
                onClick={handleDisconnect}
                style={{
                  padding: '12px 24px',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 12,
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Disconnect Store
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Connect Form */
        <form onSubmit={handleConnect} style={{
          background: 'var(--ds-panel)',
          border: '1px solid var(--ds-border)',
          borderRadius: 16,
          padding: 32
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 20, 
              background: 'linear-gradient(135deg, #95bf47, #5e8e3e)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              fontSize: 36
            }}>
              🛒
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
              Connect Your Shopify Store
            </h2>
            <p style={{ color: 'var(--ds-text-secondary)', margin: 0, fontSize: 14 }}>
              Enter your store domain to start the connection
            </p>
          </div>
          
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-secondary)', marginBottom: 8 }}>
              Shopify Store Domain
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={shopDomain}
                onChange={e => setShopDomain(e.target.value)}
                placeholder="yourstore"
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 12,
                  background: 'var(--ds-glass)',
                  color: 'var(--ds-text-primary)',
                  fontSize: 15,
                  outline: 'none'
                }}
              />
              <span style={{ 
                padding: '14px 16px', 
                background: 'var(--ds-glass)', 
                border: '1px solid var(--ds-border)',
                borderRadius: 12,
                color: 'var(--ds-text-secondary)',
                fontSize: 14,
                fontWeight: 500
              }}>
                .myshopify.com
              </span>
            </div>
            
            <button
              type="submit"
              disabled={connecting}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '16px 24px',
                border: 'none',
                borderRadius: 12,
                background: connecting ? '#94a3b8' : 'linear-gradient(135deg, #95bf47, #5e8e3e)',
                color: 'white',
                fontWeight: 700,
                fontSize: 16,
                cursor: connecting ? 'not-allowed' : 'pointer',
                boxShadow: connecting ? 'none' : '0 4px 16px rgba(149,191,71,0.3)',
                transition: '0.2s'
              }}
            >
              {connecting ? 'Connecting...' : '🔗 Connect to Shopify'}
            </button>
          </div>
        </form>
      )}
      
      {/* How it Works */}
      {!store && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 16,
          padding: 32
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
            📋 How it Works
          </h3>
          <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--ds-text-secondary)', lineHeight: 2, fontSize: 14 }}>
            <li>Enter your Shopify store name above</li>
            <li>Click "Connect to Shopify" to authorize</li>
            <li>Approve the app permissions in Shopify</li>
            <li>You'll be redirected back here once connected</li>
            <li>Go to Products and click "Push to Shopify" on any product!</li>
          </ol>
        </div>
      )}
    </div>
  )
}
