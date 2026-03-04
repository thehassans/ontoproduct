import React, { useState, useEffect, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, API_BASE } from '../../api'

export default function Brands() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState(null)
  const [form, setForm] = useState({ name: '', sortOrder: 0, isPublished: true })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [uploadingLogo, setUploadingLogo] = useState(null)
  const logoInputRef = useRef(null)

  useEffect(() => { loadBrands() }, [])

  async function loadBrands() {
    try {
      setLoading(true)
      const res = await apiGet('/api/brands')
      setBrands(Array.isArray(res?.brands) ? res.brands : [])
    } catch (err) {
      showMsg('Failed to load brands', 'error')
    } finally {
      setLoading(false)
    }
  }

  function showMsg(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  function openCreate() {
    setEditingBrand(null)
    setForm({ name: '', sortOrder: 0, isPublished: true })
    setShowModal(true)
  }

  function openEdit(brand) {
    setEditingBrand(brand)
    setForm({ name: brand.name || '', sortOrder: brand.sortOrder || 0, isPublished: brand.isPublished !== false })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { showMsg('Brand name is required', 'error'); return }
    setSaving(true)
    try {
      if (editingBrand) {
        await apiPut(`/api/brands/${editingBrand._id}`, form)
        showMsg('Brand updated')
      } else {
        await apiPost('/api/brands', form)
        showMsg('Brand created')
      }
      setShowModal(false)
      loadBrands()
    } catch (err) {
      showMsg(err?.message || 'Failed to save brand', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(brand) {
    if (!window.confirm(`Delete brand "${brand.name}"?`)) return
    try {
      await apiDelete(`/api/brands/${brand._id}`)
      showMsg('Brand deleted')
      loadBrands()
    } catch (err) {
      showMsg(err?.message || 'Failed to delete brand', 'error')
    }
  }

  async function togglePublish(brand) {
    try {
      await apiPut(`/api/brands/${brand._id}`, { isPublished: !brand.isPublished })
      loadBrands()
    } catch (err) {
      showMsg('Failed to update brand', 'error')
    }
  }

  async function handleLogoUpload(brandId, file) {
    if (!file) return
    setUploadingLogo(brandId)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/brands/${brandId}/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) throw new Error('Upload failed')
      showMsg('Logo uploaded')
      loadBrands()
    } catch (err) {
      showMsg('Failed to upload logo', 'error')
    } finally {
      setUploadingLogo(null)
    }
  }

  const resolveUrl = (p) => {
    if (!p) return null
    if (p.startsWith('http')) return p
    return `${API_BASE}${p}`
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {msg.text && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 10000,
          padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff',
          background: msg.type === 'error' ? '#ef4444' : '#10b981',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideIn 0.3s ease',
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1e293b' }}>Brand Management</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>{brands.length} brand{brands.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none',
            borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
          }}
        >
          + Add Brand
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading brands...</div>
      ) : brands.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>No brands yet</p>
          <p style={{ fontSize: 14, color: '#64748b' }}>Create your first brand to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {brands.map(brand => (
            <div key={brand._id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: 16,
              background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            }}>
              {/* Logo */}
              <div
                onClick={() => {
                  logoInputRef.current?.setAttribute('data-brand-id', brand._id)
                  logoInputRef.current?.click()
                }}
                style={{
                  width: 56, height: 56, borderRadius: 10, background: '#f1f5f9',
                  border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                }}
                title="Click to upload logo"
              >
                {uploadingLogo === brand._id ? (
                  <span style={{ fontSize: 12, color: '#64748b' }}>...</span>
                ) : brand.logo ? (
                  <img src={resolveUrl(brand.logo)} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 22, color: '#94a3b8' }}>🏷️</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{brand.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Order: {brand.sortOrder || 0}
                  {brand.slug ? ` · ${brand.slug}` : ''}
                </div>
              </div>

              {/* Status */}
              <button
                onClick={() => togglePublish(brand)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  background: brand.isPublished ? '#dcfce7' : '#f1f5f9',
                  color: brand.isPublished ? '#166534' : '#64748b',
                }}
              >
                {brand.isPublished ? 'Published' : 'Draft'}
              </button>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openEdit(brand)}
                  style={{
                    padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                    borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#334155',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(brand)}
                  style={{
                    padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#dc2626',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input for logo upload */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const brandId = logoInputRef.current?.getAttribute('data-brand-id')
          if (brandId && e.target.files?.[0]) {
            handleLogoUpload(brandId, e.target.files[0])
          }
          e.target.value = ''
        }}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '95%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px', color: '#1e293b' }}>
              {editingBrand ? 'Edit Brand' : 'Create Brand'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#374151' }}>Brand Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Nike, Samsung"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '2px solid #e5e7eb', fontSize: 14, outline: 'none',
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#374151' }}>Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '2px solid #e5e7eb', fontSize: 14, outline: 'none',
                  }}
                />
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Lower numbers appear first</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontWeight: 500, fontSize: 14 }}>Published (visible on website)</span>
              </label>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: 12, background: '#f1f5f9', color: '#374151',
                    border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2, padding: 12, background: '#2563eb', color: '#fff',
                    border: 'none', borderRadius: 8, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 14, opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : editingBrand ? 'Update Brand' : 'Create Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
