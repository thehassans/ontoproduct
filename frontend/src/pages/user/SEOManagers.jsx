import React, { useState, useEffect } from 'react'
import { apiGet, apiPost, apiDelete } from '../../api'
import { useToast } from '../../ui/Toast'

export default function SEOManagers() {
  const toast = useToast()
  const [seoManagers, setSeoManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSEOManagers()
  }, [])

  async function loadSEOManagers() {
    try {
      setLoading(true)
      const res = await apiGet('/api/users/seo-managers')
      setSeoManagers(res.seoManagers || [])
    } catch (err) {
      toast.error('Failed to load SEO Managers')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      setSubmitting(true)
      await apiPost('/api/users/seo-managers', form)
      toast.success('SEO Manager created successfully')
      setShowModal(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' })
      loadSEOManagers()
    } catch (err) {
      toast.error(err?.message || 'Failed to create SEO Manager')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this SEO Manager?')) return
    try {
      await apiDelete(`/api/users/seo-managers/${id}`)
      toast.success('SEO Manager deleted')
      loadSEOManagers()
    } catch (err) {
      toast.error('Failed to delete SEO Manager')
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>SEO Managers</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Manage SEO managers who can configure pixels and meta tags</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add SEO Manager
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading...</div>
      ) : seoManagers.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 48, 
          background: 'white', 
          borderRadius: 12,
          border: '1px solid #e2e8f0'
        }}>
          <svg width="48" height="48" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" style={{ margin: '0 auto 16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 style={{ color: '#334155', marginBottom: 8 }}>No SEO Managers Yet</h3>
          <p style={{ color: '#64748b' }}>Add your first SEO manager to help manage pixels and meta tags</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {seoManagers.map(manager => (
            <div
              key={manager._id}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 18,
                }}>
                  {manager.firstName?.[0]}{manager.lastName?.[0]}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                    {manager.firstName} {manager.lastName}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{manager.email}</p>
                  {manager.phone && (
                    <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: 13 }}>{manager.phone}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  background: '#f0fdf4',
                  color: '#16a34a',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  SEO Manager
                </span>
                <button
                  onClick={() => handleDelete(manager._id)}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Add SEO Manager</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <svg width="24" height="24" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => setForm({ ...form, firstName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        fontSize: 14,
                      }}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => setForm({ ...form, lastName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        fontSize: 14,
                      }}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                    placeholder="seo@example.com"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    background: 'white',
                    color: '#374151',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Creating...' : 'Create SEO Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
