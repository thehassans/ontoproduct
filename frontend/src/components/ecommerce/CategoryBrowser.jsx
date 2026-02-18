import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

const CATEGORY_ICONS = {
  Home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2V9.5z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  Fashion: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 2L2 7l4.5 1.5L12 22l5.5-13.5L22 7l-4.5-5L12 5.5z" />
    </svg>
  ),
  Electronics: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  Beauty: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  ),
  Sports: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 000 20M2 12h20" />
    </svg>
  ),
}

const DEFAULT_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

function getCategoryIcon(name) {
  const n = String(name || '').toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (n.includes(key.toLowerCase())) return icon
  }
  return DEFAULT_ICON
}

export default function CategoryBrowser({ selectedCountry = 'GB' }) {
  const [categories, setCategories] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const countryMap = {
          SA: 'Saudi Arabia', AE: 'UAE', OM: 'Oman', BH: 'Bahrain',
          IN: 'India', KW: 'Kuwait', QA: 'Qatar', JO: 'Jordan',
          PK: 'Pakistan', US: 'USA', GB: 'UK', CA: 'Canada', AU: 'Australia',
        }
        const countryName = countryMap[selectedCountry] || selectedCountry || ''
        const res = await apiGet(`/api/categories/public?country=${encodeURIComponent(countryName)}`)
        const cats = Array.isArray(res?.categories) ? res.categories : []
        const withSubs = cats.filter(c => c.subcategories && c.subcategories.length > 0)
        if (alive) {
          setCategories(withSubs)
          setActiveIdx(0)
        }
      } catch {
        if (alive) setCategories([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [selectedCountry])

  if (loading || categories.length === 0) return null

  const active = categories[activeIdx] || categories[0]
  const subs = active?.subcategories || []

  return (
    <section className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
      <div
        style={{
          background: '#faf8f5',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid #f0ece6',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 2,
              color: '#3d3529',
              textTransform: 'uppercase',
            }}
          >
            Discover
          </h2>
          <Link
            to="/catalog"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 600,
              color: '#a3896b',
              textDecoration: 'none',
            }}
          >
            View All
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>

        {/* Main Content: left tabs + right grid */}
        <div style={{ display: 'flex', minHeight: 340 }}>
          {/* LEFT — Vertical Category Tabs */}
          <div
            style={{
              width: 88,
              flexShrink: 0,
              background: '#f5f1eb',
              borderRight: '1px solid #ebe6de',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 4,
              paddingBottom: 8,
              overflowY: 'auto',
            }}
          >
            {categories.map((cat, idx) => {
              const isActive = idx === activeIdx
              return (
                <button
                  key={cat._id || idx}
                  onClick={() => setActiveIdx(idx)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '14px 6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? '#faf8f5' : 'transparent',
                    borderLeft: isActive ? '3px solid #a3896b' : '3px solid transparent',
                    borderRight: isActive ? 'none' : 'none',
                    transition: 'all 0.2s ease',
                    color: isActive ? '#3d3529' : '#9a9083',
                    position: 'relative',
                  }}
                >
                  <div style={{ opacity: isActive ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                    {cat.icon ? (
                      <img
                        src={mediaUrl(cat.icon)}
                        alt=""
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      getCategoryIcon(cat.name)
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 800 : 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      lineHeight: 1.2,
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      maxWidth: 72,
                    }}
                  >
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>

          {/* RIGHT — Subcategory Cards Grid */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              padding: '8px 10px 14px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {subs.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                }}
              >
                {subs.map((sub) => {
                  const imgSrc = sub.image
                    ? mediaUrl(sub.image)
                    : null
                  return (
                    <Link
                      key={sub._id}
                      to={`/catalog?category=${encodeURIComponent(sub.name)}`}
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#ffffff',
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: '1px solid #f0ece6',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(163,137,107,0.12)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          background: imgSrc ? '#faf8f5' : 'linear-gradient(135deg, #f5f1eb 0%, #ebe6de 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={sub.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div style={{ color: '#c9bfb0', fontSize: 32 }}>
                            {getCategoryIcon(sub.name)}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          padding: '10px 8px',
                          textAlign: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#3d3529',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {sub.name}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#c9bfb0',
                  fontSize: 14,
                }}
              >
                No subcategories yet
              </div>
            )}

            {/* Explore & Shop Button */}
            <Link
              to={`/catalog?category=${encodeURIComponent(active.name)}`}
              style={{
                display: 'block',
                marginTop: 14,
                padding: '14px 20px',
                background: '#3d3529',
                color: '#faf8f5',
                textAlign: 'center',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#574d3e' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#3d3529' }}
            >
              Explore & Shop
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
