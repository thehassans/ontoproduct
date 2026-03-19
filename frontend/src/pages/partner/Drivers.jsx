import React, { useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api'
import { countries, heroStyle, inputStyle, pageWrapStyle, panelStyle, primaryButtonStyle, secondaryButtonStyle, sectionTitle } from './shared.jsx'

const emptyForm = {
  name: '',
  phone: '',
  password: '',
  city: '',
  paymentModel: 'per_order',
  salaryAmount: '',
  commissionPerOrder: '',
}

export default function PartnerDrivers() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadDrivers() {
    try {
      const res = await apiGet('/api/partners/me/drivers')
      setRows(Array.isArray(res?.users) ? res.users : [])
    } catch {
      setRows([])
    }
  }

  useEffect(() => { loadDrivers() }, [])

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      if (editingId) await apiPatch(`/api/partners/me/drivers/${editingId}`, form)
      else await apiPost('/api/partners/me/drivers', form)
      setForm(emptyForm)
      setEditingId('')
      await loadDrivers()
      setMessage(editingId ? 'Driver updated' : 'Driver created')
    } catch (err) {
      setMessage(err?.message || 'Failed to save driver')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(row) {
    setEditingId(String(row?._id || ''))
    setForm({
      name: `${row?.firstName || ''} ${row?.lastName || ''}`.trim(),
      phone: row?.phone || '',
      password: '',
      city: row?.city || '',
      paymentModel: row?.driverProfile?.paymentModel || 'per_order',
      salaryAmount: row?.driverProfile?.salaryAmount || '',
      commissionPerOrder: row?.driverProfile?.commissionPerOrder || '',
    })
  }

  async function removeDriver(id) {
    try {
      await apiDelete(`/api/partners/me/drivers/${id}`)
      await loadDrivers()
    } catch (err) {
      setMessage(err?.message || 'Failed to delete driver')
    }
  }

  return (
    <div style={pageWrapStyle()}>
      <div style={heroStyle()}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.78)' }}>Drivers</div>
          <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 950, letterSpacing: '-0.05em' }}>Partner driver hub</div>
          <div style={{ color: 'rgba(226,232,240,0.84)', maxWidth: 720, fontSize: 15 }}>Create drivers for your country with either salary or per-order compensation.</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)', gap: 18 }}>
        <form onSubmit={submit} style={{ ...panelStyle(), display: 'grid', gap: 12, alignSelf: 'start' }}>
          {sectionTitle(editingId ? 'Edit driver' : 'Create driver', 'Compensation and credentials stay inside the partner workspace.')}
          <input className="input" style={inputStyle()} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Driver name" required />
          <input className="input" style={inputStyle()} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" required />
          <input className="input" style={inputStyle()} type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} placeholder={editingId ? 'New password (optional)' : 'Password'} required={!editingId} />
          <input className="input" style={inputStyle()} value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="City" />
          <select
            className="input"
            style={inputStyle()}
            value={form.paymentModel}
            onChange={(e) => {
              const paymentModel = e.target.value
              setForm((prev) => ({
                ...prev,
                paymentModel,
                salaryAmount: paymentModel === 'salary' ? prev.salaryAmount : '',
                commissionPerOrder: paymentModel === 'per_order' ? prev.commissionPerOrder : '',
              }))
            }}
          >
            <option value="per_order">Per Order</option>
            <option value="salary">Salary</option>
          </select>
          {form.paymentModel === 'salary' ? (
            <input className="input" style={inputStyle()} value={form.salaryAmount} onChange={(e) => setForm((prev) => ({ ...prev, salaryAmount: e.target.value }))} placeholder="Salary amount" />
          ) : (
            <input className="input" style={inputStyle()} value={form.commissionPerOrder} onChange={(e) => setForm((prev) => ({ ...prev, commissionPerOrder: e.target.value }))} placeholder="Commission per order" />
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" style={primaryButtonStyle()} disabled={loading}>{loading ? 'Saving…' : editingId ? 'Update Driver' : 'Create Driver'}</button>
            {editingId ? <button type="button" className="btn secondary" style={secondaryButtonStyle()} onClick={() => { setEditingId(''); setForm(emptyForm) }}>Cancel</button> : null}
          </div>
          {message ? <div style={{ fontSize: 13, color: message.toLowerCase().includes('failed') ? '#b91c1c' : '#0f766e' }}>{message}</div> : null}
        </form>
        <section style={{ ...panelStyle(), display: 'grid', gap: 12 }}>
          {sectionTitle('Driver list', 'Every driver here belongs to your partner account only.')}
          {rows.map((row) => (
            <div key={row?._id} style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 20, padding: 16, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{`${row?.firstName || ''} ${row?.lastName || ''}`.trim() || 'Driver'}</div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>{row?.phone || '-'} · {row?.city || row?.country || countries[0]}</div>
                </div>
                <div style={{ borderRadius: 999, background: 'rgba(15,23,42,0.06)', color: '#0f172a', padding: '8px 12px', fontSize: 12, fontWeight: 800 }}>{row?.driverProfile?.paymentModel === 'salary' ? 'Salary' : 'Per Order'}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>{row?.driverProfile?.paymentModel === 'salary' ? 'Salary Amount' : 'Commission Per Order'}</div>
                  <div style={{ marginTop: 6, fontWeight: 900, color: '#0f172a' }}>
                    {Number(row?.driverProfile?.paymentModel === 'salary' ? row?.driverProfile?.salaryAmount || 0 : row?.driverProfile?.commissionPerOrder || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Compensation Type</div>
                  <div style={{ marginTop: 6, fontWeight: 900, color: '#0f172a' }}>{row?.driverProfile?.paymentModel === 'salary' ? 'Fixed salary' : 'Paid per delivered order'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn secondary" style={secondaryButtonStyle()} onClick={() => startEdit(row)}>Edit</button>
                <button className="btn secondary" style={{ ...secondaryButtonStyle(), color: '#b91c1c' }} onClick={() => removeDriver(row?._id)}>Delete</button>
              </div>
            </div>
          ))}
          {!rows.length ? <div style={{ color: '#64748b' }}>No drivers created yet.</div> : null}
        </section>
      </div>
    </div>
  )
}
