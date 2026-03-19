import React, { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../api.js'
import { PageShell, MetricGrid, MetricCard, Panel, EmptyState, LoadingState, TextInput, SecondaryButton, formatMoney, formatDate } from '../../components/shop/ShopUI.jsx'

export default function ShopVendorPayments() {
  const [summary, setSummary] = useState({ totalOrders: 0, totalPayout: 0 })
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await apiGet('/api/shops/me/payments', { skipCache: true })
      setSummary(result?.summary || { totalOrders: 0, totalPayout: 0 })
      setPayments(Array.isArray(result?.payments) ? result.payments : [])
    } catch (err) {
      setError(err?.message || 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return payments
    return payments.filter((item) => {
      const hay = [item?.invoiceNumber, item?.orderId]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
      return hay.some((value) => value.includes(q))
    })
  }, [payments, query])

  if (loading) return <LoadingState label="Loading payment summary" />

  return (
    <PageShell
      eyebrow="Shop payout"
      title="Payments"
      subtitle="Delivered orders and payout-ready line totals for this shop workspace."
      actions={<SecondaryButton onClick={load}>Refresh</SecondaryButton>}
    >
      <MetricGrid>
        <MetricCard tone="emerald" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-5a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H8" /><path d="M12 6v12" /></svg>} label="Total payout" value={formatMoney(summary.totalPayout || 0, 'AED')} hint="Delivered order value available to the shop" />
        <MetricCard tone="sky" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>} label="Delivered orders" value={Number(summary.totalOrders || 0).toLocaleString()} hint="Completed payouts contributing to total" />
      </MetricGrid>

      <Panel
        title="Delivered payout ledger"
        subtitle="A precise order-by-order payout breakdown"
        tone="emerald"
        action={<div style={{ minWidth: 220 }}><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice or order id" /></div>}
      >
        {error ? <EmptyState title="Payments unavailable" description={error} action={<SecondaryButton onClick={load}>Retry</SecondaryButton>} /> : null}
        {!error && !filtered.length ? <EmptyState title="No delivered payouts yet" description="Completed deliveries will appear here automatically once the order reaches delivered status." /> : null}
        {!error && filtered.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map((payment) => (
              <div
                key={payment.orderId}
                style={{
                  borderRadius: 22,
                  border: '1px solid rgba(226,232,240,0.95)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.99), rgba(240,253,244,0.9))',
                  padding: 18,
                  display: 'grid',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>#{payment.invoiceNumber || String(payment.orderId).slice(-6)}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>Delivered {formatDate(payment.deliveredAt)}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>{formatMoney(payment.payoutAmount || 0, 'AED')}</div>
                </div>
                {Array.isArray(payment.lineItems) && payment.lineItems.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {payment.lineItems.map((line, idx) => (
                      <div key={`${line.productId || idx}-${idx}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 16, border: '1px solid rgba(226,232,240,0.95)', background: '#fff' }}>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{line.productName || 'Product'}</div>
                          <div style={{ color: '#64748b', fontSize: 13 }}>Qty {line.quantity || 1} • Unit {formatMoney(line.unitPrice || 0, 'AED')}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{formatMoney(line.lineTotal || 0, 'AED')}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Panel>
    </PageShell>
  )
}
