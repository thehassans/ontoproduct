import React, { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch } from '../../api'
import { useToast } from '../../ui/Toast.jsx'
import Modal from '../../components/Modal.jsx'

export default function CommissionerAmounts() {
  const toast = useToast()
  const [commissioners, setCommissioners] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState({})
  const [updating, setUpdating] = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingCommissioner, setEditingCommissioner] = useState(null)
  const [editForm, setEditForm] = useState({ commissionPerOrder: '', commissionCurrency: 'SAR' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    commissionPerOrder: '',
    commissionCurrency: 'SAR',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await apiGet('/api/commissioners/list')
      setCommissioners(data.commissioners || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load commissioners')
    } finally {
      setLoading(false)
    }
  }

  async function toggleCommission(id, currentStatus) {
    // Optimistic UI update - update state immediately
    const newStatus = !currentStatus
    setCommissioners(prevComms => 
      prevComms.map(comm => 
        comm._id === id 
          ? { ...comm, commissionerProfile: { ...comm.commissionerProfile, isPaused: newStatus } }
          : comm
      )
    )
    
    // Show immediate success feedback
    toast.success(`✨ Commission ${newStatus ? 'paused' : 'resumed'} successfully!`, {
      duration: 2000,
      style: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        fontWeight: 600,
      },
    })
    
    // Make API call in background
    try {
      await apiPost(`/api/commissioners/${id}/toggle-commission`)
    } catch (e) {
      // Revert on error
      setCommissioners(prevComms => 
        prevComms.map(comm => 
          comm._id === id 
            ? { ...comm, commissionerProfile: { ...comm.commissionerProfile, isPaused: currentStatus } }
            : comm
        )
      )
      toast.error(e?.message || 'Failed to toggle commission')
    }
  }

  async function handleUpdateCommissioner(e) {
    e.preventDefault()
    if (!editingCommissioner) return
    const commissionerId = editingCommissioner._id
    
    if (!editForm.commissionPerOrder || Number(editForm.commissionPerOrder) <= 0) {
      toast.error('Please enter a valid commission amount')
      return
    }

    setSavingEdit(true)
    try {
      await apiPatch(`/api/commissioners/${editingCommissioner._id}/commission`, {
        commissionPerOrder: Number(editForm.commissionPerOrder),
        commissionCurrency: editForm.commissionCurrency,
      })
      toast.success('Commissioner settings updated successfully!')
      setEditingCommissioner(null)
      loadData()
      applyToPreviousOrders(commissionerId, { skipConfirm: true })
    } catch (e) {
      toast.error(e?.message || 'Failed to update settings')
    } finally {
      setSavingEdit(false)
    }
  }

  function openEditModal(commissioner) {
    const profile = commissioner.commissionerProfile || {}
    setEditForm({
      commissionPerOrder: profile.commissionPerOrder || '',
      commissionCurrency: profile.commissionCurrency || 'SAR',
    })
    setEditingCommissioner(commissioner)
  }

  async function applyToPreviousOrders(commissionerId, options = {}) {
    if (!options?.skipConfirm) {
      if (!window.confirm('This will apply commission to ALL previous delivered orders. Continue?')) return
    }
    
    setUpdating(prev => ({ ...prev, [commissionerId]: true }))
    try {
      const result = await apiPost(`/api/commissioners/${commissionerId}/apply-to-previous-orders`, {})
      toast.success(`✅ ${result.message || 'Commission applied successfully!'}`)
      loadData()
    } catch (e) {
      toast.error(e?.message || 'Failed to apply commission to previous orders')
    } finally {
      setUpdating(prev => ({ ...prev, [commissionerId]: false }))
    }
  }

  async function handleCreateCommissioner(e) {
    e.preventDefault()
    
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Please fill all required fields')
      return
    }
    
    if (!form.commissionPerOrder || Number(form.commissionPerOrder) <= 0) {
      toast.error('Please enter a valid commission amount')
      return
    }

    setCreating(true)
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'commissioner',
        commissionerProfile: {
          commissionPerOrder: Number(form.commissionPerOrder),
          commissionCurrency: form.commissionCurrency,
        },
      }
      
      await apiPost('/api/users', payload)
      toast.success('Commissioner created successfully!')
      setShowCreateModal(false)
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        commissionPerOrder: '',
        commissionCurrency: 'SAR',
      })
      loadData()
    } catch (e) {
      toast.error(e?.message || 'Failed to create commissioner')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, marginBottom: 8 }}>
            💼 Commissioner Earnings
          </h1>
          <p style={{ fontSize: 16, opacity: 0.7, margin: 0 }}>
            Manage commissioner commissions and earnings
          </p>
        </div>
        <button
          className="btn"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 20 }}>+</span>
          Create Commissioner
        </button>
      </div>

      {/* Create Commissioner Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Commissioner">
        <form onSubmit={handleCreateCommissioner} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="label">First Name *</div>
              <input
                type="text"
                className="input"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <div className="label">Last Name *</div>
              <input
                type="text"
                className="input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <div className="label">Email *</div>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <div className="label">Phone</div>
            <input
              type="tel"
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div>
            <div className="label">Password *</div>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div
            style={{
              padding: 16,
              background: '#f0fdf4',
              borderRadius: 12,
              border: '1px solid #86efac',
            }}
          >
            <h4 style={{ margin: 0, marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#166534' }}>
              💼 Commission Settings
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="label">Commission Per Order *</div>
                <input
                  type="number"
                  className="input"
                  value={form.commissionPerOrder}
                  onChange={(e) => setForm({ ...form, commissionPerOrder: e.target.value })}
                  placeholder="e.g., 50"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <div className="label">Currency</div>
                <select
                  className="input"
                  value={form.commissionCurrency}
                  onChange={(e) => setForm({ ...form, commissionCurrency: e.target.value })}
                >
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                  <option value="OMR">OMR</option>
                  <option value="BHD">BHD</option>
                  <option value="INR">INR</option>
                  <option value="KWD">KWD</option>
                  <option value="QAR">QAR</option>
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={creating}>
              {creating ? 'Creating...' : 'Create Commissioner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Commissioner Modal */}
      <Modal open={!!editingCommissioner} onClose={() => setEditingCommissioner(null)} title="Update Commissioner Settings">
        <form onSubmit={handleUpdateCommissioner} style={{ display: 'grid', gap: 16 }}>
          {editingCommissioner && (
            <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {editingCommissioner.firstName} {editingCommissioner.lastName}
              </div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>{editingCommissioner.email}</div>
            </div>
          )}

          <div
            style={{
              padding: 16,
              background: '#f0fdf4',
              borderRadius: 12,
              border: '1px solid #86efac',
            }}
          >
            <h4 style={{ margin: 0, marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#166534' }}>
              💼 Commission Settings
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="label">Commission Per Order *</div>
                <input
                  type="number"
                  className="input"
                  value={editForm.commissionPerOrder}
                  onChange={(e) => setEditForm({ ...editForm, commissionPerOrder: e.target.value })}
                  placeholder="e.g., 50"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <div className="label">Currency</div>
                <select
                  className="input"
                  value={editForm.commissionCurrency}
                  onChange={(e) => setEditForm({ ...editForm, commissionCurrency: e.target.value })}
                >
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                  <option value="OMR">OMR</option>
                  <option value="BHD">BHD</option>
                  <option value="INR">INR</option>
                  <option value="KWD">KWD</option>
                  <option value="QAR">QAR</option>
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setEditingCommissioner(null)}
              disabled={savingEdit}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Commissioners List */}
      {commissioners.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 60,
            textAlign: 'center',
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>💼</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No commissioners yet</div>
          <div style={{ fontSize: 15, opacity: 0.6, marginBottom: 16 }}>
            Click "Create Commissioner" button above to get started
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {commissioners.map((commissioner) => {
            const profile = commissioner.commissionerProfile || {}
            const totalEarned = profile.totalEarned || 0
            const paidAmount = profile.paidAmount || 0
            const availableBalance = totalEarned - paidAmount
            const currency = profile.commissionCurrency || 'SAR'
            const commissionPerOrder = profile.commissionPerOrder || 0
            const isPaused = profile.isPaused || false

            return (
              <div
                key={commissioner._id}
                className="card"
                style={{
                  padding: 24,
                  borderRadius: 16,
                  border: isPaused ? '2px solid #fbbf24' : '1px solid var(--border)',
                  background: isPaused ? '#fef3c7' : 'var(--panel)',
                }}
              >
                {/* Commissioner Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                      {commissioner.firstName} {commissioner.lastName}
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.6 }}>
                      {commissioner.email} • {commissioner.phone || 'No phone'}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    style={{
                      padding: '6px 12px',
                      background: isPaused ? '#dc2626' : '#10b981',
                      color: 'white',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {isPaused ? '⏸️ Paused' : '▶️ Active'}
                  </div>
                </div>

                {/* Earnings Stats Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      padding: 16,
                      background: isPaused ? '#fff' : 'var(--bg)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Commission Per Order</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>
                      {currency} {commissionPerOrder.toFixed(0)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 16,
                      background: isPaused ? '#fff' : 'var(--bg)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Total Earned</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#667eea' }}>
                      {currency} {totalEarned.toFixed(0)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 16,
                      background: isPaused ? '#fff' : 'var(--bg)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Withdrawn</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
                      {currency} {paidAmount.toFixed(0)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 16,
                      background: isPaused ? '#fff' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: isPaused ? 'inherit' : 'white',
                      borderRadius: 12,
                      border: isPaused ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: isPaused ? 0.6 : 0.9, marginBottom: 4 }}>
                      Available Balance
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>
                      {currency} {availableBalance.toFixed(0)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    onClick={() => toggleCommission(commissioner._id, isPaused)}
                    disabled={toggling[commissioner._id]}
                    style={{
                      background: isPaused ? '#10b981' : '#f59e0b',
                      flex: 1,
                      minWidth: 180,
                    }}
                  >
                    {toggling[commissioner._id]
                      ? 'Processing...'
                      : isPaused
                      ? '▶️ Resume Commission'
                      : '⏸️ Pause Commission'}
                  </button>

                  <button
                    className="btn secondary"
                    style={{ flex: 1, minWidth: 180 }}
                    onClick={() => openEditModal(commissioner)}
                  >
                    ⚙️ Update Settings
                  </button>
                </div>

                {/* Apply to Previous Orders */}
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn"
                    onClick={() => applyToPreviousOrders(commissioner._id)}
                    disabled={updating[commissioner._id]}
                    style={{
                      background: '#6366f1',
                      width: '100%',
                    }}
                  >
                    {updating[commissioner._id]
                      ? '⏳ Applying...'
                      : '📊 Apply Commission to Previous Orders'}
                  </button>
                </div>

                {/* Info Note */}
                {isPaused && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: '#fef3c7',
                      border: '1px solid #fbbf24',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    💡 This commissioner is currently paused and will not earn commissions on new deliveries
                  </div>
                )}

                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: isPaused ? '#fff' : 'var(--bg)',
                    borderRadius: 8,
                    fontSize: 12,
                    opacity: 0.7,
                    border: '1px solid var(--border)',
                  }}
                >
                  📅 Joined: {new Date(commissioner.createdAt).toLocaleDateString()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
