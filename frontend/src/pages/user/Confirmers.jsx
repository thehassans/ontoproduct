import React, { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete } from '../../api'
import { useToast } from '../../ui/Toast.jsx'

export default function Confirmers() {
  const toast = useToast()
  const [confirmers, setConfirmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await apiGet('/api/users?role=confirmer')
      setConfirmers(data.users || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load confirmers')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.firstName || !form.email || !form.password) {
      toast.error('Please fill all required fields')
      return
    }

    setCreating(true)
    try {
      await apiPost('/api/users', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: 'confirmer',
      })
      toast.success('Confirmer created successfully!')
      setShowCreateForm(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' })
      loadData()
    } catch (e) {
      toast.error(e?.message || 'Failed to create confirmer')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this confirmer?')) return
    
    setDeleting(id)
    try {
      await apiDelete(`/api/users/${id}`)
      toast.success('Confirmer deleted successfully!')
      loadData()
    } catch (e) {
      toast.error(e?.message || 'Failed to delete confirmer')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="confirmers-page">
      <div className="page-header">
        <div>
          <h1>Confirmers</h1>
          <p>Manage order confirmation team members</p>
        </div>
        <button className="create-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {showCreateForm ? 'Cancel' : 'Add Confirmer'}
        </button>
      </div>

      {/* Inline Create Form */}
      {showCreateForm && (
        <div className="create-form-card">
          <h3>Add New Confirmer</h3>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password (min 6 characters)"
                required
                minLength={6}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={creating}>
                {creating ? 'Creating...' : 'Create Confirmer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading confirmers...</p>
        </div>
      ) : confirmers.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>No Confirmers Yet</h3>
          <p>Add your first confirmer to start managing order confirmations</p>
          <button className="create-btn" onClick={() => setShowCreateForm(true)}>
            Add Confirmer
          </button>
        </div>
      ) : (
        <div className="confirmers-grid">
          {confirmers.map(confirmer => (
            <div key={confirmer._id} className="confirmer-card">
              <div className="confirmer-avatar">
                {confirmer.firstName?.[0] || 'C'}
              </div>
              <div className="confirmer-info">
                <h3>{confirmer.firstName} {confirmer.lastName}</h3>
                <p className="confirmer-email">{confirmer.email}</p>
                {confirmer.phone && <p className="confirmer-phone">{confirmer.phone}</p>}
                <p className="confirmer-date">
                  Created: {new Date(confirmer.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="confirmer-actions">
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(confirmer._id)}
                  disabled={deleting === confirmer._id}
                >
                  {deleting === confirmer._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .confirmers-page {
          padding: 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary, #fff);
          margin: 0 0 4px 0;
        }

        .page-header p {
          color: var(--text-secondary, #94a3b8);
          margin: 0;
        }

        .create-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .create-form-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .create-form-card h3 {
          color: #1e293b;
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 20px 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          color: #475569;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #1e293b;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input::placeholder {
          color: #94a3b8;
        }

        .form-group input:focus {
          border-color: #10b981;
          background: #fff;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .cancel-btn {
          padding: 10px 20px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #e2e8f0;
        }

        .submit-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          color: var(--text-secondary, #94a3b8);
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state svg {
          color: #475569;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          color: var(--text-primary, #fff);
          font-size: 20px;
          margin: 0 0 8px 0;
        }

        .empty-state p {
          margin-bottom: 20px;
        }

        .confirmers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .confirmer-card {
          background: var(--card-bg, rgba(30, 41, 59, 0.8));
          border-radius: 16px;
          padding: 24px;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .confirmer-avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 700;
        }

        .confirmer-info h3 {
          color: var(--text-primary, #fff);
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        .confirmer-email, .confirmer-phone, .confirmer-date {
          color: var(--text-secondary, #94a3b8);
          font-size: 14px;
          margin: 0 0 4px 0;
        }

        .confirmer-actions {
          margin-top: auto;
          display: flex;
          gap: 12px;
        }

        .delete-btn {
          padding: 10px 16px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
        }

        .delete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .confirmers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
