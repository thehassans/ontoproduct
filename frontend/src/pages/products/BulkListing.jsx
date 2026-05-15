import React, { useState, useRef } from 'react'
import { apiPost } from '../../api'

const proxyImg = (url) =>
  url ? `/api/scrape/img?url=${encodeURIComponent(url)}` : null

const PLATFORMS = [
  { id: 'noon',        label: 'Noon.com',    flag: '🌙', color: '#f1c40f', desc: 'Saudi & UAE products' },
  { id: 'aliexpress',  label: 'AliExpress',  flag: '🧧', color: '#e74c3c', desc: 'Global suppliers' },
  { id: 'amazon',      label: 'Amazon.sa',   flag: '📦', color: '#f97316', desc: 'Saudi Amazon' },
  { id: 'shein',       label: 'Shein',       flag: '👗', color: '#ec4899', desc: 'Fashion & lifestyle' },
  { id: 'url',         label: 'URL Import',  flag: '🔗', color: '#6366f1', desc: 'Any product URL' },
]

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Beauty', 'Toys',
  'Automotive', 'Books', 'Food & Grocery', 'Health', 'Jewelry', 'Office',
]

function Toast({ msg, type }) {
  if (!msg) return null
  const bg = type === 'error' ? '#ef4444' : type === 'warning' ? '#f97316' : '#10b981'
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: bg, color: '#fff', borderRadius: 12,
      padding: '12px 20px', fontSize: 13, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      animation: 'fadeIn .25s ease',
      maxWidth: 360,
    }}>{msg}</div>
  )
}

function fmt(price, currency) {
  if (!price || price <= 0) return 'N/A'
  try { return `${currency || 'SAR'} ${Number(price).toFixed(2)}` } catch { return `${currency || 'SAR'} ${price}` }
}

