import React, { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, apiUpload, mediaUrl } from '../../api'

export default function Brands() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editBrand, setEditBrand] = useState(null)
  const [form, setForm] = useState({ name: '', sortOrder: 0 })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const logoInputRef = useRef(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const clearLogo = () => { setLogoFile(null); setLogoPreview(null); if (logoInputRef.current) logoInputRef.current.value = '' }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/api/brands')
      setBrands(res?.brands || [])
    } catch { showToast('Failed to load brands', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast('Name required', 'error')
    try {
      const res = await apiPost('/api/brands', { ...form, isPublished: true })
      const newBrand = res?.brand
      if (logoFile && newBrand?._id) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        await apiUpload(`/api/brands/${newBrand._id}/logo`, fd)
      }
      showToast('Brand created')
      setForm({ name: '', sortOrder: 0 })
      clearLogo()
      setShowAdd(false)
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleUpdate = async () => {
    if (!editBrand) return
    try {
      await apiPut(`/api/brands/${editBrand._id}`, form)
      if (logoFile) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        await apiUpload(`/api/brands/${editBrand._id}/logo`, fd)
      }
      showToast('Updated')
      setEditBrand(null)
      clearLogo()
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand?')) return
    try {
      await apiDelete(`/api/brands/${id}`)
      showToast('Deleted')
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handlePublishToggle = async (brand) => {
    try {
      await apiPut(`/api/brands/${brand._id}`, { isPublished: !brand.isPublished })
      showToast(brand.isPublished ? 'Unpublished' : 'Published')
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const S = {
    page: { padding: 24, maxWidth: 1000, margin: '0 auto' },
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 },
    btn: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' },
    btnPrimary: { background: '#f97316', color: '#fff' },
    btnSec: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' },
    btnDanger: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    btnSuccess: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
    input: { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' },
    badge: { display: 'inline-flex', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 },
  }

  const BrandRow = ({ brand }) => {
    const [imgUploading, setImgUploading] = useState(false)
    const imgRef = useRef(null)

    const handleLogoUpload = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setImgUploading(true)
      try {
        const fd = new FormData()
        fd.append('logo', file)
        await apiUpload(`/api/brands/${brand._id}/logo`, fd)
        showToast('Logo uploaded')
        await load()
      } catch (err) { showToast(err?.message || 'Upload failed', 'error') }
      finally { setImgUploading(false); if (imgRef.current) imgRef.current.value = '' }
    }

    return (
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {brand.logo ? (
              <img
                src={mediaUrl(brand.logo)}
                alt={brand.name}
                style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', padding: 4 }}
                onClick={() => imgRef.current?.click()}
                title="Click to change logo"
              />
            ) : (
              <div
                onClick={() => imgRef.current?.click()}
                style={{ width: 48, height: 48, borderRadius: 10, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f9fafb', fontSize: 18, color: '#9ca3af' }}
                title="Click to add logo"
              >
                +
              </div>
            )}
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{brand.name}</span>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <span style={{ ...S.badge, background: brand.isPublished ? '#f0fdf4' : '#fef2f2', color: brand.isPublished ? '#16a34a' : '#dc2626' }}>
                  {brand.isPublished ? 'Published' : 'Unpublished'}
                </span>
                {brand.sortOrder > 0 && <span style={{ ...S.badge, background: '#f3f4f6', color: '#6b7280' }}>Order: {brand.sortOrder}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            <button style={{ ...S.btn, background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', fontSize: 11 }} onClick={() => imgRef.current?.click()} disabled={imgUploading}>
              {imgUploading ? 'Uploading...' : (brand.logo ? 'Change Logo' : 'Add Logo')}
            </button>
            <button style={{ ...S.btn, ...(brand.isPublished ? S.btnDanger : S.btnSuccess), fontSize: 11 }} onClick={() => handlePublishToggle(brand)}>
              {brand.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button style={{ ...S.btn, ...S.btnSec, fontSize: 11 }} onClick={() => { setEditBrand(brand); setForm({ name: brand.name, sortOrder: brand.sortOrder || 0 }) }}>
              Edit
            </button>
            <button style={{ ...S.btn, ...S.btnDanger, fontSize: 11 }} onClick={() => handleDelete(brand._id)}>
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '10px 20px', background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Brands</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Manage brands with logos for your storefront</p>
        </div>
        <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => { setShowAdd(true); setEditBrand(null); setForm({ name: '', sortOrder: 0 }); clearLogo() }}>
          + Add Brand
        </button>
      </div>

      {(showAdd || editBrand) && (
        <div style={{ ...S.card, border: '2px solid #f97316' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{editBrand ? 'Edit Brand' : 'New Brand'}</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Logo upload area */}
            <div style={{ flex: '0 0 auto' }}>
              <label style={S.label}>Brand Logo</label>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoSelect} />
              {logoPreview || (editBrand?.logo) ? (
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <img
                    src={logoPreview || mediaUrl(editBrand?.logo)}
                    alt="Logo"
                    style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'contain', border: '1.5px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', padding: 4 }}
                    onClick={() => logoInputRef.current?.click()}
                    title="Click to change logo"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearLogo() }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >×</button>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  style={{ width: 80, height: 80, borderRadius: 12, border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f9fafb', gap: 2 }}
                  title="Click to add logo"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Add Logo</span>
                </div>
              )}
            </div>
            {/* Name + Sort fields */}
            <div style={{ flex: 1, minWidth: 200, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={S.label}>Brand Name *</label>
                <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Samsung, Apple, Nike" />
              </div>
              <div>
                <label style={S.label}>Sort Order</label>
                <input style={S.input} type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={editBrand ? handleUpdate : handleAdd}>
              {editBrand ? 'Save Changes' : 'Create'}
            </button>
            <button style={{ ...S.btn, ...S.btnSec }} onClick={() => { setShowAdd(false); setEditBrand(null); clearLogo() }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading brands...</div>
      ) : brands.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>No brands yet</p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Add brands with logos to display on your storefront.</p>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => setShowAdd(true)}>+ Add Brand</button>
        </div>
      ) : (
        brands.map(b => <BrandRow key={b._id} brand={b} />)
      )}
    </div>
  )
}
