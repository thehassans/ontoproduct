import React, { useState, useEffect } from 'react'
import { apiGet, apiPut } from '../../api'

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage', color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourprofile', color: '#E4405F' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/1234567890', color: '#25D366' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/yourhandle', color: '#000' },
  { key: 'pinterest', label: 'Pinterest', placeholder: 'https://pinterest.com/yourprofile', color: '#E60023' },
]

export default function SocialLinks() {
  const [links, setLinks] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet('/api/settings/public/social-links')
        if (res?.links) setLinks(res.links)
      } catch {}
      setLoading(false)
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const res = await apiPut('/api/settings/social-links', links)
      if (res?.success) {
        setMsg('Social links saved successfully!')
        if (res.links) setLinks(res.links)
      } else {
        setMsg('Failed to save')
      }
    } catch (e) {
      setMsg(e?.message || 'Error saving')
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
        Social Media Links
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
        Add your social media URLs below. They will appear as icons in the website footer.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {PLATFORMS.map(({ key, label, placeholder, color }) => (
          <div key={key}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              color: '#374151',
              marginBottom: 6,
            }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
                flexShrink: 0,
              }} />
              {label}
            </label>
            <input
              type="url"
              value={links[key] || ''}
              onChange={e => setLinks(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                borderRadius: 10,
                border: '1.5px solid #e5e7eb',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#f9fafb',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#f97316' }}
              onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 28px',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #111827, #1f2937)',
            border: 'none',
            borderRadius: 10,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {saving ? 'Saving...' : 'Save Links'}
        </button>
        {msg && (
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: msg.includes('success') ? '#16a34a' : '#ef4444',
          }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
