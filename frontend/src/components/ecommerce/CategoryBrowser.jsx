import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

const COUNTRY_MAP = {
  SA: 'Saudi Arabia', AE: 'UAE', OM: 'Oman', BH: 'Bahrain',
  IN: 'India', KW: 'Kuwait', QA: 'Qatar', JO: 'Jordan',
  PK: 'Pakistan', US: 'USA', GB: 'UK', CA: 'Canada', AU: 'Australia',
}

const CURRENCY_MAP = {
  SA: 'SAR', AE: 'AED', OM: 'OMR', BH: 'BHD',
  IN: '₹', KW: 'KWD', QA: 'QAR', JO: 'JOD',
  PK: 'Rs', US: '$', GB: '£', CA: 'C$', AU: 'A$',
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

function RotatingMeta({ rating, sold }) {
  const [idx, setIdx] = useState(0)
  const items = []
  if (rating > 0) items.push(<span key="r" style={{display:'flex',alignItems:'center',gap:2}}><svg width="10" height="10" viewBox="0 0 24 24" fill="#f97316" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg><span style={{fontWeight:700,color:'#f97316'}}>{rating.toFixed(1)}</span></span>)
  if (sold > 0) items.push(<span key="s" style={{color:'#6b7280'}}>{sold.toLocaleString()} sold</span>)
  items.push(<span key="d" style={{color:'#16a34a',fontWeight:600}}>Free Delivery</span>)
  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => setIdx(p => (p + 1) % items.length), 2200)
    return () => clearInterval(t)
  }, [items.length])
  if (!items.length) return null
  return (
    <div className="cb-rotating-meta">
      <div className="cb-rotating-track" style={{transform:`translateY(-${idx * 100}%)`}}>
        {items.map((item, i) => <div key={i} className="cb-rotating-item">{item}</div>)}
      </div>
    </div>
  )
}

