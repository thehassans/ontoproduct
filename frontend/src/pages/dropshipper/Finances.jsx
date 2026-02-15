import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api'
import { useToast } from '../../ui/Toast.jsx'

export default function DropshipperFinances() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [period, setPeriod] = useState('all') // all, month, week
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [myPayoutRequests, setMyPayoutRequests] = useState([])
  const [requestNotes, setRequestNotes] = useState('')
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [res, reqs] = await Promise.all([
        apiGet('/api/dropshippers/finances'),
        apiGet('/api/dropshippers/payout-requests/me').catch(() => ({ requests: [] }))
      ])
      setData(res)
      setMyPayoutRequests(Array.isArray(reqs?.requests) ? reqs.requests : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const pendingAmount = Number(data?.totalUnpaid || 0)
  const hasPendingRequest = myPayoutRequests.some(r => String(r?.status||'') === 'pending')

  async function submitPayoutRequest(){
    try{
      if (hasPendingRequest) return toast.warn('You already have a pending request')
      if (!Number.isFinite(pendingAmount) || pendingAmount <= 0) return toast.warn('No pending payout available')
      setRequesting(true)
      await apiPost('/api/dropshippers/payout-requests', { notes: (requestNotes || '').trim() })
      toast.success('Request submitted')
      setRequestNotes('')
      await load()
    }catch(err){
      toast.error(err?.message || 'Failed to submit request')
    }finally{
      setRequesting(false)
    }
  }

  async function handleRecalculateProfits() {
    if (!window.confirm('This will recalculate profits for all your delivered orders. Continue?')) return
    
    setRecalculating(true)
    try {
      const result = await apiPost('/api/dropshippers/recalculate-my-profits', {})
      toast.success(`✅ ${result.message || 'Profits recalculated successfully!'}`)
      setLoading(true)
      await load()
    } catch (err) {
      toast.error(err?.message || 'Failed to recalculate profits')
    } finally {
      setRecalculating(false)
    }
  }

  // Ultra premium loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'grid', 
        placeItems: 'center', 
        height: 400,
        gap: 16
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'grid',
          placeItems: 'center',
          animation: 'pulse 1.5s infinite'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div style={{ color: 'var(--ds-text-secondary)', fontWeight: 500 }}>Loading your earnings...</div>
      </div>
    )
  }

  // Calculate stats
  const totalOrders = data?.orders?.length || 0
  const totalRevenue = data?.orders?.reduce((sum, o) => sum + (o.totalPrice || 0), 0) || 0
  const totalDropshipCost = data?.orders?.reduce((sum, o) => sum + (o.dropshipCost || o.subtotal || 0), 0) || 0
  const totalShipping = data?.orders?.reduce((sum, o) => sum + (o.shippingCost || 0), 0) || 0
  const profitMargin = totalRevenue > 0 ? ((data?.totalProfit || 0) / totalRevenue * 100).toFixed(1) : 0

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 32, 
      paddingBottom: 40,
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ 
            fontSize: 32, 
            fontWeight: 800, 
            margin: 0,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            💰 Earnings Dashboard
          </h1>
          <p style={{ color: 'var(--ds-text-secondary)', marginTop: 8, fontSize: 16 }}>
            Track your profits, payouts, and order performance
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Fix Earnings Button */}
          <button
            onClick={handleRecalculateProfits}
            disabled={recalculating}
            style={{
              background: recalculating ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              cursor: recalculating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: recalculating ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.3)',
              transition: '0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {recalculating ? '⏳ Recalculating...' : '🔄 Fix Earnings'}
          </button>
          
          {/* Period Filter */}
          <div style={{ 
            display: 'flex', 
            gap: 4, 
            background: 'var(--ds-glass)', 
            padding: 4, 
            borderRadius: 12,
            border: '1px solid var(--ds-border)'
          }}>
          {[
            { value: 'all', label: 'All Time' },
            { value: 'month', label: 'This Month' },
            { value: 'week', label: 'This Week' }
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: 10,
                background: period === p.value 
                  ? 'linear-gradient(135deg, #10b981, #059669)' 
                  : 'transparent',
                color: period === p.value ? 'white' : 'var(--ds-text-secondary)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {p.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: 20,
        width: '100%'
      }}>
        {/* Total Earnings */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: 20,
          padding: 28,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)'
        }}>
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)'
          }} />
          <div style={{ opacity: 0.9, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            💎 Total Earnings
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>
            AED {(data?.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: '4px 10px', 
              borderRadius: 6,
              fontWeight: 600
            }}>
              {profitMargin}% margin
            </span>
            from {totalOrders} orders
          </div>
        </div>

        {/* Paid Out */}
        <div style={{
          background: 'var(--ds-panel)',
          border: '1px solid var(--ds-border)',
          borderRadius: 20,
          padding: 28,
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            borderRadius: '20px 20px 0 0'
          }} />
          <div style={{ color: 'var(--ds-text-secondary)', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            ✅ Paid Out
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
            AED {(data?.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ds-text-secondary)' }}>
            Successfully withdrawn
          </div>
        </div>

        {/* Pending Payout */}
        <div style={{
          background: 'var(--ds-panel)',
          border: '1px solid var(--ds-border)',
          borderRadius: 20,
          padding: 28,
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            borderRadius: '20px 20px 0 0'
          }} />
          <div style={{ color: 'var(--ds-text-secondary)', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            ⏳ Pending Payout
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.02em' }}>
            AED {(data?.totalUnpaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ds-text-secondary)' }}>
            Ready for withdrawal
          </div>
        </div>

        {/* Total Orders Revenue */}
        <div style={{
          background: 'var(--ds-panel)',
          border: '1px solid var(--ds-border)',
          borderRadius: 20,
          padding: 28,
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius: '20px 20px 0 0'
          }} />
          <div style={{ color: 'var(--ds-text-secondary)', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            📦 Total Order Value
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#6366f1', letterSpacing: '-0.02em' }}>
            AED {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ds-text-secondary)' }}>
            From {totalOrders} delivered orders
          </div>
        </div>
      </div>

      {/* Profit Breakdown Card */}
      <div style={{
        background: 'var(--ds-panel)',
        border: '1px solid var(--ds-border)',
        borderRadius: 20,
        padding: 28,
        width: '100%'
      }}>
        <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
          📊 Profit Breakdown
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)', marginBottom: 4 }}>Customer Paid (Total)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
                AED {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)', marginBottom: 4 }}>Dropship Cost (Paid to BuySial)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>
                - AED {totalDropshipCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)', marginBottom: 4 }}>Shipping Cost</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>
                - AED {totalShipping.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            padding: 24,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
            borderRadius: 16,
            border: '2px dashed rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: 13, color: '#10b981', marginBottom: 4, fontWeight: 600 }}>= YOUR PROFIT</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#10b981' }}>
              AED {(data?.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ds-text-secondary)', marginTop: 8 }}>
              Average: <strong>AED {totalOrders > 0 ? ((data?.totalProfit || 0) / totalOrders).toFixed(2) : '0.00'}</strong> per order
            </div>
          </div>
        </div>
      </div>

      {/* Earnings History Table */}
      <div style={{
        background: 'var(--ds-panel)',
        border: '1px solid var(--ds-border)',
        borderRadius: 20,
        overflow: 'hidden',
        width: '100%'
      }}>
        <div style={{ 
          padding: '20px 28px', 
          borderBottom: '1px solid var(--ds-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
            📋 Order Earnings History
          </h3>
          <span style={{ 
            background: 'var(--ds-glass)', 
            padding: '6px 14px', 
            borderRadius: 8, 
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ds-text-secondary)'
          }}>
            {data?.orders?.length || 0} orders
          </span>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: 'var(--ds-glass)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Total</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Cost</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Profit</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payout</th>
              </tr>
            </thead>
            <tbody>
              {data?.orders?.length > 0 ? (
                data.orders.map((o, i) => (
                  <tr 
                    key={o._id} 
                    style={{ 
                      borderBottom: '1px solid var(--ds-border)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--ds-glass)',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ds-text-primary)' }}>#{o.orderId}</div>
                      <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', marginTop: 2 }}>
                        {o.items?.length || 1} item(s)
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 14, color: 'var(--ds-text-secondary)' }}>
                      {new Date(o.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ds-text-primary)' }}>
                        AED {(o.totalPrice || 0).toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#ef4444' }}>
                        AED {(o.dropshipCost || o.subtotal || 0).toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 700, 
                        color: '#10b981',
                        fontSize: 16
                      }}>
                        +AED {(o.dropshipperProfit?.amount || 0).toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {o.dropshipperProfit?.isPaid ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 8,
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          fontWeight: 600,
                          fontSize: 12
                        }}>
                          ✓ PAID
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 8,
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          fontWeight: 600,
                          fontSize: 12
                        }}>
                          ⏳ PENDING
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ 
                    padding: 60, 
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 16, 
                      background: 'var(--ds-glass)',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 16px',
                      fontSize: 28
                    }}>
                      📊
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text-primary)', marginBottom: 8 }}>
                      No earnings yet
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--ds-text-secondary)' }}>
                      Submit orders to start earning profits
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        background: 'var(--ds-panel)',
        border: '1px solid var(--ds-border)',
        borderRadius: 20,
        padding: 24,
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)' }}>Request Earnings</h3>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ds-text-secondary)' }}>
              Request payout for your pending earnings. Amount is fixed to your current pending payout.
            </div>
          </div>
          <div style={{
            padding: '8px 14px',
            borderRadius: 12,
            background: 'var(--ds-glass)',
            border: '1px solid var(--ds-border)',
            color: 'var(--ds-text-secondary)',
            fontWeight: 700,
            fontSize: 13
          }}>
            Pending: AED {pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 10 }}>
            <input
              className="input"
              value={'Workspace Owner'}
              readOnly
              style={{ background: 'var(--ds-glass)', border: '1px solid var(--ds-border)', color: 'var(--ds-text-secondary)' }}
            />
            <input
              className="input"
              type="number"
              value={pendingAmount}
              readOnly
              style={{ background: 'var(--ds-glass)', border: '1px solid var(--ds-border)', color: 'var(--ds-text-secondary)' }}
            />
          </div>

          <textarea
            className="input"
            placeholder="Note (optional)"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
            rows={2}
            style={{ background: 'var(--ds-glass)', border: '1px solid var(--ds-border)', color: 'var(--ds-text-primary)' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn"
              disabled={requesting || hasPendingRequest || pendingAmount <= 0}
              onClick={submitPayoutRequest}
            >
              {requesting ? 'Submitting…' : hasPendingRequest ? 'Pending Request Exists' : 'Request Earnings'}
            </button>
          </div>

          {myPayoutRequests.length > 0 && (
            <div style={{ marginTop: 6, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                  <tr style={{ background: 'var(--ds-glass)' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: 'var(--ds-text-secondary)' }}>Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, color: 'var(--ds-text-secondary)' }}>Amount</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: 'var(--ds-text-secondary)' }}>Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: 'var(--ds-text-secondary)' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {myPayoutRequests.slice(0, 10).map((r) => (
                    <tr key={r._id} style={{ borderTop: '1px solid var(--ds-border)' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ds-text-secondary)' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                        AED {Number(r.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
                        {String(r.status || '').toUpperCase()}
                        {r.status === 'rejected' && r.rejectionReason ? ` — ${r.rejectionReason}` : ''}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ds-text-secondary)' }}>
                        {r.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pro Tips */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: 20,
        padding: 28
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#6366f1' }}>
          💡 Pro Tips to Maximize Earnings
        </h3>
        <ul style={{ 
          margin: 0, 
          paddingLeft: 20, 
          color: 'var(--ds-text-secondary)', 
          lineHeight: 2,
          fontSize: 14
        }}>
          <li>Set competitive retail prices that give you <strong>30-50% profit margin</strong></li>
          <li>Focus on high-margin products with good stock availability</li>
          <li>Promote products on Shopify and social media for more sales</li>
          <li>Earnings are available for withdrawal after order is <strong>delivered</strong></li>
        </ul>
      </div>
    </div>
  )
}
