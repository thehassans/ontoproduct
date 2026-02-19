import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

const COUNTRY_MAP = {
  SA: 'Saudi Arabia', AE: 'UAE', OM: 'Oman', BH: 'Bahrain',
  IN: 'India', KW: 'Kuwait', QA: 'Qatar', JO: 'Jordan',
  PK: 'Pakistan', US: 'USA', GB: 'UK', CA: 'Canada', AU: 'Australia',
}

function getDefaultCategoryImage(name) {
  const n = String(name || '').toLowerCase()
  if (n.includes('beauty') || n.includes('cosmetic') || n.includes('skin')) return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop'
  if (n.includes('electr') || n.includes('tech') || n.includes('phone') || n.includes('mobile') || n.includes('computer')) return 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop'
  if (n.includes('fashion') || n.includes('cloth') || n.includes('wear') || n.includes('dress')) return 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop'
  if (n.includes('hair')) return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop'
  if (n.includes('health') || n.includes('wellness') || n.includes('medical') || n.includes('pharma')) return 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=400&fit=crop'
  if (n.includes('home') || n.includes('house') || n.includes('furniture') || n.includes('decor')) return 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'
  if (n.includes('jewel') || n.includes('watch') || n.includes('accessor') || n.includes('ring') || n.includes('necklace')) return 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop'
  if (n.includes('kitchen') || n.includes('food') || n.includes('grocery')) return 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop'
  if (n.includes('sport') || n.includes('fitness') || n.includes('gym')) return 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop'
  if (n.includes('toy') || n.includes('kid') || n.includes('baby') || n.includes('child')) return 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=400&fit=crop'
  if (n.includes('auto') || n.includes('car') || n.includes('vehicle')) return 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop'
  if (n.includes('clean')) return 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop'
  if (n.includes('pet') || n.includes('animal')) return 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop'
  if (n.includes('garden') || n.includes('plant') || n.includes('outdoor')) return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop'
  if (n.includes('book') || n.includes('stationery') || n.includes('office')) return 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop'
  return 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=400&fit=crop'
}

export default function CategoryBrowser({ selectedCountry = 'GB' }) {
  const [categories, setCategories] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [catProducts, setCatProducts] = useState({})
  const pillsRef = useRef(null)
  const productsRef = useRef(null)

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
  const catKey = active?._id || active?.name || ''

  useEffect(() => {
    if (!active) return
    if (catProducts[catKey]) return
    let alive = true
    ;(async () => {
      try {
        const qs = new URLSearchParams()
        qs.set('page', '1')
        qs.set('limit', '20')
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
  }, [active, catKey, selectedCountry])

  // Scroll products container to start when category changes
  useEffect(() => {
    if (productsRef.current) productsRef.current.scrollLeft = 0
  }, [activeIdx])

  if (loading || categories.length === 0) return null

  const products = catProducts[catKey] || []

  return (
    <section className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4" style={{ marginTop: 6, marginBottom: 6 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 6px 8px' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: '#1a1a1a' }}>
          Categories
        </h2>
        <Link
          to="/categories"
          style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
        >
          See all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </Link>
      </div>

      {/* Horizontal category pills */}
      <div
        ref={pillsRef}
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: '0 4px 10px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {categories.map((cat, idx) => {
          const isActive = idx === activeIdx
          const img = cat.image ? mediaUrl(cat.image) : cat.icon ? mediaUrl(cat.icon) : null
          return (
            <button
              key={cat._id || idx}
              onClick={() => setActiveIdx(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 100,
                border: isActive ? '1.5px solid #1a1a1a' : '1.5px solid #e5e7eb',
                background: isActive ? '#1a1a1a' : '#ffffff',
                color: isActive ? '#ffffff' : '#374151',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              {img && (
                <img
                  src={img}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              )}
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Horizontal product scroll */}
      {products.length > 0 ? (
        <div
          ref={productsRef}
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            padding: '2px 4px 14px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {products.map((p) => {
            const imgSrc = mediaUrl(p?.images?.[0] || p?.imagePath || '') || null
            const price = p?.salePrice || p?.price || 0
            const originalPrice = p?.compareAtPrice || p?.originalPrice || 0
            const hasDiscount = originalPrice > 0 && originalPrice > price
            return (
              <Link
                key={p._id}
                to={`/product/${p._id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 140,
                  minWidth: 140,
                  flexShrink: 0,
                  textDecoration: 'none',
                  background: '#fff',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid #f3f4f6',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: '#f9fafb',
                  overflow: 'hidden',
                }}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.src = getDefaultCategoryImage(active?.name || '') }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    </div>
                  )}
                </div>
                <div style={{ padding: '8px 8px 10px' }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1f2937',
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 4,
                  }}>
                    {p.name}
                  </div>
                  {price > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                        {price.toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>
                          {originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}

          {/* View all button at the end */}
          <Link
            to={`/catalog?category=${encodeURIComponent(active?.name || '')}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 100,
              minWidth: 100,
              flexShrink: 0,
              textDecoration: 'none',
              background: '#f9fafb',
              borderRadius: 12,
              border: '1px solid #f3f4f6',
              color: '#6b7280',
              fontSize: 12,
              fontWeight: 600,
              gap: 6,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            View All
          </Link>
        </div>
      ) : catProducts[catKey] !== undefined ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
          No products in this category yet
        </div>
      ) : (
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>
          Loading...
        </div>
      )}

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}
