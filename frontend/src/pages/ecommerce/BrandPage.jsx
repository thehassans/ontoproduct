import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import Header from '../../components/layout/Header'
import PremiumFooter from '../../components/layout/PremiumFooter'

function resolveImg(u) {
  if (!u) return null
  if (u.startsWith('http')) return u
  try { return mediaUrl(u) } catch { return null }
}

const CURRENCY_MAP = {
  AE: 'AED', OM: 'OMR', SA: 'SAR', BH: 'BHD', IN: 'INR',
  KW: 'KWD', QA: 'QAR', PK: 'PKR', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD',
}
const CURRENCY_SYM = { SAR: '﷼', AED: 'AED ', OMR: 'OMR ', USD: '$', GBP: '£', EUR: '€', KWD: 'KD ', QAR: 'QR ', BHD: 'BD ', INR: '₹', PKR: '₨ ' }

const SORT_OPTS = [
  { label: 'Newest', fn: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) },
  { label: 'Popular', fn: (a, b) => (b.salesCount || b.views || 0) - (a.salesCount || a.views || 0) },
  { label: '↑ Price', fn: (a, b) => (Number(a.salePrice || a.price) || 0) - (Number(b.salePrice || b.price) || 0) },
  { label: '↓ Price', fn: (a, b) => (Number(b.salePrice || b.price) || 0) - (Number(a.salePrice || a.price) || 0) },
]

const PAGE_SIZE = 20

