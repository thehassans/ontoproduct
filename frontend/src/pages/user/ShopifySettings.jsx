import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api'

export default function ShopifySettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(null)
  const [connectedStores, setConnectedStores] = useState([])
  const [msg, setMsg] = useState({ text: '', type: '' })
  
  // App configuration form (admin sets this once)
  const [form, setForm] = useState({
    clientId: '',
    clientSecret: '',
    scopes: 'read_products,write_products,read_inventory,write_inventory,read_locations,read_orders,write_orders'
  })
  
  useEffect(() => {
    loadSettings()
    loadConnectedStores()
  }, [])
  
  async function loadSettings() {
    try {
      const data = await apiGet('/api/settings/shopify/app-config')
      setSettings(data)
      if (data.clientId) {
        setForm(f => ({ 
          ...f, 
          clientId: data.clientId || '',
          scopes: data.scopes || f.scopes
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadConnectedStores() {
    try {
      const data = await apiGet('/api/settings/shopify/connected-stores')
      setConnectedStores(data.stores || [])
    } catch (err) {
      console.error(err)
    }
  }
  
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMsg({ text: '', type: '' })
    
    try {
      const response = await apiPost('/api/settings/shopify/app-config', form)
      setMsg({ text: response.message || 'App configuration saved!', type: 'success' })
      await loadSettings()
      // Clear secret after save (don't show it again)
      setForm(f => ({ ...f, clientSecret: '' }))
    } catch (err) {
      setMsg({ text: err.message || 'Failed to save configuration', type: 'error' })
    } finally {
      setSaving(false)
    }
  }
  
  const [testing, setTesting] = useState(false)
  
  async function handleTest() {
    setTesting(true)
    setMsg({ text: '', type: '' })
    
    try {
      const response = await apiPost('/api/settings/shopify/test-config', form)
      if (response.success) {
        setMsg({ text: '✅ Configuration is valid! Shopify API connection successful.', type: 'success' })
      } else {
        setMsg({ text: '❌ ' + (response.error || 'Configuration test failed'), type: 'error' })
      }
    } catch (err) {
      setMsg({ text: '❌ Test failed: ' + (err.message || 'Unknown error'), type: 'error' })
    } finally {
      setTesting(false)
    }
  }
  
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: 400, color: 'var(--ds-text-secondary)' }}>
        <div className="spinner" style={{ border: '3px solid var(--ds-border)', borderTopColor: 'var(--ds-accent)' }} />
      </div>
    )
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: 'var(--ds-text-primary)' }}>
          Shopify App Configuration
        </h1>
        <p style={{ color: 'var(--ds-text-secondary)', marginTop: 8, fontSize: 16 }}>
          Configure your Shopify app credentials. Dropshippers will use these to connect their stores.
        </p>
      </div>
      
      {/* App Status */}
      <div style={{
        padding: 24,
        background: settings?.configured 
          ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))' 
          : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.05))',
        border: `1px solid ${settings?.configured ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: settings?.configured ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 24
        }}>
          {settings?.configured ? '✓' : '⚠'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
            {settings?.configured ? 'App Configured' : 'App Not Configured'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ds-text-secondary)', marginTop: 4 }}>
            {settings?.configured 
              ? `Client ID: ${settings.clientId?.slice(0, 10)}... • ${connectedStores.length} store(s) connected`
              : 'Enter your Shopify app credentials to enable dropshipper connections'
            }
          </div>
        </div>
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
      
      {/* App Credentials Form */}
      <form onSubmit={handleSave} style={{
        background: 'var(--ds-panel)',
        border: '1px solid var(--ds-border)',
        borderRadius: 16,
        padding: 32
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
          Shopify App Credentials
        </h3>
        
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-secondary)', marginBottom: 8 }}>
              Client ID (API Key) *
            </label>
            <input
              type="text"
              required
              value={form.clientId}
              onChange={e => setForm({ ...form, clientId: e.target.value })}
              placeholder="076a19e7291e002e51535256e2de28b3"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--ds-border)',
                borderRadius: 12,
                background: 'var(--ds-glass)',
                color: 'var(--ds-text-primary)',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', marginTop: 6 }}>
              Found in Shopify Partners → Apps → Your App → Settings → Client credentials
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-secondary)', marginBottom: 8 }}>
              Client Secret *
            </label>
            <input
              type="password"
              required={!settings?.configured}
              value={form.clientSecret}
              onChange={e => setForm({ ...form, clientSecret: e.target.value })}
              placeholder={settings?.configured ? '•••••••••••••••••••••••' : 'Enter Client Secret'}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--ds-border)',
                borderRadius: 12,
                background: 'var(--ds-glass)',
                color: 'var(--ds-text-primary)',
                fontSize: 14,
                outline: 'none'
              }}
            />
            <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', marginTop: 6 }}>
              {settings?.configured ? 'Leave blank to keep existing secret' : 'Found next to Client ID in Shopify Partners'}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-secondary)', marginBottom: 8 }}>
              OAuth Scopes
            </label>
            <input
              type="text"
              value={form.scopes}
              onChange={e => setForm({ ...form, scopes: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--ds-border)',
                borderRadius: 12,
                background: 'var(--ds-glass)',
                color: 'var(--ds-text-primary)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', marginTop: 6 }}>
              Comma-separated list of scopes required for product sync
            </div>
          </div>
          
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '14px 28px',
              border: 'none',
              borderRadius: 12,
              background: saving ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              fontWeight: 600,
              fontSize: 15,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
              transition: '0.2s',
              width: 'fit-content'
            }}
          >
            {saving ? 'Saving...' : settings?.configured ? 'Update Configuration' : 'Save Configuration'}
          </button>
          
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !form.clientId}
            style={{
              padding: '14px 28px',
              border: '1px solid var(--ds-border)',
              borderRadius: 12,
              background: testing ? '#94a3b8' : 'var(--ds-glass)',
              color: 'var(--ds-text-primary)',
              fontWeight: 600,
              fontSize: 15,
              cursor: (testing || !form.clientId) ? 'not-allowed' : 'pointer',
              transition: '0.2s',
              width: 'fit-content'
            }}
          >
            {testing ? 'Testing...' : '🔍 Test Configuration'}
          </button>
        </div>
      </form>
      
      {/* OAuth URLs Info */}
      <div style={{
        background: 'var(--ds-panel)',
        border: '1px solid var(--ds-border)',
        borderRadius: 16,
        padding: 32
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
          📋 Shopify App Setup
        </h3>
        <p style={{ color: 'var(--ds-text-secondary)', marginBottom: 16, fontSize: 14 }}>
          Configure these URLs in your Shopify Partners app settings:
        </p>
        
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--ds-glass)', padding: 16, borderRadius: 12, border: '1px solid var(--ds-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-secondary)', marginBottom: 6 }}>App URL</div>
            <code style={{ fontSize: 13, color: 'var(--ds-accent)', fontFamily: 'monospace' }}>
              https://buysial.com/api/shopify/install
            </code>
          </div>
          
          <div style={{ background: 'var(--ds-glass)', padding: 16, borderRadius: 12, border: '1px solid var(--ds-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-secondary)', marginBottom: 6 }}>Redirect URL</div>
            <code style={{ fontSize: 13, color: 'var(--ds-accent)', fontFamily: 'monospace' }}>
              https://buysial.com/api/shopify/callback
            </code>
          </div>
        </div>
      </div>
      
      {/* Connected Stores */}
      {connectedStores.length > 0 && (
        <div style={{
          background: 'var(--ds-panel)',
          border: '1px solid var(--ds-border)',
          borderRadius: 16,
          overflow: 'hidden'
        }}>
          <div style={{ padding: 24, borderBottom: '1px solid var(--ds-border)' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
              Connected Stores ({connectedStores.length})
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ds-glass)', borderBottom: '1px solid var(--ds-border)' }}>
                  <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-secondary)', textTransform: 'uppercase' }}>Store</th>
                  <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-secondary)', textTransform: 'uppercase' }}>Dropshipper</th>
                  <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-secondary)', textTransform: 'uppercase' }}>Products Listed</th>
                  <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-secondary)', textTransform: 'uppercase' }}>Connected</th>
                </tr>
              </thead>
              <tbody>
                {connectedStores.map(s => (
                  <tr key={s._id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                    <td style={{ padding: 16, fontSize: 14, fontWeight: 600, color: 'var(--ds-text-primary)' }}>
                      {s.shopDomain}
                    </td>
                    <td style={{ padding: 16, fontSize: 14, color: 'var(--ds-text-secondary)' }}>
                      {s.dropshipperName || s.dropshipperId}
                    </td>
                    <td style={{ padding: 16, fontSize: 14, color: 'var(--ds-text-secondary)' }}>
                      {s.productsListed || 0}
                    </td>
                    <td style={{ padding: 16, fontSize: 13, color: 'var(--ds-text-secondary)' }}>
                      {new Date(s.connectedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* How it Works */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16,
        padding: 32
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
          🔄 How it Works (CJ Dropshipping Style)
        </h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--ds-text-secondary)', lineHeight: 2, fontSize: 14 }}>
          <li><strong>You configure</strong> the Shopify app credentials above (one time)</li>
          <li><strong>Dropshippers</strong> go to their panel and click "Connect Shopify"</li>
          <li>They're redirected to Shopify to authorize your app</li>
          <li>After approval, they can <strong>"Push to Shopify"</strong> any product</li>
          <li>Products appear on their Shopify store with their custom pricing</li>
        </ol>
      </div>
    </div>
  )
}
