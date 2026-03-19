import React, { useEffect, useMemo, useState } from 'react'
import { API_BASE, apiGet, mediaUrl } from '../../api.js'
import { PageShell, Panel, EmptyState, LoadingState, TextInput, SelectInput, StatusBadge, formatMoney, formatDate, SecondaryButton } from '../../components/shop/ShopUI.jsx'

function resolveImage(product) {
  const candidate = product?.imagePath || product?.images?.[0] || product?.thumbnail || ''
  if (!candidate) return `${import.meta.env.BASE_URL}logo.png`
  try {
    return mediaUrl(candidate)
  } catch {
    return candidate.startsWith('http') ? candidate : `${API_BASE}${candidate}`
  }
}

export default function ShopVendorProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await apiGet('/api/shops/me/products', { skipCache: true })
      setProducts(Array.isArray(result?.products) ? result.products : [])
    } catch (err) {
      setError(err?.message || 'Failed to load shop products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = Array.isArray(products) ? [...products] : []
    if (q) {
      list = list.filter((product) =>
        [product?.name, product?.sku, product?.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      )
    }
    list.sort((a, b) => {
      if (sortBy === 'a-z') return String(a?.name || '').localeCompare(String(b?.name || ''))
      if (sortBy === 'price-high') return Number(b?.shopAssignment?.shopBuyingPrice || 0) - Number(a?.shopAssignment?.shopBuyingPrice || 0)
      if (sortBy === 'price-low') return Number(a?.shopAssignment?.shopBuyingPrice || 0) - Number(b?.shopAssignment?.shopBuyingPrice || 0)
      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
    })
    return list
  }, [products, query, sortBy])

  if (loading) return <LoadingState label="Loading shop products" />

  return (
    <PageShell
      eyebrow="Shop catalog"
      title="Assigned products"
      subtitle="Everything currently routed to this shop, including the exact buying price agreed for payout calculations."
      actions={<SecondaryButton onClick={load}>Refresh</SecondaryButton>}
    >
      <Panel
        title="Catalog visibility"
        subtitle="Search the shop catalog by product name, SKU, or category"
        tone="violet"
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220 }}><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" /></div>
            <div style={{ minWidth: 180 }}>
              <SelectInput value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="a-z">A to Z</option>
                <option value="price-high">Highest buying price</option>
                <option value="price-low">Lowest buying price</option>
              </SelectInput>
            </div>
          </div>
        }
      >
        {error ? <EmptyState title="Products unavailable" description={error} action={<SecondaryButton onClick={load}>Retry</SecondaryButton>} /> : null}
        {!error && !filtered.length ? <EmptyState title="No products assigned yet" description="Once the owner assigns products to this shop, they will appear here with buying price visibility." /> : null}
        {!error && filtered.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map((product) => (
              <article
                key={product._id}
                style={{
                  overflow: 'hidden',
                  borderRadius: 24,
                  border: '1px solid rgba(226,232,240,0.95)',
                  background: 'rgba(255,255,255,0.98)',
                  boxShadow: '0 18px 36px rgba(15,23,42,0.06)',
                  display: 'grid',
                }}
              >
                <div style={{ aspectRatio: '1.5 / 1', background: '#f8fafc', overflow: 'hidden' }}>
                  <img src={resolveImage(product)} alt={product?.name || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 5 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: '#0f172a' }}>{product?.name || 'Product'}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{product?.sku ? `SKU ${product.sku}` : product?.category || 'Uncategorized'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <StatusBadge tone="violet">Buying {formatMoney(product?.shopAssignment?.shopBuyingPrice || 0, product?.baseCurrency || 'SAR')}</StatusBadge>
                    <StatusBadge tone={Number(product?.stockQty || 0) > 0 ? 'emerald' : 'rose'}>{Number(product?.stockQty || 0) > 0 ? `${Number(product?.stockQty || 0).toLocaleString()} in stock` : 'Out of stock'}</StatusBadge>
                  </div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#64748b' }}>
                    <div>Base price: <strong style={{ color: '#0f172a' }}>{formatMoney(product?.price || 0, product?.baseCurrency || 'SAR')}</strong></div>
                    <div>Assigned {formatDate(product?.shopAssignment?.assignedAt || product?.updatedAt)}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Panel>
    </PageShell>
  )
}
