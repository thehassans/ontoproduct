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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <Header onCartClick={() => {}} />

      {/* Ultra-premium hero header */}
      <div style={{ padding: '32px 16px 16px', maxWidth: 1180, margin: '0 auto' }}>
        <div style={{
          borderRadius: 32,
          padding: '36px 32px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e293b 100%)',
          boxShadow: '0 30px 80px rgba(15,23,42,0.20), 0 8px 24px rgba(15,23,42,0.08)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative glow */}
          <div style={{
            position: 'absolute', top: '-40%', right: '-10%',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30%', left: '-5%',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 999,
                background: 'rgba(249,115,22,0.12)',
                border: '1px solid rgba(249,115,22,0.2)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: '#fb923c',
                marginBottom: 16,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/></svg>
                Explore Catalog
              </div>
              <h1 style={{
                fontSize: 34, fontWeight: 800, color: '#fff',
                margin: 0, letterSpacing: -0.8,
                fontFamily: "'Outfit','Inter',-apple-system,sans-serif",
              }}>
                Browse Categories
              </h1>
              <p style={{
                fontSize: 15, color: 'rgba(255,255,255,0.65)',
                margin: '10px 0 0', maxWidth: 480, lineHeight: 1.5,
              }}>
                Discover curated collections across every category. Tap to explore subcategories and find exactly what you need.
              </p>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 18px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 13,
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <span style={{ opacity: 0.6 }}>Shopping for</span>
              <span style={{ color: '#fb923c' }}>{countryLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 16px 100px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                height: 160, borderRadius: 28,
                background: 'linear-gradient(135deg, rgba(226,232,240,0.5), rgba(241,245,249,0.3))',
                border: '1px solid rgba(226,232,240,0.4)',
                animation: 'catShimmer 1.8s ease infinite',
              }} />
            ))}
            <style>{`@keyframes catShimmer { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
          </div>
        ) : categories.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 0',
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(12px)',
            borderRadius: 28,
            border: '1px solid rgba(226,232,240,0.4)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.04))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#475569', margin: 0 }}>No categories available</p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '6px 0 0' }}>Check back soon for new collections</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
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
                      display: 'flex', alignItems: 'center', gap: 18,
                      padding: '20px 22px',
                      background: 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(12px)',
                      border: '1.5px solid',
                      borderColor: isExpanded ? 'rgba(249,115,22,0.2)' : 'rgba(226,232,240,0.5)',
                      borderRadius: isExpanded ? '28px 28px 0 0' : 28,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                      textAlign: 'left',
                      boxShadow: isExpanded
                        ? '0 30px 70px rgba(15,23,42,0.10), 0 4px 12px rgba(15,23,42,0.04)'
                        : '0 12px 32px rgba(15,23,42,0.05), 0 2px 8px rgba(15,23,42,0.02)',
                    }}
                    onMouseEnter={e => { if (!isExpanded) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(15,23,42,0.08), 0 4px 12px rgba(15,23,42,0.03)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.15)' } }}
                    onMouseLeave={e => { if (!isExpanded) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,23,42,0.05), 0 2px 8px rgba(15,23,42,0.02)'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.5)' } }}
                  >
                    <div style={{
                      width: 64, height: 64, borderRadius: 20, flexShrink: 0,
                      background: img ? 'transparent' : `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`,
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: img ? '0 8px 20px rgba(15,23,42,0.08)' : `0 12px 28px ${accent[0]}33`,
                    }}>
                      {img ? (
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{
                          fontSize: 22, fontWeight: 800, color: '#fff',
                          textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          fontFamily: "'Outfit','Inter',sans-serif",
                        }}>
                          {(cat.name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 18, fontWeight: 800, color: '#0f172a',
                        marginBottom: 4, letterSpacing: -0.3,
                        fontFamily: "'Outfit','Inter',sans-serif",
                      }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                        {hasSubs ? `${subs.length} subcategories ready to explore` : 'Open this collection'}
                      </div>
                    </div>

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 999,
                      background: isExpanded
                        ? 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.04))'
                        : 'rgba(248,250,252,0.6)',
                      border: isExpanded ? '1px solid rgba(249,115,22,0.15)' : '1px solid transparent',
                      color: isExpanded ? '#ea580c' : '#475569',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                    }}>
                      <span>{hasSubs ? `${subs.length} items` : 'Shop now'}</span>
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{
                          transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && hasSubs && (
                    <div style={{
                      border: '1.5px solid rgba(249,115,22,0.15)',
                      borderTop: 'none',
                      borderRadius: '0 0 28px 28px',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.6) 100%)',
                      backdropFilter: 'blur(12px)',
                      padding: 22,
                      boxShadow: '0 30px 70px rgba(15,23,42,0.10), 0 4px 12px rgba(15,23,42,0.04)',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
                        <Link
                          to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                          style={{
                            minHeight: 140,
                            borderRadius: 24,
                            textDecoration: 'none',
                            padding: 20,
                            color: '#fff',
                            background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`,
                            boxShadow: `0 16px 36px ${accent[0]}30`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 24px 48px ${accent[0]}40` }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 16px 36px ${accent[0]}30` }}
                        >
                          <div style={{
                            fontSize: 11, fontWeight: 800, letterSpacing: '0.22em',
                            textTransform: 'uppercase', opacity: 0.85,
                          }}>
                            Explore all
                          </div>
                          <div>
                            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, fontFamily: "'Outfit','Inter',sans-serif" }}>
                              View all {cat.name}
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 4 }}>
                              Browse the full collection
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </div>
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
                              display: 'flex', alignItems: 'center', gap: 14,
                              padding: '16px 16px',
                              textDecoration: 'none',
                              border: '1px solid rgba(226,232,240,0.5)',
                              borderRadius: 22,
                              background: 'rgba(255,255,255,0.7)',
                              backdropFilter: 'blur(8px)',
                              transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                              boxShadow: '0 8px 20px rgba(15,23,42,0.03)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(15,23,42,0.08)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.15)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.03)'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.5)' }}
                          >
                            <div style={{
                              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                              background: subImg ? 'transparent' : `linear-gradient(135deg, ${subAccent[0]}, ${subAccent[1]})`,
                              overflow: 'hidden',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: subImg ? '0 4px 12px rgba(15,23,42,0.06)' : `0 8px 18px ${subAccent[0]}25`,
                            }}>
                              {subImg ? (
                                <img src={subImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{
                                  fontSize: 13, fontWeight: 800, color: '#fff',
                                  fontFamily: "'Outfit','Inter',sans-serif",
                                }}>
                                  {(sub.name || '?')[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 14, fontWeight: 700, color: '#0f172a',
                                marginBottom: 2, fontFamily: "'Outfit','Inter',sans-serif",
                              }}>
                                {sub.name}
                              </div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>Open products</div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
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
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link
              to="/catalog"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 14, fontWeight: 700, color: '#fff',
                textDecoration: 'none',
                padding: '14px 28px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: '0 8px 24px rgba(249,115,22,0.25)',
                transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(249,115,22,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(249,115,22,0.25)' }}
            >
              Browse all products
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}