function ProductCard({ product, selected, onToggle, onImportSingle }) {
  const [imgErr, setImgErr] = useState(false)
  const [useProxy, setUseProxy] = useState(false)
  const rawImg = product.images?.[0]
  const img = rawImg ? (useProxy ? proxyImg(rawImg) : rawImg) : null
  return (
    <div
      onClick={() => onToggle(product._bulkId)}
      style={{
        border: selected ? '2px solid #6366f1' : '1.5px solid #e5e7eb',
        borderRadius: 16,
        background: selected ? 'linear-gradient(145deg,#eef2ff,#fff)' : '#fff',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: selected ? '0 0 0 4px rgba(99,102,241,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {/* Checkbox */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 2,
        width: 22, height: 22, borderRadius: 6,
        border: selected ? 'none' : '2px solid #d1d5db',
        background: selected ? '#6366f1' : '#fff',
        display: 'grid', placeItems: 'center',
      }}>
        {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path d="M20 6 9 17l-5-5"/></svg>}
      </div>

      {/* Image */}
      <div style={{ aspectRatio: '1', background: '#f1f5f9', overflow: 'hidden', position: 'relative' }}>
        {img && !imgErr ? (
          <img
            src={img}
            alt={product.name}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={() => {
              if (!useProxy && rawImg) { setUseProxy(true) }  // retry via backend proxy
              else { setImgErr(true) }                         // give up
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 32, color: '#cbd5e1' }}>📦</div>
        )}
        {product.platform && (
          <span style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: 6,
            padding: '2px 7px', textTransform: 'uppercase',
          }}>{product.platform}</span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </div>
        {product.brand && (
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{product.brand}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#6366f1' }}>
            {fmt(product.price, product.currency)}
          </span>
          {product.originalPrice > product.price && (
            <span style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'line-through' }}>
              {product.currency || 'SAR'} {product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
        {product.delivery && (
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>🚚 {product.delivery}</div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {product.sourceUrl && (
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}
            >↗ View source</a>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onImportSingle(product) }}
          style={{
            marginTop: 6, height: 32, borderRadius: 8, border: 'none',
            background: selected ? '#6366f1' : '#f1f5f9',
            color: selected ? '#fff' : '#374151',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >+ Add to Listing</button>
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
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:none } }
        @keyframes spin { to { transform: rotate(360deg) } }
        .bl-tab:hover { opacity: .85 }
        .bl-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important }
      `}</style>

      <Toast msg={toast?.msg} type={toast?.type} />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>🔍 Bulk Listing Import</h1>
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
            Powered by crawl4ai
          </span>
        </div>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>
          Uses a real browser (Playwright) to bypass anti-bot protection. Search takes 15–30 seconds per request.
        </p>
      </div>

      {/* Platform Tabs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {PLATFORMS.map(pl => (
          <button
            key={pl.id}
            className="bl-tab"
            onClick={() => { setTab(pl.id); setProducts([]); setSelected(new Set()); setWarning('') }}
            style={{
              padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: tab === pl.id ? pl.color : '#f1f5f9',
              color: tab === pl.id ? (pl.id === 'noon' ? '#000' : '#fff') : '#374151',
              fontWeight: 700, fontSize: 13,
              boxShadow: tab === pl.id ? `0 4px 12px ${pl.color}55` : 'none',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <span>{pl.flag}</span>
            <span>{pl.label}</span>
            <span style={{ fontSize: 11, opacity: .75, fontWeight: 500 }}>{pl.desc}</span>
          </button>
        ))}
      </div>

      {/* URL Import Panel */}
      {tab === 'url' ? (
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1.5px solid #e5e7eb', marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Paste Product URLs</div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, marginTop: 0 }}>
            One URL per line. Works with Shein, Noon, Amazon, AliExpress, and most product pages.
          </p>
          <textarea
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder={'https://www.noon.com/saudi-en/product-name/p/\nhttps://www.shein.com/product-name-p123.html\nhttps://www.amazon.sa/dp/B0EXAMPLE'}
            rows={6}
            style={{
              width: '100%', boxSizing: 'border-box', borderRadius: 12,
              border: '1.5px solid #e5e7eb', padding: '12px 14px',
              fontSize: 13, fontFamily: 'monospace', resize: 'vertical',
              outline: 'none', color: '#0f172a', background: '#f8fafc',
            }}
          />
          <button
            onClick={importUrlList}
            disabled={urlLoading || !urlInput.trim()}
            style={{
              marginTop: 14, height: 44, paddingInline: 28, borderRadius: 12, border: 'none',
              background: urlLoading || !urlInput.trim() ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              color: urlLoading || !urlInput.trim() ? '#9ca3af' : '#fff',
              fontWeight: 700, fontSize: 14, cursor: urlLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            {urlLoading ? (
              <><div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .65s linear infinite' }} />Fetching...</>
            ) : '🔍 Fetch Products'}
          </button>
        </div>
      ) : (
        /* Search Panel */
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1.5px solid #e5e7eb', marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Search Keywords</label>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                placeholder={`Search on ${PLATFORMS.find(p => p.id === tab)?.label}...`}
                style={{
                  width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 12,
                  border: '1.5px solid #e5e7eb', paddingInline: 14, fontSize: 14,
                  outline: 'none', color: '#0f172a', background: '#f8fafc',
                }}
              />
            </div>
            <div style={{ minWidth: 160 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Category (optional)</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: '100%', height: 44, borderRadius: 12,
                  border: '1.5px solid #e5e7eb', paddingInline: 12, fontSize: 14,
                  outline: 'none', color: '#0f172a', background: '#f8fafc', cursor: 'pointer',
                }}
              >
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button
              onClick={() => doSearch(1)}
              disabled={loading || !query.trim()}
              style={{
                height: 44, paddingInline: 28, borderRadius: 12, border: 'none',
                background: loading || !query.trim() ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                color: loading || !query.trim() ? '#9ca3af' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
              }}
            >
              {loading
                ? <><div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .65s linear infinite' }} />Crawling… (15–30s)</>
                : '🔍 Search Products'}
            </button>
          </div>
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div style={{ background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e', fontWeight: 500 }}>
          ⚠️ {warning}
        </div>
      )}

      {/* Toolbar */}
      {products.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 20,
          background: '#fff', borderRadius: 16, padding: '14px 20px',
          border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#374151' }}>
              <input type="checkbox" checked={selected.size === products.length} onChange={toggleAll} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              Select All ({products.length})
            </label>
            {selected.size > 0 && (
              <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 700 }}>
                {selected.size} selected
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {selected.size > 0 && (
              <button
                onClick={importSelected}
                disabled={importing}
                style={{
                  height: 38, paddingInline: 20, borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {importing
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .65s linear infinite' }} />Importing…</>
                  : `✓ Import ${selected.size} Selected`}
              </button>
            )}
            <button
              onClick={importAll}
              disabled={importing}
              style={{
                height: 38, paddingInline: 20, borderRadius: 10,
                border: '1.5px solid #6366f1', background: '#fff',
                color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              Import All ({products.length})
            </button>
          </div>
        </div>
      )}

      {/* Import result summary */}
      {importResult && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#166534' }}>
          ✅ <strong>{importResult.imported} products imported successfully</strong> out of {importResult.total}.
          {importResult.imported > 0 && (
            <span> Visit <a href="/user/products" style={{ color: '#16a34a', fontWeight: 700 }}>Products</a> to review and publish them.</span>
          )}
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {products.map(p => (
            <ProductCard
              key={p._bulkId}
              product={p}
              selected={selected.has(p._bulkId)}
              onToggle={toggleSelect}
              onImportSingle={prod => doImport([prod])}
            />
          ))}
        </div>
      ) : !loading && !urlLoading && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>
            {PLATFORMS.find(p => p.id === tab)?.flag || '🔍'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            {tab === 'url' ? 'Paste URLs above to start' : `Search on ${PLATFORMS.find(p => p.id === tab)?.label}`}
          </div>
          <div style={{ fontSize: 14 }}>
            {tab === 'url'
              ? 'Copy product URLs from any platform and paste them one per line.'
              : 'Enter keywords and hit Search to find products.'}
          </div>
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && products.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <button
            onClick={() => doSearch(page + 1)}
            style={{
              height: 44, paddingInline: 36, borderRadius: 12,
              border: '1.5px solid #6366f1', background: '#fff',
              color: '#6366f1', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >Load More</button>
        </div>
      )}

      {/* Loading skeleton */}
      {(loading || urlLoading) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: '#fff', border: '1.5px solid #e5e7eb' }}>
              <div style={{ aspectRatio: '1', background: 'linear-gradient(90deg,#f1f5f9 25%,#e5e7eb 50%,#f1f5f9 75%)', backgroundSize: '200%', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                <div style={{ height: 14, background: '#f1f5f9', borderRadius: 6 }} />
                <div style={{ height: 14, width: '60%', background: '#f1f5f9', borderRadius: 6 }} />
                <div style={{ height: 20, width: '40%', background: '#ede9fe', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
