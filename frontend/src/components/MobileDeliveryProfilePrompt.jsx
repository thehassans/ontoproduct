import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { apiGet, apiPost } from '../api.js'
import { useToast } from '../ui/Toast'

const PROMPT_SEEN_KEY = '__buysial_mobile_onboarding_prompt_seen_v2__'
const PROFILE_KEY = '__buysial_mobile_delivery_profile__'
const SIGNUP_PREFILL_KEY = '__buysial_mobile_signup_prefill__'

function isNativeApp() {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') || {}
  } catch {
    return {}
  }
}

export function readMobileDeliveryProfile() {
  return readProfile()
}

export default function MobileDeliveryProfilePrompt() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => {
    const profile = readProfile()
    return {
      name: String(profile?.name || '').trim(),
    }
  })
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleReady, setGoogleReady] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const canContinue = useMemo(() => String(form.name || '').trim().length > 0, [form.name])

  useEffect(() => {
    if (!isNativeApp()) return undefined

    let shouldOpen = false
    try {
      shouldOpen = !localStorage.getItem('token') && localStorage.getItem(PROMPT_SEEN_KEY) !== '1'
    } catch {
      shouldOpen = false
    }
    if (!shouldOpen) return undefined

    const timer = window.setTimeout(() => setOpen(true), 1850)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false
    ;(async () => {
      try {
        const res = await apiGet('/api/settings/google-oauth')
        if (!cancelled) setGoogleClientId(String(res?.clientId || '').trim())
      } catch {}
    })()

    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open || !googleClientId) return undefined
    if (window.google?.accounts?.id) {
      setGoogleReady(true)
      return undefined
    }

    const existing = document.getElementById('buysial-mobile-google-gsi')
    if (existing) {
      const timer = window.setInterval(() => {
        if (window.google?.accounts?.id) {
          setGoogleReady(true)
          window.clearInterval(timer)
        }
      }, 120)
      return () => window.clearInterval(timer)
    }

    const script = document.createElement('script')
    script.id = 'buysial-mobile-google-gsi'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGoogleReady(true)
    document.head.appendChild(script)

    return undefined
  }, [open, googleClientId])

  const closePrompt = useCallback((markSeen = true) => {
    if (markSeen) {
      try { localStorage.setItem(PROMPT_SEEN_KEY, '1') } catch {}
    }
    setOpen(false)
  }, [])

  const persistProfile = useCallback((extra = {}) => {
    const existing = readProfile()
    const payload = {
      ...existing,
      name: String(form.name || '').trim() || String(existing?.name || '').trim(),
      updatedAt: new Date().toISOString(),
      ...extra,
    }
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('buysialDeliveryProfileUpdated', { detail: payload }))
    } catch {}
    return payload
  }, [form.name])

  const handleSkip = useCallback(() => {
    persistProfile({ skipped: true })
    closePrompt(true)
  }, [closePrompt, persistProfile])

  const handleSignup = useCallback(() => {
    if (!canContinue) {
      toast.error('Enter your name to continue')
      return
    }
    const payload = persistProfile({ skipped: false })
    try {
      localStorage.setItem(SIGNUP_PREFILL_KEY, JSON.stringify({ name: payload.name }))
    } catch {}
    closePrompt(true)
    window.location.href = '/register'
  }, [canContinue, closePrompt, persistProfile, toast])

  const handleGoogleLogin = useCallback(async (response) => {
    if (!response?.credential) {
      toast.error('Google sign-in failed')
      return
    }

    setGoogleLoading(true)
    try {
      const data = await apiPost('/api/auth/google', {
        credential: response.credential,
        clientId: googleClientId
      })

      persistProfile({ skipped: false })
      localStorage.setItem('token', data.token)
      localStorage.setItem('me', JSON.stringify(data.user))
      closePrompt(true)
      window.location.href = '/customer'
    } catch (err) {
      toast.error(err?.message || 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }, [closePrompt, googleClientId, persistProfile, toast])

  useEffect(() => {
    if (!open || !googleClientId || !googleReady || !window.google?.accounts?.id) return undefined
    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleLogin,
        auto_select: false,
        cancel_on_tap_outside: true,
      })
    } catch {}
    return undefined
  }, [open, googleClientId, googleReady, handleGoogleLogin])

  const handleGoogleContinue = useCallback(() => {
    persistProfile({ skipped: false })
    if (!googleClientId || !window.google?.accounts?.id) {
      toast.error('Google sign-in is not ready yet')
      return
    }
    try {
      window.google.accounts.id.prompt()
    } catch {
      toast.error('Google sign-in is not ready yet')
    }
  }, [googleClientId, persistProfile, toast])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="mobile-delivery-prompt-backdrop">
        <div className="mobile-delivery-prompt-card" role="dialog" aria-modal="true" aria-labelledby="mobile-delivery-prompt-title">
          <div className="mobile-delivery-prompt-topline">
            <img src={`${import.meta.env.BASE_URL}mobile-app-icon.png`} alt="BuySial" className="mobile-delivery-prompt-logo" />
            <span>Buysial</span>
          </div>

          <h2 id="mobile-delivery-prompt-title">Start with your name</h2>
          <p>Use a minimal setup now, then finish the rest later.</p>

          <div className="mobile-delivery-prompt-fields">
            <label className="mobile-delivery-field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
          </div>

          <div className="mobile-delivery-prompt-actions stacked">
            <button type="button" className="mobile-delivery-save" onClick={handleSignup} disabled={!canContinue}>Sign up</button>
            <button type="button" className="mobile-delivery-google" onClick={handleGoogleContinue} disabled={googleLoading || !googleClientId || !googleReady}>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>
          </div>

          <button type="button" className="mobile-delivery-skip-link" onClick={handleSkip}>Skip for now</button>
        </div>
      </div>

      <style>{`
        .mobile-delivery-prompt-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .mobile-delivery-prompt-card {
          width: min(100%, 332px);
          border-radius: 24px;
          padding: 20px 18px 16px;
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15,23,42,0.06);
          box-shadow: 0 24px 80px rgba(15,23,42,0.12);
        }

        .mobile-delivery-prompt-topline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mobile-delivery-prompt-logo {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .mobile-delivery-prompt-card h2 {
          margin: 14px 0 6px;
          color: #0f172a;
          font-size: 22px;
          line-height: 1.08;
          letter-spacing: -0.04em;
          font-weight: 700;
        }

        .mobile-delivery-prompt-card p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
          font-weight: 500;
        }

        .mobile-delivery-prompt-fields {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .mobile-delivery-field {
          display: grid;
          gap: 6px;
        }

        .mobile-delivery-field span {
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .mobile-delivery-field input {
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,0.18);
          background: #ffffff;
          padding: 0 13px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 600;
          outline: none;
        }

        .mobile-delivery-field input:focus {
          border-color: rgba(249,115,22,0.40);
          box-shadow: 0 0 0 4px rgba(249,115,22,0.10);
        }

        .mobile-delivery-prompt-actions.stacked {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }

        .mobile-delivery-save,
        .mobile-delivery-google {
          height: 42px;
          border-radius: 14px;
          border: none;
          font-size: 12px;
          font-weight: 700;
        }

        .mobile-delivery-save {
          background: #0f172a;
          color: #ffffff;
        }

        .mobile-delivery-google {
          background: #f8fafc;
          color: #0f172a;
          border: 1px solid rgba(148,163,184,0.18);
        }

        .mobile-delivery-save:disabled,
        .mobile-delivery-google:disabled {
          opacity: 0.5;
        }

        .mobile-delivery-skip-link {
          margin-top: 10px;
          width: 100%;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        @media (max-width: 480px) {
          .mobile-delivery-prompt-card {
            width: min(100%, 312px);
            padding: 18px 16px 14px;
          }

          .mobile-delivery-prompt-card h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </>,
    document.body
  )
}
