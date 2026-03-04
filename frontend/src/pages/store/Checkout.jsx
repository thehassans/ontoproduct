import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost, API_BASE } from '../../api'
import { COUNTRY_TO_CODE, COUNTRY_TO_CURRENCY } from '../../utils/constants'

export default function Checkout(){
  const navigate = useNavigate()
  const [cart, setCart] = useState(()=>{ try{ return JSON.parse(localStorage.getItem('shopping_cart')||'[]') }catch{ return [] } })
  const [country, setCountry] = useState(()=> localStorage.getItem('selected_country') || 'GB')
  const [form, setForm] = useState({ name:'', phone:'', city:'', area:'', address:'', details:'' })
  const [submitting, setSubmitting] = useState(false)
  const phoneCode = COUNTRY_TO_CODE[country] || '+966'
  
  useEffect(() => {
    const sync = () => {
      try {
        const sc = localStorage.getItem('selected_country') || 'GB'
        setCountry(sc)
      } catch {
        setCountry('GB')
      }
    }
    sync()
    const handleCountryChange = (e) => {
      try {
        const code = String(e?.detail?.code || '').trim()
        if (code) setCountry(code)
      } catch {}
    }
    window.addEventListener('countryChanged', handleCountryChange)
    return () => window.removeEventListener('countryChanged', handleCountryChange)
  }, [])

  useEffect(()=>{ try{ localStorage.setItem('shopping_cart', JSON.stringify(cart)) }catch{} },[cart])

  const total = useMemo(()=> cart.reduce((s, it) => s + (Number(it.price||0) * Math.max(1, Number(it.quantity||1))), 0), [cart])
  const currency = COUNTRY_TO_CURRENCY[country] || 'SAR'

  function onChange(e){
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function submitOrder(){
    if (!cart.length){ alert('Your cart is empty'); return }
    if (!form.name || !form.phone || !form.city || !form.area || !form.address){ alert('Please fill your name, phone, city, area and address'); return }
    try{
      setSubmitting(true)
      const items = cart.map(it => ({
        productId: it.productId || it.id,
        quantity: Math.max(1, Number(it.quantity||1)),
        warehouseType: it.warehouseType,
        warehouseCountry: it.warehouseCountry,
        etaMinDays: it.etaMinDays,
        etaMaxDays: it.etaMaxDays,
      }))
      const body = {
        customerName: form.name,
        customerPhone: form.phone,
        phoneCountryCode: phoneCode,
        orderCountry: country,
        city: form.city,
        area: form.area,
        address: form.address,
        details: form.details || `Website order for ${cart.length} items`,
        items,
        currency: currency
      }
      await apiPost('/api/ecommerce/orders', body) // Fixed endpoint to match CartPage
      alert('Order submitted. We will contact you shortly!')
      setCart([])
      try{ localStorage.setItem('shopping_cart', '[]') }catch{}
      window.dispatchEvent(new CustomEvent('cartUpdated'))
      setForm({ name:'', phone:'', city:'', area:'', address:'', details:'' })
      navigate('/catalog')
    }catch(err){ alert(err?.message||'Failed to submit order') }
    finally{ setSubmitting(false) }
  }

  return (
    <div className="content" style={{ padding: '24px 16px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div className="page-header" style={{marginBottom: '32px'}}>
        <div>
          <h1 style={{fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px'}}>Checkout</h1>
          <p style={{color: '#6b7280'}}>Review your cart and complete your order</p>
        </div>
      </div>

      {/* Invoice-style summary */}
      <div className="card" style={{background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px'}}>
        <div className="card-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
          <span style={{fontWeight: '600', fontSize: '18px'}}>Cart Summary</span>
          <span style={{fontWeight: '800', color: '#f97316', fontSize: '20px'}}>
            Total: {currency} {total.toFixed(2)}
          </span>
        </div>
        {!cart.length ? (
          <div className="helper" style={{color: '#6b7280'}}>Your cart is empty</div>
        ) : (
          <div className="section" style={{overflowX:'auto'}}>
            <table className="table" style={{width:'100%', borderCollapse:'separate', borderSpacing: '0 12px'}}>
              <thead>
                <tr style={{color: '#6b7280', fontSize: '14px', textAlign: 'left'}}>
                  <th style={{paddingBottom: '12px'}}>Item</th>
                  <th style={{textAlign:'right', paddingBottom: '12px'}}>Unit</th>
                  <th style={{textAlign:'right', paddingBottom: '12px'}}>Qty</th>
                  <th style={{textAlign:'right', paddingBottom: '12px'}}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((it, idx) => (
                  <tr key={idx} style={{background: '#f9fafb', borderRadius: '8px'}}>
                    <td style={{padding: '12px', borderRadius: '8px 0 0 8px'}}>
                      <div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center'}}>
                        <img alt="thumb" src={it.image? (it.image.startsWith('http') ? it.image : `${API_BASE}${it.image}`): `/placeholder-product.svg`} style={{width:48, height:48, objectFit:'cover', borderRadius:8}}/>
                        <div>
                          <div style={{fontWeight:600, color: '#111827'}}>{it.name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{textAlign:'right', padding: '12px', color: '#4b5563'}}>{it.currency} {Number(it.price||0).toFixed(2)}</td>
                    <td style={{textAlign:'right', padding: '12px', color: '#4b5563'}}>{Math.max(1, Number(it.quantity||1))}</td>
                    <td style={{textAlign:'right', fontWeight:700, padding: '12px', borderRadius: '0 8px 8px 0', color: '#111827'}}>{it.currency} {(Number(it.price||0)*Math.max(1, Number(it.quantity||1))).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer details */}
      <div className="card" style={{background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
        <div className="card-title" style={{fontSize: '18px', fontWeight: '600', marginBottom: '20px'}}>Customer Details</div>
        <div className="section" style={{display:'grid', gap:16}}>
          <div className="form-grid" style={{display: 'grid', gap: '16px'}}>
            <label className="field">
              <div style={{fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151'}}>Name</div>
              <input name="name" className="input" value={form.name} onChange={onChange} placeholder="Full name" style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none', transition: 'border-color 0.2s'}} />
            </label>
            <label className="field">
              <div style={{fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151'}}>Phone</div>
              <div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:8, alignItems:'center'}}>
                <div className="input" style={{padding:'12px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#6b7280'}}>{phoneCode}</div>
                <input name="phone" className="input" value={form.phone} onChange={onChange} placeholder="5xxxxxxx" style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none'}} />
              </div>
            </label>
            <label className="field">
              <div style={{fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151'}}>City</div>
              <input name="city" className="input" value={form.city} onChange={onChange} placeholder="City" style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none'}} />
            </label>
            <label className="field">
              <div style={{fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151'}}>Area</div>
              <input name="area" className="input" value={form.area} onChange={onChange} placeholder="Area / district" style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none'}} />
            </label>
            <label className="field" style={{gridColumn:'1 / -1'}}>
              <div style={{fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151'}}>Address</div>
              <input name="address" className="input" value={form.address} onChange={onChange} placeholder="Street, building" style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none'}} />
            </label>
            <label className="field" style={{gridColumn:'1 / -1'}}>
              <div style={{fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151'}}>Details (optional)</div>
              <textarea name="details" className="input" rows={3} value={form.details} onChange={onChange} placeholder="Any notes for delivery" style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none', resize: 'vertical'}} />
            </label>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop: '20px'}}>
            <button className="btn secondary" onClick={()=> navigate('/catalog')} style={{padding: '12px 24px', borderRadius: '8px', background: '#f3f4f6', color: '#374151', border: 'none', fontWeight: '600', cursor: 'pointer'}}>Back to Catalog</button>
            <button className="btn" onClick={submitOrder} disabled={!cart.length || submitting} style={{padding: '12px 32px', borderRadius: '8px', background: '#f97316', color: 'white', border: 'none', fontWeight: '600', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1}}>
              {submitting? 'Submitting…' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
