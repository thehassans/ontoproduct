import React, { useEffect, useState } from 'react'
import { apiGet } from '../../api'
import { formatMoney, heroStyle, metricGridStyle, pageWrapStyle, panelStyle, sectionTitle, statCardStyle } from './shared.jsx'

export default function PartnerDashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await apiGet('/api/partners/me/dashboard')
        if (active) setSummary(data?.summary || null)
      } catch {
        if (active) setSummary(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const currency = summary?.currency || 'SAR'

  return (
    <div style={pageWrapStyle()}>
      <div style={heroStyle()}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.78)' }}>Country scoped performance</div>
          <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 950, letterSpacing: '-0.05em' }}>Partner dashboard</div>
          <div style={{ color: 'rgba(226,232,240,0.84)', maxWidth: 720, fontSize: 15 }}>
            Monitor all order and amount activity for {summary?.country || 'your assigned country'} in one premium workspace.
          </div>
        </div>
      </div>

      <section style={panelStyle()}>
        {sectionTitle('Country snapshot', 'Live totals for your assigned partnership country.')}
        {loading ? (
          <div style={{ color: '#64748b', marginTop: 16 }}>Loading dashboard…</div>
        ) : (
          <div style={{ ...metricGridStyle(), marginTop: 18 }}>
            <div style={statCardStyle('#0f172a')}>
              <div style={{ color: '#475569', fontSize: 13, fontWeight: 700 }}>Total Orders</div>
              <div style={{ fontSize: 30, fontWeight: 950, color: '#0f172a', marginTop: 10 }}>{Number(summary?.totalOrders || 0)}</div>
            </div>
            <div style={statCardStyle('#059669')}>
              <div style={{ color: '#065f46', fontSize: 13, fontWeight: 700 }}>Delivered Orders</div>
              <div style={{ fontSize: 30, fontWeight: 950, color: '#065f46', marginTop: 10 }}>{Number(summary?.deliveredOrders || 0)}</div>
            </div>
            <div style={statCardStyle('#dc2626')}>
              <div style={{ color: '#991b1b', fontSize: 13, fontWeight: 700 }}>Cancelled Orders</div>
              <div style={{ fontSize: 30, fontWeight: 950, color: '#991b1b', marginTop: 10 }}>{Number(summary?.cancelledOrders || 0)}</div>
            </div>
            <div style={statCardStyle('#2563eb')}>
              <div style={{ color: '#1d4ed8', fontSize: 13, fontWeight: 700 }}>Total Amount</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: '#1d4ed8', marginTop: 10 }}>{formatMoney(summary?.totalAmount, currency)}</div>
            </div>
            <div style={statCardStyle('#7c3aed')}>
              <div style={{ color: '#6d28d9', fontSize: 13, fontWeight: 700 }}>Delivered Amount</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: '#6d28d9', marginTop: 10 }}>{formatMoney(summary?.deliveredAmount, currency)}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
