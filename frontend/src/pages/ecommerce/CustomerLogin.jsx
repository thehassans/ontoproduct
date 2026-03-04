import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiPost, apiGet, API_BASE } from '../../api'
import { useToast } from '../../ui/Toast'
import PasswordInput from '../../components/PasswordInput'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  .cl-page {
    min-height: 100vh;
    display: flex;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #ffffff;
  }

  .cl-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px;
    max-width: 560px;
    margin: 0 auto;
  }

  .cl-right {
    flex: 1;
    background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%);
    display: none;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .cl-right::before {
    content: '';
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%);
    animation: pulse 4s ease-in-out infinite;
  }

  .cl-right::after {
    content: '';
    position: absolute;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(234, 88, 12, 0.1) 0%, transparent 70%);
    animation: pulse 4s ease-in-out infinite 1s;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }

  .cl-logo-container {
    margin-bottom: 48px;
  }

  .cl-logo {
    height: 44px;
    width: auto;
    object-fit: contain;
  }

  .cl-header {
    margin-bottom: 40px;
  }

  .cl-title {
    font-size: 32px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  }

  .cl-subtitle {
    font-size: 15px;
    color: #64748b;
    margin: 0;
    font-weight: 400;
  }

  .cl-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .cl-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cl-label {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    letter-spacing: 0.01em;
  }

  .cl-input {
    width: 100%;
    padding: 16px 18px;
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    font-size: 15px;
    font-family: inherit;
    transition: all 0.2s ease;
    background: #fafafa;
    color: #0f172a;
  }

  .cl-input::placeholder {
    color: #9ca3af;
  }

  .cl-input:hover {
    border-color: #d1d5db;
    background: #ffffff;
  }

  .cl-input:focus {
    outline: none;
    border-color: #f97316;
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.08);
  }

  .cl-btn {
    width: 100%;
    padding: 18px;
    border: none;
    border-radius: 12px;
    background: #0f172a;
    color: white;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.25s ease;
    margin-top: 8px;
  }

  .cl-btn:hover {
    background: #1e293b;
    transform: translateY(-1px);
  }

  .cl-btn:active {
    transform: translateY(0);
  }

  .cl-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
  }

  .cl-divider {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 8px 0;
  }

  .cl-divider-line {
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  .cl-divider-text {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cl-footer {
    text-align: center;
    margin-top: 32px;
    font-size: 14px;
    color: #64748b;
  }

  .cl-footer a {
    color: #f97316;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
  }

  .cl-footer a:hover {
    color: #ea580c;
  }

  .cl-staff-link {
    text-align: center;
    margin-top: 48px;
    padding-top: 32px;
    border-top: 1px solid #f1f5f9;
    font-size: 13px;
    color: #94a3b8;
  }

  .cl-staff-link a {
    color: #64748b;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }

  .cl-staff-link a:hover {
    color: #0f172a;
  }

  .cl-google-btn {
    width: 100%;
    padding: 16px;
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    background: #ffffff;
    color: #374151;
    font-size: 15px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .cl-google-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .cl-google-btn:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .cl-google-icon {
    width: 20px;
    height: 20px;
  }

  .cl-back {
    position: absolute;
    top: 32px;
    left: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: color 0.2s;
  }

  .cl-back:hover {
    color: #0f172a;
  }

  .cl-illustration {
    position: relative;
    z-index: 1;
    font-size: 120px;
    opacity: 0.9;
  }

  @media (min-width: 1024px) {
    .cl-right {
      display: flex;
    }
    .cl-left {
      padding: 64px 80px;
    }
  }

  @media (max-width: 640px) {
    .cl-left {
      padding: 32px 24px;
    }
    .cl-title {
      font-size: 26px;
    }
    .cl-logo-container {
      margin-bottom: 40px;
    }
    .cl-header {
      margin-bottom: 32px;
    }
  }
`

export default function CustomerLogin() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState({ headerLogo: null, loginLogo: null })
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [brandingRes, googleRes] = await Promise.all([
          apiGet('/api/settings/branding'),
          apiGet('/api/settings/google-oauth')
        ])
        console.log('[CustomerLogin] Google OAuth response:', googleRes)
        if (!cancelled) {
          setBranding({ headerLogo: brandingRes.headerLogo || null, loginLogo: brandingRes.loginLogo || null })
          if (googleRes?.clientId) {
            console.log('[CustomerLogin] Setting Google Client ID:', googleRes.clientId)
            setGoogleClientId(googleRes.clientId)
          } else {
            console.warn('[CustomerLogin] No Google Client ID returned from API')
          }
        }
      } catch (err) {
        console.error('[CustomerLogin] Error fetching settings:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Track if Google SDK is ready
  const [googleReady, setGoogleReady] = useState(false)

  // Load Google Identity Services script only when we have client ID
  useEffect(() => {
    if (!googleClientId) return
    
    // Check if already loaded
    if (window.google?.accounts?.id) {
      setGoogleReady(true)
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      console.log('[CustomerLogin] Google script loaded')
      setGoogleReady(true)
    }
    document.head.appendChild(script)
  }, [googleClientId])

  const handleGoogleLogin = useCallback(async (response) => {
    if (!response.credential) {
      toast.error('Google login failed')
      return
    }
    
    setGoogleLoading(true)
    try {
      const data = await apiPost('/api/auth/google', {
        credential: response.credential,
        clientId: googleClientId
      })
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('me', JSON.stringify(data.user))
      
      toast.success(data.isNewUser ? 'Account created successfully!' : 'Welcome back!')
      
      // Check for pending cart item
      try {
        const pendingProductId = sessionStorage.getItem('pending_cart_product')
        if (pendingProductId) {
          sessionStorage.removeItem('pending_cart_product')
          window.location.href = `/product/${pendingProductId}`
          return
        }
      } catch {}
      
      window.location.href = '/customer'
    } catch (err) {
      toast.error(err?.message || 'Google login failed')
    } finally {
      setGoogleLoading(false)
    }
  }, [googleClientId, toast])

  // Initialize Google Sign-In only when both client ID AND script are ready
  useEffect(() => {
    if (!googleClientId || !googleReady || !window.google?.accounts?.id) return
    
    console.log('[CustomerLogin] Initializing Google Sign-In with client ID:', googleClientId.substring(0, 20) + '...')
    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleLogin,
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      console.log('[CustomerLogin] Google Sign-In initialized successfully')
    } catch (err) {
      console.error('Failed to initialize Google Sign-In:', err)
    }
  }, [googleClientId, googleReady, handleGoogleLogin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }
    if (!password) {
      toast.error('Password is required')
      return
    }

    setLoading(true)
    try {
      const data = await apiPost('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        loginType: 'customer'
      })
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('me', JSON.stringify(data.user))
      
      toast.success('Welcome back!')
      
      // Check for pending cart item logic
      try {
        const pendingProductId = sessionStorage.getItem('pending_cart_product')
        if (pendingProductId) {
          sessionStorage.removeItem('pending_cart_product')
          window.location.href = `/product/${pendingProductId}`
          return
        }
      } catch {}

      window.location.href = '/customer'
    } catch (err) {
      const status = err?.status
      const msg = String(err?.message || '')
      
      if (status === 401) {
        toast.error('Invalid email or password')
      } else if (status === 403) {
        toast.error('Account access restricted')
      } else {
        toast.error(msg || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="cl-page">
        <Link to="/catalog" className="cl-back">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to store
        </Link>

        <div className="cl-left">
          <div className="cl-logo-container">
            <img
              src={branding.loginLogo ? `${API_BASE}${branding.loginLogo}` : `${import.meta.env.BASE_URL}BuySial2.png`}
              alt="Logo"
              className="cl-logo"
            />
          </div>

          <div className="cl-header">
            <h1 className="cl-title">Welcome back</h1>
            <p className="cl-subtitle">Sign in to continue to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="cl-form">
            <div className="cl-field">
              <label className="cl-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="cl-input"
                autoComplete="email"
              />
            </div>

            <div className="cl-field">
              <label className="cl-label">Password</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                className="cl-input"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="cl-btn">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            {googleClientId && (
              <>
                <div className="cl-divider">
                  <div className="cl-divider-line"></div>
                  <span className="cl-divider-text">or</span>
                  <div className="cl-divider-line"></div>
                </div>

                <button
                  type="button"
                  className="cl-google-btn"
                  disabled={googleLoading || !googleReady}
                  onClick={() => {
                    if (window.google?.accounts?.id) {
                      window.google.accounts.id.prompt()
                    } else {
                      toast.error('Google Sign-In not ready. Please refresh the page.')
                    }
                  }}
                >
                  <svg className="cl-google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </button>
              </>
            )}
          </form>

          <div className="cl-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>

        </div>

        <div className="cl-right">
          <div className="cl-illustration">🛍️</div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </>
  )
}