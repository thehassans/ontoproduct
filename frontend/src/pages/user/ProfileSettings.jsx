import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api.js'

export default function ProfileSettings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Profile data
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // API Keys
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [mapsKey, setMapsKey] = useState('')

  // Custom Domain
  const [customDomain, setCustomDomain] = useState('')

  // Payment Settings - Stripe
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  
  // Payment Settings - PayPal
  const [paypalClientId, setPaypalClientId] = useState('')
  const [paypalClientSecret, setPaypalClientSecret] = useState('')
  const [paypalMode, setPaypalMode] = useState('sandbox')
  
  // Apple Pay Settings
  const [applePayEnabled, setApplePayEnabled] = useState(false)
  const [applePayMerchantId, setApplePayMerchantId] = useState('')
  const [applePayMerchantName, setApplePayMerchantName] = useState('')
  const [applePayDomainVerification, setApplePayDomainVerification] = useState('')
  
  // Google Pay Settings
  const [googlePayEnabled, setGooglePayEnabled] = useState(false)
  const [googlePayMerchantId, setGooglePayMerchantId] = useState('')
  const [googlePayMerchantName, setGooglePayMerchantName] = useState('')
  const [googlePayEnvironment, setGooglePayEnvironment] = useState('TEST')
  
  // Supported countries for Apple Pay & Google Pay
  const APPLE_PAY_COUNTRIES = [
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'OM', name: 'Oman' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'QA', name: 'Qatar' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
  ]
  
  // Test states
  const [testingPaypal, setTestingPaypal] = useState(false)
  const [paypalTestResult, setPaypalTestResult] = useState(null)

  // Load current user data
  useEffect(() => {
    const me = JSON.parse(localStorage.getItem('me') || '{}')
    setFirstName(me.firstName || '')
    setLastName(me.lastName || '')
    setEmail(me.email || '')
    setPhone(me.phone || '')

    // Load API keys and custom domain
    loadAPIKeys()
    loadCustomDomain()
    loadPaymentSettings()
  }, [])

  async function loadAPIKeys() {
    try {
      const data = await apiGet('/api/settings/api-keys')
      setGeminiKey(data.geminiKey || '')
      setOpenaiKey(data.openaiKey || '')
      setMapsKey(data.mapsKey || '')
    } catch (err) {
      console.error('Failed to load API keys:', err)
    }
  }

  async function loadCustomDomain() {
    try {
      const data = await apiGet('/api/users/custom-domain')
      setCustomDomain(data.customDomain || '')
    } catch (err) {
      console.error('Failed to load custom domain:', err)
    }
  }

  async function loadPaymentSettings() {
    try {
      const data = await apiGet('/api/settings/payment-keys')
      // Stripe settings
      setStripePublishableKey(data.stripePublishableKey || '')
      setStripeSecretKey(data.stripeSecretKey || '')
      // PayPal settings
      setPaypalClientId(data.paypalClientId || '')
      setPaypalClientSecret(data.paypalClientSecret || '')
      setPaypalMode(data.paypalMode || 'sandbox')
      // Apple Pay settings
      setApplePayEnabled(data.applePayEnabled || false)
      setApplePayMerchantId(data.applePayMerchantId || '')
      setApplePayMerchantName(data.applePayMerchantName || '')
      setApplePayDomainVerification(data.applePayDomainVerification || '')
      // Google Pay settings
      setGooglePayEnabled(data.googlePayEnabled || false)
      setGooglePayMerchantId(data.googlePayMerchantId || '')
      setGooglePayMerchantName(data.googlePayMerchantName || '')
      setGooglePayEnvironment(data.googlePayEnvironment || 'TEST')
    } catch (err) {
      console.error('Failed to load payment settings:', err)
    }
  }

  async function handleSavePaymentSettings(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      await apiPost('/api/settings/payment-keys', {
        stripePublishableKey,
        stripeSecretKey,
        paypalClientId,
        paypalClientSecret,
        paypalMode,
        applePayEnabled,
        applePayMerchantId,
        applePayMerchantName,
        applePayDomainVerification,
        googlePayEnabled,
        googlePayMerchantId,
        googlePayMerchantName,
        googlePayEnvironment,
      })

      setMessage('Payment settings updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update payment settings')
    } finally {
      setLoading(false)
    }
  }

  async function testPaypalConnection() {
    if (!paypalClientId || !paypalClientSecret) {
      setPaypalTestResult({ success: false, message: 'Please enter PayPal Client ID and Secret first' })
      return
    }
    setTestingPaypal(true)
    setPaypalTestResult(null)
    try {
      const result = await apiPost('/api/settings/test-paypal', { 
        clientId: paypalClientId, 
        clientSecret: paypalClientSecret,
        mode: paypalMode 
      })
      setPaypalTestResult({ success: true, message: result.message || 'PayPal connection successful!' })
    } catch (err) {
      setPaypalTestResult({ success: false, message: err.message || 'PayPal connection failed' })
    } finally {
      setTestingPaypal(false)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const res = await apiPost('/api/user/update-profile', {
        firstName,
        lastName,
        phone,
      })

      // Update localStorage
      const me = JSON.parse(localStorage.getItem('me') || '{}')
      me.firstName = firstName
      me.lastName = lastName
      me.phone = phone
      localStorage.setItem('me', JSON.stringify(me))

      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveAPIKeys(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      await apiPost('/api/settings/api-keys', {
        geminiKey,
        openaiKey,
        mapsKey,
      })

      setMessage('API keys updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update API keys')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveCustomDomain(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      await apiPost('/api/users/custom-domain', {
        customDomain: customDomain.trim(),
      })

      setMessage('Custom domain updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update custom domain')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
            Profile Settings
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            color: '#10b981',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ✓ {message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#ef4444',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ✗ {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Personal Information Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--border)',
              background:
                'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                  Personal Information
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                  Update your personal details
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="field">
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    className="input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    className="input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
                <div className="helper" style={{ marginTop: '8px' }}>
                  Email cannot be changed
                </div>
              </div>

              <div className="field">
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => navigate('/user/change-password')}
                >
                  Change Password
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* API Configuration Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--border)',
              background:
                'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.05))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                  API Configuration
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                  Configure API keys for AI and Maps integration
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveAPIKeys} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="field">
                <label className="label">
                  Google Gemini API Key
                  <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '8px' }}>
                    (For AI-powered product generation)
                  </span>
                </label>
                <input
                  type="password"
                  className="input"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                />
              </div>

              <div className="field">
                <label className="label">
                  OpenAI API Key
                  <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '8px' }}>
                    (Alternative AI provider)
                  </span>
                </label>
                <input
                  type="password"
                  className="input"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>

              <div className="field">
                <label className="label">
                  Google Maps API Key
                  <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '8px' }}>
                    (For geocoding and location services)
                  </span>
                </label>
                <input
                  type="password"
                  className="input"
                  value={mapsKey}
                  onChange={(e) => setMapsKey(e.target.value)}
                  placeholder="AIza..."
                />
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                  📘 API Setup Guide
                </div>
                <ul style={{ color: 'var(--muted)', paddingLeft: '20px', margin: 0 }}>
                  <li>
                    Gemini API: Visit{' '}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#6366f1' }}
                    >
                      Google AI Studio
                    </a>
                  </li>
                  <li>
                    OpenAI API: Get your key from{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#6366f1' }}
                    >
                      OpenAI Platform
                    </a>
                  </li>
                  <li>
                    Maps API: Create a key in{' '}
                    <a
                      href="https://console.cloud.google.com/google/maps-apis"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#6366f1' }}
                    >
                      Google Cloud Console
                    </a>
                  </li>
                </ul>
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save API Keys'}
              </button>
            </div>
          </form>
        </div>

        {/* Payment Settings Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--border)',
              background:
                'linear-gradient(135deg, rgba(99, 91, 255, 0.05), rgba(79, 70, 229, 0.05))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                  Payment Settings
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                  Configure Stripe and PayPal for online payments
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePaymentSettings} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Stripe Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #635bff, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Stripe</h3>
                  {stripeSecretKey && (
                    <div style={{
                      padding: '4px 10px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#10b981',
                    }}>
                      ✓ Configured
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="field">
                    <label className="label">Publishable Key</label>
                    <input
                      type="text"
                      className="input"
                      value={stripePublishableKey}
                      onChange={(e) => setStripePublishableKey(e.target.value)}
                      placeholder="pk_live_... or pk_test_..."
                    />
                  </div>
                  <div className="field">
                    <label className="label">Secret Key</label>
                    <input
                      type="password"
                      className="input"
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      placeholder="sk_live_... or sk_test_..."
                    />
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      Get your keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" style={{ color: '#635bff' }}>Stripe Dashboard</a>
                    </p>
                  </div>
                </div>
              </div>

              {/* PayPal Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #003087, #001f5c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>PayPal</h3>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="field">
                    <label className="label">Client ID</label>
                    <input
                      type="text"
                      className="input"
                      value={paypalClientId}
                      onChange={(e) => setPaypalClientId(e.target.value)}
                      placeholder="AZDx..."
                    />
                  </div>
                  <div className="field">
                    <label className="label">Client Secret</label>
                    <input
                      type="password"
                      className="input"
                      value={paypalClientSecret}
                      onChange={(e) => setPaypalClientSecret(e.target.value)}
                      placeholder="EGn..."
                    />
                  </div>
                  <div className="field">
                    <label className="label">Mode</label>
                    <select
                      className="input"
                      value={paypalMode}
                      onChange={(e) => setPaypalMode(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="sandbox">Sandbox (Testing)</option>
                      <option value="live">Live (Production)</option>
                    </select>
                  </div>
                  {/* Test PayPal Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={testPaypalConnection}
                      disabled={testingPaypal}
                      style={{
                        padding: '10px 20px',
                        background: testingPaypal ? '#94a3b8' : 'linear-gradient(135deg, #003087, #001f5c)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: testingPaypal ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {testingPaypal ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                          </svg>
                          Testing...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <polyline points="22,4 12,14.01 9,11.01" />
                          </svg>
                          Test Connection
                        </>
                      )}
                    </button>
                    {paypalTestResult && (
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        background: paypalTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: paypalTestResult.success ? '#10b981' : '#ef4444',
                        border: `1px solid ${paypalTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}>
                        {paypalTestResult.success ? '✓' : '✕'} {paypalTestResult.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Apple Pay Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>Apple Pay</h3>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                        Available in: SA, UAE, Oman, Bahrain, Kuwait, Qatar, UK, Canada, Australia
                      </p>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{applePayEnabled ? 'Enabled' : 'Disabled'}</span>
                    <div
                      onClick={() => setApplePayEnabled(!applePayEnabled)}
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        background: applePayEnabled ? '#10b981' : '#e2e8f0',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        background: '#fff',
                        position: 'absolute',
                        top: 2,
                        left: applePayEnabled ? 22 : 2,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </label>
                </div>
                
                {applePayEnabled && (
                  <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                    <div className="field">
                      <label className="label">Merchant ID</label>
                      <input
                        type="text"
                        className="input"
                        value={applePayMerchantId}
                        onChange={(e) => setApplePayMerchantId(e.target.value)}
                        placeholder="merchant.com.yourcompany.app"
                      />
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        Your Apple Pay Merchant ID from Apple Developer account
                      </p>
                    </div>
                    <div className="field">
                      <label className="label">Merchant Display Name</label>
                      <input
                        type="text"
                        className="input"
                        value={applePayMerchantName}
                        onChange={(e) => setApplePayMerchantName(e.target.value)}
                        placeholder="Your Store Name"
                      />
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        Name shown to customers during Apple Pay checkout
                      </p>
                    </div>
                    <div className="field">
                      <label className="label">Domain Verification File Content</label>
                      <textarea
                        className="input"
                        value={applePayDomainVerification}
                        onChange={(e) => setApplePayDomainVerification(e.target.value)}
                        placeholder="Paste the content of apple-developer-merchantid-domain-association file"
                        rows={3}
                        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                      />
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        Required for domain verification. Get this from Apple Developer Portal.
                      </p>
                    </div>
                    
                    <div style={{
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.03)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                         Supported Countries
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {APPLE_PAY_COUNTRIES.map(c => (
                          <span key={c.code} style={{
                            padding: '4px 8px',
                            background: '#f1f5f9',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#475569',
                          }}>
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Google Pay Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid #dadce0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>Google Pay</h3>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                        Available in: SA, UAE, Oman, Bahrain, Kuwait, Qatar, UK, Canada, Australia
                      </p>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{googlePayEnabled ? 'Enabled' : 'Disabled'}</span>
                    <div
                      onClick={() => setGooglePayEnabled(!googlePayEnabled)}
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        background: googlePayEnabled ? '#10b981' : '#e2e8f0',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        background: '#fff',
                        position: 'absolute',
                        top: 2,
                        left: googlePayEnabled ? 22 : 2,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </label>
                </div>
                
                {googlePayEnabled && (
                  <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                    <div className="field">
                      <label className="label">Merchant ID</label>
                      <input
                        type="text"
                        className="input"
                        value={googlePayMerchantId}
                        onChange={(e) => setGooglePayMerchantId(e.target.value)}
                        placeholder="BCR2DN..."
                      />
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        Your Google Pay Merchant ID from Google Pay Business Console
                      </p>
                    </div>
                    <div className="field">
                      <label className="label">Merchant Display Name</label>
                      <input
                        type="text"
                        className="input"
                        value={googlePayMerchantName}
                        onChange={(e) => setGooglePayMerchantName(e.target.value)}
                        placeholder="Your Store Name"
                      />
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        Name shown to customers during Google Pay checkout
                      </p>
                    </div>
                    <div className="field">
                      <label className="label">Environment</label>
                      <select
                        className="input"
                        value={googlePayEnvironment}
                        onChange={(e) => setGooglePayEnvironment(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="TEST">Test (Development)</option>
                        <option value="PRODUCTION">Production (Live)</option>
                      </select>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        Use TEST for development, PRODUCTION for live payments
                      </p>
                    </div>
                    
                    <div style={{
                      padding: '12px',
                      background: 'rgba(66, 133, 244, 0.05)',
                      border: '1px solid rgba(66, 133, 244, 0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                        🌍 Supported Countries
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {APPLE_PAY_COUNTRIES.map(c => (
                          <span key={c.code} style={{
                            padding: '4px 8px',
                            background: '#f1f5f9',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#475569',
                          }}>
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'rgba(99, 91, 255, 0.05)',
                  border: '1px solid rgba(99, 91, 255, 0.2)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                  💳 Payment Setup Guide
                </div>
                <ul style={{ color: 'var(--muted)', paddingLeft: '20px', margin: 0 }}>
                  <li>
                    Stripe: Get keys from{' '}
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#635bff' }}
                    >
                      Stripe Dashboard
                    </a>
                  </li>
                  <li>
                    PayPal: Get credentials from{' '}
                    <a
                      href="https://developer.paypal.com/dashboard/applications"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#003087' }}
                    >
                      PayPal Developer Portal
                    </a>
                  </li>
                  <li>
                    Apple Pay: Configure in{' '}
                    <a
                      href="https://developer.apple.com/account/resources/identifiers/list/merchant"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#000' }}
                    >
                      Apple Developer Portal
                    </a>
                  </li>
                  <li>
                    Google Pay: Set up in{' '}
                    <a
                      href="https://pay.google.com/business/console"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#4285F4' }}
                    >
                      Google Pay Business Console
                    </a>
                  </li>
                  <li>For testing, use Sandbox/TEST mode with test credentials</li>
                  <li>Switch to Live/PRODUCTION mode for real payments</li>
                </ul>
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Payment Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Custom Domain Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--border)',
              background:
                'linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(236, 72, 153, 0.05))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                  Custom Domain
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                  Connect your own domain to your e-commerce store
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveCustomDomain} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="field">
                <label className="label">
                  Domain Name
                  <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '8px' }}>
                    (e.g., buysial.com)
                  </span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="yourdomain.com"
                />
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                  🌐 Domain Setup Instructions
                </div>
                <ol style={{ color: 'var(--muted)', paddingLeft: '20px', margin: 0 }}>
                  <li>Enter your domain name in the field above (e.g., myshop.com)</li>
                  <li>Point your domain's DNS to buysial.com using a CNAME record</li>
                  <li>Wait for DNS propagation (usually 5-10 minutes)</li>
                  <li>Your e-commerce store will be accessible on your custom domain</li>
                </ol>
                {customDomain && (
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(168, 85, 247, 0.2)',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
                      Current Domain:
                    </div>
                    <a
                      href={`https://${customDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a855f7', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {customDomain} →
                    </a>
                  </div>
                )}
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Custom Domain'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
