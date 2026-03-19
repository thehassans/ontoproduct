import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api'
import { formatMoney, heroStyle, inputStyle, pageWrapStyle, panelStyle, primaryButtonStyle, sectionTitle } from './shared.jsx'

export default function PartnerDriverAmounts() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState('')
  const [payAmount, setPayAmount] = useState({})

  async function loadRows() {
    setLoading(true)
    try {
      const res = await apiGet('/api/partners/me/driver-amounts')
      setRows(Array.isArray(res?.drivers) ? res.drivers : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRows() }, [])

  async function payRow(row) {
    const id = String(row?.id || row?._id || '')
    if (!id) return
    setPayingId(id)
    try {
      await apiPost(`/api/partners/me/drivers/${id}/pay`, { amount: Number(payAmount[id] || row?.pendingPayment || 0) })
      await loadRows()
    } finally {
      setPayingId('')
    }
  }

  return (
    <div style={pageWrapStyle()}>
      <div style={heroStyle()}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.78)' }}>Driver amounts</div>
          <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 950, letterSpacing: '-0.05em' }}>Driver payout control</div>
          <div style={{ color: 'rgba(226,232,240,0.84)', maxWidth: 720, fontSize: 15 }}>Review assigned, delivered, cancelled, earned, and pending payout amounts per driver.</div>
        </div>
      </div>
      <section style={{ ...panelStyle(), display: 'grid', gap: 12 }}>
        {sectionTitle('Driver performance', 'Accept pending payments with a direct partner payout action.')}
        {loading ? <div style={{ color: '#64748b' }}>Loading driver amounts…</div> : null}
        {!loading && !rows.length ? <div style={{ color: '#64748b' }}>No driver amounts available yet.</div> : null}
        {rows.map((row) => {
          const id = String(row?.id || row?._id || '')
          return (
            <div key={id} style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 22, padding: 16, display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{row?.name || 'Driver'}</div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>{row?.phone || '-'} · {row?.country || '-'}</div>
                </div>
                <div style={{ borderRadius: 999, background: 'rgba(15,23,42,0.06)', color: '#0f172a', padding: '8px 12px', fontSize: 12, fontWeight: 800 }}>{row?.paymentModel === 'salary' ? 'Salary' : 'Per Order'}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Assigned</div><div style={{ marginTop: 6, fontWeight: 900 }}>{Number(row?.totalAssigned || 0)}</div></div>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Delivered</div><div style={{ marginTop: 6, fontWeight: 900, color: '#065f46' }}>{Number(row?.totalDelivered || 0)}</div></div>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Cancelled</div><div style={{ marginTop: 6, fontWeight: 900, color: '#991b1b' }}>{Number(row?.cancelledOrders || 0)}</div></div>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Total Amount</div><div style={{ marginTop: 6, fontWeight: 900 }}>{formatMoney(row?.totalAmount, row?.currency || 'SAR')}</div></div>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Delivered Amount</div><div style={{ marginTop: 6, fontWeight: 900, color: '#065f46' }}>{formatMoney(row?.deliveredAmount, row?.currency || 'SAR')}</div></div>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>{row?.paymentModel === 'salary' ? 'Salary Amount' : 'Commission Per Order'}</div><div style={{ marginTop: 6, fontWeight: 900 }}>{formatMoney(row?.paymentModel === 'salary' ? row?.salaryAmount : row?.commissionPerOrder, row?.currency || 'SAR')}</div></div>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>{row?.paymentModel === 'salary' ? 'Current Salary Due' : 'Earned Amount'}</div><div style={{ marginTop: 6, fontWeight: 900, color: row?.paymentModel === 'salary' ? '#0f172a' : '#7c3aed' }}>{formatMoney(row?.paymentModel === 'salary' ? row?.salaryAmount : row?.earnedAmount, row?.currency || 'SAR')}</div></div>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Paid</div><div style={{ marginTop: 6, fontWeight: 900 }}>{formatMoney(row?.paidAmount, row?.currency || 'SAR')}</div></div>
                <div><div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Pending</div><div style={{ marginTop: 6, fontWeight: 900, color: '#1d4ed8' }}>{formatMoney(row?.pendingPayment, row?.currency || 'SAR')}</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 220px) auto', gap: 12, alignItems: 'end' }}>
                <input className="input" style={inputStyle()} value={payAmount[id] ?? row?.pendingPayment ?? ''} onChange={(e) => setPayAmount((prev) => ({ ...prev, [id]: e.target.value }))} placeholder="Payment amount" />
                <button className="btn" style={primaryButtonStyle()} disabled={payingId === id || Number(row?.pendingPayment || 0) <= 0} onClick={() => payRow(row)}>{payingId === id ? 'Paying…' : 'Accept Pending Payment'}</button>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
