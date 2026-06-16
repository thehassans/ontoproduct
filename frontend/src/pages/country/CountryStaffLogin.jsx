import React, { useEffect, useState } from 'react'
import { API_BASE, apiGet, apiPost } from '../../api.js'
import { useToast } from '../../ui/Toast.jsx'
import { DEFAULT_COUNTRY_LIST } from '../../utils/constants.js'

// Resolve country from current hostname
function resolveCountryFromHost() {
  try {
    const host = window.location.hostname.toLowerCase()
    return DEFAULT_COUNTRY_LIST.find(
      (c) => c.domain && c.domain.toLowerCase() === host
    ) || null
  } catch {
    return null
  }
}

// Country-specific accent colors
const COUNTRY_THEMES = {
  PK: { from: '#01411C', to: '#3a7d44', accent: '#3a7d44', light: '#e8f5e9' },
  SA: { from: '#006C35', to: '#1a8a4e', accent: '#1a8a4e', light: '#e6f4ea' },
  AE: { from: '#00732F', to: '#c8102e', accent: '#c8102e', light: '#fce8ea' },
  OM: { from: '#DB161B', to: '#009a44', accent: '#DB161B', light: '#fde8e8' },
  BH: { from: '#CE1126', to: '#a8081b', accent: '#CE1126', light: '#fde8ea' },
  KW: { from: '#007A3D', to: '#CE1126', accent: '#007A3D', light: '#e6f4ec' },
  QA: { from: '#8D1B3D', to: '#6a1530', accent: '#8D1B3D', light: '#f5e8ed' },
  IN: { from: '#FF9933', to: '#138808', accent: '#FF9933', light: '#fff3e0' },
  JO: { from: '#007A3D', to: '#CE1126', accent: '#007A3D', light: '#e6f4ec' },
  US: { from: '#3C3B6E', to: '#B22234', accent: '#3C3B6E', light: '#ecedf7' },
  GB: { from: '#012169', to: '#C8102E', accent: '#012169', light: '#e8eaf6' },
  CA: { from: '#FF0000', to: '#cc0000', accent: '#FF0000', light: '#ffe8e8' },
  AU: { from: '#00008B', to: '#006BA6', accent: '#006BA6', light: '#e8f0fa' },
}

function redirectForRole(role) {
  if (role === 'admin') location.href = '/admin'
  else if (role === 'agent') location.href = '/agent'
  else if (role === 'manager') location.href = '/manager'
  else if (role === 'partner') location.href = '/partner'
  else if (role === 'investor') location.href = '/investor'
  else if (role === 'commissioner') location.href = '/commissioner/dashboard'
  else if (role === 'confirmer') location.href = '/confirmer'
  else if (role === 'dropshipper') location.href = '/dropshipper'
  else if (role === 'driver') location.href = '/driver'
  else if (role === 'seo_manager') location.href = '/seo'
  else if (role === 'web_designer') location.href = '/designer'
  else if (role === 'user') location.href = '/user'
  else location.href = '/user'
}

