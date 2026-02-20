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

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <Header onCartClick={() => {}} />

      {/* Minimal header */}
      <div style={{ padding: '28px 16px 12px', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, letterSpacing: -0.3 }}>
          Categories
        </h1>
        <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
          Browse products by category
        </p>
      </div>

      {/* Categories */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '8px 16px 100px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                height: 56, borderRadius: 12,
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categories.map((cat) => {
              const isExpanded = expandedCat === cat._id
              const subs = cat.subcategories || []
              const hasSubs = subs.length > 0
              const img = catImage(cat)

              return (
                <div key={cat._id}>
                  {/* Category row */}
                  <button
                    onClick={() => handleCatClick(cat)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      background: isExpanded ? '#f9fafb' : '#fff',
                      border: '1px solid',
                      borderColor: isExpanded ? '#e5e7eb' : '#f0f0f0',
                      borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    {/* Image or initial */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: img ? 'transparent' : '#f3f4f6',
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {img ? (
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#9ca3af' }}>
                          {(cat.name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                      {cat.name}
                    </span>

                    {/* Count + arrow */}
                    {hasSubs && (
                      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginRight: 2 }}>
                        {subs.length}
                      </span>
                    )}
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        flexShrink: 0,
                        transition: 'transform 0.2s ease',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>

                  {/* Subcategories - minimal list */}
                  {isExpanded && hasSubs && (
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderTop: 'none',
                      borderRadius: '0 0 12px 12px',
                      background: '#fafafa',
                      overflow: 'hidden',
                    }}>
                      {/* View all */}
                      <Link
                        to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px 10px 66px',
                          textDecoration: 'none',
                          borderBottom: '1px solid #f0f0f0',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#f97316' }}>
                          View all {cat.name}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                      </Link>

                      {/* Subcategory items */}
                      {subs.map((sub, i) => {
                        const subImg = catImage(sub)
                        return (
                          <Link
                            key={sub._id || i}
                            to={`/catalog?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 14px 9px 54px',
                              textDecoration: 'none',
                              borderBottom: i < subs.length - 1 ? '1px solid #f0f0f0' : 'none',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                              background: subImg ? 'transparent' : '#e5e7eb',
                              overflow: 'hidden',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {subImg ? (
                                <img src={subImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>
                                  {(sub.name || '?')[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                              {sub.name}
                            </span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                          </Link>
                        )
                      })}
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
