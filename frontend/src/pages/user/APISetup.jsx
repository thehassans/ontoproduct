import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api'

export default function UserAPISetup() {
  const [form, setForm] = useState({
    geminiApiKey: '',
    googleMapsApiKey: '',
    locationIQApiKey: '',
    geminiDescModel: 'gemini-2.5-flash',
  })
  const [fb, setFb] = useState({ accessToken: '', appId: '' })
  const [googleOAuth, setGoogleOAuth] = useState({ clientId: '' })
  const [savingGoogleOAuth, setSavingGoogleOAuth] = useState(false)
  const [googleOAuthStatus, setGoogleOAuthStatus] = useState(null)
  const [googleOAuthMsg, setGoogleOAuthMsg] = useState('')
  const [gscKeyJson, setGscKeyJson] = useState('')
  const [gscStatus, setGscStatus] = useState(null) // null | 'active' | 'inactive'
  const [gscClientEmail, setGscClientEmail] = useState('')
  const [savingGsc, setSavingGsc] = useState(false)
  const [gscMsg, setGscMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingMaps, setSavingMaps] = useState(false)
  const [savingLocationIQ, setSavingLocationIQ] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testingMaps, setTestingMaps] = useState(false)
  const [testingLocationIQ, setTestingLocationIQ] = useState(false)
  const [msg, setMsg] = useState('')
  const [tests, setTests] = useState(null)
  const [mapsMsg, setMapsMsg] = useState('')
  const [mapsStatus, setMapsStatus] = useState(null) // 'active', 'inactive', null
  const [locMsg, setLocMsg] = useState('')
  const [locStatus, setLocStatus] = useState(null) // 'active' | 'inactive' | null
  const [fbMsg, setFbMsg] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await apiGet('/api/settings/ai')
        if (!alive) return
        setForm((f) => ({
          ...f,
          // Server masks keys; we don't show full values
          geminiApiKey: r.geminiApiKey || '',
          googleMapsApiKey: r.googleMapsApiKey || '',
          locationIQApiKey: r.locationIQApiKey || '',
          geminiDescModel: r.geminiDescModel || 'gemini-2.5-flash',
        }))
        // Set Maps status indicator - check for any truthy masked value
        if (r.googleMapsApiKey && r.googleMapsApiKey.length > 0) {
          setMapsStatus('active')
        } else {
          setMapsStatus('inactive')
        }
        if (r.locationIQApiKey && r.locationIQApiKey.length > 0) {
          setLocStatus('active')
        } else {
          setLocStatus('inactive')
        }
        setMsg('')
      } catch (e) {
        if (!alive) return
        setMsg(e?.message || 'Failed to load settings')
      }
      try {
        const fbRes = await apiGet('/api/settings/facebook')
        if (!alive) return
        setFb((f) => ({
          accessToken: fbRes?.accessToken || localStorage.getItem('fb_access_token') || '',
          appId: fbRes?.appId || localStorage.getItem('fb_app_id') || '',
        }))
      } catch {
        if (!alive)
          setFb((f) => ({
            accessToken: localStorage.getItem('fb_access_token') || '',
            appId: localStorage.getItem('fb_app_id') || '',
          }))
      }
      // Load Google OAuth settings
      try {
        const googleRes = await apiGet('/api/settings/google-oauth')
        if (!alive) return
        if (googleRes?.clientId) {
          setGoogleOAuth({ clientId: googleRes.clientId })
          setGoogleOAuthStatus('active')
        } else {
          setGoogleOAuthStatus('inactive')
        }
      } catch {
        setGoogleOAuthStatus('inactive')
      }
      // Load GSC service account key status
      try {
        const gscRes = await apiGet('/api/settings/gsc-key')
        if (!alive) return
        if (gscRes?.configured) {
          setGscStatus('active')
          setGscClientEmail(gscRes.clientEmail || '')
        } else {
          setGscStatus('inactive')
        }
      } catch {
        setGscStatus('inactive')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function onSave(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const body = {}
      if (form.geminiApiKey && !form.geminiApiKey.includes('••••'))
        body.geminiApiKey = form.geminiApiKey
      body.geminiDescModel = form.geminiDescModel || 'gemini-2.5-flash'
      const res = await apiPost('/api/settings/ai', body)
      if (res?.success) {
        setMsg('AI settings saved')
        setTimeout(() => setMsg(''), 1500)
      } else setMsg(res?.error || 'Failed to save')
    } catch (err) {
      setMsg(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveMaps(e) {
    e.preventDefault()
    setSavingMaps(true)
    setMapsMsg('')
    try {
      const body = {}
      if (form.googleMapsApiKey && !form.googleMapsApiKey.includes('••••'))
        body.googleMapsApiKey = form.googleMapsApiKey
      const res = await apiPost('/api/settings/ai', body)
      if (res?.success) {
        setMapsMsg('Google Maps API key saved successfully')
        setMapsStatus('active')
        setTimeout(() => setMapsMsg(''), 2000)
      } else {
        setMapsMsg(res?.error || 'Failed to save')
      }
    } catch (err) {
      setMapsMsg(err?.message || 'Failed to save')
    } finally {
      setSavingMaps(false)
    }
  }

  async function onSaveLocationIQ(e) {
    e.preventDefault()
    setSavingLocationIQ(true)
    setLocMsg('')
    try {
      const body = {}
      if (form.locationIQApiKey && !form.locationIQApiKey.includes('••••'))
        body.locationIQApiKey = form.locationIQApiKey
      const res = await apiPost('/api/settings/ai', body)
      if (res?.success) {
        setLocMsg('✅ LocationIQ API key saved successfully')
        setLocStatus('active')
        setTimeout(() => setLocMsg(''), 2000)
      } else {
        setLocMsg(res?.error || 'Failed to save')
      }
    } catch (err) {
      setLocMsg(err?.message || 'Failed to save')
    } finally {
      setSavingLocationIQ(false)
    }
  }

  async function testLocationIQ() {
    setTestingLocationIQ(true)
    setLocMsg('Testing LocationIQ API…')
    try {
      const apiKey = form.locationIQApiKey
      if (!apiKey || apiKey.includes('••••')) {
        setLocMsg('Please enter a valid API key first')
        setTestingLocationIQ(false)
        setTimeout(() => setLocMsg(''), 2500)
        return
      }

      // Test with a simple reverse geocode request
      const testLat = 25.2048
      const testLng = 55.2708
      const url = `https://us1.locationiq.com/v1/reverse?key=${encodeURIComponent(apiKey)}&lat=${testLat}&lon=${testLng}&format=json`
      const r = await fetch(url)

      if (r.ok) {
        const data = await r.json()
        if (data.display_name) {
          setLocMsg('✅ LocationIQ API Connection Successful')
        } else {
          setLocMsg('❌ API response invalid')
        }
      } else {
        const errData = await r.json().catch(() => ({}))
        setLocMsg(`❌ Test failed: ${errData.error || r.statusText}`)
      }
    } catch (err) {
      setLocMsg('❌ LocationIQ API test failed')
    } finally {
      setTestingLocationIQ(false)
      setTimeout(() => setLocMsg(''), 4000)
    }
  }

  async function onTest() {
    setTesting(true)
    setMsg('')
    setTests(null)
    try {
      const body = {
        geminiDescModel: form.geminiDescModel || 'gemini-2.5-flash'
      }
      if (form.geminiApiKey && !form.geminiApiKey.includes('••••'))
        body.geminiApiKey = form.geminiApiKey
      if (form.googleMapsApiKey && !form.googleMapsApiKey.includes('••••'))
        body.googleMapsApiKey = form.googleMapsApiKey
      const res = await apiPost('/api/settings/ai/test', body)
      setTests(res?.tests || null)
      if (res?.success) {
        setMsg('Connection test completed')
      } else setMsg(res?.error || 'Test failed')
    } catch (err) {
      setMsg(err?.message || 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  async function saveFacebook(e) {
    e.preventDefault()
    setFbMsg('')
    try {
      const res = await apiPost('/api/settings/facebook', {
        accessToken: fb.accessToken,
        appId: fb.appId,
      })
      if (res?.success) {
        setFbMsg('Facebook settings saved')
      } else throw new Error(res?.error || 'Failed to save on server')
    } catch (err) {
      // Fallback to localStorage when server endpoint not available
      try {
        localStorage.setItem('fb_access_token', fb.accessToken || '')
      } catch {}
      try {
        localStorage.setItem('fb_app_id', fb.appId || '')
      } catch {}
      setFbMsg('Saved locally (server endpoint unavailable)')
    } finally {
      setTimeout(() => setFbMsg(''), 2000)
    }
  }

  async function testFacebook() {
    setFbMsg('Testing Facebook API…')
    try {
      const url = `https://graph.facebook.com/v17.0/me?access_token=${encodeURIComponent(fb.accessToken || '')}`
      const r = await fetch(url)
      if (r.ok) {
        setFbMsg('Facebook API Connection Successful')
      } else {
        setFbMsg('Facebook API test failed')
      }
    } catch {
      setFbMsg('Facebook API test failed')
    } finally {
      setTimeout(() => setFbMsg(''), 2500)
    }
  }

  async function saveGscKey(e) {
    e.preventDefault()
    const trimmed = gscKeyJson.trim()
    if (!trimmed) { setGscMsg('❌ Paste the service account JSON key first'); return }
    setSavingGsc(true)
    setGscMsg('')
    try {
      const res = await apiPost('/api/settings/gsc-key', { serviceAccountKey: trimmed })
      if (res?.success) {
        setGscMsg('✅ GSC service account key saved')
        setGscStatus('active')
        setGscClientEmail(res.clientEmail || '')
        setGscKeyJson('')
        setTimeout(() => setGscMsg(''), 3000)
      } else {
        setGscMsg('❌ ' + (res?.error || 'Failed to save'))
      }
    } catch (err) {
      setGscMsg('❌ ' + (err?.message || 'Failed to save'))
    } finally {
      setSavingGsc(false)
    }
  }

  async function removeGscKey() {
    if (!window.confirm('Remove the GSC service account key?')) return
    setSavingGsc(true)
    setGscMsg('')
    try {
      const res = await apiPost('/api/settings/gsc-key', { serviceAccountKey: '{}' })
      // Use DELETE via apiPost workaround — call the delete route directly
      await fetch('/api/settings/gsc-key', { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setGscStatus('inactive')
      setGscClientEmail('')
      setGscMsg('✅ GSC key removed')
      setTimeout(() => setGscMsg(''), 2000)
    } catch (err) {
      setGscMsg('❌ ' + (err?.message || 'Failed to remove'))
    } finally {
      setSavingGsc(false)
    }
  }

  async function saveGoogleOAuth(e) {
    e.preventDefault()
    setSavingGoogleOAuth(true)
    setGoogleOAuthMsg('')
    try {
      const res = await apiPost('/api/settings/google-oauth', {
        clientId: googleOAuth.clientId,
      })
      if (res?.success) {
        setGoogleOAuthMsg('✅ Google OAuth settings saved')
        setGoogleOAuthStatus(googleOAuth.clientId ? 'active' : 'inactive')
        setTimeout(() => setGoogleOAuthMsg(''), 2500)
      } else {
        throw new Error(res?.error || 'Failed to save')
      }
    } catch (err) {
      setGoogleOAuthMsg('❌ ' + (err?.message || 'Failed to save'))
      setTimeout(() => setGoogleOAuthMsg(''), 3000)
    } finally {
      setSavingGoogleOAuth(false)
    }
  }

  async function testGoogleMaps() {
    setTestingMaps(true)
    setMapsMsg('Testing Google Maps API…')
    try {
      const apiKey = form.googleMapsApiKey
      if (!apiKey || apiKey.includes('••••')) {
        setMapsMsg('Please enter a valid API key first')
        setTestingMaps(false)
        setTimeout(() => setMapsMsg(''), 2500)
        return
      }

      // Test with a simple geocoding request (reverse geocode a known location)
      const testLat = 25.2048
      const testLng = 55.2708
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLat},${testLng}&key=${encodeURIComponent(apiKey)}`
      const r = await fetch(url)

      if (r.ok) {
        const data = await r.json()
        if (data.status === 'OK') {
          setMapsMsg('✅ Google Maps API Connection Successful')
        } else if (data.status === 'REQUEST_DENIED') {
          setMapsMsg('❌ API Key Invalid or Geocoding API not enabled')
        } else {
          setMapsMsg(`❌ Test failed: ${data.status}`)
        }
      } else {
        setMapsMsg('❌ Google Maps API test failed')
      }
    } catch (err) {
      setMapsMsg('❌ Google Maps API test failed')
    } finally {
      setTestingMaps(false)
      setTimeout(() => setMapsMsg(''), 4000)
    }
  }

  return (
    <div
      className="content"
      style={{ padding: 16, display: 'grid', gap: 16, maxWidth: 900, margin: '0 auto' }}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>API Setup</div>
        <div className="helper">
          Store API keys used to integrate with external services like Facebook, AI, and Maps. This
          setup applies to your workspace.
        </div>
      </div>

      {/* LocationIQ (Free) Settings */}
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">LocationIQ Geocoding (Free)</div>
          {locStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: locStatus === 'active' ? '#f0fdf4' : '#fef2f2',
                border: `2px dashed ${locStatus === 'active' ? '#86efac' : '#fecaca'}`,
                fontSize: 13,
                fontWeight: 600,
                color: locStatus === 'active' ? '#16a34a' : '#dc2626',
              }}
            >
              <span style={{ fontSize: 16 }}>{locStatus === 'active' ? '✓' : '○'}</span>
              <span>{locStatus === 'active' ? 'API Key Active' : 'Not Configured'}</span>
            </div>
          )}
        </div>
        <form onSubmit={onSaveLocationIQ} className="section" style={{ display: 'grid', gap: 12 }}>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div>LocationIQ API Key</div>
              <input
                name="locationIQApiKey"
                className="input"
                type="password"
                value={form.locationIQApiKey}
                onChange={onChange}
                placeholder="Enter LocationIQ API Key"
              />
              <div className="helper">
                Used for free geocoding and reverse geocoding. Stored securely on server.
              </div>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={savingLocationIQ}>
              {savingLocationIQ ? 'Saving…' : 'Save API Key'}
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={testLocationIQ}
              disabled={testingLocationIQ}
            >
              {testingLocationIQ ? 'Testing…' : 'Test Connection'}
            </button>
            {locMsg && (
              <div
                className="helper"
                style={{
                  fontWeight: 600,
                  color:
                    locMsg.includes('✅') || locMsg.includes('OK')
                      ? '#16a34a'
                      : locMsg.includes('❌')
                        ? '#dc2626'
                        : 'inherit',
                }}
              >
                {locMsg}
              </div>
            )}
          </div>
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div className="helper">
              If both LocationIQ and Google Maps are configured, the system prefers LocationIQ and
              falls back to Google, then OpenStreetMap.
            </div>
          </div>
        </form>
      </div>

      {/* Facebook API */}
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="card-title">Facebook API</div>
        <form onSubmit={saveFacebook} className="section" style={{ display: 'grid', gap: 12 }}>
          <div className="form-grid">
            <label className="field">
              <div>Access Token</div>
              <input
                className="input"
                value={fb.accessToken}
                onChange={(e) => setFb((f) => ({ ...f, accessToken: e.target.value }))}
                placeholder="EAAB..."
              />
            </label>
            <label className="field">
              <div>App ID</div>
              <input
                className="input"
                value={fb.appId}
                onChange={(e) => setFb((f) => ({ ...f, appId: e.target.value }))}
                placeholder="1234567890"
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="submit">
              Save Facebook Settings
            </button>
            <button className="btn secondary" type="button" onClick={testFacebook}>
              Test Connection
            </button>
            {fbMsg && (
              <div className="helper" style={{ fontWeight: 600 }}>
                {fbMsg}
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">Gemini AI Settings</div>
          {form.geminiApiKey && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: '#f0fdf4',
                border: '2px dashed #86efac',
                fontSize: 13,
                fontWeight: 600,
                color: '#16a34a',
              }}
            >
              <span>✓</span>
              <span>API Key Active</span>
            </div>
          )}
        </div>
        <form onSubmit={onSave} className="section" style={{ display: 'grid', gap: 12 }}>
          <div className="form-grid">
            <label className="field">
              <div>Gemini API Key</div>
              <input
                name="geminiApiKey"
                className="input"
                type="password"
                value={form.geminiApiKey}
                onChange={onChange}
                placeholder="Enter Gemini API Key (starts with AIza...)"
              />
              <div className="helper">
                Required for AI product descriptions and image generation. Get it from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent)', textDecoration: 'underline'}}>Google AI Studio</a>.
              </div>
            </label>
            <label className="field">
              <div>Description Model</div>
              <select
                name="geminiDescModel"
                className="input"
                value={form.geminiDescModel}
                onChange={onChange}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </select>
              <div className="helper">Model used for generating product descriptions.</div>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save AI Settings'}
            </button>
            <button className="btn secondary" type="button" onClick={onTest} disabled={testing}>
              {testing ? 'Testing…' : 'Test Gemini'}
            </button>
            {msg && (
              <div className="helper" style={{ fontWeight: 600 }}>
                {msg}
              </div>
            )}
          </div>
          {tests && (
            <div className="card" style={{ display: 'grid', gap: 8, padding: 12 }}>
              <div className="label">Test Results</div>
              <div className="grid" style={{ display: 'grid', gap: 8 }}>
                <div className="flex items-center gap-2">
                  <span>{tests.gemini?.ok ? '✅' : '❌'}</span>
                  <span>Gemini: {tests.gemini?.ok ? 'OK' : tests.gemini?.message || 'Failed'}</span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Google Maps API Settings */}
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">Google Maps API</div>
          {mapsStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: mapsStatus === 'active' ? '#f0fdf4' : '#fef2f2',
                border: `2px dashed ${mapsStatus === 'active' ? '#86efac' : '#fecaca'}`,
                fontSize: 13,
                fontWeight: 600,
                color: mapsStatus === 'active' ? '#16a34a' : '#dc2626',
              }}
            >
              <span style={{ fontSize: 16 }}>{mapsStatus === 'active' ? '✓' : '○'}</span>
              <span>{mapsStatus === 'active' ? 'API Key Active' : 'Not Configured'}</span>
            </div>
          )}
        </div>
        <form onSubmit={onSaveMaps} className="section" style={{ display: 'grid', gap: 12 }}>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div>Google Maps API Key</div>
              <input
                name="googleMapsApiKey"
                className="input"
                type="password"
                value={form.googleMapsApiKey}
                onChange={onChange}
                placeholder="Enter Google Maps API Key"
              />
              <div className="helper">
                Used for geocoding, reverse geocoding, and resolving WhatsApp location codes in
                order workflow. Stored securely on server.
              </div>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={savingMaps}>
              {savingMaps ? 'Saving…' : 'Save API Key'}
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={testGoogleMaps}
              disabled={testingMaps}
            >
              {testingMaps ? 'Testing…' : 'Test Connection'}
            </button>
            {mapsMsg && (
              <div
                className="helper"
                style={{
                  fontWeight: 600,
                  color:
                    mapsMsg.includes('✅') || mapsMsg.includes('success')
                      ? '#16a34a'
                      : mapsMsg.includes('❌')
                        ? '#dc2626'
                        : 'inherit',
                }}
              >
                {mapsMsg}
              </div>
            )}
          </div>
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>📍 Integration Points:</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Submit Order page - Resolve WhatsApp location codes</li>
              <li>Address geocoding and validation</li>
              <li>Automatic city and area detection</li>
              <li>Complete address population from location data</li>
            </ul>
          </div>
        </form>
      </div>

      {/* Google Search Console Service Account */}
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">
            <span style={{ marginRight: 6 }}>🔍</span>Google Search Console (Indexing API)
          </div>
          {gscStatus && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 8,
                background: gscStatus === 'active' ? '#f0fdf4' : '#fef2f2',
                border: `2px dashed ${gscStatus === 'active' ? '#86efac' : '#fecaca'}`,
                fontSize: 13, fontWeight: 600,
                color: gscStatus === 'active' ? '#16a34a' : '#dc2626',
              }}
            >
              <span style={{ fontSize: 16 }}>{gscStatus === 'active' ? '✓' : '○'}</span>
              <span>{gscStatus === 'active' ? 'Key Configured' : 'Not Configured'}</span>
            </div>
          )}
        </div>

        {gscStatus === 'active' && gscClientEmail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 13 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div>
              <div style={{ fontWeight: 600, color: '#166534' }}>Service Account Active</div>
              <div style={{ color: '#16a34a', wordBreak: 'break-all' }}>{gscClientEmail}</div>
            </div>
            <button
              type="button"
              onClick={removeGscKey}
              disabled={savingGsc}
              style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Remove Key
            </button>
          </div>
        )}

        <form onSubmit={saveGscKey} className="section" style={{ display: 'grid', gap: 12 }}>
          <label className="field">
            <div>Service Account JSON Key</div>
            <textarea
              className="input"
              rows={8}
              value={gscKeyJson}
              onChange={(e) => setGscKeyJson(e.target.value)}
              placeholder={'Paste the full contents of your service account JSON key file here...\n{\n  "type": "service_account",\n  "project_id": "...",\n  "client_email": "...",\n  "private_key": "-----BEGIN RSA PRIVATE KEY-----\\n..."\n}'}
              style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 160, resize: 'vertical' }}
            />
            <div className="helper">
              The full JSON contents of the Google service account key file (.json). The key is stored securely on the server and never exposed to the browser again.
            </div>
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={savingGsc || !gscKeyJson.trim()}>
              {savingGsc ? 'Saving…' : 'Save GSC Key'}
            </button>
            {gscMsg && (
              <div className="helper" style={{ fontWeight: 600, color: gscMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
                {gscMsg}
              </div>
            )}
          </div>
          <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 13, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>📋 Setup Instructions</div>
            <ol style={{ margin: 0, paddingLeft: 20, color: '#1e40af' }}>
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Google Cloud Console</a> and create or select a project</li>
              <li>Enable the <strong>Web Search Indexing API</strong> for the project</li>
              <li>Go to <strong>IAM &amp; Admin → Service Accounts</strong> → Create service account</li>
              <li>Click the service account → <strong>Keys</strong> tab → <strong>Add Key → Create new key → JSON</strong></li>
              <li>Download the .json file and paste its full contents above</li>
              <li>In <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Google Search Console</a>, go to <strong>Settings → Users and permissions</strong></li>
              <li>Add the service account <code>client_email</code> as an <strong>Owner</strong></li>
            </ol>
          </div>
        </form>
      </div>

      {/* Google OAuth Settings */}
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">Google OAuth (Customer Login)</div>
          {googleOAuthStatus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 8,
                background: googleOAuthStatus === 'active' ? '#f0fdf4' : '#fef2f2',
                border: `2px dashed ${googleOAuthStatus === 'active' ? '#86efac' : '#fecaca'}`,
                fontSize: 13,
                fontWeight: 600,
                color: googleOAuthStatus === 'active' ? '#16a34a' : '#dc2626',
              }}
            >
              <span style={{ fontSize: 16 }}>{googleOAuthStatus === 'active' ? '✓' : '○'}</span>
              <span>{googleOAuthStatus === 'active' ? 'Configured' : 'Not Configured'}</span>
            </div>
          )}
        </div>
        <form onSubmit={saveGoogleOAuth} className="section" style={{ display: 'grid', gap: 12 }}>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div>Google OAuth Client ID</div>
              <input
                className="input"
                type="text"
                value={googleOAuth.clientId}
                onChange={(e) => setGoogleOAuth({ clientId: e.target.value })}
                placeholder="xxxxxxxxxx.apps.googleusercontent.com"
              />
              <div className="helper">
                Enables "Continue with Google" button on customer login page. Get it from{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                >
                  Google Cloud Console
                </a>.
              </div>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={savingGoogleOAuth}>
              {savingGoogleOAuth ? 'Saving…' : 'Save Google OAuth'}
            </button>
            {googleOAuthMsg && (
              <div
                className="helper"
                style={{
                  fontWeight: 600,
                  color: googleOAuthMsg.includes('✅') ? '#16a34a' : googleOAuthMsg.includes('❌') ? '#dc2626' : 'inherit',
                }}
              >
                {googleOAuthMsg}
              </div>
            )}
          </div>
          <div
            style={{
              padding: 12,
              background: '#f0fdf4',
              borderRadius: 8,
              border: '1px solid #bbf7d0',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#166534' }}>📋 Setup Instructions:</div>
            <ol style={{ margin: 0, paddingLeft: 20, color: '#166534' }}>
              <li>Go to Google Cloud Console → APIs & Services → Credentials</li>
              <li>Create OAuth 2.0 Client ID (Web application type)</li>
              <li>Add your domain to "Authorized JavaScript origins"</li>
              <li>Copy the Client ID and paste it above</li>
            </ol>
          </div>
        </form>
      </div>
    </div>
  )
}
