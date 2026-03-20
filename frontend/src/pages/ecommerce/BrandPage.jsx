import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import Header from '../../components/layout/Header'
import PremiumFooter from '../../components/layout/PremiumFooter'
import ProductCardMini from '../../components/ecommerce/ProductCardMini'

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
  const [brand, setBrand] = useState(null)
  const [allProducts, setAllProducts] = useState([])   // all matching products
  const [displayed, setDisplayed] = useState([])        // paginated slice
  const [loading, setLoading] = useState(true)
  const [sortIdx, setSortIdx] = useState(0)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadedRef = useRef(false)

  const [currency] = useState(() => CURRENCY_MAP[localStorage.getItem('selected_country') || 'GB'] || 'SAR')
  const sym = CURRENCY_SYM[currency] || currency + ' '
  const selectedCountry = useMemo(() => {
    try { return localStorage.getItem('selected_country') || 'GB' } catch { return 'GB' }
  }, [])

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 26%, #fff7ed 100%)', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <Header />

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 12px 128px' }}>
        <section style={{
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: 28,
          padding: '20px 18px 18px',
          boxShadow: '0 18px 48px rgba(15,23,42,0.05)',
          marginBottom: 14,
          display: 'grid',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              border: '1px solid rgba(148,163,184,0.14)',
              background: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
            }}>
              {brandLogo
                ? <img src={brandLogo} alt={brand?.name || slug} style={{ width: 50, height: 50, objectFit: 'contain' }} />
                : <span style={{ fontSize: 28, fontWeight: 900, color: '#f97316' }}>{brand?.name?.charAt(0)?.toUpperCase() || '?'}</span>}
            </div>
            <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800 }}>Brand</div>
              <h1 style={{ margin: 0, fontSize: 'clamp(22px, 3vw, 32px)', lineHeight: 1.05, letterSpacing: '-0.03em', color: '#0f172a', fontWeight: 900 }}>
                {brand?.name || slug}
              </h1>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                {!loading ? `${totalCount} ${totalCount === 1 ? 'product' : 'products'} available` : 'Loading products...'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            paddingTop: 2,
          }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Minimal brand view with products directly below.
            </div>
            <Link to="/catalog" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.16)',
              background: '#fff',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 700,
            }}>Browse all</Link>
          </div>
        </section>

        <section style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(148,163,184,0.10)',
          borderRadius: 24,
          padding: '12px',
          boxShadow: '0 14px 36px rgba(15,23,42,0.04)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '2px 2px 12px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap', paddingRight: 6 }}>Sort</span>
            {SORT_OPTS.map((s, i) => (
              <button key={s.label} onClick={() => setSortIdx(i)} style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: sortIdx === i ? '1px solid rgba(15,23,42,0.18)' : '1px solid rgba(148,163,184,0.16)',
                background: sortIdx === i ? '#0f172a' : '#ffffff',
                color: sortIdx === i ? '#ffffff' : '#475569',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}>{s.label}</button>
            ))}
          </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.10)', animation: 'pulse 1.5s ease infinite alternate' }}>
                <div style={{ aspectRatio: '1', background: '#f2f2f2' }} />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ height: 11, background: '#f2f2f2', borderRadius: 6, width: '75%', marginBottom: 8 }} />
                  <div style={{ height: 13, background: '#f2f2f2', borderRadius: 6, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : totalCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 20px' }}>
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
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
            }}>
              {displayed.map((p) => (
                <div key={p._id} style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.10)', background: '#fff' }}>
                  <ProductCardMini product={p} selectedCountry={selectedCountry} showVideo={true} />
                </div>
              ))}
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
        </section>
      </div>

      <div className="hidden lg:block"><PremiumFooter /></div>
      <MobileBottomNav />
      <style>{`@keyframes pulse { from { opacity:1 } to { opacity:0.5 } }`}</style>
    </div>
  )
}
