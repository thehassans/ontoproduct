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

function fallbackImg(name) {
  const n = String(name || '').toLowerCase()
  if (n.includes('beauty') || n.includes('cosmetic') || n.includes('skin')) return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop'
  if (n.includes('electr') || n.includes('tech') || n.includes('phone')) return 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=400&fit=crop'
  if (n.includes('fashion') || n.includes('cloth') || n.includes('wear')) return 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=400&fit=crop'
  if (n.includes('hair')) return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=400&fit=crop'
  if (n.includes('health') || n.includes('wellness')) return 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop'
  if (n.includes('home') || n.includes('house') || n.includes('decor')) return 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop'
  if (n.includes('jewel') || n.includes('watch') || n.includes('accessor')) return 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=400&fit=crop'
  if (n.includes('kitchen') || n.includes('food')) return 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop'
  if (n.includes('sport') || n.includes('fitness')) return 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop'
  if (n.includes('toy') || n.includes('kid') || n.includes('baby')) return 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=400&fit=crop'
  if (n.includes('auto') || n.includes('car')) return 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=400&fit=crop'
  if (n.includes('clean')) return 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=400&fit=crop'
  if (n.includes('pet') || n.includes('animal')) return 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop'
  if (n.includes('garden') || n.includes('plant')) return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop'
  if (n.includes('book') || n.includes('office')) return 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop'
  if (n.includes('body')) return 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=400&fit=crop'
  if (n.includes('household')) return 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop'
  return 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=400&fit=crop'
}

function catImage(cat) {
  if (cat.image) return mediaUrl(cat.image)
  if (cat.icon) return mediaUrl(cat.icon)
  return fallbackImg(cat.name)
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
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header onCartClick={() => {}} />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '56px 16px 40px',
      }}>
        <div style={{
          position: 'absolute', top: '-40%', right: '-10%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-30%', left: '-5%',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        }} />
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 50,
            background: 'rgba(249,115,22,0.15)', marginBottom: 16,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316' }} />
            <span style={{ color: '#fb923c', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>EXPLORE COLLECTION</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 6vw, 52px)', fontWeight: 900,
            color: '#fff', margin: '0 0 12px', lineHeight: 1.1,
          }}>
            Shop by <span style={{ color: '#f97316' }}>Category</span>
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2.5vw, 18px)', color: '#9ca3af', margin: 0, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
            Browse our curated collections and find exactly what you need
          </p>
        </div>
      </section>

      {/* Categories Grid */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 12px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{
              width: 40, height: 40, border: '3px solid #f97316',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <p style={{ fontSize: 20, fontWeight: 700 }}>No categories available</p>
            <p style={{ fontSize: 14, marginTop: 4 }}>Check back soon for new products!</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {categories.map((cat) => {
              const isExpanded = expandedCat === cat._id
              const subs = cat.subcategories || []
              const hasSubs = subs.length > 0
              return (
                <div key={cat._id} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Category Card */}
                  <button
                    onClick={() => handleCatClick(cat)}
                    style={{
                      position: 'relative',
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: isExpanded ? '2px solid #f97316' : '2px solid transparent',
                      cursor: 'pointer',
                      background: '#111827',
                      padding: 0,
                      textAlign: 'left',
                      transition: 'all 0.3s ease',
                      boxShadow: isExpanded ? '0 8px 32px rgba(249,115,22,0.2)' : '0 2px 12px rgba(0,0,0,0.08)',
                    }}
                    onMouseEnter={e => {
                      if (!isExpanded) e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                    }}
                    onMouseLeave={e => {
                      if (!isExpanded) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Image */}
                    <div style={{ position: 'relative', paddingTop: '60%', overflow: 'hidden' }}>
                      <img
                        src={catImage(cat)}
                        alt={cat.name}
                        loading="lazy"
                        onError={e => { e.target.src = fallbackImg(cat.name) }}
                        style={{
                          position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s ease',
                        }}
                        onMouseEnter={e => { e.target.style.transform = 'scale(1.08)' }}
                        onMouseLeave={e => { e.target.style.transform = 'scale(1)' }}
                      />
                      {/* Dark gradient overlay */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: '70%',
                        background: 'linear-gradient(to top, rgba(17,24,39,0.95) 0%, transparent 100%)',
                      }} />
                      {/* Subcategory count badge */}
                      {hasSubs && (
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          background: 'rgba(249,115,22,0.9)',
                          color: '#fff', fontSize: 11, fontWeight: 800,
                          padding: '3px 10px', borderRadius: 50,
                          backdropFilter: 'blur(4px)',
                        }}>
                          {subs.length} sub{subs.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: '14px 16px 16px', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{
                            fontSize: 17, fontWeight: 800, color: '#fff',
                            margin: 0, lineHeight: 1.2,
                          }}>{cat.name}</h3>
                          {cat.description && (
                            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0', lineHeight: 1.3 }}>
                              {cat.description.length > 50 ? cat.description.slice(0, 50) + '...' : cat.description}
                            </p>
                          )}
                        </div>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: isExpanded ? '#f97316' : 'rgba(255,255,255,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.3s ease',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Subcategories Panel */}
                  {isExpanded && hasSubs && (
                    <div style={{
                      marginTop: 6,
                      borderRadius: 14,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      animation: 'fadeSlideIn 0.25s ease',
                    }}>
                      <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }`}</style>
                      {/* View all in this category */}
                      <Link
                        to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 16px',
                          borderBottom: '1px solid #f3f4f6',
                          textDecoration: 'none',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: 'linear-gradient(135deg, #111827, #1f2937)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                          </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>All {cat.name}</span>
                          <span style={{ display: 'block', fontSize: 11, color: '#9ca3af' }}>Browse entire category</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                      </Link>
                      {/* Subcategory items */}
                      {subs.map((sub, i) => (
                        <Link
                          key={sub._id || i}
                          to={`/catalog?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 16px',
                            borderBottom: i < subs.length - 1 ? '1px solid #f3f4f6' : 'none',
                            textDecoration: 'none',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            overflow: 'hidden', flexShrink: 0,
                            background: '#f3f4f6',
                          }}>
                            {(sub.image || sub.icon) ? (
                              <img
                                src={sub.image ? mediaUrl(sub.image) : mediaUrl(sub.icon)}
                                alt={sub.name}
                                loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                              }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                                  <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#374151' }}>{sub.name}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Browse All CTA */}
        {!loading && categories.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link
              to="/catalog"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '14px 36px',
                background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
                color: '#fff', fontWeight: 800, fontSize: 15,
                borderRadius: 50, textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(17,24,39,0.3)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(249,115,22,0.3)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(17,24,39,0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Browse All Products
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}
