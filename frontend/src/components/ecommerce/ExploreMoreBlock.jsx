import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

export default function ExploreMoreBlock() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet('/api/explore-more/public')
        if (alive && Array.isArray(res?.items)) setItems(res.items)
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  if (!items.length) return null

  return (
    <section className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4" style={{ marginTop: 18, marginBottom: 8 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', marginBottom: 14, letterSpacing: -0.3 }}>
        Explore More
      </h2>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
        {items.map(item => {
          const img = item.image ? mediaUrl(item.image) : null
          const link = item.link || '/catalog'
          const isExternal = link.startsWith('http')
          const Wrapper = isExternal ? 'a' : Link
          const wrapperProps = isExternal
            ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
            : { to: link }

          return (
            <Wrapper
              key={item._id}
              {...wrapperProps}
              style={{
                flex: '0 0 auto',
                width: 150,
                height: 180,
                borderRadius: 16,
                overflow: 'hidden',
                position: 'relative',
                display: 'block',
                textDecoration: 'none',
                background: '#f3f4f6',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                transition: 'transform 0.2s ease',
              }}
              className="explore-card"
            >
              {img ? (
                <img
                  src={img}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #fbbf24, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 32 }}>🎁</span>
                </div>
              )}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '24px 10px 10px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              }}>
                <span style={{
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  lineHeight: 1.2,
                  display: 'block',
                }}>
                  {item.name}
                </span>
              </div>
            </Wrapper>
          )
        })}
      </div>
      <style>{`
        .explore-card:hover { transform: scale(1.03); }
        .explore-card:active { transform: scale(0.98); }
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </section>
  )
}
