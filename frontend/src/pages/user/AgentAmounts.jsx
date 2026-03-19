import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, API_BASE } from '../../api'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../ui/Toast.jsx'
import Modal from '../../components/Modal.jsx'
import { io } from 'socket.io-client'

export default function AgentAmounts() {
  const navigate = useNavigate()
  const toast = useToast()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [payingAgent, setPayingAgent] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [commissionRate, setCommissionRate] = useState(null)
  const [calculatedAmount, setCalculatedAmount] = useState(0)

  // Load agents asynchronously to prevent blocking page render
  useEffect(() => {
    let alive = true
    // Small delay to allow page to render first
    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true)
        const r = await apiGet('/api/finance/agents/commission?limit=100')
        if (alive) {
          setAgents(Array.isArray(r?.agents) ? r.agents : [])
          setErr('')
        }
      } catch (e) {
        if (alive) setErr(e?.message || 'Failed to load agent amounts')
      } finally {
        if (alive) setLoading(false)
      }
    }, 10)

    return () => {
      alive = false
      clearTimeout(timeoutId)
    }
  }, [])

  // Debounce search for better performance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  function num(n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  // Helper function to calculate commission in PKR from AED
  function calculateCommissionPKR(aedAmount, commissionRate, pkrRate = 76) {
    const aed = Number(aedAmount) || 0
    const rate = Number(commissionRate) || 12
    const pkr = Number(pkrRate) || 76
    // Convert AED to PKR first, then apply commission percentage
    return Math.round(aed * pkr * (rate / 100))
  }

  // Socket: auto-refresh when orders change (e.g. order marked as delivered)
  useEffect(() => {
    let socket
    try {
      const token = localStorage.getItem('token') || ''
      socket = io(API_BASE || undefined, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        withCredentials: true,
        auth: { token },
      })
      socket.on('orders.changed', () => {
        try { fetchAgents() } catch {}
      })
    } catch {}
    return () => {
      try { socket && socket.off('orders.changed') } catch {}
      try { socket && socket.disconnect() } catch {}
    }
  }, [])

  async function fetchAgents() {
    setLoading(true)
    try {
      const r = await apiGet('/api/finance/agents/commission?limit=100')
      setAgents(Array.isArray(r?.agents) ? r.agents : [])
      setErr('')
    } catch (e) {
      setErr(e?.message || 'Failed to load agent amounts')
    } finally {
      setLoading(false)
    }
  }

  async function handlePayCommission() {
    if (!payModal || !calculatedAmount || calculatedAmount <= 0) {
      toast.show('Please enter a valid amount', 'error')
      return
    }

    setPayingAgent(payModal.agent.id)
    try {
      const finalRate = commissionRate !== null ? commissionRate : 12
      // Calculate base commission amount (the 12% portion that reduces balance)
      const balance = Number(payModal.balance || 0)

      // If rate > 12%, the extra is a bonus. Only deduct balance from future.
      // If rate <= 12%, deduct proportional amount.
      const baseCommissionAmount =
        finalRate <= 12
          ? Math.round(calculatedAmount) // Paying less than 12%, deduct what's paid
          : Math.round(balance) // Paying bonus, deduct full balance

      await apiPost(`/api/finance/agents/${payModal.agent.id}/pay-commission`, {
        amount: calculatedAmount,
        baseCommissionAmount: baseCommissionAmount,
        commissionRate: finalRate,
        totalOrderValueAED: 0, // Not using this anymore
      })

      toast.show('Commission payment sent successfully!', 'success')
      setPayModal(null)
      fetchAgents() // Refresh the list
    } catch (err) {
      toast.show(err?.message || 'Failed to send commission', 'error')
    } finally {
      setPayingAgent(null)
    }
  }

  function goToHistory(agent) {
    navigate(`/user/agent-history/${agent.id}`)
  }

  const filteredAgents = useMemo(() => {
    let list = agents
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase()
      list = list.filter(
        (a) =>
          String(a.name || '').toLowerCase().includes(term) ||
          String(a.phone || '').toLowerCase().includes(term)
      )
    }
    // Only show agents with remaining balance OR upcoming commission
    list = list.filter((a) => {
      const paidBase = Number(a.sentBasePKR || a.sentPKR || 0)
      const bal = Math.max(0, Number(a.deliveredCommissionPKR || 0) - paidBase - Number(a.pendingPKR || 0))
      const upcoming = Number(a.upcomingCommissionPKR || 0)
      return bal > 0 || upcoming > 0
    })
    return list
  }, [agents, debouncedSearch])

  const totals = useMemo(() => {
    let deliveredCommission = 0,
      upcomingCommission = 0,
      sent = 0,
      pending = 0,
      balance = 0,
      ordersSubmitted = 0,
      ordersDelivered = 0,
      totalOrderValueAED = 0
    for (const a of filteredAgents) {
      deliveredCommission += Number(a.deliveredCommissionPKR || 0)
      upcomingCommission += Number(a.upcomingCommissionPKR || 0)
      sent += Number(a.sentPKR || 0)
      pending += Number(a.pendingPKR || 0)
      // Calculate balance for each agent
      const agentBalance = Math.max(
        0,
        Number(a.deliveredCommissionPKR || 0) - Number(a.sentPKR || 0) - Number(a.pendingPKR || 0)
      )
      balance += agentBalance
      ordersSubmitted += Number(a.ordersSubmitted || 0)
      ordersDelivered += Number(a.ordersDelivered || 0)
      totalOrderValueAED += Number(a.totalOrderValueAED || 0)
    }
    return {
      deliveredCommission,
      upcomingCommission,
      sent,
      pending,
      balance,
      ordersSubmitted,
      ordersDelivered,
      totalOrderValueAED,
    }
  }, [filteredAgents])

  return (
    <div className="section" style={{ display: 'grid', gap: 12 }}>
      <div
        className="page-header"
        style={{ animation: 'fadeInUp 0.6s ease-out', marginBottom: '20px' }}
      >
        <div>
          <div
            style={{
              fontSize: '42px',
              fontWeight: 900,
              letterSpacing: '-1px',
              marginBottom: '12px',
              background:
                'linear-gradient(135deg, #10b981 0%, #22c55e 25%, #14b8a6 50%, #06b6d4 75%, #0ea5e9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 8px rgba(16, 185, 129, 0.3))',
              lineHeight: '1.2',
            }}
          >
            💼 Agent Amounts
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.3px',
              background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              opacity: 0.9,
            }}
          >
            Monitor agent earnings from submitted orders
          </div>
        </div>
      </div>
      {err && <div className="error">{err}</div>}

      {/* Search Filter */}
      <div
        className="card hover-lift"
        style={{ display: 'grid', gap: 10, animation: 'scaleIn 0.5s ease-out 0.1s backwards' }}
      >
        <div className="card-header">
          <div className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>
            Search & Filter
          </div>
          {loading && (
            <div className="helper" style={{ fontSize: 12 }}>
              Loading agents...
            </div>
          )}
        </div>
        <input
          className="input filter-select"
          type="text"
          placeholder="🔍 Search by agent name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
          autoComplete="off"
        />
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
          gap: 16,
        }}
      >
        <div className="stat-card stagger-item gradient-blue" style={{ animationDelay: '0.2s' }}>
          <div
            style={{
              fontSize: 13,
              opacity: 0.95,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}
          >
            Upcoming Commission
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>
            PKR {num(totals.upcomingCommission)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>From pending orders</div>
        </div>
        <div
          className="stat-card stagger-item gradient-orange"
          style={{
            animationDelay: '0.3s',
            ...(totals.balance > 0 ? { animation: 'pulseGlow 2s ease-in-out infinite' } : {}),
          }}
        >
          <div
            style={{
              fontSize: 13,
              opacity: 0.95,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}
          >
            Total Balance
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>
            PKR {num(totals.balance)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>Remaining to pay</div>
        </div>
        <div
          className="stat-card stagger-item"
          style={{
            animationDelay: '0.35s',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              opacity: 0.95,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}
          >
            Orders Delivered
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>
            {num(totals.ordersDelivered)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
            Out of {num(totals.ordersSubmitted)} submitted orders
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="card" style={{ animation: 'scaleIn 0.5s ease-out 0.4s backwards' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '20px' }}>Agent Commission Summary</div>
          <div className="helper" style={{ fontSize: '14px' }}>
            {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }} className="premium-scroll">
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    borderRight: '1px solid var(--border)',
                    color: '#8b5cf6',
                  }}
                >
                  Agent
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    borderRight: '1px solid var(--border)',
                    color: '#6366f1',
                  }}
                >
                  Orders Submitted
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    borderRight: '1px solid var(--border)',
                    color: '#22c55e',
                  }}
                >
                  Orders Delivered
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    borderRight: '1px solid var(--border)',
                    color: '#3b82f6',
                  }}
                >
                  Upcoming Comm.
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    borderRight: '1px solid var(--border)',
                    color: '#ef4444',
                  }}
                >
                  Balance
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#8b5cf6' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`sk${i}`}>
                    <td style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                      <div
                        style={{
                          height: 14,
                          background: 'var(--panel-2)',
                          borderRadius: 6,
                          animation: 'pulse 1.2s ease-in-out infinite',
                          marginBottom: 4,
                        }}
                      />
                      <div
                        style={{
                          height: 10,
                          width: '60%',
                          background: 'var(--panel-2)',
                          borderRadius: 4,
                          animation: 'pulse 1.2s ease-in-out infinite',
                          marginTop: 4,
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                      <div
                        style={{
                          height: 14,
                          background: 'var(--panel-2)',
                          borderRadius: 6,
                          animation: 'pulse 1.2s ease-in-out infinite',
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                      <div
                        style={{
                          height: 14,
                          background: 'var(--panel-2)',
                          borderRadius: 6,
                          animation: 'pulse 1.2s ease-in-out infinite',
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                      <div
                        style={{
                          height: 14,
                          background: 'var(--panel-2)',
                          borderRadius: 6,
                          animation: 'pulse 1.2s ease-in-out infinite',
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div
                        style={{
                          height: 14,
                          background: 'var(--panel-2)',
                          borderRadius: 6,
                          animation: 'pulse 1.2s ease-in-out infinite',
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: '20px 12px', opacity: 0.7, textAlign: 'center' }}
                  >
                    {searchTerm
                      ? 'No agents match your search'
                      : 'No agents found. Agents will appear here once they submit orders.'}
                  </td>
                </tr>
              ) : (
                filteredAgents.map((a, idx) => {
                  // Use sentBasePKR (12%-equivalent portion paid) for balance to avoid inflation by bonus rates
                  const paidBase = Number(a.sentBasePKR || a.sentPKR || 0)
                  const rawBalance =
                    Number(a.deliveredCommissionPKR || 0) -
                    paidBase -
                    Number(a.pendingPKR || 0)
                  const balance = Math.max(0, rawBalance)
                  return (
                    <tr
                      key={String(a.id)}
                      className="premium-table-row"
                      style={{
                        borderTop: '1px solid var(--border)',
                        background: idx % 2 ? 'transparent' : 'var(--panel)',
                      }}
                    >
                      <td style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, color: '#8b5cf6' }}>
                          {a.name || 'Unnamed'}
                        </div>
                        <div className="helper">{a.phone || ''}</div>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'center',
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ color: '#6366f1', fontWeight: 700 }}>
                          {num(a.ordersSubmitted || 0)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'center',
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ color: '#22c55e', fontWeight: 700 }}>
                          {num(a.ordersDelivered || 0)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ color: '#3b82f6', fontWeight: 800 }}>
                          PKR {num(a.upcomingCommissionPKR)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        <span
                          style={{
                            color: balance > 0 ? '#10b981' : 'var(--text-muted)',
                            fontWeight: 800,
                          }}
                        >
                          PKR {num(balance)}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 8,
                          }}
                        >
                          {balance > 0 ? (
                            <button
                              className="btn"
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                boxShadow:
                                  '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                              onClick={() => {
                                // Use balance (remaining unpaid commission) for payment calculation
                                setPayModal({
                                  agent: a,
                                  balance: balance,
                                  deliveredCommissionPKR: a.deliveredCommissionPKR,
                                })
                                setCommissionRate(12)
                                // 12% = full balance (since balance is already at 12% commission)
                                setCalculatedAmount(Math.round(balance))
                              }}
                            >
                              Pay Commission
                            </button>
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--text-muted)',
                                fontStyle: 'italic',
                                padding: '8px 12px',
                              }}
                            >
                              No balance
                            </span>
                          )}
                          <button
                            className="btn"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow:
                                '0 4px 6px -1px rgba(6, 182, 212, 0.2), 0 2px 4px -1px rgba(6, 182, 212, 0.1)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                            onClick={() => goToHistory(a)}
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Commission Modal */}
      <Modal
        title="Pay Agent Commission"
        open={!!payModal}
        onClose={() => {
          setPayModal(null)
          setCommissionRate(null)
          setCalculatedAmount(0)
        }}
        footer={
          <>
            <button
              className="btn secondary"
              onClick={() => setPayModal(null)}
              disabled={!!payingAgent}
            >
              Cancel
            </button>
            <button className="btn success" disabled={!!payingAgent} onClick={handlePayCommission}>
              {payingAgent ? 'Sending...' : 'Confirm Payment'}
            </button>
          </>
        }
      >
        {payModal && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 16, marginBottom: 24, textAlign: 'center' }}>
              Send{' '}
              <strong style={{ color: '#10b981', fontSize: 20 }}>
                PKR {num(calculatedAmount)}
              </strong>{' '}
              commission to <strong style={{ color: '#8b5cf6' }}>{payModal.agent.name}</strong>?
            </div>

            {/* Commission Rate Selector */}
            <div
              style={{ marginBottom: 20, padding: 16, background: 'var(--panel)', borderRadius: 8 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <label style={{ fontWeight: 600, fontSize: 14 }}>Commission Rate:</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionRate !== null ? commissionRate : 12}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0
                      setCommissionRate(val)
                      // Balance represents 12% commission. Adjust proportionally.
                      // e.g., 8% = (8/12)*balance, 15% = (15/12)*balance
                      const availableBalance = Number(payModal.balance || 0)
                      setCalculatedAmount(Math.round((availableBalance * val) / 12))
                    }}
                    style={{
                      width: 70,
                      padding: '8px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                    className="input"
                  />
                  <span style={{ fontSize: 18, fontWeight: 700 }}>%</span>
                </div>
              </div>

              {/* Quick Rate Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {[8, 10, 12, 15, 18, 20, 25].map((rate) => (
                  <button
                    key={rate}
                    className="btn"
                    style={{
                      fontSize: 12,
                      padding: '6px 12px',
                      background: (commissionRate || 12) === rate ? '#8b5cf6' : 'var(--panel-2)',
                      color: (commissionRate || 12) === rate ? '#fff' : 'inherit',
                    }}
                    onClick={() => {
                      setCommissionRate(rate)
                      // Balance represents 12% commission. rate/12 gives proportion.
                      const availableBalance = Number(payModal.balance || 0)
                      setCalculatedAmount(Math.round((availableBalance * rate) / 12))
                    }}
                  >
                    {rate}%
                  </button>
                ))}
                <button
                  className="btn secondary"
                  style={{ fontSize: 12, padding: '6px 12px' }}
                  onClick={() => {
                    setCommissionRate(12) // Default is 12%
                    // Reset to 12% = full balance
                    const availableBalance = Number(payModal.balance || 0)
                    setCalculatedAmount(Math.round(availableBalance))
                  }}
                >
                  Reset
                </button>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Balance at 12%: PKR {num(payModal.balance)} | Paying at{' '}
                {commissionRate !== null ? commissionRate : 12}%: ({commissionRate || 12}/12 ×
                balance) = PKR {num(calculatedAmount)}
              </div>
            </div>

            <div style={{ background: 'var(--panel)', padding: 12, borderRadius: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ opacity: 0.7 }}>Agent:</span>
                <strong>{payModal.agent.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ opacity: 0.7 }}>Phone:</span>
                <strong>{payModal.agent.phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ opacity: 0.7 }}>Available Balance:</span>
                <strong>PKR {num(payModal.balance)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ opacity: 0.7 }}>Commission Rate:</span>
                <strong style={{ color: '#8b5cf6', fontSize: 16 }}>
                  {commissionRate !== null ? commissionRate : 12}%
                </strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ opacity: 0.7, fontWeight: 600 }}>Total Amount:</span>
                <strong style={{ color: '#10b981', fontSize: 18 }}>
                  PKR {num(calculatedAmount)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
