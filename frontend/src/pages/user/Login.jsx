import React, { useEffect, useState, useRef } from 'react'
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
  const canvasRef = useRef(null)

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

  // Animated background particles
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    let raf
    let w = 0, h = 0
    const particles = []
    const COUNT = 60

    function resize() {
      w = cvs.width = window.innerWidth
      h = cvs.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        o: Math.random() * 0.5 + 0.1,
      })
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.o})`
        ctx.fill()
      }
      // draw faint connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
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
    <div className="ul-root">
      {/* Animated particle canvas */}
      <canvas ref={canvasRef} className="ul-canvas" />

      {/* Floating gradient orbs */}
      <div className="ul-orb ul-orb-1" />
      <div className="ul-orb ul-orb-2" />
      <div className="ul-orb ul-orb-3" />

      {/* Center stage */}
      <div className={`ul-stage ${mounted ? 'ul-mounted' : ''}`}>
        {/* Glass card */}
        <form onSubmit={login} className="ul-card" autoComplete="on">
          {/* Logo */}
          <div className="ul-logo-wrap">
            <div className="ul-logo-ring">
              <img src={logoSrc} alt="BuySial" className="ul-logo-img" />
            </div>
          </div>

          {/* Heading */}
          <div className="ul-heading">
            <h1 className="ul-title">Welcome back</h1>
            <p className="ul-subtitle">Sign in to your management workspace</p>
          </div>

          {/* Email field */}
          <div className={`ul-field ${emailFocus ? 'ul-field--focus' : ''}`}>
            <div className="ul-field-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M2 7l10 6 10-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
              placeholder="Email address"
              autoComplete="email"
              required
              className="ul-input"
            />
          </div>

          {/* Password field */}
          <div className={`ul-field ${pwFocus ? 'ul-field--focus' : ''}`}>
            <div className="ul-field-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPwFocus(true)}
              onBlur={() => setPwFocus(false)}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="ul-input"
            />
            <button type="button" className="ul-eye" onClick={() => setShowPw(s => !s)} tabIndex={-1}>
              {showPw ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.84 20.84 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 7 11 7a20.84 20.84 0 01-4.12 5.23M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
              )}
            </button>
          </div>

          {/* Forgot */}
          <div className="ul-forgot-row">
            <a href="#" className="ul-forgot" onClick={e => { e.preventDefault(); toast.info('Forgot password coming soon') }}>
              Forgot password?
            </a>
          </div>

          {/* Submit */}
          <button type="submit" className="ul-btn" disabled={loading}>
            <span className="ul-btn-shimmer" />
            {loading ? (
              <span className="ul-btn-inner"><span className="ul-spinner" /> Signing in...</span>
            ) : (
              <span className="ul-btn-inner">
                Sign In
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            )}
          </button>

          {/* Health status */}
          {healthBad && (
            <button type="button" className="ul-health" onClick={() => window.location.reload()}>
              <span className="ul-health-dot" />
              Connection issue — tap to retry
            </button>
          )}

          {/* Footer */}
          <div className="ul-footer">
            <span className="ul-footer-text">Powered by</span>
            <span className="ul-footer-brand">BuySial</span>
          </div>
        </form>
      </div>

      <style>{`
        /* ====== Ultra Premium Login ====== */
        .ul-root {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050a18;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .ul-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        /* Floating gradient orbs */
        .ul-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.45;
          z-index: 0;
          will-change: transform;
        }
        .ul-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #1d4ed8 0%, transparent 70%);
          top: -10%; left: -8%;
          animation: ul-float1 18s ease-in-out infinite;
        }
        .ul-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #7c3aed 0%, transparent 70%);
          bottom: -12%; right: -5%;
          animation: ul-float2 22s ease-in-out infinite;
        }
        .ul-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #f97316 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.15;
          animation: ul-float3 15s ease-in-out infinite;
        }

        @keyframes ul-float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, 40px) scale(1.08); }
          66% { transform: translate(-30px, 60px) scale(0.95); }
        }
        @keyframes ul-float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, -30px) scale(1.05); }
          66% { transform: translate(40px, -50px) scale(0.97); }
        }
        @keyframes ul-float3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.3); }
        }

        /* Stage & entrance */
        .ul-stage {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          padding: 24px;
          opacity: 0;
          transform: translateY(30px) scale(0.97);
          transition: opacity 0.8s cubic-bezier(.16,1,.3,1), transform 0.8s cubic-bezier(.16,1,.3,1);
        }
        .ul-stage.ul-mounted {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* Glass card */
        .ul-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 40px 32px 32px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(40px) saturate(1.6);
          -webkit-backdrop-filter: blur(40px) saturate(1.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03),
            0 30px 80px -20px rgba(0,0,0,0.7),
            0 0 60px -10px rgba(29,78,216,0.15),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }

        /* Logo */
        .ul-logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: -4px;
        }
        .ul-logo-ring {
          width: 68px; height: 68px;
          border-radius: 20px;
          background: rgba(255,255,255,0.95);
          display: grid;
          place-items: center;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.3),
            0 0 0 1px rgba(255,255,255,0.1),
            0 0 30px rgba(29,78,216,0.2);
          animation: ul-logoPulse 3s ease-in-out infinite;
        }
        .ul-logo-img {
          height: 42px;
          width: auto;
          display: block;
        }
        @keyframes ul-logoPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1), 0 0 30px rgba(29,78,216,0.2); }
          50% { box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.15), 0 0 50px rgba(29,78,216,0.35); }
        }

        /* Heading */
        .ul-heading {
          text-align: center;
        }
        .ul-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0 0 6px;
          background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ul-subtitle {
          font-size: 14px;
          color: rgba(148, 163, 184, 0.8);
          margin: 0;
          font-weight: 400;
        }

        /* Input fields */
        .ul-field {
          display: flex;
          align-items: center;
          gap: 0;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 0 14px;
          height: 52px;
          transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
        }
        .ul-field--focus {
          border-color: rgba(99, 102, 241, 0.6);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), 0 0 20px rgba(99, 102, 241, 0.08);
          background: rgba(255,255,255,0.06);
        }
        .ul-field-icon {
          flex-shrink: 0;
          width: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(148, 163, 184, 0.5);
          transition: color 0.3s ease;
        }
        .ul-field--focus .ul-field-icon {
          color: rgba(165, 180, 252, 0.9);
        }
        .ul-input {
          flex: 1;
          background: none !important;
          border: none !important;
          outline: none !important;
          color: #e2e8f0 !important;
          font-size: 15px;
          font-weight: 500;
          height: 100%;
          padding: 0;
          letter-spacing: 0.01em;
        }
        .ul-input::placeholder {
          color: rgba(148, 163, 184, 0.4);
          font-weight: 400;
        }
        .ul-input:-webkit-autofill,
        .ul-input:-webkit-autofill:hover,
        .ul-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #e2e8f0 !important;
          -webkit-box-shadow: 0 0 0 40px rgba(5,10,24,0.95) inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .ul-eye {
          flex-shrink: 0;
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(148, 163, 184, 0.4);
          padding: 6px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          transition: color 0.2s, background 0.2s;
        }
        .ul-eye:hover {
          color: rgba(165, 180, 252, 0.9);
          background: rgba(255,255,255,0.05);
        }

        /* Forgot */
        .ul-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
        }
        .ul-forgot {
          font-size: 13px;
          font-weight: 500;
          color: rgba(165, 180, 252, 0.7);
          text-decoration: none;
          transition: color 0.2s;
        }
        .ul-forgot:hover {
          color: #a5b4fc;
          text-decoration: underline;
        }

        /* Submit button */
        .ul-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 52px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%);
          background-size: 200% 200%;
          animation: ul-gradShift 4s ease infinite;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          box-shadow:
            0 8px 30px -4px rgba(99, 102, 241, 0.5),
            0 0 0 1px rgba(99, 102, 241, 0.2),
            inset 0 1px 0 rgba(255,255,255,0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .ul-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 14px 40px -4px rgba(99, 102, 241, 0.6),
            0 0 0 1px rgba(99, 102, 241, 0.3),
            inset 0 1px 0 rgba(255,255,255,0.2);
          filter: brightness(1.08);
        }
        .ul-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .ul-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .ul-btn-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .ul-btn-shimmer {
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: skewX(-20deg);
          animation: ul-shimmer 3s ease-in-out infinite;
        }
        @keyframes ul-shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes ul-gradShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Spinner */
        .ul-spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: ul-spin 0.7s linear infinite;
        }
        @keyframes ul-spin {
          to { transform: rotate(360deg); }
        }

        /* Health */
        .ul-health {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 10px 16px;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .ul-health:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.35);
        }
        .ul-health-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239,68,68,0.6);
          animation: ul-blink 1.5s ease-in-out infinite;
        }
        @keyframes ul-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Footer */
        .ul-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding-top: 4px;
        }
        .ul-footer-text {
          font-size: 11px;
          color: rgba(148, 163, 184, 0.3);
          font-weight: 400;
        }
        .ul-footer-brand {
          font-size: 11px;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Mobile */
        @media (max-width: 480px) {
          .ul-stage { padding: 16px; max-width: 100%; }
          .ul-card { padding: 32px 20px 24px; border-radius: 20px; }
          .ul-title { font-size: 24px; }
          .ul-logo-ring { width: 58px; height: 58px; border-radius: 16px; }
          .ul-logo-img { height: 36px; }
          .ul-field { height: 48px; border-radius: 12px; }
          .ul-btn { height: 48px; border-radius: 12px; }
          .ul-orb-1 { width: 300px; height: 300px; }
          .ul-orb-2 { width: 250px; height: 250px; }
          .ul-orb-3 { width: 180px; height: 180px; }
        }
      `}</style>
    </div>
  )
}
