import React, { useState, useRef, useCallback } from 'react'
import { apiPost } from '../../api'

const proxyImg = (url) =>
  url ? `/api/scrape/img?url=${encodeURIComponent(url)}` : null

const PLATFORMS = [
  { id: 'noon',        label: 'Noon',       flag: '🌙', color: '#f59e0b', textColor: '#000', desc: 'Saudi & UAE' },
  { id: 'aliexpress',  label: 'AliExpress', flag: '🧧', color: '#ef4444', textColor: '#fff', desc: 'Global' },
  { id: 'amazon',      label: 'Amazon',     flag: '📦', color: '#f97316', textColor: '#fff', desc: 'Amazon.sa' },
  { id: 'shein',       label: 'Shein',      flag: '👗', color: '#ec4899', textColor: '#fff', desc: 'Fashion' },
  { id: 'url',         label: 'URL Import', flag: '🔗', color: '#6366f1', textColor: '#fff', desc: 'Any URL' },
]

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Beauty', 'Toys',
  'Automotive', 'Books', 'Food & Grocery', 'Health', 'Jewelry', 'Office',
]

function Toast({ msg, type }) {
  if (!msg) return null
  const bg = type === 'error'
    ? 'linear-gradient(135deg,#ef4444,#dc2626)'
    : type === 'warning'
    ? 'linear-gradient(135deg,#f97316,#ea580c)'
    : 'linear-gradient(135deg,#10b981,#059669)'
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: bg, color: '#fff', borderRadius: 14,
      padding: '14px 22px', fontSize: 13, fontWeight: 600,
      boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
      animation: 'slideIn .3s cubic-bezier(.34,1.56,.64,1)',
      maxWidth: 380, backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>{type === 'error' ? '✕' : type === 'warning' ? '⚠' : '✓'}</span>
      {msg}
    </div>
  )
}

function fmt(price, currency) {
  if (!price || price <= 0) return null
  try { return `${currency || 'SAR'} ${Number(price).toFixed(2)}` } catch { return `${currency || 'SAR'} ${price}` }
}

