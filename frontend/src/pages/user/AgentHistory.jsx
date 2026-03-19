import React, { useEffect, useState } from 'react'
import { apiGet, API_BASE } from '../../api'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../ui/Toast.jsx'

export default function AgentHistory() {
  const { agentId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [history, setHistory] = useState([])
  const [agentName, setAgentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({ totalPaid: 0, count: 0 })

  function num(n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  useEffect(() => {
    if (!agentId) return
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const r = await apiGet(`/api/finance/agents/${agentId}/commission-history`)
        if (!alive) return
        const h = Array.isArray(r?.history) ? r.history : []
        setHistory(h)
        const totalPaid = h.reduce((s, x) => s + Number(x.amount || 0), 0)
        setSummary({ totalPaid, count: h.length })
        if (h.length > 0) {
          const approver = h[0]?.agent
          setAgentName(r?.agentName || '')
        }
        // Try to get agent name from the first record
        setAgentName(r?.agentName || agentId)
      } catch (e) {
        if (alive) toast.show(e?.message || 'Failed to load history', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [agentId])

  return (
    <div className="section" style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <div className="page-header" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn secondary"
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => navigate('/user/agent-amounts')}
          >
            ← Back
          </button>
          <div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              📋 Agent Commission History
            </div>
            {agentName && (
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                Payment records for <strong style={{ color: '#8b5cf6' }}>{agentName}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="stat-card gradient-green">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.9, marginBottom: 6 }}>
            Total Paid
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>PKR {num(summary.totalPaid)}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>All time payments</div>
        </div>
        <div className="stat-card gradient-blue">
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.9, marginBottom: 6 }}>
            Total Payments
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{summary.count}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Commission transactions</div>
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ fontSize: 18, fontWeight: 800 }}>
            Payment History
          </div>
          {loading && <div className="helper" style={{ fontSize: 12 }}>Loading...</div>}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading payment history...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No commission payments found for this agent.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--panel-2)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Amount (PKR)</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Rate</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Paid By</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Note</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr
                    key={h._id || idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--panel)',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {history.length - idx}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>
                        {new Date(h.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#10b981' }}>
                        PKR {num(h.amount)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {h.commissionRate ? (
                        <span
                          style={{
                            background: '#f3e8ff',
                            color: '#8b5cf6',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {h.commissionRate}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600 }}>
                        {h.approver
                          ? `${h.approver.firstName || ''} ${h.approver.lastName || ''}`.trim() || 'Admin'
                          : 'System'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, maxWidth: 200 }}>
                      {h.note || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {h.receiptPdf ? (
                        <a
                          href={`${API_BASE}/${h.receiptPdf}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 12px',
                            background: '#eff6ff',
                            color: '#3b82f6',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          📄 PDF
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--panel-2)' }}>
                  <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 700 }}>
                    Total ({summary.count} payments)
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#10b981' }}>
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
