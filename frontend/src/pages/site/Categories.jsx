import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import { apiGet, mediaUrl } from '../../api'

const COUNTRY_MAP = {
  SA: 'Saudi Arabia', AE: 'UAE', OM: 'Oman', BH: 'Bahrain',
  IN: 'India', KW: 'Kuwait', QA: 'Qatar', JO: 'Jordan',
  PK: 'Pakistan', US: 'USA', GB: 'UK', CA: 'Canada', AU: 'Australia',
}

function catImage(cat) {
  if (cat.image) return mediaUrl(cat.image)
  if (cat.icon) return mediaUrl(cat.icon)
  return ''
}

export default function Categories() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCat, setExpandedCat] = useState(null)
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'GB' } catch { return 'GB' }
  })

  useEffect(() => {
    const h = (e) => { if (e.detail?.code) setSelectedCountry(e.detail.code) }
    window.addEventListener('countryChanged', h)
    return () => window.removeEventListener('countryChanged', h)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const countryName = COUNTRY_MAP[selectedCountry] || selectedCountry || ''
        const res = await apiGet(`/api/categories/public?country=${encodeURIComponent(countryName)}`)
        const cats = Array.isArray(res?.categories) ? res.categories : []
        if (alive) setCategories(cats.filter(c => c.parent === null || !c.parent))
      } catch {
        if (alive) setCategories([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [selectedCountry])

  const handleCatClick = (cat) => {
    const subs = cat.subcategories || []
    if (subs.length > 0) {
      setExpandedCat(prev => prev === cat._id ? null : cat._id)
    } else {
      navigate(`/catalog?category=${encodeURIComponent(cat.name)}`)
    }
  }

  const countryLabel = COUNTRY_MAP[selectedCountry] || selectedCountry || 'Global'
  const accentFor = (name) => {
    const palettes = [
      ['#f97316', '#fb7185'],
      ['#0f172a', '#334155'],
      ['#14b8a6', '#06b6d4'],
      ['#8b5cf6', '#6366f1'],
      ['#22c55e', '#84cc16'],
    ]
    const seed = Array.from(String(name || '')).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
    return palettes[seed % palettes.length]
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header onCartClick={() => {}} />

      {/* Minimal header */}
      <div style={{ padding: '28px 16px 12px', maxWidth: 1180, margin: '0 auto' }}>
        <div style={{
          borderRadius: 28,
          padding: '22px 20px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
          boxShadow: '0 22px 60px rgba(15,23,42,0.16)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
                Explore catalog
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -0.6 }}>
                Categories
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', margin: '8px 0 0' }}>
                Tap a category to open its subcategories and jump straight into the right collection.
              </p>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 13,
              fontWeight: 700,
            }}>
              <span style={{ opacity: 0.7 }}>Shopping for</span>
              <span>{countryLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '10px 16px 100px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                height: 144, borderRadius: 24,
                background: '#f5f5f5',
                animation: 'pulse 1.5s ease infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>No categories available</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {categories.map((cat) => {
              const isExpanded = expandedCat === cat._id
              const subs = cat.subcategories || []
              const hasSubs = subs.length > 0
              const img = catImage(cat)
              const accent = accentFor(cat.name)

              return (
                <div key={cat._id}>
                  {/* Category row */}
                  <button
                    onClick={() => handleCatClick(cat)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '18px 18px',
                      background: '#fff',
                      border: '1px solid',
                      borderColor: isExpanded ? '#dbe4ee' : '#e5e7eb',
                      borderRadius: isExpanded ? '24px 24px 0 0' : 24,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      textAlign: 'left',
                      boxShadow: isExpanded ? '0 24px 55px rgba(15,23,42,0.08)' : '0 10px 28px rgba(15,23,42,0.04)',
                    }}
                  >
                    <div style={{
                      width: 58, height: 58, borderRadius: 18, flexShrink: 0,
                      background: img ? 'transparent' : `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`,
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 12px 24px rgba(15,23,42,0.08)',
                    }}>
                      {img ? (
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
                          {(cat.name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        {hasSubs ? `${subs.length} subcategories ready to explore` : 'Open this collection'}
                      </div>
                    </div>

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 999,
                      background: isExpanded ? '#eff6ff' : '#f8fafc',
                      color: isExpanded ? '#2563eb' : '#475569',
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      <span>{hasSubs ? `${subs.length} items` : 'Shop now'}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        transition: 'transform 0.2s ease',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                      }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                    </div>
                  </button>

                  {isExpanded && hasSubs && (
                    <div style={{
                      border: '1px solid #dbe4ee',
                      borderTop: 'none',
                      borderRadius: '0 0 24px 24px',
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                      padding: 18,
                      boxShadow: '0 24px 55px rgba(15,23,42,0.08)',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <Link
                          to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                          style={{
                            minHeight: 126,
                            borderRadius: 22,
                            textDecoration: 'none',
                            padding: 18,
                            color: '#fff',
                            background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`,
                            boxShadow: '0 16px 32px rgba(249,115,22,0.18)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.8 }}>
                            Explore all
                          </div>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>View all {cat.name}</div>
                            <div style={{ fontSize: 13, opacity: 0.9 }}>Browse the full collection</div>
                          </div>
                        </Link>

                      {subs.map((sub, i) => {
                        const subImg = catImage(sub)
                        const subAccent = accentFor(sub.name)
                        return (
                          <Link
                            key={sub._id || i}
                            to={`/catalog?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '14px 14px',
                              textDecoration: 'none',
                              border: '1px solid #e2e8f0',
                              borderRadius: 20,
                              background: '#fff',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                              boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(15,23,42,0.08)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(15,23,42,0.04)' }}
                          >
                            <div style={{
                              width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                              background: subImg ? 'transparent' : `linear-gradient(135deg, ${subAccent[0]}, ${subAccent[1]})`,
                              overflow: 'hidden',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {subImg ? (
                                <img src={subImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                                  {(sub.name || '?')[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                                {sub.name}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>Open products</div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                          </Link>
                        )
                      })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Browse all link */}
        {!loading && categories.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link
              to="/catalog"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, color: '#f97316',
                textDecoration: 'none',
              }}
            >
              Browse all products
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}
