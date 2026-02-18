import React, { useEffect, useState } from 'react'
import { apiGet, apiPost, clearApiCache } from '../../api'

const defaultSlides = [
  {
    title: 'noon one day',
    subtitle: '20% CASHBACK',
    accent: 'Use code',
    codeLabel: '',
    code: 'ONEDAY',
    link: '/catalog',
    bg1: '#fde68a',
    bg2: '#f59e0b',
    textColor: '#111827',
    accentBg: '#ffffff',
    accentText: '#111827',
    codeBg: '#ffffff',
    codeText: '#111827'
  },
  {
    title: 'Extra 20% off',
    subtitle: 'with alrajhi credit cards',
    accent: '25 Jan  1st Feb',
    codeLabel: 'Use code',
    code: 'ARB20',
    link: '/catalog',
    bg1: '#1d4ed8',
    bg2: '#0ea5e9',
    textColor: '#ffffff',
    accentBg: '#fde047',
    accentText: '#111827',
    codeBg: '#111827',
    codeText: '#ffffff'
  }
]

function safeParseSlides(raw, fallback) {
  try {
    const v = JSON.parse(String(raw || ''))
    if (Array.isArray(v)) {
      return v
        .filter(Boolean)
        .map((s) => ({
          title: String(s?.title || '').trim(),
          subtitle: String(s?.subtitle || '').trim(),
          accent: String(s?.accent || '').trim(),
          codeLabel: String(s?.codeLabel || '').trim(),
          code: String(s?.code || '').trim(),
          link: String(s?.link || '').trim(),
          bg1: String(s?.bg1 || '').trim(),
          bg2: String(s?.bg2 || '').trim(),
          textColor: String(s?.textColor || '').trim(),
          accentBg: String(s?.accentBg || '').trim(),
          accentText: String(s?.accentText || '').trim(),
          codeBg: String(s?.codeBg || '').trim(),
          codeText: String(s?.codeText || '').trim(),
        }))
        .filter((s) => s.title || s.subtitle || s.code)
    }
  } catch {}
  return fallback
}

const COUNTRIES = [
  { code: '', name: 'All Countries (Default)' },
  { code: 'UAE', name: 'UAE' }, { code: 'Saudi Arabia', name: 'KSA' },
  { code: 'Oman', name: 'Oman' }, { code: 'Bahrain', name: 'Bahrain' },
  { code: 'India', name: 'India' }, { code: 'Kuwait', name: 'Kuwait' },
  { code: 'Qatar', name: 'Qatar' }, { code: 'Jordan', name: 'Jordan' },
  { code: 'Pakistan', name: 'Pakistan' }, { code: 'USA', name: 'USA' },
  { code: 'UK', name: 'UK' }, { code: 'Canada', name: 'Canada' },
  { code: 'Australia', name: 'Australia' },
]

