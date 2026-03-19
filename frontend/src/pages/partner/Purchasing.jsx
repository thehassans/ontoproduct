import React, { useEffect, useState } from 'react'
import { mediaUrl, apiGet } from '../../api'
import { formatMoney, heroStyle, inputStyle, pageWrapStyle, panelStyle, sectionTitle, statCardStyle } from './shared.jsx'

export default function PartnerPurchasing() {
  const [query, setQuery] = useState('')
  const [data, setData] = useState({ rows: [], summary: { totalStock: 0, totalValue: 0 }, currency: 'SAR', country: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await apiGet(`/api/partners/me/purchasing?q=${encodeURIComponent(query)}`)
        if (active) setData({ rows: Array.isArray(res?.rows) ? res.rows : [], summary: res?.summary || { totalStock: 0, totalValue: 0 }, currency: res?.currency || 'SAR', country: res?.country || '' })
      } catch {
        if (active) setData({ rows: [], summary: { totalStock: 0, totalValue: 0 }, currency: 'SAR', country: '' })
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [query])

  return (
    <div style={pageWrapStyle()}>
      <div style={heroStyle()}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.78)' }}>Purchasing</div>
          <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 950, letterSpacing: '-0.05em' }}>Partner purchasing ledger</div>
          <div style={{ color: 'rgba(226,232,240,0.84)', maxWidth: 720, fontSize: 15 }}>Track partner purchasing stock and per-piece pricing synced from the owner product detail flow.</div>
        </div>
      </div>
      <section style={panelStyle()}>
        {sectionTitle('Purchasing snapshot', `Country: ${data.country || 'Assigned country'}`)}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 18 }}>
          <div style={statCardStyle('#0f172a')}><div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>Total Stock</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 950 }}>{Number(data.summary?.totalStock || 0)}</div></div>
          <div style={statCardStyle('#2563eb')}><div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 700 }}>Inventory Value</div><div style={{ marginTop: 10, fontSize: 22, fontWeight: 950, color: '#1d4ed8' }}>{formatMoney(data.summary?.totalValue, data.currency)}</div></div>
        </div>
      </section>
      <section style={panelStyle()}>
        <input className="input" style={{ ...inputStyle(), maxWidth: 320 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product" />
        <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          {loading ? <div style={{ color: '#64748b' }}>Loading purchasing…</div> : null}
          {!loading && !data.rows.length ? <div style={{ color: '#64748b' }}>No purchasing rows available yet.</div> : null}
          {data.rows.map((row) => (
            <div key={row?._id} style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 22, padding: 16, display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', background: '#e2e8f0' }}>
                {row?.productId?.imagePath || row?.productId?.images?.[0] ? <img src={mediaUrl(row?.productId?.imagePath || row?.productId?.images?.[0])} alt={row?.productId?.name || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{row?.productId?.name || 'Product'}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{row?.country || data.country}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Price per piece</div>
                    <div style={{ marginTop: 6, color: '#0f172a', fontWeight: 900 }}>{formatMoney(row?.pricePerPiece, row?.currency || data.currency)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Partner Stock</div><div style={{ marginTop: 6, color: '#0f172a', fontWeight: 900 }}>{Number(row?.stock || 0)}</div></div>
                  <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Owner Purchase Price</div><div style={{ marginTop: 6, color: '#0f172a', fontWeight: 900 }}>{formatMoney(row?.productId?.purchasePrice, row?.productId?.baseCurrency || data.currency)}</div></div>
                  <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Total Value</div><div style={{ marginTop: 6, color: '#0f172a', fontWeight: 900 }}>{formatMoney(Number(row?.stock || 0) * Number(row?.pricePerPiece || 0), row?.currency || data.currency)}</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
