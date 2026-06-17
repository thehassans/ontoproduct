import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api'

const AVAILABLE_SECTIONS = [
  { type: 'HomeMiniBanner', label: 'Mini Banner', editRoute: '/designer/home-mini-banners' },
  { type: 'CategoryBrowser', label: 'Categories', editRoute: '/designer/categories' },
  { type: 'NewArrivals', label: 'New Arrivals' },
  { type: 'BrandBrowser', label: 'Brands', editRoute: '/designer/brands' },
  { type: 'ExploreMoreBlock', label: 'Explore More', editRoute: '/designer/explore-more' },
  { type: 'PromoBlock', label: 'Promo Block' },
  { type: 'CustomBlock', label: 'Custom HTML/Text' }
]

export default function LayoutManager() {
  const navigate = useNavigate()
  const [layout, setLayout] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  // State to track which index is currently showing the "Add Section" popover
  const [insertIndex, setInsertIndex] = useState(null)
  // Track which custom block is currently being edited
  const [editingIndex, setEditingIndex] = useState(null)

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
    if (editingIndex === index) setEditingIndex(null)
  }

  const addSection = (type, index) => {
    const newLayout = [...layout]
    // Insert at the given index
    newLayout.splice(index, 0, { type, id: Date.now() })
    setLayout(newLayout)
    setInsertIndex(null)
    if (type === 'CustomBlock') {
      setEditingIndex(index)
    }
  }

  const updateCustomBlock = (index, field, value) => {
    const newLayout = [...layout]
    newLayout[index][field] = value
    setLayout(newLayout)
  }

  const handleEditClick = (section, idx) => {
    const def = AVAILABLE_SECTIONS.find(s => s.type === section.type)
    if (def?.editRoute) {
      navigate(def.editRoute)
    } else if (section.type === 'CustomBlock') {
      setEditingIndex(editingIndex === idx ? null : idx)
    }
  }

  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Loading layout manager...</div>

  // Render a subtle + button between sections
  const InsertPoint = ({ index }) => (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: '-8px 0', zIndex: 10 }}>
      {insertIndex === index ? (
        <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Add Section Here</span>
            <button onClick={() => setInsertIndex(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {AVAILABLE_SECTIONS.map(s => (
              <button
                key={s.type}
                onClick={() => addSection(s.type, index)}
                style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#1d4ed8' }}
                onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setInsertIndex(index)}
          style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#3b82f6', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          onMouseOver={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)' }}
          onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.transform = 'scale(1)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
    </div>
  )

  return (
    <div style={{ background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>Homepage Layout Editor</h2>
          <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#64748b' }}>Design your storefront by organizing sections. Add custom content or reorder existing elements.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8,
            fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => !saving && (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={e => !saving && (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {saving ? 'Saving...' : 'Save & Publish'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px 16px', borderRadius: 8, marginBottom: 24, fontSize: 14, fontWeight: 500, border: '1px solid #fecaca' }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InsertPoint index={0} />

            {layout.map((section, idx) => {
              const def = AVAILABLE_SECTIONS.find(s => s.type === section.type)
              const canEdit = !!def?.editRoute || section.type === 'CustomBlock'

              return (
                <React.Fragment key={`${section.type}-${section.id || idx}`}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                          {idx + 1}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{def?.label || section.type}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {canEdit && (
                          <button onClick={() => handleEditClick(section, idx)} style={{ padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                            {section.type === 'CustomBlock' && editingIndex === idx ? 'Close Edit' : 'Edit'}
                          </button>
                        )}
                        <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 4px' }} />
                        <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1, color: '#64748b' }}>&uarr;</button>
                        <button onClick={() => moveDown(idx)} disabled={idx === layout.length - 1} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6, cursor: idx === layout.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === layout.length - 1 ? 0.4 : 1, color: '#64748b' }}>&darr;</button>
                        <button onClick={() => removeSection(idx)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#ef4444', marginLeft: 4 }}>&times;</button>
                      </div>
                    </div>

                    {section.type === 'CustomBlock' && editingIndex === idx && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>HTML Content</label>
                          <textarea
                            value={section.content || ''}
                            onChange={(e) => updateCustomBlock(idx, 'content', e.target.value)}
                            placeholder="<h1>Hello World</h1>&#10;<p>Write custom HTML here...</p>"
                            style={{ width: '100%', minHeight: 120, padding: 12, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Background Color</label>
                            <input
                              type="text"
                              value={section.background || ''}
                              onChange={(e) => updateCustomBlock(idx, 'background', e.target.value)}
                              placeholder="#ffffff or transparent"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, outline: 'none' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Padding</label>
                            <input
                              type="text"
                              value={section.padding || ''}
                              onChange={(e) => updateCustomBlock(idx, 'padding', e.target.value)}
                              placeholder="e.g. 20px 0"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, outline: 'none' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Text Color</label>
                            <input
                              type="text"
                              value={section.textColor || ''}
                              onChange={(e) => updateCustomBlock(idx, 'textColor', e.target.value)}
                              placeholder="e.g. #000000"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, outline: 'none' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <InsertPoint index={idx + 1} />
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
