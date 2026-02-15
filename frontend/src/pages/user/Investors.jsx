import React, { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../api'
import './Investors.css'

const CURRENCIES = ['SAR', 'AED', 'OMR', 'BHD', 'INR', 'KWD', 'QAR', 'USD', 'CNY', 'PKR', 'JOD', 'GBP', 'CAD', 'AUD']

export default function Investors() {
  const [investors, setInvestors] = useState([])
  const [references, setReferences] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingInvestor, setEditingInvestor] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    investmentAmount: '',
    profitAmount: '',
    profitPercentage: '15',
    currency: 'SAR',
    referredBy: '', // Selected reference ID
    createNewReference: false, // Toggle to create new reference
    referenceName: '',
    referencePhone: '',
    referenceEmail: '',
    referenceCommission: '5',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadInvestors = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet('/users/investors')
      let users = res.users || []

      try {
        const earningsRes = await apiGet('/api/finance/investors/earnings')
        const earningsMap = {}
        ;(earningsRes?.investors || []).forEach((inv) => {
          if (inv?._id) earningsMap[String(inv._id)] = inv
        })

        users = users.map((u) => {
          const e = earningsMap[String(u?._id)]
          if (!e) return u
          return {
            ...u,
            investorProfile: {
              ...(u.investorProfile || {}),
              earnedProfit:
                e.profit != null ? Number(e.profit || 0) : Number(u?.investorProfile?.earnedProfit || 0),
              totalReturn:
                e.returns != null ? Number(e.returns || 0) : Number(u?.investorProfile?.totalReturn || 0),
            },
          }
        })
      } catch (e) {
        // ignore: show DB-stored profile values if earnings endpoint unavailable
      }

      setInvestors(users)
    } catch (err) {
      console.error('Failed to load investors:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReferences = useCallback(async () => {
    try {
      const res = await apiGet('/references')
      setReferences(res.references || [])
    } catch (err) {
      console.error('Failed to load references:', err)
    }
  }, [])

  useEffect(() => {
    loadInvestors()
    loadReferences()
  }, [loadInvestors, loadReferences])

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      investmentAmount: '',
      profitAmount: '',
      profitPercentage: '15',
      currency: 'SAR',
      referredBy: '',
      createNewReference: false,
      referenceName: '',
      referencePhone: '',
      referenceEmail: '',
      referenceCommission: '5',
    })
    setEditingInvestor(null)
    setError('')
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (investor) => {
    setEditingInvestor(investor)
    setForm({
      firstName: investor.firstName || '',
      lastName: investor.lastName || '',
      email: investor.email || '',
      password: '',
      phone: investor.phone || '',
      investmentAmount: investor.investorProfile?.investmentAmount?.toString() || '',
      profitAmount: investor.investorProfile?.profitAmount?.toString() || '',
      profitPercentage: investor.investorProfile?.profitPercentage?.toString() || '15',
      currency: investor.investorProfile?.currency || 'SAR',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload = {
        ...form,
        investmentAmount: parseFloat(form.investmentAmount) || 0,
        profitAmount: parseFloat(form.profitAmount) || 0,
        profitPercentage: parseFloat(form.profitPercentage) || 15,
        referredBy: form.referredBy || undefined,
      }

      if (editingInvestor) {
        await apiPatch(`/users/investors/${editingInvestor._id}`, payload)
      } else {
        await apiPost('/users/investors', payload)
      }

      setShowForm(false)
      resetForm()
      loadInvestors()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save investor')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleProfit = async (investor) => {
    // Optimistic update - update UI immediately
    const newStatus = investor.investorProfile?.status === 'active' ? 'inactive' : 'active'
    setInvestors(prev => prev.map(inv => 
      inv._id === investor._id 
        ? { ...inv, investorProfile: { ...inv.investorProfile, status: newStatus } }
        : inv
    ))
    
    try {
      await apiPost(`/users/investors/${investor._id}/toggle-profit`)
      // Optimistic update already applied above - no need to reload
    } catch (err) {
      console.error('Failed to toggle profit:', err)
      // Revert on error
      setInvestors(prev => prev.map(inv => 
        inv._id === investor._id 
          ? { ...inv, investorProfile: { ...inv.investorProfile, status: investor.investorProfile?.status } }
          : inv
      ))
    }
  }

  const handleLoginAs = async (investor) => {
    try {
      const res = await apiPost(`/users/${investor._id}/impersonate`)
      localStorage.setItem('token', res.token)
      localStorage.setItem('me', JSON.stringify(res.user))
      window.location.href = '/investor'
    } catch (err) {
      console.error('Failed to login as user:', err)
      alert('Failed to login as this user')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await apiDelete(`/users/investors/${deleteConfirm._id}`)
      setDeleteConfirm(null)
      loadInvestors()
    } catch (err) {
      console.error('Failed to delete investor:', err)
    }
  }

  const getProgress = (investor) => {
    const earned = investor.investorProfile?.earnedProfit || 0
    const target = investor.investorProfile?.profitAmount || 1
    return Math.min(100, (earned / target) * 100)
  }

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0)
  }

  const statsData = [
    { label: 'Total Investors', value: investors.length, color: '#3b82f6', icon: '👥' },
    { label: 'Active', value: investors.filter(i => i.investorProfile?.status === 'active').length, color: '#10b981', icon: '✅' },
    { label: 'Completed', value: investors.filter(i => i.investorProfile?.status === 'completed').length, color: '#8b5cf6', icon: '🏆' },
    { label: 'Total Invested', value: formatCurrency(investors.reduce((s, i) => s + (i.investorProfile?.investmentAmount || 0), 0), 'SAR'), color: '#f59e0b', icon: '💰' },
  ]

  return (
    <div className="investors-container">
      {/* Header */}
      <div className="investors-header">
        <div className="investors-header-text">
          <h1 className="investors-title">Investor Management</h1>
          <p className="investors-subtitle">Manage your investors and track profit distribution</p>
        </div>
        {!showForm && (
          <button className="investors-add-btn" onClick={openCreate}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Investor
          </button>
        )}
      </div>

      {/* Inline Create/Edit Form */}
      {showForm && (
        <div className="investors-form-card">
          <div className="investors-form-header">
            <h2 className="investors-form-title">
              {editingInvestor ? 'Edit Investor' : 'Add New Investor'}
            </h2>
            <button className="investors-form-close" onClick={() => { setShowForm(false); resetForm() }}>×</button>
          </div>

          {error && <div className="investors-form-error">{error}</div>}

          <form onSubmit={handleSubmit} className="investors-form">
            <div className="investors-form-grid">
              <div className="investors-form-field">
                <label>First Name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  placeholder="John"
                />
              </div>
              <div className="investors-form-field">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  placeholder="Doe"
                />
              </div>
              <div className="investors-form-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+966 XXX XXX XXXX"
                />
              </div>
              <div className="investors-form-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="john@example.com"
                />
              </div>
              {!editingInvestor && (
                <div className="investors-form-field">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!editingInvestor}
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>
              )}
              <div className="investors-form-field">
                <label>Investment Amount *</label>
                <input
                  type="number"
                  value={form.investmentAmount}
                  onChange={(e) => setForm({ ...form, investmentAmount: e.target.value })}
                  required
                  min="1"
                  placeholder="10000"
                />
              </div>
              <div className="investors-form-field">
                <label>Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="investors-form-field">
                <label>Total Profit Amount *</label>
                <input
                  type="number"
                  value={form.profitAmount}
                  onChange={(e) => setForm({ ...form, profitAmount: e.target.value })}
                  required
                  min="1"
                  placeholder="5000"
                />
              </div>
              <div className="investors-form-field">
                <label>Profit % Per Order</label>
                <input
                  type="number"
                  value={form.profitPercentage}
                  onChange={(e) => setForm({ ...form, profitPercentage: e.target.value })}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="15"
                />
              </div>
            </div>

            {/* Reference Section */}
            <div style={{marginBottom: 20, paddingTop: 20, borderTop: '1px solid var(--investor-glass-border)'}}>
              <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 16}}>Reference (Optional)</h3>
              <div className="investors-form-field">
                <label>Select Reference</label>
                <select
                  value={form.referredBy}
                  onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
                >
                  <option value="">None</option>
                  {references.map((ref) => (
                    <option key={ref._id} value={ref._id}>
                      {ref.name} - {ref.profitRate || 0}%
                    </option>
                  ))}
                </select>
                <p style={{fontSize: 12, opacity: 0.6, marginTop: 4}}>
                  To add a new reference, go to References page
                </p>
              </div>
            </div>

            <div className="investors-form-actions">
              <button type="button" className="investors-btn-secondary" onClick={() => { setShowForm(false); resetForm() }}>
                Cancel
              </button>
              <button type="submit" className="investors-btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingInvestor ? 'Update Investor' : 'Create Investor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Cards */}
      <div className="investors-stats">
        {statsData.map((stat, i) => (
          <div key={i} className="investors-stat-card">
            <div className="investors-stat-header">
              <span className="investors-stat-icon">{stat.icon}</span>
              <span className="investors-stat-label">{stat.label}</span>
            </div>
            <div className="investors-stat-value" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Investors Grid */}
      {loading ? (
        <div className="investors-loading">
          <div className="investors-loading-spinner"></div>
          <p>Loading investors...</p>
        </div>
      ) : investors.length === 0 && !showForm ? (
        <div className="investors-empty">
          <div className="investors-empty-icon">💼</div>
          <p>No investors yet. Add your first investor to start tracking profits!</p>
          <button className="investors-btn-primary" onClick={openCreate}>Add First Investor</button>
        </div>
      ) : (
        <div className="investors-grid">
          {investors.map((inv) => (
            <div key={inv._id} className="investor-card">
              <div className="investor-card-header">
                <div className="investor-card-avatar">
                  {inv.firstName?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="investor-card-info">
                  <div className="investor-card-name">{inv.firstName} {inv.lastName}</div>
                  <div className="investor-card-email">{inv.email}</div>
                  {inv.phone && <div className="investor-card-phone">{inv.phone}</div>}
                </div>
                <span className={`investor-status investor-status-${inv.investorProfile?.status || 'inactive'}`}>
                  {inv.investorProfile?.status === 'active' ? 'Active' : 
                   inv.investorProfile?.status === 'completed' ? 'Completed' : 'Paused'}
                </span>
              </div>

              <div className="investor-card-details">
                <div className="investor-detail-box investor-detail-investment">
                  <span className="investor-detail-label">Investment</span>
                  <span className="investor-detail-value">
                    {formatCurrency(inv.investorProfile?.investmentAmount, inv.investorProfile?.currency)}
                  </span>
                </div>
                <div className="investor-detail-box investor-detail-profit">
                  <span className="investor-detail-label">Profit/Order</span>
                  <span className="investor-detail-value">{inv.investorProfile?.profitPercentage || 0}%</span>
                </div>
              </div>

              <div className="investor-progress">
                <div className="investor-progress-header">
                  <span>Profit Progress</span>
                  <span>
                    {formatCurrency(inv.investorProfile?.earnedProfit, inv.investorProfile?.currency)} / 
                    {formatCurrency(inv.investorProfile?.profitAmount, inv.investorProfile?.currency)}
                  </span>
                </div>
                <div className="investor-progress-bar">
                  <div 
                    className={`investor-progress-fill ${inv.investorProfile?.status === 'completed' ? 'completed' : ''}`}
                    style={{ width: `${getProgress(inv)}%` }}
                  />
                </div>
                {inv.investorProfile?.status === 'completed' && (
                  <div className="investor-completed-badge">🎉 Investment Completed!</div>
                )}
              </div>

              <div className="investor-card-actions">
                {inv.investorProfile?.status !== 'completed' && (
                  <button 
                    className={`investor-action-btn ${inv.investorProfile?.status === 'active' ? 'pause' : 'start'}`}
                    onClick={() => handleToggleProfit(inv)}
                  >
                    {inv.investorProfile?.status === 'active' ? '⏸️ Pause' : '▶️ Start'}
                  </button>
                )}
                <button className="investor-action-btn edit" onClick={() => openEdit(inv)}>✏️ Edit</button>
                <button className="investor-action-btn" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff'}} onClick={() => handleLoginAs(inv)}>🔑 Login As</button>
                <button className="investor-action-btn delete" onClick={() => setDeleteConfirm(inv)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="investors-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="investors-modal" onClick={(e) => e.stopPropagation()}>
            <div className="investors-modal-icon">⚠️</div>
            <h3>Delete Investor?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.firstName} {deleteConfirm.lastName}</strong>? 
              This action cannot be undone.
            </p>
            <div className="investors-modal-actions">
              <button className="investors-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="investors-btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
