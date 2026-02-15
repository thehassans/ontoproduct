import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api.js'
import { useToast } from '../../ui/Toast.jsx'

export default function DropshipperEarnings() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [dropshippers, setDropshippers] = useState([])
  const [payoutRequests, setPayoutRequests] = useState([])
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [processingId, setProcessingId] = useState(null)
  const [stats, setStats] = useState({
    totalDelivered: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    pendingPayouts: 0
  })

  useEffect(() => {
    loadData()
  }, [filter, dateRange])

  async function loadData() {
    setLoading(true)
    try {
      let url = '/api/dropshippers/earnings'
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (dateRange.from) params.set('from', dateRange.from)
      if (dateRange.to) params.set('to', dateRange.to)
      if (params.toString()) url += '?' + params.toString()

      const [earningsRes, payoutsRes] = await Promise.all([
        apiGet(url).catch(() => ({ dropshippers: [], stats: {} })),
        apiGet('/api/dropshippers/payout-requests').catch(() => ({ requests: [] }))
      ])

      setDropshippers(earningsRes.dropshippers || [])
      setPayoutRequests(payoutsRes.requests || [])
      setStats({
        totalDelivered: earningsRes.stats?.totalDelivered || 0,
        totalRevenue: earningsRes.stats?.totalRevenue || 0,
        totalCost: earningsRes.stats?.totalCost || 0,
        totalProfit: earningsRes.stats?.totalProfit || 0,
        pendingPayouts: earningsRes.stats?.pendingPayouts || 0
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handlePayoutAction(requestId, action) {
    setProcessingId(requestId)
    try {
      await apiPost(`/api/dropshippers/payout-requests/${requestId}/${action}`)
      toast.success(`Payout ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      loadData()
    } catch (err) {
      toast.error(err?.message || `Failed to ${action} payout`)
    } finally {
      setProcessingId(null)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div style={{
      background: 'linear-gradient(135deg, var(--panel) 0%, var(--bg) 100%)',
      borderRadius: 20,
      padding: 24,
      border: '1px solid var(--border)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        borderRadius: '50%'
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-1px' }}>{value}</div>
          {subtitle && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{subtitle}</div>}
        </div>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          boxShadow: `0 8px 24px ${color}20`
        }}>
          {icon}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)'
          }}>
            <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Dropshipper Earnings
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
              Track dropshipper performance, earnings, and manage payout requests
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        <StatCard
          title="Orders Delivered"
          value={stats.totalDelivered.toLocaleString()}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          color="#10b981"
          subtitle="Successfully completed"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          color="#3b82f6"
          subtitle="From delivered orders"
        />
        <StatCard
          title="Dropshipping Cost"
          value={formatCurrency(stats.totalCost)}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
          color="#f59e0b"
          subtitle="Product costs paid"
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(stats.totalProfit)}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>}
          color="#8b5cf6"
          subtitle="Revenue minus costs"
        />
        <StatCard
          title="Pending Payouts"
          value={formatCurrency(stats.pendingPayouts)}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          color="#ef4444"
          subtitle="Awaiting approval"
        />
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '16px 20px',
        background: 'var(--panel)',
        borderRadius: 16,
        border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Filters:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 14,
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          <option value="all">All Dropshippers</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 14
          }}
        />
        <span style={{ color: 'var(--muted)' }}>to</span>
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 14
          }}
        />
      </div>

      {/* Payout Requests Section */}
      {payoutRequests.filter(r => r.status === 'pending').length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, var(--panel) 0%, var(--bg) 100%)',
          borderRadius: 20,
          border: '2px solid #ef444430',
          marginBottom: 24,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #ef444408 0%, transparent 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)'
              }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Pending Payout Requests
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  {payoutRequests.filter(r => r.status === 'pending').length} requests need your attention
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {payoutRequests.filter(r => r.status === 'pending').map(request => (
              <div key={request._id} style={{
                padding: 20,
                borderRadius: 16,
                border: '1px solid var(--border)',
                marginBottom: 12,
                background: 'var(--panel)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 20,
                    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.3)'
                  }}>
                    {(request.dropshipperName || 'D')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: 16 }}>
                      {request.dropshipperName || 'Unknown Dropshipper'}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: '#10b981',
                        background: '#10b98115',
                        padding: '2px 8px',
                        borderRadius: 6
                      }}>
                        {formatCurrency(request.amount)}
                      </span>
                      <span>•</span>
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handlePayoutAction(request._id, 'approve')}
                    disabled={processingId === request._id}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: processingId === request._id ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                      opacity: processingId === request._id ? 0.7 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    {processingId === request._id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handlePayoutAction(request._id, 'reject')}
                    disabled={processingId === request._id}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 12,
                      border: '2px solid #ef4444',
                      background: 'transparent',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: processingId === request._id ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      opacity: processingId === request._id ? 0.7 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropshippers Table */}
      <div style={{
        background: 'var(--panel)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#f9731615',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f97316'
            }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Dropshipper Performance
            </h3>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ 
              width: 48, 
              height: 48, 
              border: '4px solid var(--border)', 
              borderTopColor: '#f97316',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }} />
            Loading dropshipper data...
          </div>
        ) : dropshippers.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 20, 
              background: '#f9731610', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px'
            }}>
              <svg width="40" height="40" fill="none" stroke="#f97316" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              No Dropshipper Data
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>
              Dropshipper earnings will appear here once orders are processed
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dropshipper</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orders Delivered</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profit</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dropshippers.map((ds, idx) => (
                  <tr key={ds._id || idx} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: `linear-gradient(135deg, hsl(${(idx * 50 + 20) % 360}, 70%, 55%), hsl(${(idx * 50 + 40) % 360}, 70%, 45%))`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: 16,
                          boxShadow: `0 4px 12px hsla(${(idx * 50 + 20) % 360}, 70%, 50%, 0.3)`
                        }}>
                          {(ds.name || 'D')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{ds.name || 'Unknown'}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ds.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: '#10b98115',
                        color: '#10b981',
                        fontWeight: 700,
                        fontSize: 13
                      }}>
                        {ds.ordersDelivered || 0}
                      </span>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: 600, color: '#3b82f6', fontSize: 14 }}>
                      {formatCurrency(ds.revenue || 0)}
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: 600, color: '#f59e0b', fontSize: 14 }}>
                      {formatCurrency(ds.cost || 0)}
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: 700, color: (ds.profit || 0) >= 0 ? '#10b981' : '#ef4444', fontSize: 14 }}>
                      {formatCurrency(ds.profit || 0)}
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--text)', fontSize: 15 }}>
                      {formatCurrency(ds.balance || 0)}
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: ds.status === 'active' ? '#10b98115' : '#6b728015',
                        color: ds.status === 'active' ? '#10b981' : '#6b7280',
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: 'capitalize'
                      }}>
                        {ds.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          h1 { font-size: 22px !important; }
          table { font-size: 13px; }
          td, th { padding: 12px 10px !important; }
        }
      `}</style>
    </div>
  )
}