export default function CountryStaffLogin() {
  const toast = useToast()
  const country = resolveCountryFromHost()
  const theme = COUNTRY_THEMES[country?.code] || { from: '#1a1a2e', to: '#16213e', accent: '#4f8ef7', light: '#eef2ff' }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [emailFocus, setEmailFocus] = useState(false)
  const [pwFocus, setPwFocus] = useState(false)
  const [health, setHealth] = useState({ checked: false, reachable: false, ready: false })
  const [particles] = useState(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    dur: 4 + Math.random() * 6,
    delay: Math.random() * 4,
  })))

  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  // Check if already logged in or auto-logging in via URL
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const urlMe = urlParams.get('me');
      
      if (urlToken && urlMe) {
        localStorage.setItem('token', urlToken);
        const meStr = decodeURIComponent(atob(urlMe));
        localStorage.setItem('me', meStr);
        
        // Lock this country for the panel session
        if (country?.code) {
          localStorage.setItem('country_domain_locked_code', country.code);
          localStorage.setItem('country_domain_locked', 'true');
          localStorage.setItem('selected_country', country.code);
          localStorage.removeItem('country_selected_manually');
          localStorage.removeItem('country_auto_defaulted');
        }
        
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error("Failed to parse auto-login token", e);
    }

    const token = localStorage.getItem('token')
    if (token) {
      try {
        const me = JSON.parse(localStorage.getItem('me') || '{}')
        if (me.role) redirectForRole(me.role)
      } catch {}
    }
  }, [country?.code])

  // Health check
  useEffect(() => {
    let cancelled = false
    let attempt = 0
    const delays = [3000, 7000, 15000]
    async function run() {
      try {
        const j = await apiGet('/api/health', { skipCache: true })
        if (cancelled) return
        const ready = Boolean(j?.ready) || j?.status === 'ok'
        setHealth({ checked: true, reachable: true, ready })
        if (!ready) {
          const d = delays[Math.min(attempt, delays.length - 1)]
          attempt++
          setTimeout(() => { if (!cancelled) run() }, d)
        }
      } catch {
        if (cancelled) return
        setHealth({ checked: true, reachable: false, ready: false })
        const d = delays[Math.min(attempt, delays.length - 1)]
        attempt++
        setTimeout(() => { if (!cancelled) run() }, d)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  async function login(e) {
    e.preventDefault()
    if (health.checked && !health.ready) {
      toast.info(!health.reachable ? 'Connection issue. Please retry.' : 'Server is starting. Please wait.')
      return
    }
    setLoading(true)
    try {
      const data = await apiPost('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('me', JSON.stringify(data.user))

      // Lock this country for the panel session
      if (country?.code) {
        localStorage.setItem('country_domain_locked_code', country.code)
        localStorage.setItem('country_domain_locked', 'true')
        localStorage.setItem('selected_country', country.code)
        localStorage.removeItem('country_selected_manually')
        localStorage.removeItem('country_auto_defaulted')
      }

      redirectForRole(data?.user?.role || 'user')
    } catch (err) {
      const status = err?.status
      const msg = String(err?.message || '')
      if (status === 429) toast.info('Too many requests. Please wait.')
      else if (status === 400 || /invalid|incorrect|credentials|password|email/i.test(msg))
        toast.error('Incorrect email or password')
      else toast.error(msg || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const loginBlocked = loading || (health.checked && !health.ready)

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${theme.from} 0%, #0d1117 50%, ${theme.to} 100%)`,
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Floating particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: `${theme.accent}60`,
          animation: `csl-float ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          boxShadow: `0 0 ${p.size * 3}px ${theme.accent}40`,
        }} />
      ))}

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '60vw', height: '60vw',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '50vw', height: '50vw',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.from}25 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Center card */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '16px',
      }}>
        <form
          onSubmit={login}
          style={{
            width: '100%', maxWidth: 420,
            background: 'rgba(13, 17, 23, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 24,
            padding: '40px 36px',
            boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
          autoComplete="on"
        >
          {/* Country badge header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {country ? (
              <>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: `${theme.accent}18`,
                  border: `1px solid ${theme.accent}40`,
                  borderRadius: 100,
                  padding: '8px 18px',
                  marginBottom: 20,
                }}>
                  <span style={{ fontSize: 22 }}>{country.flag}</span>
                  <span style={{ color: theme.accent, fontWeight: 700, fontSize: 13, letterSpacing: '0.05em' }}>
                    {country.name} PANEL
                  </span>
                </div>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: `linear-gradient(135deg, ${theme.accent}30, ${theme.from}60)`,
                  border: `1px solid ${theme.accent}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 28,
                }}>
                  {country.flag}
                </div>
              </>
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, #4f8ef730, #1a1a2e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 24,
              }}>🌐</div>
            )}

            <h1 style={{
              color: '#fff', fontSize: 22, fontWeight: 700,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Welcome back
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6, marginBottom: 0,
            }}>
              {country
                ? `Sign in to the ${country.name} operations panel`
                : 'Sign in to your panel'}
            </p>
          </div>

          {/* Email field */}
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block', color: 'rgba(255,255,255,0.5)',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>Email or Phone</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: emailFocus ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${emailFocus ? `${theme.accent}60` : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12, padding: '0 14px',
              transition: 'all 0.2s',
              boxShadow: emailFocus ? `0 0 0 3px ${theme.accent}15` : 'none',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6"/>
                <path d="M2 7l10 6 10-6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                placeholder="you@company.com"
                autoComplete="username"
                required
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 14, padding: '13px 0',
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', color: 'rgba(255,255,255,0.5)',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>Password</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: pwFocus ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${pwFocus ? `${theme.accent}60` : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12, padding: '0 14px',
              transition: 'all 0.2s',
              boxShadow: pwFocus ? `0 0 0 3px ${theme.accent}15` : 'none',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6"/>
                <path d="M8 11V8a4 4 0 118 0v3" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" strokeLinecap="round"/>
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
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 14, padding: '13px 0',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                tabIndex={-1}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', padding: 4, display: 'flex',
                }}
              >
                {showPw ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.84 20.84 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 7 11 7a20.84 20.84 0 01-4.12 5.23M1 1l22 22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loginBlocked}
            style={{
              width: '100%', padding: '14px',
              background: loginBlocked
                ? 'rgba(255,255,255,0.08)'
                : `linear-gradient(135deg, ${theme.accent}, ${theme.from})`,
              border: 'none', borderRadius: 12,
              color: loginBlocked ? 'rgba(255,255,255,0.3)' : '#fff',
              fontSize: 15, fontWeight: 600, cursor: loginBlocked ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
              boxShadow: loginBlocked ? 'none' : `0 8px 24px ${theme.accent}40`,
              letterSpacing: '0.01em',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'csl-spin 0.7s linear infinite',
                  display: 'inline-block',
                }} />
                Signing in…
              </>
            ) : loginBlocked ? (
              'Server starting…'
            ) : (
              <>
                Sign In
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>

          {/* Health status */}
          {health.checked && !health.ready && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                width: '100%', marginTop: 12, padding: '10px',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, color: '#f87171', fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span style={{
                width: 6, height: 6, background: '#f87171', borderRadius: '50%',
                animation: 'csl-pulse 1.5s ease infinite',
              }} />
              {!health.reachable ? 'Connection issue — tap to retry' : 'Server starting — tap to retry'}
            </button>
          )}

          {/* Footer */}
          <div style={{
            textAlign: 'center', marginTop: 28,
            color: 'rgba(255,255,255,0.2)', fontSize: 12,
          }}>
            {country
              ? <>{country.flag} {country.name} Staff Panel • Powered by <strong style={{ color: 'rgba(255,255,255,0.35)' }}>Buysial</strong></>
              : <>Powered by <strong style={{ color: 'rgba(255,255,255,0.35)' }}>Buysial</strong></>
            }
          </div>
        </form>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes csl-spin { to { transform: rotate(360deg); } }
        @keyframes csl-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes csl-float {
          0% { transform: translateY(0px) scale(1); opacity: 0.4; }
          100% { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
        }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #0d1117 inset !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>
    </div>
  )
}
