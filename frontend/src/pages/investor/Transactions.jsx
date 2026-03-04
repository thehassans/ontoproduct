import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { apiGet, apiPost } from '../../api.js'
import { useToast } from '../../ui/Toast.jsx'
import './Dashboard.css'

export default function Transactions() {
  const toast = useToast()
  const { user, refreshUser } = useOutletContext()
  const profile = user?.investorProfile || {}
  const { currency = 'SAR', earnedProfit = 0, availableBalance = 0 } = profile
  
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestAmount, setRequestAmount] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Placeholder transactions - in real app would come from API
  const transactions = [
    { id: 1, type: 'profit', amount: earnedProfit, date: new Date(), description: 'Total Accumulated Profit' },
  ]

  async function handleRequestPayout() {
    if (!requestAmount || Number(requestAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (Number(requestAmount) > availableBalance) {
      toast.error('Amount exceeds available balance')
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/api/finance/investors/payout-requests', {
        amount: Number(requestAmount),
        notes: requestNotes
      })
      try {
        await refreshUser?.()
      } catch {
        try {
          await apiGet('/users/me')
        } catch {}
      }
      toast.success('Payout request submitted successfully!')
      setShowRequestModal(false)
      setRequestAmount('')
      setRequestNotes('')
    } catch (err) {
      toast.error(err?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="investor-dashboard">
      <div className="id-background-overlay" />
      
      {/* Header */}
      <div className="id-header">
        <div className="id-welcome">
           <span className="id-greeting">Financial Records</span>
           <h1 className="id-name">Transactions</h1>
        </div>
        <button 
          onClick={() => setShowRequestModal(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Request Payout
        </button>
      </div>

      {/* Summary Cards */}
      <div className="id-stats-grid">
        <div className="id-stat-card glass">
          <div className="id-stat-icon green">
            💰
          </div>
          <div className="id-stat-content">
            <span className="id-stat-label">Total Earned</span>
            <div className="id-stat-value highlight">
              {Number(earnedProfit).toLocaleString()} <span className="currency">{currency}</span>
            </div>
            <div className="id-stat-sub">Lifetime Profit</div>
          </div>
        </div>

        <div className="id-stat-card glass">
          <div className="id-stat-icon blue">
            📈
          </div>
          <div className="id-stat-content">
            <span className="id-stat-label">This Month</span>
            <div className="id-stat-value">
              {Number(earnedProfit).toLocaleString()} <span className="currency">{currency}</span>
            </div>
            <div className="id-stat-sub">Current Period</div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="id-activity-feed" style={{ marginTop: '0' }}>
        <h3>Recent Activity</h3>
        
        <div className="activity-list">
          {transactions.length === 0 ? (
            <div className="it-empty" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
              <p>No transactions yet</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="activity-item">
                <div className="activity-icon">
                  {tx.type === 'profit' ? '⚡' : '💸'}
                </div>
                <div className="activity-info">
                  <span className="activity-title">{tx.description}</span>
                  <span className="activity-time">{tx.date.toLocaleDateString()}</span>
                </div>
                <div className={`activity-amount ${tx.type === 'profit' ? 'positive' : ''}`}>
                  {tx.type === 'profit' ? '+' : '-'}{Number(tx.amount).toLocaleString()} {currency}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 24,
            padding: 32,
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Request Payout</h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Available: {Number(availableBalance).toLocaleString()} {currency}</p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Amount ({currency})
              </label>
              <input
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder="Enter amount"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '2px solid #e2e8f0',
                  fontSize: 16,
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Notes (optional)
              </label>
              <textarea
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '2px solid #e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowRequestModal(false)}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
