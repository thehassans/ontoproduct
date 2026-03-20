import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'

const PROMPT_SEEN_KEY = '__buysial_mobile_delivery_prompt_seen__'
const PROFILE_KEY = '__buysial_mobile_delivery_profile__'

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
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => {
    const profile = readProfile()
    return {
      name: String(profile?.name || '').trim(),
      phone: String(profile?.phone || '').trim(),
    }
  })

  const canSave = useMemo(() => String(form.name || '').trim() && String(form.phone || '').trim(), [form])

  useEffect(() => {
    if (!isNativeApp()) return undefined

    let shouldOpen = false
    try {
      shouldOpen = localStorage.getItem(PROMPT_SEEN_KEY) !== '1'
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

  const closePrompt = (markSeen = true) => {
    if (markSeen) {
      try { localStorage.setItem(PROMPT_SEEN_KEY, '1') } catch {}
    }
    setOpen(false)
  }

  const handleSkip = () => {
    const existing = readProfile()
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        ...existing,
        skipped: true,
        updatedAt: new Date().toISOString(),
      }))
    } catch {}
    closePrompt(true)
  }

  const handleSave = () => {
    if (!canSave) return
    const payload = {
      name: String(form.name || '').trim(),
      phone: String(form.phone || '').trim(),
      skipped: false,
      updatedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('buysialDeliveryProfileUpdated', { detail: payload }))
    } catch {}
    closePrompt(true)
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="mobile-delivery-prompt-backdrop">
        <div className="mobile-delivery-prompt-card" role="dialog" aria-modal="true" aria-labelledby="mobile-delivery-prompt-title">
          <div className="mobile-delivery-prompt-orb orb-a" />
          <div className="mobile-delivery-prompt-orb orb-b" />
          <div className="mobile-delivery-prompt-badge">Deliver smarter</div>
          <h2 id="mobile-delivery-prompt-title">Who should receive your orders?</h2>
          <p>
            Add your delivery name and phone once so checkout feels instant every time.
          </p>

          <div className="mobile-delivery-prompt-fields">
            <label className="mobile-delivery-field">
              <span>Customer name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                autoComplete="name"
              />
            </label>
            <label className="mobile-delivery-field">
              <span>Phone number</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                autoComplete="tel"
                inputMode="tel"
              />
            </label>
          </div>

          <div className="mobile-delivery-prompt-actions">
            <button type="button" className="mobile-delivery-skip" onClick={handleSkip}>Skip</button>
            <button type="button" className="mobile-delivery-save" onClick={handleSave} disabled={!canSave}>Save details</button>
          </div>
        </div>
      </div>

      <style>{`
        .mobile-delivery-prompt-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.52);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .mobile-delivery-prompt-card {
          position: relative;
          width: min(100%, 380px);
          border-radius: 30px;
          padding: 24px;
          overflow: hidden;
          background:
            radial-gradient(circle at top right, rgba(249,115,22,0.18), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,237,0.98) 100%);
          border: 1px solid rgba(255,255,255,0.58);
          box-shadow: 0 30px 90px rgba(15,23,42,0.24);
        }

        .mobile-delivery-prompt-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(28px);
          pointer-events: none;
          opacity: 0.4;
        }

        .mobile-delivery-prompt-orb.orb-a {
          width: 120px;
          height: 120px;
          top: -10px;
          right: -14px;
          background: rgba(249,115,22,0.26);
        }

        .mobile-delivery-prompt-orb.orb-b {
          width: 84px;
          height: 84px;
          left: -20px;
          bottom: 24px;
          background: rgba(59,130,246,0.20);
        }

        .mobile-delivery-prompt-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(148,163,184,0.16);
          color: #ea580c;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .mobile-delivery-prompt-card h2 {
          position: relative;
          margin: 16px 0 8px;
          color: #0f172a;
          font-size: 30px;
          line-height: 1.02;
          letter-spacing: -0.04em;
          font-weight: 900;
        }

        .mobile-delivery-prompt-card p {
          position: relative;
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 600;
        }

        .mobile-delivery-prompt-fields {
          position: relative;
          display: grid;
          gap: 12px;
          margin-top: 20px;
        }

        .mobile-delivery-field {
          display: grid;
          gap: 8px;
        }

        .mobile-delivery-field span {
          color: #334155;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .mobile-delivery-field input {
          height: 54px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.16);
          background: rgba(255,255,255,0.84);
          padding: 0 16px;
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }

        .mobile-delivery-field input:focus {
          border-color: rgba(249,115,22,0.48);
          box-shadow: 0 0 0 4px rgba(249,115,22,0.12);
        }

        .mobile-delivery-prompt-actions {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: 10px;
          margin-top: 20px;
        }

        .mobile-delivery-skip,
        .mobile-delivery-save {
          height: 52px;
          border-radius: 18px;
          border: none;
          font-size: 14px;
          font-weight: 800;
        }

        .mobile-delivery-skip {
          background: rgba(255,255,255,0.78);
          color: #334155;
          border: 1px solid rgba(148,163,184,0.18);
        }

        .mobile-delivery-save {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 42%, #f97316 120%);
          color: #ffffff;
          box-shadow: 0 18px 36px rgba(15,23,42,0.24);
        }

        .mobile-delivery-save:disabled {
          opacity: 0.5;
          box-shadow: none;
        }

        @media (max-width: 480px) {
          .mobile-delivery-prompt-card {
            padding: 20px;
            border-radius: 26px;
          }

          .mobile-delivery-prompt-card h2 {
            font-size: 26px;
          }

          .mobile-delivery-prompt-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>,
    document.body
  )
}
