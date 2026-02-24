import React, { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, clearApiCache } from '../../api'

const DEFAULTS = {
  annEnabled: true,
  annText: 'Free Shipping on Orders over $75 · Easy Returns · Trusted Quality',
  annBg: '#111827',
  annColor: '#ffffff',
  navEnabled: true,
  navCategories: 'Fashion,Skincare,Electronics,Women,Men,Kids,Home,Beauty',
}

export default function HomeHeader() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ msg: '', ok: true })
  const [form, setForm] = useState(DEFAULTS)
  const [catList, setCatList] = useState([])
  const [catInput, setCatInput] = useState('')
  const [allCats, setAllCats] = useState([])
  const dragIdx = useRef(null)

  useEffect(() => { load(); loadAllCats() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await apiGet('/api/settings/website/content?page=home', { skipCache: true })
      const els = Array.isArray(res?.content?.elements) ? res.content.elements : []
      const get = (id, fb) => { const e = els.find(x => x?.id === id); return typeof e?.text === 'string' ? e.text : fb }
      const next = {
        annEnabled: get('annBar_enabled', 'true') !== 'false',
        annText: get('annBar_text', DEFAULTS.annText),
        annBg: get('annBar_bg', DEFAULTS.annBg),
        annColor: get('annBar_color', DEFAULTS.annColor),
        navEnabled: get('catNav_enabled', 'true') !== 'false',
        navCategories: get('catNav_categories', DEFAULTS.navCategories),
      }
      setForm(next)
      setCatList(next.navCategories ? next.navCategories.split(',').map(s => s.trim()).filter(Boolean) : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadAllCats() {
    try {
      const res = await apiGet('/api/categories/public?country=UAE')
      const cats = Array.isArray(res?.categories) ? res.categories.map(c => c.name) : []
      setAllCats(cats)
    } catch {}
  }

  async function save() {
    setNotice({ msg: '', ok: true })
    setSaving(true)
    try {
      const elements = [
        { id: 'annBar_enabled', type: 'text', text: form.annEnabled ? 'true' : 'false' },
        { id: 'annBar_text', type: 'text', text: form.annText || '' },
        { id: 'annBar_bg', type: 'text', text: form.annBg || '#111827' },
        { id: 'annBar_color', type: 'text', text: form.annColor || '#ffffff' },
        { id: 'catNav_enabled', type: 'text', text: form.navEnabled ? 'true' : 'false' },
        { id: 'catNav_categories', type: 'text', text: catList.join(',') },
      ]
      const existing = await apiGet('/api/settings/website/content?page=home', { skipCache: true }).catch(() => null)
      const existingEls = Array.isArray(existing?.content?.elements) ? existing.content.elements : []
      const byId = new Map(existingEls.filter(e => e?.id).map(e => [e.id, e]))
      for (const el of elements) byId.set(el.id, el)
      await apiPost('/api/settings/website/content', { page: 'home', elements: Array.from(byId.values()) })
      clearApiCache('/api/settings/website/content')
      setNotice({ msg: 'Saved!', ok: true })
    } catch (err) { setNotice({ msg: err?.message || 'Save failed', ok: false }) }
    finally { setSaving(false); setTimeout(() => setNotice({ msg: '', ok: true }), 3000) }
  }

  const addCat = (name) => {
    const v = (name || catInput).trim()
    if (v && !catList.includes(v)) { setCatList(p => [...p, v]); setCatInput('') }
  }
  const removeCat = (i) => setCatList(p => p.filter((_, idx) => idx !== i))
  const moveCat = (from, to) => {
    if (to < 0 || to >= catList.length) return
    const next = [...catList]; const [item] = next.splice(from, 1); next.splice(to, 0, item); setCatList(next)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>Home Header</h1>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: '4px 0 0' }}>Announcement bar &amp; category navigation bar settings</p>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>

        {/* ── Announcement Bar Card ── */}
        <Section
          title="Announcement Bar"
          subtitle='Thin bar above the header · "Free Shipping on Orders over $75"'
          badge={form.annEnabled ? 'ON' : 'OFF'}
          badgeOk={form.annEnabled}
        >
          <Row>
            <Label>Enabled</Label>
            <Toggle on={form.annEnabled} onChange={v => set('annEnabled', v)} />
          </Row>

          <Row>
            <Label>Text</Label>
            <input
              value={form.annText}
              onChange={e => set('annText', e.target.value)}
              placeholder="Free Shipping on Orders over $75. Easy Returns."
              style={inp}
            />
          </Row>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Row col>
              <Label>Background</Label>
              <ColorPair value={form.annBg} onChange={v => set('annBg', v)} />
            </Row>
            <Row col>
              <Label>Text Color</Label>
              <ColorPair value={form.annColor} onChange={v => set('annColor', v)} />
            </Row>
          </div>

          {/* Live preview */}
          <div>
            <span style={previewLabel}>LIVE PREVIEW</span>
            <div style={{
              background: form.annBg || '#111827',
              padding: '10px 20px',
              textAlign: 'center',
              borderRadius: 10,
              marginTop: 6,
            }}>
              <span style={{ color: form.annColor || '#fff', fontSize: 13, fontWeight: 500 }}>
                {form.annText || 'Announcement text goes here…'}
              </span>
            </div>
          </div>
        </Section>

        {/* ── Category Nav Bar Card ── */}
        <Section
          title="Category Navigation Bar"
          subtitle="Scrollable horizontal tabs below the header · All · Women · Men · Kids ⋮"
          badge={form.navEnabled ? 'ON' : 'OFF'}
          badgeOk={form.navEnabled}
        >
          <Row>
            <Label>Enabled</Label>
            <Toggle on={form.navEnabled} onChange={v => set('navEnabled', v)} />
          </Row>

          <div>
            <Label>Categories <span style={{ color: '#9ca3af', fontWeight: 400 }}>(drag ← → to reorder)</span></Label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input
                value={catInput}
                onChange={e => setCatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCat()}
                placeholder="Type category name…"
                style={{ ...inp, flex: 1 }}
              />
              <button onClick={() => addCat()} style={btnDark}>Add</button>
            </div>

            {/* Quick-add from existing categories */}
            {allCats.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allCats.filter(c => !catList.includes(c)).slice(0, 12).map(c => (
                  <button
                    key={c}
                    onClick={() => addCat(c)}
                    style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', cursor: 'pointer',
                    }}
                  >+ {c}</button>
                ))}
              </div>
            )}

            {/* Reorderable pill list */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {catList.map((cat, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => { dragIdx.current = i }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx.current == null || dragIdx.current === i) return
                    moveCat(dragIdx.current, i)
                    dragIdx.current = null
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    borderRadius: 999, padding: '5px 6px 5px 12px',
                    fontSize: 13, color: '#111827', fontWeight: 600,
                    cursor: 'grab', userSelect: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{ marginRight: 2 }}>{cat}</span>
                  <button onClick={() => moveCat(i, i - 1)} disabled={i === 0} style={arrowBtn}>‹</button>
                  <button onClick={() => moveCat(i, i + 1)} disabled={i === catList.length - 1} style={arrowBtn}>›</button>
                  <button onClick={() => removeCat(i)} style={{ ...arrowBtn, color: '#ef4444', marginLeft: 2 }}>×</button>
                </div>
              ))}
              {catList.length === 0 && (
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, padding: '8px 0' }}>No categories added yet.</p>
              )}
            </div>
          </div>

          {/* Live preview */}
          {catList.length > 0 && (
            <div>
              <span style={previewLabel}>LIVE PREVIEW</span>
              <div style={{
                marginTop: 6, background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 10, overflowX: 'auto',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '0 12px', minHeight: 46, gap: 2, whiteSpace: 'nowrap',
                }}>
                  <span style={{
                    padding: '5px 14px', background: '#111827', color: '#fff',
                    borderRadius: 999, fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>All</span>
                  {catList.map((cat, i) => (
                    <span key={i} style={{
                      padding: '5px 14px', color: '#374151', fontSize: 12, fontWeight: 600,
                      borderRadius: 999, flexShrink: 0,
                    }}>{cat}</span>
                  ))}
                  <span style={{ marginLeft: 'auto', padding: '5px 10px', color: '#6b7280', fontSize: 20, flexShrink: 0 }}>⋮</span>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* Save row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 40 }}>
          <button onClick={save} disabled={saving} style={{
            padding: '12px 32px', background: '#111827', color: '#fff',
            border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {notice.msg && (
            <span style={{ fontSize: 13, fontWeight: 600, color: notice.ok ? '#10b981' : '#ef4444' }}>
              {notice.ok ? '✓ ' : '✕ '}{notice.msg}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, subtitle, badge, badgeOk, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.2px' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0' }}>{subtitle}</p>}
        </div>
        {badge && (
          <span style={{
            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            background: badgeOk ? '#dcfce7' : '#f3f4f6',
            color: badgeOk ? '#16a34a' : '#6b7280',
          }}>{badge}</span>
        )}
      </div>
      <div style={{ display: 'grid', gap: 16 }}>{children}</div>
    </div>
  )
}

function Row({ children, col }) {
  return (
    <div style={{
      display: col ? 'block' : 'flex',
      alignItems: col ? undefined : 'center',
      justifyContent: col ? undefined : 'space-between',
      gap: col ? 6 : 12,
    }}>{children}</div>
  )
}

function Label({ children }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{children}</span>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 46, height: 26, borderRadius: 999, border: 'none',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: on ? '#111827' : '#d1d5db',
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 4, left: on ? 24 : 4, width: 18, height: 18,
        borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function ColorPair({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <input
        type="color"
        value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        style={{ width: 38, height: 38, border: '1px solid #e5e7eb', borderRadius: 10, padding: 3, cursor: 'pointer', background: '#fff', flexShrink: 0 }}
      />
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="#000000"
        style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: 13 }}
      />
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const inp = {
  padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 10,
  fontSize: 14, color: '#111827', outline: 'none',
  background: '#fafafa', width: '100%', boxSizing: 'border-box',
}

const btnDark = {
  padding: '9px 18px', background: '#111827', color: '#fff',
  border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13,
  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
}

const arrowBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '0 3px', fontSize: 15, color: '#6b7280', fontWeight: 700,
  lineHeight: 1, display: 'flex', alignItems: 'center', borderRadius: 4,
}

const previewLabel = {
  fontSize: 10, fontWeight: 700, color: '#9ca3af',
  letterSpacing: '0.08em', textTransform: 'uppercase',
}
