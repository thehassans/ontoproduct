import React, { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../api.js'
import { useToast } from '../../ui/Toast.jsx'

export default function InvestorEarnings() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [investors, setInvestors] = useState([])
  const [payoutRequests, setPayoutRequests] = useState([])
  const [bonusOpen, setBonusOpen] = useState(false)
  const [bonusInvestor, setBonusInvestor] = useState(null)
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusNote, setBonusNote] = useState('')
  const [bonusSending, setBonusSending] = useState(false)
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [processingId, setProcessingId] = useState(null)
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalReturns: 0,
    totalProfit: 0,
    pendingPayouts: 0,
    activeInvestors: 0
  })

  useEffect(() => {
    loadData()
  }, [filter, dateRange])

  async function loadData() {
    setLoading(true)
    try {
      let url = '/api/finance/investors/earnings'
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (dateRange.from) params.set('from', dateRange.from)
      if (dateRange.to) params.set('to', dateRange.to)
      if (params.toString()) url += '?' + params.toString()

      const [earningsRes, payoutsRes] = await Promise.all([
        apiGet(url).catch(() => ({ investors: [], stats: {} })),
        apiGet('/api/finance/investors/payout-requests').catch(() => ({ requests: [] }))
      ])

      setInvestors(earningsRes.investors || [])
      setPayoutRequests(payoutsRes.requests || [])
      setStats({
        totalInvested: earningsRes.stats?.totalInvested || 0,
        totalReturns: earningsRes.stats?.totalReturns || 0,
        totalProfit: earningsRes.stats?.totalProfit || 0,
        pendingPayouts: earningsRes.stats?.pendingPayouts || 0,
        activeInvestors: earningsRes.stats?.activeInvestors || 0
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
      await apiPost(`/api/finance/investors/payout-requests/${requestId}/${action}`)
      toast.success(`Payout ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      loadData()
    } catch (err) {
      toast.error(err?.message || `Failed to ${action} payout`)
    } finally {
      setProcessingId(null)
    }
  }

  const openBonus = (inv) => {
    setBonusInvestor(inv)
    setBonusAmount('')
    setBonusNote('')
    setBonusOpen(true)
  }

  const submitBonus = async () => {
    if (!bonusInvestor?._id) return
    const amt = Number(bonusAmount || 0)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setBonusSending(true)
    try {
      await apiPost(`/api/finance/investors/${bonusInvestor._id}/bonus`, {
        amount: amt,
        note: String(bonusNote || '').trim(),
      })
      toast.success('Bonus sent')
      setBonusOpen(false)
      setBonusInvestor(null)
      loadData()
    } catch (err) {
      toast.error(err?.message || 'Failed to send bonus')
    } finally {
      setBonusSending(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
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
      <div style={{
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
        borderRadius: '50%'
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-1px' }}>{value}</div>
          {subtitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{subtitle}</span>
              {trend && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: trend > 0 ? '#10b98115' : '#ef444415',
                  color: trend > 0 ? '#10b981' : '#ef4444'
                }}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
          )}
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
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
          }}>
            <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Investor Earnings
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
              Track investments, returns, and manage payout requests
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
          title="Total Invested"
          value={formatCurrency(stats.totalInvested)}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
          color="#3b82f6"
          subtitle="Capital deployed"
        />
        <StatCard
          title="Total Returns"
          value={formatCurrency(stats.totalReturns)}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>}
          color="#10b981"
          subtitle="Generated returns"
          trend={12}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(stats.totalProfit)}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          color="#8b5cf6"
          subtitle="Returns - Investment"
        />
        <StatCard
          title="Pending Payouts"
          value={formatCurrency(stats.pendingPayouts)}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          color="#f59e0b"
          subtitle="Awaiting approval"
        />
        <StatCard
          title="Active Investors"
          value={stats.activeInvestors}
          icon={<svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
          color="#06b6d4"
          subtitle="With active investments"
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
          <option value="all">All Investors</option>
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
          border: '2px solid #f59e0b30',
          marginBottom: 24,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f59e0b08 0%, transparent 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)'
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
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 20,
                    boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)'
                  }}>
                    {(request.investorName || 'I')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: 16 }}>
                      {request.investorName || 'Unknown Investor'}
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

      {/* Investors Table */}
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
              background: '#8b5cf615',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b5cf6'
            }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Investor Performance
            </h3>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ 
              width: 48, 
              height: 48, 
              border: '4px solid var(--border)', 
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }} />
            Loading investor data...
          </div>
        ) : investors.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 20, 
              background: '#8b5cf610', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px'
            }}>
              <svg width="40" height="40" fill="none" stroke="#8b5cf6" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              No Investor Data
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>
              Investor earnings will appear here once investments are made
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Investor</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invested</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Returns</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profit</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ROI</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {investors.map((inv, idx) => {
                  const roi = inv.invested > 0 ? ((inv.profit / inv.invested) * 100).toFixed(1) : 0
                  return (
                    <tr key={inv._id || idx} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: `linear-gradient(135deg, hsl(${(idx * 50 + 260) % 360}, 70%, 55%), hsl(${(idx * 50 + 280) % 360}, 70%, 45%))`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 16,
                            boxShadow: `0 4px 12px hsla(${(idx * 50 + 260) % 360}, 70%, 50%, 0.3)`
                          }}>
                            {(inv.name || 'I')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{inv.name || 'Unknown'}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{inv.email || ''}</div>
                            <button
                              type="button"
                              onClick={() => openBonus(inv)}
                              style={{
                                marginTop: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#8b5cf6',
                                background: '#8b5cf615',
                                border: '1px solid #8b5cf620',
                                padding: '6px 10px',
                                borderRadius: 10,
                                cursor: 'pointer'
                              }}
                            >
                              Send Bonus
                            </button>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: 600, color: '#3b82f6', fontSize: 14 }}>
                        {formatCurrency(inv.invested || 0)}
                      </td>
                      <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: 600, color: '#10b981', fontSize: 14 }}>
                        {formatCurrency(inv.returns || 0)}
                      </td>
                      <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: 700, color: (inv.profit || 0) >= 0 ? '#10b981' : '#ef4444', fontSize: 14 }}>
                        {formatCurrency(inv.profit || 0)}
                      </td>
                      <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--text)', fontSize: 15 }}>
                        {formatCurrency(inv.balance || 0)}
                      </td>
                      <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                        <span style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          background: roi >= 0 ? '#10b98115' : '#ef444415',
                          color: roi >= 0 ? '#10b981' : '#ef4444',
                          fontWeight: 700,
                          fontSize: 13
                        }}>
                          {roi}%
                        </span>
                      </td>
                      <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                        <span style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          background: inv.status === 'active' ? '#10b98115' : '#6b728015',
                          color: inv.status === 'active' ? '#10b981' : '#6b7280',
                          fontWeight: 600,
                          fontSize: 12,
                          textTransform: 'capitalize'
                        }}>
                          {inv.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
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

      {bonusOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 460,
            background: 'white',
            borderRadius: 20,
            border: '1px solid #e5e7eb',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: 18,
              borderBottom: '1px solid #eef2f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Investor Bonus
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {bonusInvestor?.name || 'Investor'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (bonusSending) return
                  setBonusOpen(false)
                  setBonusInvestor(null)
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 900,
                  color: '#64748b'
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Amount
                </label>
                <input
                  type="number"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  placeholder="Enter bonus amount"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    outline: 'none',
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Note (optional)
                </label>
                <textarea
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    outline: 'none',
                    fontSize: 14,
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (bonusSending) return
                    setBonusOpen(false)
                    setBonusInvestor(null)
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    fontWeight: 800,
                    color: '#64748b',
                    cursor: bonusSending ? 'wait' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitBonus}
                  disabled={bonusSending}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    color: 'white',
                    fontWeight: 900,
                    cursor: bonusSending ? 'wait' : 'pointer',
                    opacity: bonusSending ? 0.7 : 1,
                  }}
                >
                  {bonusSending ? 'Sending…' : 'Send Bonus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
