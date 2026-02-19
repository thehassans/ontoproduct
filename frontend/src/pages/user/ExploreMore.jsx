import React, { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, apiUpload, mediaUrl } from '../../api'

export default function ExploreMore() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', link: '', sortOrder: 0 })
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const imgRef = useRef(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const handleImgSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImgPreview(ev.target.result)
    reader.readAsDataURL(file)
  }
  const clearImg = () => { setImgFile(null); setImgPreview(null); if (imgRef.current) imgRef.current.value = '' }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/api/explore-more')
      setItems(res?.items || [])
    } catch { showToast('Failed to load', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast('Name required', 'error')
    try {
      const res = await apiPost('/api/explore-more', { ...form, isPublished: true })
      const newItem = res?.item
      if (imgFile && newItem?._id) {
        const fd = new FormData()
        fd.append('image', imgFile)
        await apiUpload(`/api/explore-more/${newItem._id}/image`, fd)
      }
      showToast('Created')
      setForm({ name: '', link: '', sortOrder: 0 })
      clearImg()
      setShowAdd(false)
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleUpdate = async () => {
    if (!editItem) return
    try {
      await apiPut(`/api/explore-more/${editItem._id}`, form)
      if (imgFile) {
        const fd = new FormData()
        fd.append('image', imgFile)
        await apiUpload(`/api/explore-more/${editItem._id}/image`, fd)
      }
      showToast('Updated')
      setEditItem(null)
      clearImg()
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      await apiDelete(`/api/explore-more/${id}`)
      showToast('Deleted')
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleToggle = async (item) => {
    try {
      await apiPut(`/api/explore-more/${item._id}`, { isPublished: !item.isPublished })
      showToast(item.isPublished ? 'Unpublished' : 'Published')
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

  const ItemRow = ({ item }) => {
    const [uploading, setUploading] = useState(false)
    const ref = useRef(null)
    const handleUpload = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('image', file)
        await apiUpload(`/api/explore-more/${item._id}/image`, fd)
        showToast('Image uploaded')
        await load()
      } catch (err) { showToast(err?.message || 'Upload failed', 'error') }
      finally { setUploading(false); if (ref.current) ref.current.value = '' }
    }

    return (
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {item.image ? (
              <img src={mediaUrl(item.image)} alt={item.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => ref.current?.click()} title="Click to change" />
            ) : (
              <div onClick={() => ref.current?.click()} style={{ width: 64, height: 64, borderRadius: 12, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f9fafb', fontSize: 20, color: '#9ca3af' }}>+</div>
            )}
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</span>
              {item.link && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.link}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <span style={{ ...S.badge, background: item.isPublished ? '#f0fdf4' : '#fef2f2', color: item.isPublished ? '#16a34a' : '#dc2626' }}>
                  {item.isPublished ? 'Published' : 'Unpublished'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            <button style={{ ...S.btn, background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', fontSize: 11 }} onClick={() => ref.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : (item.image ? 'Change Image' : 'Add Image')}
            </button>
            <button style={{ ...S.btn, ...(item.isPublished ? S.btnDanger : S.btnSuccess), fontSize: 11 }} onClick={() => handleToggle(item)}>
              {item.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button style={{ ...S.btn, ...S.btnSec, fontSize: 11 }} onClick={() => { setEditItem(item); setForm({ name: item.name, link: item.link || '', sortOrder: item.sortOrder || 0 }); clearImg() }}>Edit</button>
            <button style={{ ...S.btn, ...S.btnDanger, fontSize: 11 }} onClick={() => handleDelete(item._id)}>Delete</button>
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
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Explore More</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Manage promotional blocks shown on home page</p>
        </div>
        <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => { setShowAdd(true); setEditItem(null); setForm({ name: '', link: '', sortOrder: 0 }); clearImg() }}>
          + Add Block
        </button>
      </div>

      {(showAdd || editItem) && (
        <div style={{ ...S.card, border: '2px solid #f97316' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{editItem ? 'Edit Block' : 'New Block'}</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={S.label}>Image</label>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgSelect} />
              {imgPreview || editItem?.image ? (
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <img src={imgPreview || mediaUrl(editItem?.image)} alt="Preview" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '1.5px solid #e5e7eb', cursor: 'pointer' }} onClick={() => imgRef.current?.click()} />
                  <button type="button" onClick={(e) => { e.stopPropagation(); clearImg() }} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ) : (
                <div onClick={() => imgRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 12, border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f9fafb', gap: 2 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Add Image</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 200, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={S.label}>Offer Name *</label>
                <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Deals, Bundle Savings" />
              </div>
              <div>
                <label style={S.label}>Link (optional)</label>
                <input style={S.input} value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="e.g. /catalog?filter=deals" />
              </div>
              <div>
                <label style={S.label}>Sort Order</label>
                <input style={S.input} type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={editItem ? handleUpdate : handleAdd}>
              {editItem ? 'Save Changes' : 'Create'}
            </button>
            <button style={{ ...S.btn, ...S.btnSec }} onClick={() => { setShowAdd(false); setEditItem(null); clearImg() }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>No blocks yet</p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Add promotional blocks to display on your home page.</p>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => setShowAdd(true)}>+ Add Block</button>
        </div>
      ) : (
        items.map(item => <ItemRow key={item._id} item={item} />)
      )}
    </div>
  )
}
