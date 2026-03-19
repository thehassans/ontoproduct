import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPatch } from '../../api.js'
import { PageShell, Panel, EmptyState, LoadingState, TextInput, Label, PrimaryButton, SecondaryButton, SelectInput, StatusBadge, formatDate } from '../../components/shop/ShopUI.jsx'
import { useToast } from '../../ui/Toast.jsx'

function normalizeAssignments(product) {
  return Array.isArray(product?.shops)
    ? product.shops.map((entry) => ({
        shopId: String(entry?.shopId?._id || entry?.shopId || ''),
        shopBuyingPrice: Number(entry?.shopBuyingPrice || 0),
        assignedAt: entry?.assignedAt,
        assignedBy: entry?.assignedBy,
      })).filter((entry) => entry.shopId)
    : []
}

export default function ShopCatalogAssignments() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [draftAssignments, setDraftAssignments] = useState([])
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [productsRes, shopsRes] = await Promise.all([
        apiGet('/api/products', { skipCache: true }),
        apiGet('/api/shops', { skipCache: true }),
      ])
      const nextProducts = Array.isArray(productsRes?.products) ? productsRes.products : []
      const nextShops = Array.isArray(shopsRes?.shops) ? shopsRes.shops : []
      setProducts(nextProducts)
      setShops(nextShops)
      const firstId = nextProducts[0]?._id ? String(nextProducts[0]._id) : ''
      setSelectedProductId((prev) => prev || firstId)
    } catch (err) {
      setError(err?.message || 'Failed to load products and shops')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) =>
      [product?.name, product?.sku, product?.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }, [products, search])

  const selectedProduct = useMemo(() => products.find((product) => String(product._id) === String(selectedProductId)) || null, [products, selectedProductId])

  useEffect(() => {
    if (!selectedProduct) {
      setDraftAssignments([])
      return
    }
    setDraftAssignments(normalizeAssignments(selectedProduct))
  }, [selectedProduct])

  function upsertAssignment(shopId, enabled) {
    setDraftAssignments((prev) => {
      const existing = prev.find((item) => String(item.shopId) === String(shopId))
      if (enabled && !existing) return [...prev, { shopId: String(shopId), shopBuyingPrice: 0 }]
      if (!enabled && existing) return prev.filter((item) => String(item.shopId) !== String(shopId))
      return prev
    })
  }

  function updatePrice(shopId, value) {
    setDraftAssignments((prev) => prev.map((item) => String(item.shopId) === String(shopId) ? { ...item, shopBuyingPrice: value } : item))
  }

  async function saveAssignments() {
    if (!selectedProduct) return
    setSaving(true)
    try {
      const payload = draftAssignments.map((item) => ({ shopId: item.shopId, shopBuyingPrice: Number(item.shopBuyingPrice || 0) }))
      const result = await apiPatch(`/api/products/${selectedProduct._id}`, { shops: payload })
      const updatedProduct = result?.product
      setProducts((prev) => prev.map((product) => (String(product._id) === String(updatedProduct?._id || selectedProduct._id) ? { ...product, ...(updatedProduct || {}), shops: updatedProduct?.shops || payload } : product)))
      toast.success('Shop assignments updated')
    } catch (err) {
      toast.error(err?.message || 'Failed to save shop assignments')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading shop assignments" />

  return (
    <PageShell
      eyebrow="Product routing"
      title="Shop product assignments"
      subtitle="Control which shops can fulfill each product and define the exact shop buying price used in payout logic."
      actions={<SecondaryButton onClick={load}>Refresh</SecondaryButton>}
    >
      {error ? <EmptyState title="Assignments unavailable" description={error} action={<SecondaryButton onClick={load}>Retry</SecondaryButton>} /> : null}
      {!error ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.9fr) minmax(0, 1.1fr)', gap: 18 }}>
          <Panel title="Products" subtitle="Choose a product to manage its shop coverage" tone="violet" action={<div style={{ minWidth: 220 }}><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" /></div>}>
            {!filteredProducts.length ? <EmptyState title="No products found" description="Try a different search term or create products first." /> : (
              <div style={{ display: 'grid', gap: 10, maxHeight: 700, overflowY: 'auto', paddingRight: 4 }}>
                {filteredProducts.map((product) => {
                  const assignmentCount = Array.isArray(product?.shops) ? product.shops.length : 0
                  return (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => setSelectedProductId(String(product._id))}
                      style={{
                        textAlign: 'left',
                        borderRadius: 18,
                        border: String(product._id) === String(selectedProductId) ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(226,232,240,0.95)',
                        background: String(product._id) === String(selectedProductId) ? 'linear-gradient(135deg, rgba(245,243,255,0.98), rgba(255,255,255,0.98))' : 'rgba(255,255,255,0.98)',
                        padding: 14,
                        display: 'grid',
                        gap: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{product.name || 'Product'}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{product.sku || '-'} • {product.category || 'Uncategorized'}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <StatusBadge tone={assignmentCount ? 'violet' : 'neutral'}>{assignmentCount} shop assignments</StatusBadge>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{formatDate(product.updatedAt || product.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>

          <Panel title={selectedProduct ? selectedProduct.name : 'Shop assignments'} subtitle={selectedProduct ? 'Select coverage and buying price per shop' : 'Choose a product from the left'} tone="orange" action={selectedProduct ? <PrimaryButton onClick={saveAssignments} disabled={saving}>{saving ? 'Saving…' : 'Save assignments'}</PrimaryButton> : null}>
            {!selectedProduct ? <EmptyState title="Choose a product" description="Select a product to define which shops can fulfill it and what each shop should be paid." /> : (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ color: '#0f172a', fontWeight: 900, letterSpacing: '-0.03em', fontSize: 20 }}>{selectedProduct.name}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{selectedProduct.sku || '-'} • {selectedProduct.category || 'Uncategorized'}</div>
                </div>
                {!shops.length ? <EmptyState title="No shops found" description="Create shop vendors first, then map this product to them." /> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {shops.map((shop) => {
                      const entry = draftAssignments.find((item) => String(item.shopId) === String(shop._id))
                      const enabled = !!entry
                      return (
                        <div key={shop._id} style={{ borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', background: 'rgba(255,255,255,0.98)', padding: 16, display: 'grid', gap: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'grid', gap: 4 }}>
                              <div style={{ fontWeight: 900, color: '#0f172a' }}>{shop.name}</div>
                              <div style={{ color: '#64748b', fontSize: 13 }}>{shop.ownerName || '-'} • {shop.phone || '-'}</div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: '#0f172a' }}>
                              <input type="checkbox" checked={enabled} onChange={(e) => upsertAssignment(shop._id, e.target.checked)} />
                              Assigned
                            </label>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
                            <div style={{ display: 'grid', gap: 6 }}>
                              <Label>Shop buying price</Label>
                              <TextInput type="number" min="0" step="0.01" value={enabled ? entry?.shopBuyingPrice ?? '' : ''} disabled={!enabled} onChange={(e) => updatePrice(shop._id, e.target.value)} placeholder="0.00" />
                            </div>
                            <div style={{ color: '#64748b', fontSize: 13 }}>
                              {enabled ? 'This amount becomes the shop payout basis for all assigned orders containing the product.' : 'Enable the shop to route this product to that vendor location.'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      ) : null}
    </PageShell>
  )
}