export default function BrandPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [brand, setBrand] = useState(null)
  const [allProducts, setAllProducts] = useState([])   // all matching products
  const [displayed, setDisplayed] = useState([])        // paginated slice
  const [loading, setLoading] = useState(true)
  const [sortIdx, setSortIdx] = useState(0)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadedRef = useRef(false)

  const [currency] = useState(() => CURRENCY_MAP[localStorage.getItem('selected_country') || 'GB'] || 'SAR')
  const sym = CURRENCY_SYM[currency] || currency + ' '

  // 1. Resolve brand from public brands list
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet('/api/brands/public')
        if (!alive) return
        const list = Array.isArray(res?.brands) ? res.brands : []
        const found = list.find(b => {
          const bSlug = b.slug || b.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          return bSlug === slug || b.name?.toLowerCase().trim() === slug?.toLowerCase().replace(/-/g, ' ').trim()
        })
        setBrand(found || null)
      } catch { if (alive) setBrand(null) }
    })()
    return () => { alive = false }
  }, [slug])

  // 2. Fetch ALL products (large limit) and filter strictly by brand name
  useEffect(() => {
    if (!brand?.name || loadedRef.current) return
    loadedRef.current = true
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        // Fetch up to 500 products — filter strictly by brand name
        const country = localStorage.getItem('selected_country') || 'GB'
        const res = await apiGet(`/api/products/public?limit=500&country=${encodeURIComponent(country)}`)
        if (!alive) return
        const raw = Array.isArray(res?.products) ? res.products : []
        // Strict client-side filter: only products whose brand string matches this brand's name
        const bNameLower = brand.name.toLowerCase().trim()
        const matched = raw.filter(p => {
          const pBrand = String(p.brand || p.brandName || '').toLowerCase().trim()
          return pBrand === bNameLower
        })
        setAllProducts(matched)
        setDisplayed(matched.slice(0, PAGE_SIZE))
      } catch { if (alive) setAllProducts([]) }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [brand])

  // 3. Apply sort
  useEffect(() => {
    const sorted = [...allProducts].sort(SORT_OPTS[sortIdx].fn)
    setVisibleCount(PAGE_SIZE)
    setDisplayed(sorted.slice(0, PAGE_SIZE))
  }, [sortIdx, allProducts])

  // 4. Load more
  const loadMore = () => {
    const next = visibleCount + PAGE_SIZE
    const sorted = [...allProducts].sort(SORT_OPTS[sortIdx].fn)
    setDisplayed(sorted.slice(0, next))
    setVisibleCount(next)
  }

  const hasMore = visibleCount < allProducts.length
  const brandLogo = brand?.logo ? resolveImg(brand.logo) : null
  const totalCount = allProducts.length

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      {/* Desktop header */}
      <div className="hidden lg:block"><Header /></div>

      {/* Mobile top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffff', borderBottom: '1px solid #ebebeb',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
        height: 52,
      }} className="lg:hidden">
        <button onClick={() => navigate(-1)} style={{
          width: 34, height: 34, borderRadius: '50%', background: '#f5f5f5',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="16" height="16" fill="none" stroke="#111" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111', flex: 1 }}>
          {brand?.name || slug}
        </span>
      </div>

      {/* ── Hero ── pure black, ultra-minimal */}
      <div style={{
        background: '#000',
        padding: '48px 20px 36px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: '#111',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', overflow: 'hidden',
        }}>
          {brandLogo
            ? <img src={brandLogo} alt={brand.name} style={{ width: 58, height: 58, objectFit: 'contain' }} />
            : <span style={{ fontSize: 32, fontWeight: 900, color: '#f97316' }}>{brand?.name?.charAt(0)?.toUpperCase() || '?'}</span>}
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
          {brand?.name || slug}
        </h1>
        {!loading && (
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>
            {totalCount} {totalCount === 1 ? 'product' : 'products'}
          </p>
        )}
      </div>

      {/* ── Sort strip ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', overflowX: 'auto', scrollbarWidth: 'none',
        position: 'sticky', top: 52, zIndex: 40,
      }} className="lg:top-0">
        <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Sort</span>
        {SORT_OPTS.map((s, i) => (
          <button key={s.label} onClick={() => setSortIdx(i)} style={{
            padding: '5px 14px', borderRadius: 20,
            border: sortIdx === i ? 'none' : '1px solid #e8e8e8',
            background: sortIdx === i ? '#111' : '#fafafa',
            color: sortIdx === i ? '#fff' : '#555',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── Grid ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 10px 128px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', animation: 'pulse 1.5s ease infinite alternate' }}>
                <div style={{ aspectRatio: '1', background: '#f2f2f2' }} />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ height: 11, background: '#f2f2f2', borderRadius: 6, width: '75%', marginBottom: 8 }} />
                  <div style={{ height: 13, background: '#f2f2f2', borderRadius: 6, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : totalCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📦</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111' }}>No products yet</h3>
            <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 24px' }}>No products are currently listed for this brand.</p>
            <Link to="/catalog" style={{
              padding: '12px 28px', background: '#111', color: '#fff',
              borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}>Browse All Products</Link>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}>
              {displayed.map(p => {
                const base = Number(p.price) || 0
                const sale = Number(p.salePrice) || 0
                const hasDisc = sale > 0 && sale < base
                const disp = hasDisc ? sale : base
                const pct = hasDisc ? Math.round(((base - sale) / base) * 100) : 0
                const imgs = Array.isArray(p.images) ? p.images : []
                const img = resolveImg(imgs[0] || p.imagePath)
                const href = p.slug ? `/products/${p.slug}` : `/product/${p._id}`
                return (
                  <Link key={p._id} to={href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: '#fff', borderRadius: 14, overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'box-shadow 0.2s, transform 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
                    >
                      <div style={{ position: 'relative', aspectRatio: '1', background: '#f8f8f8', overflow: 'hidden' }}>
                        {img
                          ? <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} loading="lazy" onError={e => { e.target.style.display = 'none' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 28, opacity: 0.15 }}>📦</span>
                            </div>}
                        {hasDisc && (
                          <span style={{ position: 'absolute', top: 7, left: 7, background: '#ff3b30', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20 }}>
                            -{pct}%
                          </span>
                        )}
                      </div>
                      <div style={{ padding: '9px 11px 11px' }}>
                        <p style={{
                          margin: '0 0 7px', fontSize: 11, fontWeight: 600, color: '#1a1a1a',
                          lineHeight: 1.4, display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{p.name}</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#f97316' }}>{sym}{disp.toFixed(2)}</span>
                          {hasDisc && <span style={{ fontSize: 10, color: '#ccc', textDecoration: 'line-through' }}>{sym}{base.toFixed(2)}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
                <button onClick={loadMore} style={{
                  padding: '13px 36px', background: '#111', color: '#fff',
                  border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', letterSpacing: '0.02em',
                }}>
                  Show More ({allProducts.length - visibleCount} left)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="hidden lg:block"><PremiumFooter /></div>
      <MobileBottomNav />
      <style>{`@keyframes pulse { from { opacity:1 } to { opacity:0.5 } }`}</style>
    </div>
  )
}
