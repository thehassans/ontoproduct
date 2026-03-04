import React, { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { apiGet, mediaUrl } from '../../api'

export default function MyStock() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024))
  useEffect(() => {
    const onResize = () => {
      try {
        setVw(window.innerWidth || 1024)
      } catch {}
    }
    try {
      window.addEventListener('resize', onResize)
    } catch {}
    return () => {
      try {
        window.removeEventListener('resize', onResize)
      } catch {}
    }
  }, [])
  const isMobileView = vw <= 768
  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('me') || '{}')
    } catch {
      return {}
    }
  })

  async function load() {
    setLoading(true)
    try {
      const r = await apiGet('/api/manager-stock/me')
      setRows(Array.isArray(r?.rows) ? r.rows : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { user } = await apiGet('/api/users/me')
        if (!alive) return
        setMe(user || {})
        try {
          localStorage.setItem('me', JSON.stringify(user || {}))
        } catch {}
      } catch {
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const canAccessProductDetail = !!(me && me.managerPermissions && me.managerPermissions.canAccessProductDetail)

  const items = useMemo(() => {
    const map = new Map()
    for (const row of rows || []) {
      const p = row?.productId
      const pid = String(p?._id || row?.productId || '')
      if (!pid) continue
      const name = p?.name || row?.productName || 'Product'
      const image = p?.imagePath || (Array.isArray(p?.images) ? p.images[0] : '')
      const country = String(row?.country || '').trim()
      const qty = Number(row?.qty || 0)
      if (!map.has(pid)) {
        map.set(pid, { productId: pid, name, image, countries: {}, total: 0 })
      }
      const it = map.get(pid)
      if (!it.image && image) it.image = image
      it.countries[country] = (it.countries[country] || 0) + qty
      it.total += qty
    }
    let arr = Array.from(map.values())
    const query = String(q || '').trim().toLowerCase()
    if (query) {
      arr = arr.filter((it) => {
        if (String(it.name || '').toLowerCase().includes(query)) return true
        for (const c of Object.keys(it.countries || {})) {
          if (String(c).toLowerCase().includes(query)) return true
        }
        return false
      })
    }
    arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    return arr
  }, [rows, q])

  const summary = useMemo(() => {
    const productCount = items.length
    const totalUnits = items.reduce((acc, it) => acc + Number(it.total || 0), 0)
    const countrySet = new Set()
    for (const it of items) {
      for (const c of Object.keys(it.countries || {})) {
        if (Number(it.countries?.[c] || 0) > 0) countrySet.add(String(c))
      }
    }
    return {
      productCount,
      totalUnits,
      countryCount: countrySet.size
    }
  }, [items])

  return (
    <div className="section">
      <div className="page-header" style={isMobileView ? { flexDirection: 'column', alignItems: 'stretch', gap: 10 } : undefined}>
        <div>
          <div className="page-title gradient heading-blue">My Stock</div>
          <div className="page-subtitle">Your allocated product stock</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, display: 'grid', gap: 14, borderRadius: 18, border: '1px solid var(--border)', background: 'rgba(148, 163, 184, 0.05)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10
          }}
        >
          <div
            className="card"
            style={{
              padding: 12,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.10), rgba(99, 102, 241, 0.06))',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              borderRadius: 16,
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>Products</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em' }}>{summary.productCount}</div>
          </div>
          <div
            className="card"
            style={{
              padding: 12,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.10), rgba(34, 197, 94, 0.06))',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              borderRadius: 16,
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total Units</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em' }}>{summary.totalUnits}</div>
          </div>
          <div
            className="card"
            style={{
              padding: 12,
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(251, 191, 36, 0.06))',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              borderRadius: 16,
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>Countries</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em' }}>{summary.countryCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: isMobileView ? 'stretch' : 'center', flexDirection: isMobileView ? 'column' : undefined }}>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product or country"
            style={{ minWidth: 0, flex: 1, width: isMobileView ? '100%' : undefined, padding: '12px 14px', borderRadius: 14 }}
          />
          <button className="btn" onClick={load} disabled={loading} style={isMobileView ? { width: '100%', borderRadius: 14, padding: '12px 14px', fontWeight: 700 } : { borderRadius: 14, padding: '12px 14px', fontWeight: 700 }}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="helper">Loading...</div>
        ) : items.length === 0 ? (
          <div className="helper">No allocated stock</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: isMobileView ? 10 : 12
            }}
          >
            {items.map((it) => {
              const countries = Object.entries(it.countries || {})
                .filter(([, v]) => Number(v || 0) > 0)
                .sort((a, b) => String(a[0]).localeCompare(String(b[0])))

              const img = mediaUrl(it.image) || '/placeholder-product.svg'

              return (
                <div
                  key={it.productId}
                  className="card"
                  style={{
                    padding: 16,
                    display: 'grid',
                    gap: 12,
                    borderRadius: 18,
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.06), rgba(255,255,255,0))',
                    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        overflow: 'hidden',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        background: 'var(--panel)',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={img}
                        alt={it.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.svg'
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 950, lineHeight: 1.15, wordBreak: 'break-word', letterSpacing: '-0.02em' }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{countries.length} countries</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total</div>
                      <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: '-0.02em' }}>{Number(it.total || 0)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {countries.map(([c, v]) => (
                      <span
                        key={c}
                        className="chip"
                        style={{
                          background: 'rgba(148, 163, 184, 0.08)',
                          border: '1px solid rgba(148, 163, 184, 0.16)',
                          borderRadius: 999,
                          padding: '6px 10px',
                          fontWeight: 700
                        }}
                      >
                        <strong>{c}</strong>
                        <span style={{ marginLeft: 6 }}>{Number(v || 0)}</span>
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {canAccessProductDetail ? (
                      <NavLink className="btn secondary" to={`/manager/products/${it.productId}`} style={{ borderRadius: 14, padding: '10px 12px', fontWeight: 700 }}>
                        View Product
                      </NavLink>
                    ) : (
                      <span className="helper">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
