import React, { useEffect, useState } from 'react'
import { API_BASE, apiGet, apiPost } from '../../api.js'
import { useToast } from '../../ui/Toast.jsx'

export default function UserLogin() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState({ ok: false, dbLabel: 'unknown' })
  const [branding, setBranding] = useState({ headerLogo: null, loginLogo: null })
  const [mounted, setMounted] = useState(false)
  const [emailFocus, setEmailFocus] = useState(false)
  const [pwFocus, setPwFocus] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  // Check if user is already logged in and redirect
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const me = JSON.parse(localStorage.getItem('me') || '{}')
        if (me.role === 'admin') location.href = '/admin'
        else if (me.role === 'agent') location.href = '/agent'
        else if (me.role === 'manager') location.href = '/manager'
        else if (me.role === 'investor') location.href = '/investor'
        else if (me.role === 'commissioner') location.href = '/commissioner/dashboard'
        else if (me.role === 'confirmer') location.href = '/confirmer'
        else if (me.role === 'dropshipper') location.href = '/dropshipper'
        else if (me.role === 'driver') location.href = '/driver'
        else if (me.role === 'seo_manager') location.href = '/seo'
        else if (me.role === 'user') location.href = '/user'
      } catch {}
    }
  }, [])

  // Health check with backoff; stop once healthy
  useEffect(() => {
    let cancelled = false
    let attempt = 0
    const delays = [3000, 7000, 15000, 30000]
    async function run() {
      try {
        const j = await apiGet('/api/health')
        if (cancelled) return
        const dbLabel = j?.db?.label || 'unknown'
        const ok = j?.status === 'ok'
        setHealth({ ok, dbLabel })
        if (!ok) {
          const d = delays[Math.min(attempt, delays.length - 1)]
          attempt++
          setTimeout(() => { if (!cancelled) run() }, d)
        }
      } catch {
        if (cancelled) return
        setHealth({ ok: false, dbLabel: 'unreachable' })
        const d = delays[Math.min(attempt, delays.length - 1)]
        attempt++
        setTimeout(() => { if (!cancelled) run() }, d)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  // Load branding (public, no auth needed)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const j = await apiGet('/api/settings/branding')
        if (!cancelled)
          setBranding({ headerLogo: j.headerLogo || null, loginLogo: j.loginLogo || null })
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  async function login(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiPost('/api/auth/login', { email: email.trim().toLowerCase(), password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('me', JSON.stringify(data.user))
      if (data.user.role === 'admin') location.href = '/admin'
      else if (data.user.role === 'agent') location.href = '/agent'
      else if (data.user.role === 'manager') location.href = '/manager'
      else if (data.user.role === 'investor') location.href = '/investor'
      else if (data.user.role === 'commissioner') location.href = '/commissioner/dashboard'
      else if (data.user.role === 'confirmer') location.href = '/confirmer'
      else if (data.user.role === 'dropshipper') location.href = '/dropshipper'
      else if (data.user.role === 'driver') location.href = '/driver'
      else if (data.user.role === 'seo_manager') location.href = '/seo'
      else location.href = '/user'
    } catch (e) {
      const status = e?.status
      const msg = String(e?.message || '')
      if (status === 429) {
        toast.info('Too many requests. Please wait a few seconds and try again.')
      } else if (status === 400 || /invalid|incorrect|credentials|password|email/i.test(msg)) {
        toast.error('Incorrect email or password')
      } else {
        toast.error(msg || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const fallbackLogo = `${import.meta.env.BASE_URL}BuySial2.png`
  const logoSrc = branding.loginLogo ? `${API_BASE}${branding.loginLogo}` : fallbackLogo

  const healthBad = (() => {
    const dbLabel = String(health.dbLabel || '').toLowerCase()
    return !(health.ok && dbLabel === 'connected')
  })()

  return (
    <div className="pl-root">
      {/* Subtle decorative shapes */}
      <div className="pl-deco pl-deco-1" />
      <div className="pl-deco pl-deco-2" />

      {/* Center stage */}
      <div className={`pl-stage ${mounted ? 'pl-mounted' : ''}`}>
        <form onSubmit={login} className="pl-card" autoComplete="on">
          {/* Logo */}
          <div className="pl-logo-wrap">
            <div className="pl-logo-box">
              <img src={logoSrc} alt="BuySial" className="pl-logo-img" />
            </div>
          </div>

          {/* Heading */}
          <div className="pl-heading">
            <h1 className="pl-title">Welcome back</h1>
            <p className="pl-subtitle">Sign in to your workspace</p>
          </div>

          {/* Email */}
          <label className="pl-label">Email</label>
          <div className={`pl-field ${emailFocus ? 'pl-field--focus' : ''}`}>
            <svg className="pl-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M2 7l10 6 10-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
              placeholder="you@company.com"
              autoComplete="email"
              required
              className="pl-input"
            />
          </div>

          {/* Password */}
          <label className="pl-label">Password</label>
          <div className={`pl-field ${pwFocus ? 'pl-field--focus' : ''}`}>
            <svg className="pl-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPwFocus(true)}
              onBlur={() => setPwFocus(false)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
              className="pl-input"
            />
            <button type="button" className="pl-eye" onClick={() => setShowPw(s => !s)} tabIndex={-1} aria-label={showPw ? 'Hide' : 'Show'}>
              {showPw ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.84 20.84 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 7 11 7a20.84 20.84 0 01-4.12 5.23M1 1l22 22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/></svg>
              )}
            </button>
          </div>

          {/* Forgot */}
          <div className="pl-forgot-row">
            <a href="#" className="pl-forgot" onClick={e => { e.preventDefault(); toast.info('Forgot password coming soon') }}>
              Forgot password?
            </a>
          </div>

          {/* Submit */}
          <button type="submit" className="pl-btn" disabled={loading}>
            {loading ? (
              <><span className="pl-spinner" /> Signing in...</>
            ) : (
              <>Sign In</>
            )}
          </button>

          {/* Health status */}
          {healthBad && (
            <button type="button" className="pl-health" onClick={() => window.location.reload()}>
              <span className="pl-health-dot" />
              Connection issue — tap to retry
            </button>
          )}

          {/* Footer */}
          <p className="pl-footer">Powered by <strong>BuySial</strong></p>
        </form>
      </div>

      <style>{`
        .pl-root {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fb;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        }

        /* Subtle decorative background shapes */
        .pl-deco {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.5;
          z-index: 0;
          pointer-events: none;
        }
        .pl-deco-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #dbeafe 0%, transparent 70%);
          top: -20%; right: -10%;
        }
        .pl-deco-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #ede9fe 0%, transparent 70%);
          bottom: -18%; left: -8%;
        }

        /* Stage entrance */
        .pl-stage {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          padding: 24px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1);
        }
        .pl-stage.pl-mounted {
          opacity: 1;
          transform: translateY(0);
        }

        /* Card */
        .pl-card {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 40px 32px 32px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.04),
            0 8px 40px -12px rgba(0,0,0,0.08);
        }

        /* Logo */
        .pl-logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .pl-logo-box {
          width: 60px; height: 60px;
          border-radius: 16px;
          background: #ffffff;
          display: grid;
          place-items: center;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .pl-logo-img {
          height: 38px;
          width: auto;
          display: block;
        }

        /* Heading */
        .pl-heading {
          text-align: center;
          margin-bottom: 28px;
        }
        .pl-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #111827;
          margin: 0 0 4px;
        }
        .pl-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          font-weight: 400;
        }

        /* Labels */
        .pl-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          margin-top: 16px;
        }
        .pl-card .pl-label:first-of-type {
          margin-top: 0;
        }

        /* Input fields */
        .pl-field {
          display: flex;
          align-items: center;
          gap: 0;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          padding: 0 14px;
          height: 48px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .pl-field--focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(129,140,248,0.12);
          background: #ffffff;
        }
        .pl-field-icon {
          flex-shrink: 0;
          width: 32px;
          display: flex;
          align-items: center;
          color: #9ca3af;
          transition: color 0.2s ease;
        }
        .pl-field--focus .pl-field-icon {
          color: #6366f1;
        }
        .pl-input {
          flex: 1;
          background: none !important;
          border: none !important;
          outline: none !important;
          color: #111827 !important;
          font-size: 15px;
          font-weight: 400;
          height: 100%;
          padding: 0;
        }
        .pl-input::placeholder {
          color: #9ca3af;
        }
        .pl-input:-webkit-autofill,
        .pl-input:-webkit-autofill:hover,
        .pl-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #111827 !important;
          -webkit-box-shadow: 0 0 0 40px #f9fafb inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .pl-eye {
          flex-shrink: 0;
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 6px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          transition: color 0.15s, background 0.15s;
        }
        .pl-eye:hover {
          color: #6366f1;
          background: #f3f4f6;
        }

        /* Forgot */
        .pl-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
          margin-bottom: 20px;
        }
        .pl-forgot {
          font-size: 13px;
          font-weight: 500;
          color: #6366f1;
          text-decoration: none;
          transition: color 0.15s;
        }
        .pl-forgot:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        /* Submit button */
        .pl-btn {
          width: 100%;
          height: 48px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          background: #111827;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05);
        }
        .pl-btn:hover:not(:disabled) {
          background: #1f2937;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08);
        }
        .pl-btn:active:not(:disabled) {
          transform: translateY(0);
          background: #030712;
        }
        .pl-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner */
        .pl-spinner {
          display: inline-block;
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: pl-spin 0.6s linear infinite;
        }
        @keyframes pl-spin {
          to { transform: rotate(360deg); }
        }

        /* Health */
        .pl-health {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 10px 16px;
          margin-top: 12px;
          color: #dc2626;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .pl-health:hover {
          background: #fee2e2;
        }
        .pl-health-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #ef4444;
          animation: pl-blink 1.5s ease-in-out infinite;
        }
        @keyframes pl-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Footer */
        .pl-footer {
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          margin: 20px 0 0;
          font-weight: 400;
        }
        .pl-footer strong {
          font-weight: 600;
          color: #6b7280;
        }

        /* Mobile */
        @media (max-width: 480px) {
          .pl-stage { padding: 16px; max-width: 100%; }
          .pl-card { padding: 32px 20px 24px; border-radius: 16px; }
          .pl-title { font-size: 22px; }
          .pl-logo-box { width: 52px; height: 52px; border-radius: 14px; }
          .pl-logo-img { height: 32px; }
          .pl-field { height: 46px; }
          .pl-btn { height: 46px; }
        }
      `}</style>
    </div>
  )
}