export default function CategoryBrowser({ selectedCountry = 'GB' }) {
  const [categories, setCategories] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [catProducts, setCatProducts] = useState({})
  const productsRef = useRef(null)

  const currency = CURRENCY_MAP[selectedCountry] || '£'

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

  useEffect(() => {
    if (productsRef.current) productsRef.current.scrollLeft = 0
  }, [activeIdx])

  if (loading || categories.length === 0) return null

  const products = catProducts[catKey] || []

  return (
    <section className="cb-section">
      {/* Header */}
      <div className="cb-header">
        <h2 className="cb-title">Categories</h2>
        <Link to="/categories" className="cb-see-all">
          See all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </Link>
      </div>

      {/* Horizontal product scroll */}
      {products.length > 0 ? (
        <div ref={productsRef} className="cb-products-scroll">
          {products.map((p) => {
            const imgSrc = mediaUrl(p?.images?.[0] || p?.imagePath || '') || null
            const price = p?.salePrice || p?.price || 0
            const originalPrice = p?.compareAtPrice || p?.originalPrice || 0
            const hasDiscount = originalPrice > 0 && originalPrice > price
            return (
              <Link key={p._id} to={`/product/${p._id}`} className="cb-product-card">
                <div className="cb-product-img-wrap">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={p.name}
                      className="cb-product-img"
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.src = getDefaultCategoryImage(active?.name || '') }}
                    />
                  ) : (
                    <div className="cb-product-placeholder">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    </div>
                  )}
                </div>
                <div className="cb-product-info">
                  <div className="cb-product-name">{p.name}</div>
                  {price > 0 && (
                    <div className="cb-product-price-row">
                      <span className="cb-product-price">{currency} {price.toFixed(2)}</span>
                      {hasDiscount && (
                        <span className="cb-product-old-price">{currency} {originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                  )}
                  <RotatingMeta rating={p.rating || 0} sold={p.sold || p.totalSold || 0} />
                </div>
              </Link>
            )
          })}

          <Link
            to={`/catalog?category=${encodeURIComponent(active?.name || '')}`}
            className="cb-view-all"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            View All
          </Link>
        </div>
      ) : catProducts[catKey] !== undefined ? (
        <div className="cb-empty">No products in this category yet</div>
      ) : (
        <div className="cb-empty" style={{ color: '#d1d5db' }}>Loading...</div>
      )}

      {/* Horizontal category image blocks — below products */}
      <div className="cb-cats-scroll">
        {categories.map((cat, idx) => {
          const isActive = idx === activeIdx
          const catImg = cat.image ? mediaUrl(cat.image) : cat.icon ? mediaUrl(cat.icon) : getDefaultCategoryImage(cat.name)
          return (
            <button
              key={cat._id || idx}
              onClick={() => setActiveIdx(idx)}
              className={`cb-cat-block ${isActive ? 'cb-cat-active' : ''}`}
            >
              <div className="cb-cat-img-wrap">
                <img
                  src={catImg}
                  alt={cat.name}
                  className="cb-cat-img"
                  loading="lazy"
                  onError={e => { e.target.src = getDefaultCategoryImage(cat.name) }}
                />
                {isActive && <div className="cb-cat-ring" />}
              </div>
              <span className={`cb-cat-label ${isActive ? 'cb-cat-label-active' : ''}`}>
                {cat.name}
              </span>
            </button>
          )
        })}
      </div>

      <style>{`
        .cb-section {
          max-width: 1280px;
          margin: 8px auto 10px;
          padding: 0 6px;
        }
        .cb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 4px 6px;
        }
        .cb-title {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #111;
        }
        .cb-see-all {
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 2px;
          transition: color 0.2s;
        }
        .cb-see-all:hover { color: #111; }

        /* Category image blocks */
        .cb-cats-scroll {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 6px 4px 14px;
          -webkit-overflow-scrolling: touch;
        }
        .cb-cats-scroll::-webkit-scrollbar { display: none; }

        .cb-cat-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
          min-width: 68px;
          transition: transform 0.15s ease;
        }
        .cb-cat-block:active { transform: scale(0.95); }

        .cb-cat-img-wrap {
          position: relative;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          overflow: hidden;
          background: #f3f4f6;
        }
        .cb-cat-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .cb-cat-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2.5px solid #111;
          pointer-events: none;
        }

        .cb-cat-label {
          font-size: 11px;
          font-weight: 500;
          color: #6b7280;
          text-align: center;
          max-width: 72px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.2;
        }
        .cb-cat-label-active {
          color: #111;
          font-weight: 700;
        }

        /* Products scroll */
        .cb-products-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 2px 4px 16px;
          -webkit-overflow-scrolling: touch;
        }
        .cb-products-scroll::-webkit-scrollbar { display: none; }

        .cb-product-card {
          display: flex;
          flex-direction: column;
          width: 150px;
          min-width: 150px;
          flex-shrink: 0;
          text-decoration: none;
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #f0f0f0;
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .cb-product-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }

        .cb-product-img-wrap {
          width: 100%;
          aspect-ratio: 1;
          background: #fafafa;
          overflow: hidden;
        }
        .cb-product-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cb-product-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e5e7eb;
        }

        .cb-product-info {
          padding: 8px 10px 10px;
        }
        .cb-product-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 5px;
        }
        .cb-product-price-row {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .cb-product-price {
          font-size: 14px;
          font-weight: 800;
          color: #111;
        }
        .cb-product-old-price {
          font-size: 11px;
          color: #b0b0b0;
          text-decoration: line-through;
          font-weight: 400;
        }

        .cb-view-all {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100px;
          min-width: 100px;
          flex-shrink: 0;
          text-decoration: none;
          background: #f9fafb;
          border-radius: 14px;
          border: 1px solid #f0f0f0;
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          gap: 6px;
          transition: background 0.2s;
        }
        .cb-view-all:hover { background: #f3f4f6; }

        .cb-empty {
          padding: 24px 0;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
        }

        /* Rotating meta animation */
        .cb-rotating-meta {
          height: 16px;
          overflow: hidden;
          margin-top: 4px;
        }
        .cb-rotating-track {
          transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .cb-rotating-item {
          height: 16px;
          display: flex;
          align-items: center;
          font-size: 10.5px;
          line-height: 1;
          gap: 3px;
        }

        @media (min-width: 768px) {
          .cb-cat-img-wrap { width: 72px; height: 72px; }
          .cb-cat-label { font-size: 12px; max-width: 80px; }
          .cb-product-card { width: 170px; min-width: 170px; }
        }
      `}</style>
    </section>
  )
}