function Spinner({ size = 16, color = '#fff' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `${size > 20 ? 3 : 2.5}px solid ${color}44`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

function ImageGallery({ images }) {
  const [idx, setIdx] = useState(0)
  const [err, setErr] = useState({})
  const [useProxy, setUseProxy] = useState({})
  const validImgs = images?.filter(Boolean) || []
  if (!validImgs.length) return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#f8fafc,#f1f5f9)' }}>
      <div style={{ fontSize: 40, opacity: .35 }}>📦</div>
    </div>
  )
  const cur = validImgs[idx] || validImgs[0]
  const src = useProxy[idx] ? proxyImg(cur) : cur
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {err[idx] ? (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#f8fafc,#f1f5f9)' }}>
          <div style={{ fontSize: 40, opacity: .35 }}>📦</div>
        </div>
      ) : (
        <img
          key={src}
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => {
            if (!useProxy[idx]) { setUseProxy(p => ({ ...p, [idx]: true })) }
            else { setErr(e => ({ ...e, [idx]: true })) }
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .2s' }}
        />
      )}
      {/* Nav arrows */}
      {validImgs.length > 1 && (
        <>
          {idx > 0 && (
            <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }} style={{
              position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
              width: 26, height: 26, borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 13, cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}>‹</button>
          )}
          {idx < validImgs.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }} style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              width: 26, height: 26, borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 13, cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}>›</button>
          )}
          {/* Dots */}
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {validImgs.slice(0, 6).map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setIdx(i) }} style={{
                width: i === idx ? 16 : 6, height: 6,
                borderRadius: 3, cursor: 'pointer',
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'all .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProductCard({ product, selected, onToggle, onImportSingle }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const price = fmt(product.price, product.currency)

  async function handleAdd(e) {
    e.stopPropagation()
    if (adding || added) return
    setAdding(true)
    try {
      await onImportSingle(product)
      setAdded(true)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      className="bl-card"
      onClick={() => onToggle(product._bulkId)}
      style={{
        borderRadius: 20,
        background: '#fff',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: selected
          ? '0 0 0 2.5px #6366f1, 0 8px 28px rgba(99,102,241,0.18)'
          : '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        position: 'relative',
      }}
    >
      {/* Selection indicator */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 3,
        width: 24, height: 24, borderRadius: 8,
        border: selected ? 'none' : '2px solid rgba(255,255,255,0.85)',
        background: selected ? '#6366f1' : 'rgba(0,0,0,0.25)',
        display: 'grid', placeItems: 'center',
        backdropFilter: 'blur(4px)',
        transition: 'all .2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path d="M20 6 9 17l-5-5"/></svg>}
      </div>

      {/* Platform badge */}
      {product.platform && product.platform !== 'url' && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 3,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: 10, fontWeight: 800, borderRadius: 6,
          padding: '3px 8px', textTransform: 'uppercase', letterSpacing: .5,
          backdropFilter: 'blur(4px)',
        }}>{product.platform}</div>
      )}

      {/* Image */}
      <div style={{ aspectRatio: '1/1', background: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
        <ImageGallery images={product.images} />
      </div>

      {/* Info */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {/* Name */}
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </div>

        {/* Brand */}
        {product.brand && (
          <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, letterSpacing: .2 }}>
            {product.brand}
          </div>
        )}

        {/* Price row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
          {price ? (
            <span style={{
              fontSize: 18, fontWeight: 900, color: '#6366f1',
              letterSpacing: -.3,
            }}>{price}</span>
          ) : (
            <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Price unavailable</span>
          )}
          {product.originalPrice > 0 && product.originalPrice > product.price && (
            <span style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'line-through' }}>
              {product.currency || 'SAR'} {Number(product.originalPrice).toFixed(2)}
            </span>
          )}
          {product.originalPrice > 0 && product.originalPrice > product.price && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#10b981',
              background: '#dcfce7', borderRadius: 5, padding: '2px 6px',
            }}>
              {Math.round((1 - product.price / product.originalPrice) * 100)}% off
            </span>
          )}
        </div>

        {/* Delivery */}
        {product.delivery && (
          <div style={{
            fontSize: 11.5, color: '#059669', fontWeight: 600,
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>🚚 {product.delivery}</div>
        )}

        {/* Description snippet */}
        {product.description && (
          <div style={{
            fontSize: 11.5, color: '#64748b', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {product.description}
          </div>
        )}

        {/* Source link */}
        {product.sourceUrl && (
          <a
            href={product.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, color: '#a5b4fc', textDecoration: 'none', fontWeight: 600, marginTop: 'auto' }}
          >↗ View original</a>
        )}

        {/* Add to List button */}
        <button
          onClick={handleAdd}
          disabled={adding}
          style={{
            marginTop: 8, height: 38, borderRadius: 12, border: 'none',
            background: added
              ? 'linear-gradient(135deg,#10b981,#059669)'
              : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: adding ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all .2s',
            boxShadow: added ? '0 4px 14px rgba(16,185,129,0.35)' : '0 4px 14px rgba(99,102,241,0.35)',
            opacity: adding ? .8 : 1,
          }}
        >
          {adding ? (
            <><Spinner size={14} />Adding…</>
          ) : added ? (
            <>✓ Added to Listing</>
          ) : (
            <>+ Add to Listing</>
          )}
        </button>
      </div>
    </div>
  )
}

export default function BulkListing() {
  const [tab, setTab] = useState('noon')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [warning, setWarning] = useState('')
  const [toast, setToast] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const counterRef = useRef(0)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function assignIds(prods) {
    return prods.map(p => ({ ...p, _bulkId: String(++counterRef.current) }))
  }

  async function doSearch(newPage = 1) {
    if (!query.trim() && tab !== 'url') return
    setLoading(true)
    setWarning('')
    if (newPage === 1) { setProducts([]); setSelected(new Set()) }
    try {
      const res = await apiPost('/api/scrape/search', {
        platform: tab,
        query: [query.trim(), category].filter(Boolean).join(' '),
        page: newPage,
      })
      const incoming = assignIds(res.products || [])
      setProducts(prev => newPage === 1 ? incoming : [...prev, ...incoming])
      setHasMore(res.hasMore || false)
      setPage(newPage)
      if (res.warning) setWarning(res.warning)
      if (!incoming.length && !res.warning) setWarning('No products found. Try different keywords.')
    } catch (err) {
      setWarning(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function importUrlList() {
    const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
    if (!urls.length) { showToast('Paste at least one product URL', 'error'); return }
    setUrlLoading(true)
    setWarning('')
    try {
      const res = await apiPost('/api/scrape/fetch-urls', { urls })
      const prods = assignIds(
        (res.results || []).filter(r => r.success && r.product?.name).map(r => r.product)
      )
      const failed = (res.results || []).filter(r => !r.success).length
      setProducts(prev => [...prev, ...prods])
      if (failed) setWarning(`${failed} URL(s) could not be fetched.`)
      showToast(`${prods.length} product(s) added to results`)
    } catch (err) {
      showToast(err.message || 'Failed to fetch URLs', 'error')
    } finally {
      setUrlLoading(false)
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === products.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map(p => p._bulkId)))
    }
  }

  async function doImport(subset) {
    if (!subset.length) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await apiPost('/api/scrape/import', { products: subset })
      setImportResult(res)
      showToast(`✓ Imported ${res.imported} / ${res.total} products`)
      // Remove successfully imported from list
      const failedNames = new Set((res.results || []).filter(r => !r.success).map(r => r.name))
      setProducts(prev => prev.filter(p => failedNames.has(p.name) || !subset.find(s => s.name === p.name && s.price === p.price)))
      setSelected(new Set())
    } catch (err) {
      showToast(err.message || 'Import failed', 'error')
    } finally {
      setImporting(false)
    }
  }

  function importSelected() {
    const prods = products.filter(p => selected.has(p._bulkId))
    doImport(prods)
  }

  function importAll() {
    doImport([...products])
  }

  const selectedProducts = products.filter(p => selected.has(p._bulkId))

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:none } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px) }  to { opacity:1; transform:none } }
        @keyframes spin    { to   { transform: rotate(360deg) } }
        @keyframes shimmer { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
        @keyframes popIn   { from { opacity:0; transform:scale(.92) }        to { opacity:1; transform:scale(1) } }
        .bl-tab:hover  { transform: translateY(-1px); filter: brightness(1.05) }
        .bl-card:hover { transform: translateY(-4px) !important; box-shadow: 0 16px 40px rgba(0,0,0,0.13) !important }
        .bl-card:hover .bl-img-overlay { opacity:1 !important }
        .bl-btn:hover  { filter: brightness(1.08); transform: translateY(-1px) }
        .bl-btn:active { transform: none; filter: brightness(.96) }
      `}</style>

      <Toast msg={toast?.msg} type={toast?.type} />

      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4338ca 100%)',
        padding: '36px 32px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 20%,rgba(99,102,241,.25) 0%,transparent 60%),radial-gradient(circle at 20% 80%,rgba(139,92,246,.2) 0%,transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: -.5 }}>
              Bulk Listing Import
            </h1>
            <span style={{ background: 'rgba(255,255,255,.15)', color: '#c7d2fe', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,.2)' }}>
              Powered by crawl4ai
            </span>
            {products.length > 0 && (
              <span style={{ background: 'rgba(16,185,129,.2)', color: '#6ee7b7', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(16,185,129,.3)' }}>
                {products.length} products loaded
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: '#a5b4fc', margin: 0 }}>
            Import products from any platform using a real browser — images, prices, descriptions &amp; delivery info extracted automatically.
          </p>

          {/* Platform Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
            {PLATFORMS.map(pl => (
              <button
                key={pl.id}
                className="bl-tab"
                onClick={() => { setTab(pl.id); setProducts([]); setSelected(new Set()); setWarning('') }}
                style={{
                  padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: tab === pl.id ? pl.color : 'rgba(255,255,255,0.1)',
                  color: tab === pl.id ? pl.textColor : 'rgba(255,255,255,0.75)',
                  fontWeight: 700, fontSize: 13,
                  boxShadow: tab === pl.id ? `0 4px 18px ${pl.color}66` : 'none',
                  transition: 'all 0.18s',
                  display: 'flex', alignItems: 'center', gap: 7,
                  backdropFilter: tab === pl.id ? 'none' : 'blur(4px)',
                  border: tab === pl.id ? 'none' : '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <span>{pl.flag}</span>
                <span>{pl.label}</span>
                <span style={{ fontSize: 11, opacity: .7, fontWeight: 500 }}>{pl.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── Input Panel ── */}
        {tab === 'url' ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>🔗 Paste Product URLs</div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              One URL per line — works with Shein, Noon, Amazon, AliExpress &amp; most product pages.
            </p>
            <textarea
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder={'https://ar.shein.com/product-name-p123.html\nhttps://www.noon.com/saudi-en/product/p/\nhttps://www.amazon.sa/dp/B0EXAMPLE'}
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box', borderRadius: 14,
                border: '1.5px solid #e2e8f0', padding: '14px 16px',
                fontSize: 13, fontFamily: 'monospace', resize: 'vertical',
                outline: 'none', color: '#0f172a', background: '#f8fafc',
                lineHeight: 1.7, transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center' }}>
              <button
                className="bl-btn"
                onClick={importUrlList}
                disabled={urlLoading || !urlInput.trim()}
                style={{
                  height: 46, paddingInline: 32, borderRadius: 14, border: 'none',
                  background: urlLoading || !urlInput.trim() ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: urlLoading || !urlInput.trim() ? '#9ca3af' : '#fff',
                  fontWeight: 800, fontSize: 14, cursor: urlLoading || !urlInput.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: urlLoading || !urlInput.trim() ? 'none' : '0 4px 18px rgba(99,102,241,0.35)',
                  transition: 'all .2s',
                }}
              >
                {urlLoading ? <><Spinner size={15} color={urlInput.trim() ? '#fff' : '#9ca3af'} />Crawling pages…</> : '🔍 Fetch Products'}
              </button>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {urlInput.trim().split('\n').filter(u => u.trim().startsWith('http')).length} URL(s) queued
              </span>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 20, padding: '22px 24px', marginBottom: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', display: 'block', marginBottom: 7, letterSpacing: .3, textTransform: 'uppercase' }}>Keywords</label>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                  placeholder={`Search on ${PLATFORMS.find(p => p.id === tab)?.label}…`}
                  style={{
                    width: '100%', boxSizing: 'border-box', height: 46, borderRadius: 14,
                    border: '1.5px solid #e2e8f0', paddingInline: 16, fontSize: 14,
                    outline: 'none', color: '#0f172a', background: '#f8fafc',
                    fontWeight: 500, transition: 'border-color .15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div style={{ minWidth: 170 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', display: 'block', marginBottom: 7, letterSpacing: .3, textTransform: 'uppercase' }}>Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{
                    width: '100%', height: 46, borderRadius: 14,
                    border: '1.5px solid #e2e8f0', paddingInline: 14, fontSize: 14,
                    outline: 'none', color: '#0f172a', background: '#f8fafc', cursor: 'pointer',
                  }}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                className="bl-btn"
                onClick={() => doSearch(1)}
                disabled={loading || !query.trim()}
                style={{
                  height: 46, paddingInline: 32, borderRadius: 14, border: 'none',
                  background: loading || !query.trim() ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: loading || !query.trim() ? '#9ca3af' : '#fff',
                  fontWeight: 800, fontSize: 14, cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap',
                  boxShadow: loading || !query.trim() ? 'none' : '0 4px 18px rgba(99,102,241,0.35)',
                  transition: 'all .2s',
                }}
              >
                {loading ? <><Spinner size={15} color={query.trim() ? '#fff' : '#9ca3af'} />Searching…</> : '🔍 Search Products'}
              </button>
            </div>
          </div>
        )}

        {/* ── Warning banner ── */}
        {warning && (
          <div style={{
            background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1.5px solid #fde68a',
            borderRadius: 14, padding: '14px 18px', marginBottom: 20,
            fontSize: 13, color: '#92400e', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span>{warning}</span>
          </div>
        )}

        {/* ── Import result banner ── */}
        {importResult && (
          <div style={{
            background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac',
            borderRadius: 14, padding: '16px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#166534' }}>
                {importResult.imported} of {importResult.total} products imported successfully
              </div>
              {importResult.imported > 0 && (
                <div style={{ fontSize: 13, color: '#15803d', marginTop: 3 }}>
                  Visit <a href="/user/products" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Products</a> to review and publish them.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sticky action toolbar ── */}
        {products.length > 0 && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12, marginBottom: 24,
            background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(16px)',
            borderRadius: 18, padding: '14px 20px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(99,102,241,.15)',
            animation: 'popIn .2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                <div
                  onClick={toggleAll}
                  style={{
                    width: 22, height: 22, borderRadius: 7, cursor: 'pointer',
                    border: selected.size === products.length ? 'none' : '2px solid #d1d5db',
                    background: selected.size === products.length ? '#6366f1' : '#fff',
                    display: 'grid', placeItems: 'center',
                    boxShadow: selected.size === products.length ? '0 2px 8px rgba(99,102,241,.4)' : 'none',
                    transition: 'all .15s',
                  }}
                >
                  {selected.size === products.length && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path d="M20 6 9 17l-5-5"/></svg>}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#374151' }}>
                  Select All
                </span>
              </label>
              <span style={{ fontSize: 13, color: '#64748b', background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', fontWeight: 700 }}>
                {products.length} found
              </span>
              {selected.size > 0 && (
                <span style={{ fontSize: 13, color: '#6366f1', background: '#eef2ff', borderRadius: 8, padding: '4px 10px', fontWeight: 700, animation: 'popIn .2s' }}>
                  {selected.size} selected
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {selected.size > 0 && (
                <button
                  className="bl-btn"
                  onClick={importSelected}
                  disabled={importing}
                  style={{
                    height: 40, paddingInline: 22, borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    color: '#fff', fontWeight: 800, fontSize: 13, cursor: importing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(99,102,241,.35)',
                    transition: 'all .2s',
                  }}
                >
                  {importing ? <><Spinner size={13} />Importing…</> : `✓ Import ${selected.size} Selected`}
                </button>
              )}
              <button
                className="bl-btn"
                onClick={importAll}
                disabled={importing}
                style={{
                  height: 40, paddingInline: 20, borderRadius: 12,
                  border: '1.5px solid #6366f1', background: '#fff',
                  color: '#6366f1', fontWeight: 800, fontSize: 13, cursor: importing ? 'not-allowed' : 'pointer',
                  transition: 'all .2s',
                }}
              >
                Import All ({products.length})
              </button>
            </div>
          </div>
        )}

        {/* ── Skeleton loader ── */}
        {(loading || urlLoading) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ aspectRatio: '1', background: 'linear-gradient(90deg,#f1f5f9 25%,#e9eef5 50%,#f1f5f9 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
                <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                  <div style={{ height: 13, background: '#f1f5f9', borderRadius: 6, width: '90%' }} />
                  <div style={{ height: 13, background: '#f1f5f9', borderRadius: 6, width: '65%' }} />
                  <div style={{ height: 20, background: '#ede9fe', borderRadius: 8, width: '45%' }} />
                  <div style={{ height: 36, background: '#f1f5f9', borderRadius: 12 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Products Grid ── */}
        {products.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {products.map((p, i) => (
              <div key={p._bulkId} style={{ animation: `popIn .25s ease ${Math.min(i * 0.03, .3)}s both` }}>
                <ProductCard
                  product={p}
                  selected={selected.has(p._bulkId)}
                  onToggle={toggleSelect}
                  onImportSingle={prod => doImport([prod])}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !urlLoading && products.length === 0 && !warning && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 72, marginBottom: 20, filter: 'drop-shadow(0 8px 24px rgba(99,102,241,.25))' }}>
              {PLATFORMS.find(p => p.id === tab)?.flag || '🔍'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>
              {tab === 'url' ? 'Paste URLs to get started' : `Search ${PLATFORMS.find(p => p.id === tab)?.label}`}
            </div>
            <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 400, margin: '0 auto' }}>
              {tab === 'url'
                ? 'Copy product page URLs from any platform — Shein, Noon, Amazon or AliExpress — paste them above and click Fetch.'
                : 'Type keywords in the search box above and hit Search to find products with prices, images and delivery info.'}
            </p>
          </div>
        )}

        {/* ── Load more ── */}
        {hasMore && !loading && products.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <button
              className="bl-btn"
              onClick={() => doSearch(page + 1)}
              style={{
                height: 46, paddingInline: 44, borderRadius: 14,
                border: '2px solid #6366f1', background: '#fff',
                color: '#6366f1', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,.15)',
                transition: 'all .2s',
              }}
            >Load More</button>
          </div>
        )}

      </div>
    </div>
  )
}

