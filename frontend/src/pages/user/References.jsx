import React, { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPatch } from '../../api'

export default function References() {
  const [references, setReferences] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRef, setNewRef] = useState({ name: '', phone: '', profitRate: '' })

  const loadReferences = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet('/api/references')
      setReferences(res.references || [])
    } catch (err) {
      console.error('Failed to load references:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReferences()
  }, [loadReferences])

  const totalProfit = references.reduce((sum, ref) => sum + (ref.totalProfit || 0), 0)
  const pendingRequests = references.filter(ref => ref.pendingRequest).length

  const handleAddReference = async () => {
    if (!newRef.name || !newRef.profitRate) return
    try {
      await apiPost('/api/references', newRef)
      setShowAddModal(false)
      setNewRef({ name: '', phone: '', profitRate: '' })
      loadReferences()
    } catch (err) {
      console.error('Failed to add reference:', err)
      alert('Failed to add reference')
    }
  }

  const handleApproveRequest = async (refId) => {
    try {
      await apiPost(`/api/references/${refId}/approve-request`)
      loadReferences()
    } catch (err) {
      console.error('Failed to approve request:', err)
      alert('Failed to approve request')
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#0f172a' }}>References</h1>
          <p style={{ fontSize: 14, opacity: 0.6, margin: '4px 0 0 0' }}>Manage reference profits and requests</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Reference
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Total References</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{references.length}</div>
        </div>
        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Total Profit</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>AED {totalProfit.toFixed(0)}</div>
        </div>
        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Pending Requests</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{pendingRequests}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : references.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <p style={{ fontSize: 16, opacity: 0.6 }}>No references yet. Click "Add Reference" to create one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {references.map((ref) => (
            <div key={ref._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{ref.name}</div>
                  {ref.phone && <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 12 }}>{ref.phone}</div>}
                  
                  <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Profit Rate</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>{ref.profitRate}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Total Profit</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>AED {(ref.totalProfit || 0).toFixed(0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Pending Amount</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>AED {(ref.pendingAmount || 0).toFixed(0)}</div>
                    </div>
                  </div>
                </div>
                
                {ref.pendingRequest && (
                  <button
                    onClick={() => handleApproveRequest(ref._id)}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Approve Request
                  </button>
                )}
              </div>
              
              {ref.lastPaid && (
                <div style={{ marginTop: 12, padding: 10, background: '#f8fafc', borderRadius: 6, fontSize: 13, opacity: 0.7 }}>
                  Last payment: AED {ref.lastPaidAmount?.toFixed(0)} on {new Date(ref.lastPaid).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: 24, maxWidth: 400, width: '90%' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Add Reference</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={newRef.name}
                onChange={(e) => setNewRef({ ...newRef, name: e.target.value })}
                placeholder="Reference name"
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label className="label">Phone (optional)</label>
              <input
                type="text"
                className="input"
                value={newRef.phone}
                onChange={(e) => setNewRef({ ...newRef, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label className="label">Profit Rate (%)</label>
              <input
                type="number"
                className="input"
                value={newRef.profitRate}
                onChange={(e) => setNewRef({ ...newRef, profitRate: e.target.value })}
                placeholder="e.g., 5"
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddReference}
                style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
