import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api'

export default function HomeHeadline() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    enabled: true,
    badge: 'Premium Shopping',
    title: 'Discover premium products, delivered fast',
    subtitle: 'Curated collections, trusted quality, and seamless shopping across the Gulf.',
    chip1: '',
    chip2: '',
    chip3: '',
    chip4: '',
    speed: '18',
    bg1: '#0b5ed7',
    bg2: '#f97316',
    textColor: '#ffffff'
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await apiGet('/api/settings/website/content?page=home')
        const elements = Array.isArray(res?.content?.elements) ? res.content.elements : []
        const getText = (id, fallback = '') => {
          const el = elements.find((e) => e?.id === id)
          return typeof el?.text === 'string' ? el.text : fallback
        }

        const enabledRaw = getText('homeHeadline_enabled', 'true')
        const next = {
          enabled: String(enabledRaw).toLowerCase() !== 'false',
          badge: getText('homeHeadline_badge', form.badge),
          title: getText('homeHeadline_title', form.title),
          subtitle: getText('homeHeadline_subtitle', form.subtitle),
          chip1: getText('homeHeadline_chip1', form.chip1),
          chip2: getText('homeHeadline_chip2', form.chip2),
          chip3: getText('homeHeadline_chip3', form.chip3),
          chip4: getText('homeHeadline_chip4', form.chip4),
          speed: getText('homeHeadline_speed', form.speed),
          bg1: getText('homeHeadline_bg1', form.bg1),
          bg2: getText('homeHeadline_bg2', form.bg2),
          textColor: getText('homeHeadline_textColor', form.textColor)
        }

        if (alive) setForm(next)
      } catch (err) {
        console.error(err)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function save() {
    setNotice('')
    setSaving(true)
    try {
      const elements = [
        { id: 'homeHeadline_enabled', type: 'text', text: form.enabled ? 'true' : 'false' },
        { id: 'homeHeadline_badge', type: 'text', text: form.badge || '' },
        { id: 'homeHeadline_title', type: 'text', text: form.title || '' },
        { id: 'homeHeadline_subtitle', type: 'text', text: form.subtitle || '' },
        { id: 'homeHeadline_chip1', type: 'text', text: form.chip1 || '' },
        { id: 'homeHeadline_chip2', type: 'text', text: form.chip2 || '' },
        { id: 'homeHeadline_chip3', type: 'text', text: form.chip3 || '' },
        { id: 'homeHeadline_chip4', type: 'text', text: form.chip4 || '' },
        { id: 'homeHeadline_speed', type: 'text', text: String(form.speed || '').trim() },
        { id: 'homeHeadline_bg1', type: 'text', text: String(form.bg1 || '').trim() },
        { id: 'homeHeadline_bg2', type: 'text', text: String(form.bg2 || '').trim() },
        { id: 'homeHeadline_textColor', type: 'text', text: String(form.textColor || '').trim() }
      ]

      await apiPost('/api/settings/website/content', { page: 'home', elements })
      setNotice('Saved')
    } catch (err) {
      console.error(err)
      setNotice(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="section">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Home Headline</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Configure the premium headline strip shown on the homepage below the banner.
        </p>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 900 }}>
        {loading ? (
          <div style={{ padding: 24, color: 'var(--muted)' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {notice ? (
              <div style={{ fontSize: 13, color: notice === 'Saved' ? '#10b981' : '#ef4444' }}>{notice}</div>
            ) : null}

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={!!form.enabled}
                onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
              />
              Enable headline strip
            </label>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Badge</div>
              <input
                className="input"
                value={form.badge}
                onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
                placeholder="e.g. Premium Shopping"
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Title</div>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Main headline"
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Subtitle</div>
              <textarea
                className="input"
                value={form.subtitle}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="Short description"
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Ticker speed (seconds per loop)</div>
                <input
                  className="input"
                  type="number"
                  min={5}
                  max={300}
                  value={form.speed}
                  onChange={(e) => setForm((p) => ({ ...p, speed: e.target.value }))}
                  placeholder="e.g. 18"
                />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Background color 1 (logo blue)</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={form.bg1}
                    onChange={(e) => setForm((p) => ({ ...p, bg1: e.target.value }))}
                    style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
                  />
                  <input
                    className="input"
                    value={form.bg1}
                    onChange={(e) => setForm((p) => ({ ...p, bg1: e.target.value }))}
                    placeholder="#0b5ed7"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Background color 2 (logo orange)</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={form.bg2}
                    onChange={(e) => setForm((p) => ({ ...p, bg2: e.target.value }))}
                    style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
                  />
                  <input
                    className="input"
                    value={form.bg2}
                    onChange={(e) => setForm((p) => ({ ...p, bg2: e.target.value }))}
                    placeholder="#f97316"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Text color</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={form.textColor}
                    onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))}
                    style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
                  />
                  <input
                    className="input"
                    value={form.textColor}
                    onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Ticker item 1</div>
                <input className="input" value={form.chip1} onChange={(e) => setForm((p) => ({ ...p, chip1: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Ticker item 2</div>
                <input className="input" value={form.chip2} onChange={(e) => setForm((p) => ({ ...p, chip2: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Ticker item 3</div>
                <input className="input" value={form.chip3} onChange={(e) => setForm((p) => ({ ...p, chip3: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Ticker item 4</div>
                <input className="input" value={form.chip4} onChange={(e) => setForm((p) => ({ ...p, chip4: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
              <button className="btn primary" disabled={saving} onClick={save}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <a className="btn" href="/" target="_blank" rel="noreferrer">
                Preview
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