export default function ProductHeadline() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')

  const [form, setForm] = useState({
    enabled: true,
    speed: '5',
    font: 'system',
    slides: defaultSlides
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const pageKey = selectedCountry ? `catalog_${selectedCountry.replace(/\s+/g, '_')}` : 'catalog'
        const res = await apiGet(`/api/settings/website/content?page=${pageKey}`, { skipCache: true })
        const elements = Array.isArray(res?.content?.elements) ? res.content.elements : []
        const getText = (id, fallback = '') => {
          const el = elements.find((e) => e?.id === id)
          return typeof el?.text === 'string' ? el.text : fallback
        }

        const enabledRaw = getText('catalogHeadline_enabled', 'true')
        const slidesRaw = getText('catalogHeadline_slides', '')
        const speedRaw = getText('catalogHeadline_speed', String(form.speed || '5'))
        const fontRaw = getText('catalogHeadline_font', String(form.font || 'system'))

        const slides = safeParseSlides(slidesRaw, defaultSlides)
        const speed = String(speedRaw || '5').trim()
        const font = String(fontRaw || 'system').trim()

        if (alive) {
          setForm({
            enabled: String(enabledRaw).toLowerCase() !== 'false',
            speed,
            font,
            slides: slides.length ? slides : defaultSlides
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [selectedCountry])

  function updateSlide(idx, patch) {
    setForm((p) => {
      const next = [...(p.slides || [])]
      const curr = next[idx] || {}
      next[idx] = { ...curr, ...patch }
      return { ...p, slides: next }
    })
  }

  function addSlide() {
    setForm((p) => ({
      ...p,
      slides: [...(p.slides || []), { ...defaultSlides[0], code: '', title: 'New offer', subtitle: 'Edit this offer' }]
    }))
  }

  function removeSlide(idx) {
    if (!confirm('Remove this slide?')) return
    setForm((p) => ({
      ...p,
      slides: (p.slides || []).filter((_, i) => i !== idx)
    }))
  }

  async function save() {
    setNotice('')
    setSaving(true)
    try {
      const speedNum = Number(form.speed)
      const speed = Number.isFinite(speedNum) ? String(Math.max(2, Math.min(60, speedNum))) : '5'

      const slides = Array.isArray(form.slides) ? form.slides : []
      const normalizedSlides = slides
        .filter(Boolean)
        .map((s) => ({
          title: String(s?.title || '').trim(),
          subtitle: String(s?.subtitle || '').trim(),
          accent: String(s?.accent || '').trim(),
          codeLabel: String(s?.codeLabel || '').trim(),
          code: String(s?.code || '').trim(),
          link: String(s?.link || '').trim(),
          bg1: String(s?.bg1 || '').trim(),
          bg2: String(s?.bg2 || '').trim(),
          textColor: String(s?.textColor || '').trim(),
          accentBg: String(s?.accentBg || '').trim(),
          accentText: String(s?.accentText || '').trim(),
          codeBg: String(s?.codeBg || '').trim(),
          codeText: String(s?.codeText || '').trim(),
        }))
        .filter((s) => s.title || s.subtitle || s.code)

      const elements = [
        { id: 'catalogHeadline_enabled', type: 'text', text: form.enabled ? 'true' : 'false' },
        { id: 'catalogHeadline_speed', type: 'text', text: speed },
        { id: 'catalogHeadline_font', type: 'text', text: String(form.font || 'system').trim() },
        { id: 'catalogHeadline_slides', type: 'text', text: JSON.stringify(normalizedSlides) }
      ]

      const pageKey = selectedCountry ? `catalog_${selectedCountry.replace(/\s+/g, '_')}` : 'catalog'
      const existing = await apiGet(`/api/settings/website/content?page=${pageKey}`).catch(() => null)
      const existingElements = Array.isArray(existing?.content?.elements) ? existing.content.elements : []
      const byId = new Map(
        existingElements
          .filter((e) => e && typeof e === 'object' && typeof e.id === 'string')
          .map((e) => [e.id, e])
      )
      for (const el of elements) {
        byId.set(el.id, el)
      }
      const mergedElements = Array.from(byId.values())

      await apiPost('/api/settings/website/content', { page: pageKey, elements: mergedElements })
      clearApiCache('/api/settings/website/content')
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
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Product Headline</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Configure the premium offer headline strip shown on the catalog page.
        </p>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 980, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Country:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COUNTRIES.map(c => (
              <button
                key={c.code}
                onClick={() => setSelectedCountry(c.code)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: selectedCountry === c.code ? '2px solid #f97316' : '1px solid #e5e7eb',
                  background: selectedCountry === c.code ? '#fff7ed' : '#fff',
                  color: selectedCountry === c.code ? '#c2410c' : '#374151',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 980 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Slide duration (seconds)</div>
                <input
                  className="input"
                  type="number"
                  min={2}
                  max={60}
                  value={form.speed}
                  onChange={(e) => setForm((p) => ({ ...p, speed: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Font</div>
                <select
                  className="input"
                  value={String(form.font || 'system')}
                  onChange={(e) => setForm((p) => ({ ...p, font: e.target.value }))}
                >
                  <option value="system">System (Premium Sans)</option>
                  <option value="serif">Luxury Serif</option>
                  <option value="mono">Modern Mono</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" type="button" onClick={addSlide}>Add slide</button>
              <a className="btn" href="/catalog" target="_blank" rel="noreferrer">Preview</a>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {(form.slides || []).map((s, idx) => (
                <div key={idx} className="card" style={{ padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ fontWeight: 800 }}>Slide {idx + 1}</div>
                    <button className="btn" type="button" onClick={() => removeSlide(idx)}>Remove</button>
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Title</div>
                        <input className="input" value={s.title} onChange={(e) => updateSlide(idx, { title: e.target.value })} />
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Subtitle</div>
                        <input className="input" value={s.subtitle} onChange={(e) => updateSlide(idx, { subtitle: e.target.value })} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Accent (e.g. dates / Use code)</div>
                        <input className="input" value={s.accent} onChange={(e) => updateSlide(idx, { accent: e.target.value })} />
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Code label</div>
                        <input className="input" value={s.codeLabel} onChange={(e) => updateSlide(idx, { codeLabel: e.target.value })} placeholder="Use code" />
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Code</div>
                        <input className="input" value={s.code} onChange={(e) => updateSlide(idx, { code: e.target.value })} />
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Link (optional)</div>
                        <input className="input" value={s.link} onChange={(e) => updateSlide(idx, { link: e.target.value })} placeholder="/catalog?filter=sale" />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Background 1</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input type="color" value={s.bg1} onChange={(e) => updateSlide(idx, { bg1: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }} />
                          <input className="input" value={s.bg1} onChange={(e) => updateSlide(idx, { bg1: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Background 2</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input type="color" value={s.bg2} onChange={(e) => updateSlide(idx, { bg2: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }} />
                          <input className="input" value={s.bg2} onChange={(e) => updateSlide(idx, { bg2: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Text color</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input type="color" value={s.textColor} onChange={(e) => updateSlide(idx, { textColor: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }} />
                          <input className="input" value={s.textColor} onChange={(e) => updateSlide(idx, { textColor: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Accent bg</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input type="color" value={s.accentBg} onChange={(e) => updateSlide(idx, { accentBg: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }} />
                          <input className="input" value={s.accentBg} onChange={(e) => updateSlide(idx, { accentBg: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Accent text</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input type="color" value={s.accentText} onChange={(e) => updateSlide(idx, { accentText: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }} />
                          <input className="input" value={s.accentText} onChange={(e) => updateSlide(idx, { accentText: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Code bg</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input type="color" value={s.codeBg} onChange={(e) => updateSlide(idx, { codeBg: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }} />
                          <input className="input" value={s.codeBg} onChange={(e) => updateSlide(idx, { codeBg: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Code text</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input type="color" value={s.codeText} onChange={(e) => updateSlide(idx, { codeText: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }} />
                          <input className="input" value={s.codeText} onChange={(e) => updateSlide(idx, { codeText: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
              <button className="btn primary" disabled={saving} onClick={save}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
