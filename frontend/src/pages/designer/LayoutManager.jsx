import React, { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api'

const AVAILABLE_SECTIONS = [
  { type: 'HomeMiniBanner', label: 'Mini Banner' },
  { type: 'CategoryBrowser', label: 'Categories' },
  { type: 'NewArrivals', label: 'New Arrivals' },
  { type: 'BrandBrowser', label: 'Brands' },
  { type: 'ExploreMoreBlock', label: 'Explore More' },
  { type: 'PromoBlock', label: 'Promo Block' },
  { type: 'CustomBlock', label: 'Custom HTML/Text' }
]

export default function LayoutManager() {
  const [layout, setLayout] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLayout()
  }, [])

  const fetchLayout = async () => {
    try {
      const res = await apiGet('/api/settings/website/content?page=home')
      const elements = Array.isArray(res?.content?.elements) ? res.content.elements : []
      const el = elements.find((e) => e?.id === 'homepage_layout_sections')
      
      if (el?.text) {
        setLayout(JSON.parse(el.text))
      } else {
        setLayout([
          { type: 'HomeMiniBanner' },
          { type: 'CategoryBrowser' },
          { type: 'NewArrivals' },
          { type: 'BrandBrowser' },
          { type: 'ExploreMoreBlock' },
          { type: 'PromoBlock' }
        ])
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load layout.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await apiPost('/api/settings/website/content', {
        page: 'home',
        elements: [{ id: 'homepage_layout_sections', text: JSON.stringify(layout) }]
      })
      window.dispatchEvent(new StorageEvent('storage', { key: 'pageContent_home' }))
    } catch (err) {
      console.error(err)
      setError('Failed to save layout.')
    } finally {
      setSaving(false)
    }
  }

  const moveUp = (index) => {
    if (index === 0) return
    const newLayout = [...layout]
    const temp = newLayout[index]
    newLayout[index] = newLayout[index - 1]
    newLayout[index - 1] = temp
    setLayout(newLayout)
  }

  const moveDown = (index) => {
    if (index === layout.length - 1) return
    const newLayout = [...layout]
    const temp = newLayout[index]
    newLayout[index] = newLayout[index + 1]
    newLayout[index + 1] = temp
    setLayout(newLayout)
  }

  const removeSection = (index) => {
    const newLayout = [...layout]
    newLayout.splice(index, 1)
    setLayout(newLayout)
  }

  const addSection = (type) => {
    const newLayout = [...layout, { type, id: Date.now() }]
    setLayout(newLayout)
  }

  const updateCustomBlock = (index, field, value) => {
    const newLayout = [...layout]
    newLayout[index][field] = value
    setLayout(newLayout)
  }

  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Loading layout manager...</div>

  return (
    <div style={{ background: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Homepage Layout Manager</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>Drag or use arrows to reorder sections. Add custom blocks.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6,
            fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save Layout'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {layout.map((section, idx) => {
            const def = AVAILABLE_SECTIONS.find(s => s.type === section.type)
            return (
              <div key={`${section.type}-${section.id || idx}`} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{def?.label || section.type}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.5 : 1 }}>&uarr;</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === layout.length - 1} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, cursor: idx === layout.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === layout.length - 1 ? 0.5 : 1 }}>&darr;</button>
                    <button onClick={() => removeSection(idx)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', color: '#ef4444' }}>&times;</button>
                  </div>
                </div>

                {section.type === 'CustomBlock' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>HTML Content</label>
                      <textarea
                        value={section.content || ''}
                        onChange={(e) => updateCustomBlock(idx, 'content', e.target.value)}
                        placeholder="<h1>Hello</h1>"
                        style={{ width: '100%', minHeight: 80, padding: 8, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13, fontFamily: 'monospace' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Background</label>
                        <input
                          type="text"
                          value={section.background || ''}
                          onChange={(e) => updateCustomBlock(idx, 'background', e.target.value)}
                          placeholder="#ffffff or transparent"
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Padding</label>
                        <input
                          type="text"
                          value={section.padding || ''}
                          onChange={(e) => updateCustomBlock(idx, 'padding', e.target.value)}
                          placeholder="20px 0"
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ background: '#f1f5f9', padding: 24, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Add Section:</span>
          <select 
            id="add-section-select"
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13, flex: 1 }}
          >
            {AVAILABLE_SECTIONS.map(s => <option key={s.type} value={s.type}>{s.label}</option>)}
          </select>
          <button 
            onClick={() => {
              const val = document.getElementById('add-section-select').value
              addSection(val)
            }}
            style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
