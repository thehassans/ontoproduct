import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPatch, apiPost, API_BASE } from '../../api'
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
  const [payPreview, setPayPreview] = useState(null)
  const [payPreviewLoading, setPayPreviewLoading] = useState(false)
  const [payPreviewError, setPayPreviewError] = useState('')
  const [editingPayCommissions, setEditingPayCommissions] = useState({})

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

  function getPayCommissionValue(order) {
    const id = String(order?.id || order?._id || order?.orderId || '')
    if (editingPayCommissions[id] !== undefined) {
      return Math.max(0, Number(editingPayCommissions[id]) || 0)
    }
    return Math.max(0, Number(order?.commission || 0) || 0)
  }

  const calculatedAmount = useMemo(() => {
    const list = Array.isArray(payPreview?.orders) ? payPreview.orders : []
    return list.reduce((sum, order) => sum + getPayCommissionValue(order), 0)
  }, [payPreview, editingPayCommissions])

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

  async function openPayCommission(agent, balance) {
    setPayModal({ agent, balance })
    setPayPreview(null)
    setPayPreviewError('')
    setEditingPayCommissions({})
    setPayPreviewLoading(true)
    try {
      const res = await apiGet(`/api/finance/agents/${agent.id}/commission-preview`)
      const preview = res?.preview || null
      setPayPreview(preview)
      const initial = {}
      ;(preview?.orders || []).forEach((order) => {
        initial[String(order?.id || order?.orderId || '')] = Number(order?.commission || 0) || 0
      })
      setEditingPayCommissions(initial)
    } catch (e) {
      setPayPreviewError(e?.message || 'Failed to load commission preview')
    } finally {
      setPayPreviewLoading(false)
    }
  }

  async function handlePayCommission() {
    if (!payModal?.agent || !payPreview) {
      toast.error('Commission preview is not ready yet')
      return
    }
    if (!calculatedAmount || calculatedAmount <= 0) {
      toast.error('No delivered commission is available to pay')
      return
    }

    setPayingAgent(payModal.agent.id)
    try {
      const changedOrders = (payPreview?.orders || []).filter(
        (order) => Number(getPayCommissionValue(order)) !== Number(order?.commission || 0)
      )
      for (const order of changedOrders) {
        await apiPatch(`/api/orders/${order.id}`, {
          agentCommissionPKR: getPayCommissionValue(order),
        })
      }

      const refreshed = await apiGet(`/api/finance/agents/${payModal.agent.id}/commission-preview`)
      const latestPreview = refreshed?.preview || payPreview
      setPayPreview(latestPreview)
      const latestAmount = (latestPreview?.orders || []).reduce(
        (sum, order) => sum + Math.max(0, Number(order?.commission || 0) || 0),
        0
      )
      if (!latestAmount || latestAmount <= 0) {
        throw new Error('No delivered commission is available to pay')
      }

      await apiPost(`/api/finance/agents/${payModal.agent.id}/pay-commission`, {
        amount: latestAmount,
      })

      toast.success('Commission payment sent successfully!')
      setPayModal(null)
      setPayPreview(null)
      setEditingPayCommissions({})
      setPayPreviewError('')
      fetchAgents() // Refresh the list
    } catch (err) {
      toast.error(err?.message || 'Failed to send commission')
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
      const bal = Math.max(0, Number(a.balancePKR ?? a.payableDeliveredCommissionPKR ?? 0))
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
      const agentBalance = Math.max(0, Number(a.balancePKR ?? a.payableDeliveredCommissionPKR ?? 0))
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
                  const balance = Math.max(0, Number(a.balancePKR ?? a.payableDeliveredCommissionPKR ?? 0))
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
                              onClick={() => openPayCommission(a, balance)}
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
        width="1100px"
        maxWidth="96vw"
        dialogStyle={{ borderRadius: 18 }}
        onClose={() => {
          setPayModal(null)
          setPayPreview(null)
          setEditingPayCommissions({})
          setPayPreviewError('')
        }}
        footer={
          <>
            <button
              className="btn secondary"
              onClick={() => {
                setPayModal(null)
                setPayPreview(null)
                setEditingPayCommissions({})
                setPayPreviewError('')
              }}
              disabled={!!payingAgent}
            >
              Cancel
            </button>
            <button
              className="btn success"
              disabled={!!payingAgent || !payPreview || payPreviewLoading}
              onClick={handlePayCommission}
            >
              {payingAgent ? 'Sending...' : 'Pay Commission'}
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

            {payPreviewLoading ? (
              <div className="card" style={{ padding: 18 }}>Loading delivered commission preview...</div>
            ) : payPreviewError ? (
              <div className="card" style={{ padding: 18, color: '#dc2626' }}>{payPreviewError}</div>
            ) : payPreview ? (
              <div style={{ display: 'grid', gap: 16 }}>
                <div
                  className="card"
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 15 }}>{payModal.agent.name}</strong>
                    <span className="helper">{payModal.agent.phone || '-'}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span className="helper">Balance: <strong style={{ color: 'var(--fg)' }}>PKR {num(payModal.balance)}</strong></span>
                    <span className="helper">Orders: <strong style={{ color: 'var(--fg)' }}>{num(payPreview.orders?.length || 0)}</strong></span>
                    <span className="helper">Paying: <strong style={{ color: '#10b981' }}>PKR {num(calculatedAmount)}</strong></span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
                    <div className="helper">Total Orders</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{num(payPreview.totalSubmitted)}</div>
                  </div>
                  <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
                    <div className="helper">Delivered Orders</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{num(payPreview.totalDelivered)}</div>
                  </div>
                  <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
                    <div className="helper">Cancelled Orders</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{num(payPreview.totalCancelled)}</div>
                  </div>
                  <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
                    <div className="helper">Total Order Amount</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>AED {num(payPreview.totalOrderValueAED)}</div>
                  </div>
                  <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
                    <div className="helper">Delivered Order Amount</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>AED {num(payPreview.deliveredOrderValueAED)}</div>
                  </div>
                  <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
                    <div className="helper">Payable Commission</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>PKR {num(calculatedAmount)}</div>
                  </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="card-header" style={{ padding: '14px 16px' }}>
                    <div className="card-title">Delivered Orders</div>
                    <div className="helper">Edit commission per order before paying</div>
                  </div>
                  <div style={{ maxHeight: 320, overflow: 'auto' }} className="premium-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, background: 'var(--panel-2)', zIndex: 1 }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Order</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Product</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Price</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(payPreview.orders || []).map((order, idx) => {
                          const rowId = String(order?.id || order?.orderId || idx)
                          return (
                            <tr key={rowId} style={{ background: idx % 2 ? 'transparent' : 'var(--panel)' }}>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 700 }}>{order.orderId}</div>
                                <div className="helper">
                                  {order?.date ? new Date(order.date).toLocaleString() : '-'}
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600 }}>{order.productName || '-'}</div>
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {order.currency || 'AED'} {num(order.amount)}
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                                <input
                                  type="number"
                                  className="input"
                                  min="0"
                                  step="1"
                                  value={editingPayCommissions[rowId] ?? order.commission ?? 0}
                                  onChange={(e) =>
                                    setEditingPayCommissions((prev) => ({ ...prev, [rowId]: e.target.value }))
                                  }
                                  disabled={!!payingAgent}
                                  style={{ width: 120, marginLeft: 'auto', textAlign: 'right', fontWeight: 700 }}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

    </div>
  )
}
