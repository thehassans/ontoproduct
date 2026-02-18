import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

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
  if (n.includes('home') || n.includes('house') || n.includes('furniture')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2V9.5z" /><path d="M9 22V12h6v10" /></svg>
  if (n.includes('fashion') || n.includes('cloth') || n.includes('wear') || n.includes('dress')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 2L2 7l4.5 1.5L12 22l5.5-13.5L22 7l-4.5-5L12 5.5z" /></svg>
  if (n.includes('electr') || n.includes('tech') || n.includes('computer') || n.includes('phone') || n.includes('mobile')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
  if (n.includes('beauty') || n.includes('cosmetic') || n.includes('skin') || n.includes('care')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></svg>
  if (n.includes('sport') || n.includes('fitness') || n.includes('gym')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 000 20M2 12h20" /></svg>
  if (n.includes('food') || n.includes('grocery') || n.includes('kitchen')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><path d="M6 1v3M10 1v3M14 1v3" /></svg>
  if (n.includes('toy') || n.includes('kid') || n.includes('baby') || n.includes('child')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /><path d="M12 2a10 10 0 110 20 10 10 0 010-20z" /></svg>
  if (n.includes('auto') || n.includes('car') || n.includes('vehicle')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 00-.84-.99L16 11l-2.7-3.6a1 1 0 00-.8-.4H5.24a2 2 0 00-1.8 1.1l-.8 1.63A6 6 0 002 12.42V16h2" /><circle cx="6.5" cy="16.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></svg>
  if (n.includes('jewel') || n.includes('watch') || n.includes('accessor')) return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="7" /><polyline points="12 9 12 12 13.5 13.5" /><path d="M16.51 17.35l-.35 3.83a2 2 0 01-2 1.82H9.83a2 2 0 01-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 019.83 1h4.35a2 2 0 012 1.82l.35 3.83" /></svg>
  return DEFAULT_ICON
}

const COUNTRY_MAP = {
  SA: 'Saudi Arabia', AE: 'UAE', OM: 'Oman', BH: 'Bahrain',
  IN: 'India', KW: 'Kuwait', QA: 'Qatar', JO: 'Jordan',
  PK: 'Pakistan', US: 'USA', GB: 'UK', CA: 'Canada', AU: 'Australia',
}

export default function CategoryBrowser({ selectedCountry = 'GB' }) {
  const [categories, setCategories] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [catProducts, setCatProducts] = useState({})
  const scrollRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const countryName = COUNTRY_MAP[selectedCountry] || selectedCountry || ''
        const res = await apiGet(`/api/categories/public?country=${encodeURIComponent(countryName)}`)
        const cats = Array.isArray(res?.categories) ? res.categories : []
        if (alive) {
          setCategories(cats)
          setActiveIdx(0)
          setCatProducts({})
        }
      } catch {
        if (alive) setCategories([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [selectedCountry])

  const active = categories[activeIdx] || categories[0]
  const subs = active?.subcategories || []
  const hasSubs = subs.length > 0
  const catKey = active?._id || active?.name || ''

  useEffect(() => {
    if (!active || hasSubs) return
    if (catProducts[catKey]) return
    let alive = true
    ;(async () => {
      try {
        const qs = new URLSearchParams()
        qs.set('page', '1')
        qs.set('limit', '3')
        qs.set('sort', 'newest')
        qs.set('category', active.name)
        const countryName = COUNTRY_MAP[selectedCountry] || selectedCountry || ''
        if (countryName) qs.set('country', countryName)
        const res = await apiGet(`/api/products/public?${qs.toString()}`)
        const products = Array.isArray(res?.products) ? res.products : []
        if (alive) setCatProducts(prev => ({ ...prev, [catKey]: products }))
      } catch {
        if (alive) setCatProducts(prev => ({ ...prev, [catKey]: [] }))
      }
    })()
    return () => { alive = false }
  }, [active, hasSubs, catKey, selectedCountry])

  if (loading || categories.length === 0) return null

  const fallbackProducts = catProducts[catKey] || []

  const CardItem = ({ to, imgSrc, label, isProduct }) => (
    <Link
      to={to}
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
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg' }}
          />
        ) : (
          <div style={{ color: '#c9bfb0' }}>{getCategoryIcon(label)}</div>
        )}
      </div>
      <div style={{ padding: '10px 8px', textAlign: 'center' }}>
        <span
          style={{
            fontSize: isProduct ? 11 : 12,
            fontWeight: 700,
            color: '#3d3529',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {label}
        </span>
      </div>
    </Link>
  )

  return (
    <section className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4" style={{ marginTop: 6, marginBottom: 6 }}>
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
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2, color: '#3d3529', textTransform: 'uppercase' }}>
            Categories
          </h2>
          <Link
            to="/catalog"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#a3896b', textDecoration: 'none' }}
          >
            View All
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
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
                  onClick={() => { setActiveIdx(idx); if (scrollRef.current) scrollRef.current.scrollTop = 0 }}
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
                    transition: 'all 0.2s ease',
                    color: isActive ? '#3d3529' : '#9a9083',
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
                    ) : cat.image ? (
                      <img
                        src={mediaUrl(cat.image)}
                        alt=""
                        style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6 }}
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

          {/* RIGHT — Subcategory or Product Cards Grid */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              padding: '8px 10px 14px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {hasSubs ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {subs.map((sub) => (
                  <CardItem
                    key={sub._id}
                    to={`/catalog?category=${encodeURIComponent(active.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                    imgSrc={sub.image ? mediaUrl(sub.image) : null}
                    label={sub.name}
                  />
                ))}
              </div>
            ) : fallbackProducts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {fallbackProducts.map((p) => (
                  <CardItem
                    key={p._id}
                    to={`/product/${p._id}`}
                    imgSrc={mediaUrl(p?.images?.[0] || p?.imagePath || '') || null}
                    label={p.name}
                    isProduct
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#c9bfb0', fontSize: 14 }}>
                No items yet
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
