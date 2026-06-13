import React, { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../api'
import { useToast } from '../../ui/Toast'

export default function WebDesigners() {
  const toast = useToast()
  const [webDesigners, setWebDesigners] = useState([])
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
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    loadWebDesigners()
  }, [])

  async function loadWebDesigners() {
    try {
      setLoading(true)
      const res = await apiGet('/api/users/web-designers')
      setWebDesigners(res.webDesigners || [])
    } catch (err) {
      toast.error('Failed to load Web Designers')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editingId) {
      if (!form.firstName || !form.lastName) {
        toast.error('First name and last name are required')
        return
      }
      try {
        setSubmitting(true)
        await apiPut(`/api/users/web-designers/${editingId}`, { 
          firstName: form.firstName, 
          lastName: form.lastName, 
          phone: form.phone 
        })
        toast.success('Web Designer updated')
        setShowModal(false)
        setEditingId(null)
        setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' })
        loadWebDesigners()
      } catch (err) {
        toast.error(err?.message || 'Failed to update Web Designer')
      } finally {
        setSubmitting(false)
      }
      return
    }
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      setSubmitting(true)
      await apiPost('/api/users/web-designers', form)
      toast.success('Web Designer created successfully')
      setShowModal(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' })
      loadWebDesigners()
    } catch (err) {
      toast.error(err?.message || 'Failed to create Web Designer')
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(designer) {
    setEditingId(designer._id)
    setForm({
      firstName: designer.firstName || '',
      lastName: designer.lastName || '',
      email: designer.email || '',
      phone: designer.phone || '',
      password: '',
    })
    setShowModal(true)
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this Web Designer?')) return
    try {
      await apiDelete(`/api/users/web-designers/${id}`)
      toast.success('Web Designer deleted')
      loadWebDesigners()
    } catch (err) {
      toast.error('Failed to delete Web Designer')
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Web Designers</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Manage Web Designers who can custom design storefront banners, categories and headlines</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' }); setShowModal(true) }}
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
          Add Web Designer
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading...</div>
      ) : webDesigners.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 48, 
          background: 'white', 
          borderRadius: 12,
          border: '1px solid #e2e8f0'
        }}>
          <svg width="48" height="48" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" style={{ margin: '0 auto 16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 style={{ color: '#334155', marginBottom: 8 }}>No Web Designers Yet</h3>
          <p style={{ color: '#64748b' }}>Add your first web designer to customize and manage storefront designs</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {webDesigners.map(designer => (
            <div
              key={designer._id}
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
                  background: 'linear-gradient(135deg, #0284c7, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 18,
                }}>
                  {designer.firstName?.[0]}{designer.lastName?.[0]}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                    {designer.firstName} {designer.lastName}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{designer.email}</p>
                  {designer.phone && (
                    <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: 13 }}>{designer.phone}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  background: '#f0fdfa',
                  color: '#0d9488',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  Web Designer
                </span>
                <button
                  onClick={() => openEdit(designer)}
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(designer._id)}
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

      {/* Add/Edit Modal */}
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                {editingId ? 'Edit Web Designer' : 'Add Web Designer'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingId(null) }}
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
                      required
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
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                    Email {editingId ? '' : '*'}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    disabled={!!editingId}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                    placeholder="designer@example.com"
                    required={!editingId}
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
                    Password {editingId ? '(leave blank)' : '*'}
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
                    required={!editingId}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null) }}
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
                  {submitting ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Create Web Designer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
