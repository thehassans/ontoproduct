import React, { useEffect, useState } from 'react'
import { mediaUrl, apiGet, apiPost } from '../../api'
import { useToast } from '../../ui/Toast.jsx'
import Modal from '../../components/Modal.jsx'
import { formatMoney, heroStyle, inputStyle, pageWrapStyle, panelStyle, sectionTitle, statCardStyle } from './shared.jsx'

export default function PartnerPurchasing() {
  const [query, setQuery] = useState('')
  const [data, setData] = useState({ rows: [], summary: { totalStock: 0, totalValue: 0 }, currency: 'SAR', country: '' })
  const [loading, setLoading] = useState(true)

  const toast = useToast()
  const [drivers, setDrivers] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [assignForm, setAssignForm] = useState({})
  const [assigning, setAssigning] = useState({})

  useEffect(() => {
    apiGet('/api/partners/me/tracking/drivers').then(res => {
      setDrivers(Array.isArray(res?.users) ? res.users : [])
    }).catch(() => setDrivers([]))
  }, [])

  async function handleAssignStock(driverId, productId) {
    const qty = Number(assignForm[driverId] || 0)
    if (qty <= 0) {
      toast.error('Enter a valid quantity greater than 0')
      return
    }

    setAssigning(prev => ({ ...prev, [driverId]: true }))
    try {
      await apiPost(`/api/partners/me/drivers/${driverId}/assign-stock`, {
        productId,
        quantity: qty
      })
      toast.success(`Assigned ${qty} units to driver`)
      
      setData(prev => {
        const newRows = prev.rows.map(r => {
          if (String(r.productId?._id) === String(productId)) {
            return { ...r, stock: Number(r.stock) - qty }
          }
          return r
        })
        return { ...prev, rows: newRows }
      })
      setAssignForm(prev => ({ ...prev, [driverId]: '' }))
    } catch (err) {
      toast.error(err?.message || 'Failed to assign stock')
    } finally {
      setAssigning(prev => ({ ...prev, [driverId]: false }))
    }
  }

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
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(148,163,184,0.16)', paddingTop: 12 }}>
                  <button className="btn secondary" onClick={() => setSelectedProduct(row)} style={{ padding: '8px 16px', fontSize: 13 }}>Assign Stock to Driver</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedProduct && (
        <Modal title="Assign Stock to Driver" onClose={() => setSelectedProduct(null)}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700 }}>{selectedProduct.productId?.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Available to assign: <strong style={{color:'#0f172a'}}>{selectedProduct.stock}</strong> units</div>
            </div>
            
            <div style={{ display: 'grid', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {drivers.length === 0 ? <div style={{opacity:0.6}}>No drivers found</div> : null}
              {drivers.map(driver => (
                <div key={driver._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{driver.firstName} {driver.lastName}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{driver.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input 
                      type="number" 
                      min="1" 
                      max={selectedProduct.stock}
                      placeholder="Qty" 
                      className="input" 
                      style={{ width: 80, padding: '8px 12px' }}
                      value={assignForm[driver._id] || ''}
                      onChange={e => setAssignForm(p => ({...p, [driver._id]: e.target.value}))}
                    />
                    <button 
                      className="btn success" 
                      disabled={assigning[driver._id] || !assignForm[driver._id] || Number(assignForm[driver._id]) > Number(selectedProduct.stock)} 
                      onClick={() => handleAssignStock(driver._id, selectedProduct.productId?._id)}
                      style={{ padding: '8px 12px' }}
                    >
                      {assigning[driver._id] ? '...' : 'Assign'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
