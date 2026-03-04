import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

export default function BrandBrowser() {
  const [brands, setBrands] = useState([])
  const scrollRef = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet('/api/brands/public')
        if (alive) setBrands(Array.isArray(res?.brands) ? res.brands : [])
      } catch {
        if (alive) setBrands([])
      }
    })()
    return () => { alive = false }
  }, [])

  if (!brands.length) return null

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  return (
    <section className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4" style={{ marginTop: 16, marginBottom: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 2, paddingRight: 2 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>Shop by Brand</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            style={{
              width: 28, height: 28, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            style={{
              width: 28, height: 28, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Brand pills */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 4,
          scrollSnapType: 'x mandatory',
        }}
      >
        {brands.map((b) => (
          <Link
            key={b._id}
            to={`/catalog?brand=${encodeURIComponent(b.name)}`}
            style={{
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              scrollSnapAlign: 'start',
              minWidth: 80,
            }}
          >
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#fff',
              border: '1.5px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              transition: 'all 0.25s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              {b.logo ? (
                <img
                  src={mediaUrl(b.logo)}
                  alt={b.name}
                  style={{ width: 44, height: 44, objectFit: 'contain' }}
                  loading="lazy"
                />
              ) : (
                <span style={{ fontSize: 22, fontWeight: 800, color: '#f97316', textTransform: 'uppercase' }}>
                  {b.name.charAt(0)}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#374151',
              textAlign: 'center',
              maxWidth: 80,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              {b.name}
            </span>
          </Link>
        ))}
      </div>

      <style>{`
        section > div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}
