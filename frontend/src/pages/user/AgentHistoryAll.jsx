import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, API_BASE } from '../../api'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../ui/Toast.jsx'

export default function AgentHistoryAll() {
  const navigate = useNavigate()
  const toast = useToast()

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [total, setTotal] = useState(0)

  function num(n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const r = await apiGet('/api/finance/agents/all-commission-history?limit=500')
        if (!alive) return
        setHistory(Array.isArray(r?.history) ? r.history : [])
        setTotal(r?.total || 0)
      } catch (e) {
        if (alive) toast.show(e?.message || 'Failed to load history', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return history
    const term = searchTerm.toLowerCase()
    return history.filter(h => {
      const name = `${h.agent?.firstName || ''} ${h.agent?.lastName || ''}`.toLowerCase()
      const phone = String(h.agent?.phone || '').toLowerCase()
      return name.includes(term) || phone.includes(term)
    })
  }, [history, searchTerm])

  const summary = useMemo(() => {
    const totalPaid = filtered.reduce((s, h) => s + Number(h.amount || 0), 0)
    const agentsSet = new Set(filtered.map(h => String(h.agent?._id || '')))
    return { totalPaid, agentCount: agentsSet.size, payments: filtered.length }
  }, [filtered])

  return (
    <div className="section" style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <div className="page-header" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        <div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            📋 Agent Commission History
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            All commission payments across all agents
          </div>
        </div>
        <button
          className="btn secondary"
          style={{ padding: '8px 16px', fontSize: 13 }}
          onClick={() => navigate('/user/agent-amounts')}
        >
          ← Agent Amounts
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="stat-card gradient-green">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.9, marginBottom: 6 }}>
            Total Paid Out
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>PKR {num(summary.totalPaid)}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>All agents combined</div>
        </div>
        <div className="stat-card gradient-blue">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.9, marginBottom: 6 }}>
            Total Payments
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{summary.payments}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Commission transactions</div>
        </div>
        <div className="stat-card gradient-purple">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.9, marginBottom: 6 }}>
            Agents Paid
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{summary.agentCount}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Unique agents</div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 16 }}>
        <input
          className="input"
          type="text"
          placeholder="🔍 Search by agent name or phone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ fontSize: 18, fontWeight: 800 }}>
            Payment Records
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {loading ? 'Loading...' : `${filtered.length} records`}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading payment history...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {searchTerm ? 'No records match your search.' : 'No commission payments found.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--panel-2)', borderBottom: '2px solid var(--border)' }}>
                  {['#', 'Date', 'Agent', 'Amount (PKR)', 'Rate', 'Paid By', 'Note', 'Receipt'].map(h => (
                    <th key={h} style={{
                      padding: '12px 14px', textAlign: h === 'Amount (PKR)' ? 'right' : h === 'Rate' ? 'center' : 'left',
                      fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, idx) => {
                  const agentName = `${h.agent?.firstName || ''} ${h.agent?.lastName || ''}`.trim() || 'Unknown'
                  const agentId = String(h.agent?._id || '')
                  return (
                    <tr
                      key={h._id || idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'transparent' : 'var(--panel)',
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {filtered.length - idx}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {new Date(h.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#8b5cf6', fontWeight: 700, fontSize: 14, padding: 0, textAlign: 'left'
                          }}
                          onClick={() => agentId && navigate(`/user/agent-history/${agentId}`)}
                        >
                          {agentName}
                        </button>
                        {h.agent?.phone && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{h.agent.phone}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>
                          PKR {num(h.amount)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {h.commissionRate ? (
                          <span style={{
                            background: '#f3e8ff', color: '#8b5cf6',
                            padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 12,
                          }}>
                            {h.commissionRate}%
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {h.approver
                            ? `${h.approver.firstName || ''} ${h.approver.lastName || ''}`.trim() || 'Admin'
                            : 'System'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12, maxWidth: 180 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {h.note || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {h.receiptPdf ? (
                          <a
                            href={`${API_BASE}/${h.receiptPdf}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', background: '#eff6ff', color: '#3b82f6',
                              borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                            }}
                          >
                            📄 PDF
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--panel-2)' }}>
                  <td colSpan={3} style={{ padding: '12px 14px', fontWeight: 700 }}>
                    Total ({summary.payments} payments, {summary.agentCount} agents)
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#10b981' }}>
                    PKR {num(summary.totalPaid)}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
