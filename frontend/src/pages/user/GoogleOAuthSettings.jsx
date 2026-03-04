import React, { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api'
import { useToast } from '../../ui/Toast'

export default function GoogleOAuthSettings() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await apiGet('/api/settings/google-oauth')
      if (res?.clientId) setClientId(res.clientId)
    } catch (err) {
      console.error('Failed to load Google OAuth settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await apiPost('/api/settings/google-oauth', { clientId })
      toast.success('Google OAuth settings saved!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Google OAuth</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Configure Google Sign-In for customer login</p>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        border: '1px solid #e5e7eb',
        padding: 24,
        marginBottom: 24
      }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: 8, 
            fontWeight: 600, 
            color: '#374151',
            fontSize: 14
          }}>
            Google Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="xxxxxxxxxx.apps.googleusercontent.com"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
            }}
          />
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Get this from Google Cloud Console → APIs & Services → Credentials
          </p>
        </div>

        <div style={{ 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0',
          borderRadius: 8, 
          padding: 16,
          marginBottom: 20
        }}>
          <h4 style={{ margin: '0 0 8px', color: '#166534', fontSize: 14, fontWeight: 600 }}>
            Setup Instructions
          </h4>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#166534', fontSize: 13 }}>
            <li style={{ marginBottom: 4 }}>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', textDecoration: 'underline' }}>Google Cloud Console</a></li>
            <li style={{ marginBottom: 4 }}>Create a new OAuth 2.0 Client ID (Web application)</li>
            <li style={{ marginBottom: 4 }}>Add your domain to Authorized JavaScript origins</li>
            <li style={{ marginBottom: 4 }}>Add your domain/customer/login to Authorized redirect URIs</li>
            <li>Copy the Client ID and paste it above</li>
          </ol>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 24px',
            background: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {clientId && (
        <div style={{ 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe',
          borderRadius: 8, 
          padding: 16
        }}>
          <p style={{ margin: 0, color: '#1e40af', fontSize: 14 }}>
            ✓ Google Sign-In is configured. Customers will see "Continue with Google" on the login page.
          </p>
        </div>
      )}
    </div>
  )
}
