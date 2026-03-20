import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'

const SEEN_KEY = '__buysial_delivery_prompt_seen__'
const DRAFT_KEY = '__buysial_delivery_draft__'

function isNativeApp() {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export default function DeliveryDetailsPrompt() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => {
    const draft = readDraft()
    return {
      name: String(draft?.name || '').trim(),
      phone: String(draft?.phone || '').trim(),
    }
  })

  const canSave = useMemo(() => {
    return form.name.trim().length > 1 && form.phone.trim().length > 4
  }, [form])

  useEffect(() => {
    if (!isNativeApp()) return undefined

    try {
      const alreadySeen = localStorage.getItem(SEEN_KEY)
      if (alreadySeen === '1') return undefined
    } catch {}

    const timer = window.setTimeout(() => {
      setOpen(true)
    }, 1900)

    return () => window.clearTimeout(timer)
  }, [])

  function closeAndRemember() {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {}
    setOpen(false)
  }

  function skip() {
    closeAndRemember()
  }

  function save() {
    if (!canSave) return
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      updatedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('buysialDeliveryDraftUpdated', { detail: payload }))
    } catch {}
    closeAndRemember()
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="delivery-first-open-backdrop">
        <div className="delivery-first-open-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-first-open-title">
          <div className="delivery-first-open-chip">First delivery setup</div>
          <div className="delivery-first-open-copy">
            <h2 id="delivery-first-open-title">Who should we deliver to?</h2>
            <p>Add the customer name and phone now for a faster checkout experience.</p>
          </div>

          <div className="delivery-first-open-fields">
            <label className="delivery-first-open-field">
              <span>Customer name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                autoComplete="name"
              />
            </label>
            <label className="delivery-first-open-field">
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

          <div className="delivery-first-open-actions">
            <button type="button" className="delivery-first-open-skip" onClick={skip}>Skip for now</button>
            <button type="button" className="delivery-first-open-save" onClick={save} disabled={!canSave}>Save details</button>
          </div>
        </div>
      </div>

      <style>{`
        .delivery-first-open-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10001;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 24px 16px calc(28px + env(safe-area-inset-bottom, 0px));
          background: linear-gradient(180deg, rgba(15,23,42,0.16) 0%, rgba(15,23,42,0.58) 100%);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .delivery-first-open-modal {
          width: min(100%, 430px);
          border-radius: 28px;
          padding: 22px 18px 18px;
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, #fff7ed 100%);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 28px 80px rgba(15,23,42,0.28);
          display: grid;
          gap: 16px;
        }

        .delivery-first-open-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(249,115,22,0.10);
          color: #ea580c;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .delivery-first-open-copy {
          display: grid;
          gap: 6px;
        }

        .delivery-first-open-copy h2 {
          margin: 0;
          color: #0f172a;
          font-size: 25px;
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 900;
        }

        .delivery-first-open-copy p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 600;
        }

        .delivery-first-open-fields {
          display: grid;
          gap: 12px;
        }

        .delivery-first-open-field {
          display: grid;
          gap: 7px;
        }

        .delivery-first-open-field span {
          color: #334155;
          font-size: 12px;
          font-weight: 800;
        }

        .delivery-first-open-field input {
          width: 100%;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(255,255,255,0.92);
          border-radius: 18px;
          min-height: 54px;
          padding: 0 16px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 700;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
        }

        .delivery-first-open-field input:focus {
          border-color: rgba(249,115,22,0.46);
          box-shadow: 0 0 0 4px rgba(249,115,22,0.10);
        }

        .delivery-first-open-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .delivery-first-open-actions button {
          min-height: 50px;
          border-radius: 18px;
          font-size: 13px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
        }

        .delivery-first-open-actions button:active {
          transform: scale(0.98);
        }

        .delivery-first-open-skip {
          background: rgba(255,255,255,0.9);
          color: #475569;
          border: 1px solid rgba(148,163,184,0.18);
        }

        .delivery-first-open-save {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #ffffff;
          box-shadow: 0 18px 34px rgba(249,115,22,0.24);
        }

        .delivery-first-open-save:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        @media (max-width: 480px) {
          .delivery-first-open-backdrop {
            padding-inline: 12px;
            padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
          }

          .delivery-first-open-modal {
            border-radius: 24px;
            padding: 18px 14px 14px;
          }

          .delivery-first-open-copy h2 {
            font-size: 22px;
          }
        }
      `}</style>
    </>,
    document.body
  )
}
