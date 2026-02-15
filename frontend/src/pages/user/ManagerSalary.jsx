import React, { useEffect, useState, useMemo } from 'react'
import { apiGet, apiPost } from '../../api.js'
import { useToast } from '../../ui/Toast.jsx'

export default function ManagerSalary() {
  const toast = useToast()
  const [managers, setManagers] = useState([])
  const [managerStats, setManagerStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [salaryInputs, setSalaryInputs] = useState({})
  const [currencyInputs, setCurrencyInputs] = useState({})
  const [sending, setSending] = useState({})
  const [salaryHistory, setSalaryHistory] = useState([])
  const [expandedManager, setExpandedManager] = useState(null)

  const currencies = ['PKR', 'SAR', 'AED', 'USD', 'EUR', 'GBP']

  useEffect(() => {
    loadManagers()
    loadSalaryHistory()
  }, [])

  async function loadManagers() {
    setLoading(true)
    try {
      const res = await apiGet('/api/users/managers')
      const mgrs = Array.isArray(res?.users) ? res.users : []
      setManagers(mgrs)
      
      // Load stats for each manager
      const stats = {}
      for (const m of mgrs) {
        try {
          const statsRes = await apiGet(`/api/finance/manager-stats/${m._id}`)
          stats[m._id] = statsRes?.stats || { totalCollected: 0, submittedToCompany: 0 }
        } catch {
          stats[m._id] = { totalCollected: 0, submittedToCompany: 0 }
        }
      }
      setManagerStats(stats)
    } catch (err) {
      toast.error('Failed to load managers')
    } finally {
      setLoading(false)
    }
  }

  async function loadSalaryHistory() {
    try {
      const res = await apiGet('/api/finance/manager-salaries')
      setSalaryHistory(Array.isArray(res?.salaries) ? res.salaries : [])
    } catch {
      setSalaryHistory([])
    }
  }

  async function sendSalary(managerId) {
    const amount = Number(salaryInputs[managerId] || 0)
    const currency = currencyInputs[managerId] || 'PKR'
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setSending(prev => ({ ...prev, [managerId]: true }))
    try {
      await apiPost('/api/finance/manager-salaries', {
        managerId,
        amount,
        currency,
        month: new Date().toISOString().slice(0, 7),
      })
      toast.success('Salary sent successfully!')
      setSalaryInputs(prev => ({ ...prev, [managerId]: '' }))
      loadSalaryHistory()
    } catch (err) {
      toast.error(err?.message || 'Failed to send salary')
    } finally {
      setSending(prev => ({ ...prev, [managerId]: false }))
    }
  }

  const salaryByManager = useMemo(() => {
    const map = {}
    for (const s of salaryHistory) {
      const mid = s.managerId?._id || s.managerId
      if (!map[mid]) map[mid] = { total: 0, payments: [] }
      map[mid].total += Number(s.amount || 0)
      map[mid].payments.push(s)
    }
    return map
  }, [salaryHistory])

  return (
    <div className="section" style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Minimal Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 800, 
          color: 'var(--text)',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 32 }}>💰</span>
          Manager Salary
        </h1>
        <p style={{ color: 'var(--muted)', margin: '8px 0 0', fontSize: 14 }}>
          Send salary payments to your managers
        </p>
      </div>

      {/* Managers List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          Loading managers...
        </div>
      ) : managers.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 60, 
          background: 'var(--card)', 
          borderRadius: 16,
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 48, marginBottom: 16, display: 'block' }}>👥</span>
          <p style={{ color: 'var(--muted)', margin: 0 }}>No managers found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {managers.map((manager) => {
            const mid = manager._id
            const stats = managerStats[mid] || { totalCollected: 0, submittedToCompany: 0 }
            const salaryData = salaryByManager[mid] || { total: 0, payments: [] }
            const isSending = sending[mid]
            const isExpanded = expandedManager === mid
            const currency = currencyInputs[mid] || 'PKR'

            return (
              <div
                key={mid}
                style={{
                  background: 'var(--card)',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                  boxShadow: isExpanded ? '0 8px 30px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {/* Manager Row */}
                <div 
                  style={{ 
                    padding: 20,
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 20,
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedManager(isExpanded ? null : mid)}
                >
                  {/* Left: Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 20,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {(manager.firstName?.[0] || 'M').toUpperCase()}
                    </div>
                    
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                          {`${manager.firstName || ''} ${manager.lastName || ''}`.trim() || 'Manager'}
                        </span>
                        <span style={{
                          background: '#10b981',
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                        }}>
                          Active
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                        {manager.email}
                      </div>
                      {/* Assigned Countries */}
                      {manager.assignedCountries?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          {manager.assignedCountries.map(c => (
                            <span key={c} style={{
                              background: 'var(--panel)',
                              color: 'var(--text)',
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                            }}>
                              🌍 {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        Total Paid
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
                        {salaryData.total.toLocaleString()}
                      </div>
                    </div>
                    <button 
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: 8,
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                  <div style={{ 
                    borderTop: '1px solid var(--border)',
                    padding: 20,
                    background: 'var(--panel)',
                  }}>
                    {/* Stats Row */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16,
                      marginBottom: 24,
                    }}>
                      <div style={{
                        background: 'var(--card)',
                        borderRadius: 12,
                        padding: 16,
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>
                          📥 Collected from Drivers
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>
                          {stats.totalCollected?.toLocaleString() || '0'}
                        </div>
                      </div>
                      <div style={{
                        background: 'var(--card)',
                        borderRadius: 12,
                        padding: 16,
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>
                          ✅ Submitted to Company
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>
                          {stats.submittedToCompany?.toLocaleString() || '0'}
                        </div>
                      </div>
                    </div>

                    {/* Send Salary Form */}
                    <div style={{ 
                      background: 'var(--card)',
                      borderRadius: 12,
                      padding: 20,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 16,
                      alignItems: 'end',
                    }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
                          Amount to Send
                        </label>
                        <div style={{ display: 'flex', gap: 0 }}>
                          <select
                            value={currency}
                            onChange={(e) => setCurrencyInputs(prev => ({ ...prev, [mid]: e.target.value }))}
                            style={{
                              padding: '12px',
                              borderRadius: '10px 0 0 10px',
                              border: '1px solid var(--border)',
                              borderRight: 'none',
                              background: 'var(--panel)',
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={salaryInputs[mid] || ''}
                            onChange={(e) => setSalaryInputs(prev => ({ ...prev, [mid]: e.target.value }))}
                            disabled={isSending}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              borderRadius: '0 10px 10px 0',
                              border: '1px solid var(--border)',
                              fontSize: 16,
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          sendSalary(mid)
                        }}
                        disabled={isSending || !salaryInputs[mid]}
                        style={{
                          padding: '12px 32px',
                          borderRadius: 10,
                          border: 'none',
                          background: isSending ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: isSending || !salaryInputs[mid] ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                          height: 46,
                        }}
                      >
                        {isSending ? 'Sending...' : 'Send Salary'}
                      </button>
                    </div>

                    {/* History for this manager */}
                    {salaryData.payments.length > 0 && (
                      <div style={{ marginTop: 24 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase' }}>
                          Recent Payments
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {salaryData.payments.slice(0, 3).map((payment, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              background: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                            }}>
                              <div style={{ fontSize: 14, color: 'var(--text)' }}>
                                {new Date(payment.createdAt).toLocaleDateString()}
                              </div>
                              <div style={{ fontWeight: 700, color: '#10b981' }}>
                                {payment.currency || 'PKR'} {Number(payment.amount).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
