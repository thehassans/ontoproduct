import React, { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, apiUpload, mediaUrl } from '../../api'

const COUNTRIES = [
  { code: 'UAE', name: 'UAE' }, { code: 'Saudi Arabia', name: 'KSA' },
  { code: 'Oman', name: 'Oman' }, { code: 'Bahrain', name: 'Bahrain' },
  { code: 'India', name: 'India' }, { code: 'Kuwait', name: 'Kuwait' },
  { code: 'Qatar', name: 'Qatar' }, { code: 'Jordan', name: 'Jordan' },
  { code: 'Pakistan', name: 'Pakistan' }, { code: 'USA', name: 'USA' },
  { code: 'UK', name: 'UK' }, { code: 'Canada', name: 'Canada' },
  { code: 'Australia', name: 'Australia' },
]

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [flat, setFlat] = useState([])
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [form, setForm] = useState({ name: '', parent: '', description: '', sortOrder: 0 })
  const [expandedCountry, setExpandedCountry] = useState(null)
  const [selectedCountry, setSelectedCountry] = useState('')

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [catRes, mgrRes] = await Promise.all([
        apiGet('/api/categories'),
        apiGet('/api/users?role=manager&limit=100').catch(() => ({ users: [] })),
      ])
      setCategories(catRes?.categories || [])
      setFlat(catRes?.flat || [])
      setManagers(Array.isArray(mgrRes?.users) ? mgrRes.users : [])
    } catch { showToast('Failed to load categories', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await apiPost('/api/categories/sync-from-products', {})
      showToast(`Synced ${res?.created || 0} categories from products`)
      await load()
    } catch { showToast('Sync failed', 'error') }
    finally { setSyncing(false) }
  }

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast('Name required', 'error')
    try {
      await apiPost('/api/categories', { ...form, isPublished: true })
      showToast('Category created')
      setForm({ name: '', parent: '', description: '', sortOrder: 0 })
      setShowAdd(false)
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleUpdate = async () => {
    if (!editCat) return
    try {
      await apiPut(`/api/categories/${editCat._id}`, form)
      showToast('Updated')
      setEditCat(null)
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return
    try {
      await apiDelete(`/api/categories/${id}`)
      showToast('Deleted')
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleCountryToggle = async (catId, country, action) => {
    try {
      await apiPut(`/api/categories/${catId}/country-toggle`, { country, action })
      showToast(`${action === 'unpublish' ? 'Unpublished' : 'Published'} in ${country}`)
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handlePublishToggle = async (cat) => {
    try {
      await apiPut(`/api/categories/${cat._id}`, { isPublished: !cat.isPublished })
      showToast(cat.isPublished ? 'Unpublished globally' : 'Published globally')
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const handleManagerAccess = async (catId, managerId, action) => {
    try {
      await apiPost(`/api/categories/${catId}/manager-access`, { managerId, action })
      showToast(`Manager ${action}ed`)
      await load()
    } catch (e) { showToast(e?.message || 'Failed', 'error') }
  }

  const S = {
    page: { padding: 24, maxWidth: 1200, margin: '0 auto' },
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 },
    btn: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' },
    btnPrimary: { background: '#f97316', color: '#fff' },
    btnSec: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' },
    btnDanger: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    btnSuccess: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
    input: { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' },
    badge: { display: 'inline-flex', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 },
    grid: { display: 'grid', gap: 12 },
  }

  const CategoryRow = ({ cat, depth = 0 }) => {
    const [showCountries, setShowCountries] = useState(false)
    const [showManagers, setShowManagers] = useState(false)
    const [showAddSub, setShowAddSub] = useState(false)
    const [showCopySub, setShowCopySub] = useState(false)
    const [subName, setSubName] = useState('')
    const [subSaving, setSubSaving] = useState(false)
    const [copySaving, setCopySaving] = useState(false)
    const [imgUploading, setImgUploading] = useState(false)
    const imgInputRef = useRef(null)
    const unpub = cat.unpublishedCountries || []

    // Copy subcategories from another top-level category
    const handleCopySubsFrom = async (srcCat) => {
      const subs = (srcCat.subcategories || []).filter(s => s?.name)
      if (!subs.length) return showToast(`"${srcCat.name}" has no subcategories`, 'error')
      setCopySaving(true)
      try {
        const existingNames = new Set((cat.subcategories || []).map(s => String(s.name).toLowerCase()))
        const toCreate = subs.filter(s => !existingNames.has(String(s.name).toLowerCase()))
        if (!toCreate.length) { showToast('All subcategories already exist here'); setCopySaving(false); return }
        await Promise.all(toCreate.map(s => apiPost('/api/categories', { name: s.name, parent: cat._id, isPublished: true })))
        showToast(`Copied ${toCreate.length} subcategories from "${srcCat.name}"`)
        setShowCopySub(false)
        await load()
      } catch (e) { showToast(e?.message || 'Copy failed', 'error') }
      finally { setCopySaving(false) }
    }

    const handleImageUpload = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setImgUploading(true)
      try {
        const fd = new FormData()
        fd.append('image', file)
        await apiUpload(`/api/categories/${cat._id}/image`, fd)
        showToast('Image uploaded')
        await load()
      } catch (err) { showToast(err?.message || 'Upload failed', 'error') }
      finally { setImgUploading(false); if (imgInputRef.current) imgInputRef.current.value = '' }
    }

    const handleAddSub = async () => {
      if (!subName.trim()) return showToast('Subcategory name required', 'error')
      setSubSaving(true)
      try {
        await apiPost('/api/categories', { name: subName.trim(), parent: cat._id, isPublished: true })
        showToast(`Subcategory "${subName.trim()}" added`)
        setSubName('')
        setShowAddSub(false)
        await load()
      } catch (e) { showToast(e?.message || 'Failed', 'error') }
      finally { setSubSaving(false) }
    }

    return (
      <div style={{ ...S.card, marginLeft: depth * 24, borderLeft: depth ? '3px solid #f97316' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {cat.image ? (
              <img src={mediaUrl(cat.image)} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => imgInputRef.current?.click()} title="Click to change image" />
            ) : null}
            <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</span>
            {cat.parent && <span style={{ ...S.badge, background: '#f3f4f6', color: '#6b7280' }}>Sub</span>}
            <span style={{ ...S.badge, background: cat.isPublished ? '#f0fdf4' : '#fef2f2', color: cat.isPublished ? '#16a34a' : '#dc2626' }}>
              {cat.isPublished ? 'Published' : 'Unpublished'}
            </span>
            {unpub.length > 0 && (
              <span style={{ ...S.badge, background: '#fff7ed', color: '#c2410c' }}>
                Hidden in {unpub.length} {unpub.length === 1 ? 'country' : 'countries'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            <button style={{ ...S.btn, background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', fontSize: 11 }} onClick={() => imgInputRef.current?.click()} disabled={imgUploading}>
              {imgUploading ? 'Uploading...' : (cat.image ? 'Change Img' : 'Add Image')}
            </button>
            {depth === 0 && (
              <>
                <button style={{ ...S.btn, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 11 }} onClick={() => { setShowAddSub(!showAddSub); setShowCopySub(false) }}>
                  {showAddSub ? 'Cancel' : '+ Sub'}
                </button>
                <button style={{ ...S.btn, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11 }} onClick={() => { setShowCopySub(!showCopySub); setShowAddSub(false) }}>
                  {showCopySub ? 'Cancel' : 'Copy Subs'}
                </button>
              </>
            )}
            <button style={{ ...S.btn, ...S.btnSec, fontSize: 11 }} onClick={() => setShowCountries(!showCountries)}>
              {showCountries ? 'Hide' : 'Countries'}
            </button>
            <button style={{ ...S.btn, ...S.btnSec, fontSize: 11 }} onClick={() => setShowManagers(!showManagers)}>
              Managers
            </button>
            <button style={{ ...S.btn, ...(cat.isPublished ? S.btnDanger : S.btnSuccess), fontSize: 11 }} onClick={() => handlePublishToggle(cat)}>
              {cat.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button style={{ ...S.btn, ...S.btnSec, fontSize: 11 }} onClick={() => { setEditCat(cat); setForm({ name: cat.name, parent: cat.parent || '', description: cat.description || '', sortOrder: cat.sortOrder || 0 }) }}>
              Edit
            </button>
            <button style={{ ...S.btn, ...S.btnDanger, fontSize: 11 }} onClick={() => handleDelete(cat._id)}>
              Delete
            </button>
          </div>
        </div>

        {showAddSub && (
          <div style={{ marginTop: 12, padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ ...S.input, flex: 1, minWidth: 180 }} value={subName} onChange={e => setSubName(e.target.value)} placeholder={`New subcategory under ${cat.name}`} onKeyDown={e => e.key === 'Enter' && handleAddSub()} />
            <button style={{ ...S.btn, ...S.btnPrimary, fontSize: 12 }} onClick={handleAddSub} disabled={subSaving}>{subSaving ? 'Adding...' : 'Add Subcategory'}</button>
          </div>
        )}

        {showCopySub && (
          <div style={{ marginTop: 12, padding: 14, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 10 }}>Copy subcategories from another category into "{cat.name}":</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.filter(c => String(c._id) !== String(cat._id) && (c.subcategories || []).length > 0).map(srcCat => (
                <button
                  key={srcCat._id}
                  onClick={() => handleCopySubsFrom(srcCat)}
                  disabled={copySaving}
                  style={{ ...S.btn, background: '#fff', border: '1px solid #d1fae5', fontSize: 12, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontWeight: 700 }}>{srcCat.name}</span>
                  <span style={{ color: '#6b7280', fontWeight: 400 }}>({srcCat.subcategories.length} subs: {srcCat.subcategories.slice(0,3).map(s=>s.name).join(', ')}{srcCat.subcategories.length > 3 ? '…' : ''})</span>
                </button>
              ))}
              {categories.filter(c => String(c._id) !== String(cat._id) && (c.subcategories || []).length > 0).length === 0 && (
                <p style={{ fontSize: 12, color: '#6b7280' }}>No other categories have subcategories yet. Add subcategories to another category first.</p>
              )}
            </div>
          </div>
        )}

        {showCountries && (
          <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#6b7280' }}>Country Visibility</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COUNTRIES.map(c => {
                const isUnpub = unpub.includes(c.code)
                return (
                  <button
                    key={c.code}
                    onClick={() => handleCountryToggle(cat._id, c.code, isUnpub ? 'publish' : 'unpublish')}
                    style={{
                      ...S.btn,
                      fontSize: 11,
                      padding: '4px 10px',
                      background: isUnpub ? '#fef2f2' : '#f0fdf4',
                      color: isUnpub ? '#dc2626' : '#16a34a',
                      border: `1px solid ${isUnpub ? '#fecaca' : '#bbf7d0'}`,
                    }}
                  >
                    {c.name} {isUnpub ? '✕' : '✓'}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {showManagers && (
          <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#6b7280' }}>Manager Access</p>
            {managers.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9ca3af' }}>No managers found</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {managers.map(m => {
                  const has = (cat.managerAccess || []).some(mid => String(mid) === String(m._id))
                  return (
                    <button
                      key={m._id}
                      onClick={() => handleManagerAccess(cat._id, m._id, has ? 'revoke' : 'grant')}
                      style={{
                        ...S.btn, fontSize: 11, padding: '4px 10px',
                        background: has ? '#eff6ff' : '#f3f4f6',
                        color: has ? '#2563eb' : '#6b7280',
                        border: `1px solid ${has ? '#bfdbfe' : '#e5e7eb'}`,
                      }}
                    >
                      {m.firstName} {m.lastName} {has ? '✓' : '+'}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {cat.subcategories?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {cat.subcategories.map(sub => (
              <CategoryRow key={sub._id} cat={sub} depth={depth + 1} />
            ))}
          </div>
        )}
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
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Categories</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Manage categories, subcategories & country visibility</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...S.btn, ...S.btnSec }} onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync from Products'}
          </button>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => { setShowAdd(true); setEditCat(null); setForm({ name: '', parent: '', description: '', sortOrder: 0 }) }}>
            + Add Category
          </button>
        </div>
      </div>

      {(showAdd || editCat) && (
        <div style={{ ...S.card, border: '2px solid #f97316' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{editCat ? 'Edit Category' : 'New Category'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={S.label}>Name *</label>
              <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name" />
            </div>
            <div>
              <label style={S.label}>Parent Category</label>
              <select style={S.input} value={form.parent} onChange={e => setForm({ ...form, parent: e.target.value })}>
                <option value="">None (Top Level)</option>
                {flat.filter(c => !editCat || String(c._id) !== String(editCat._id)).map(c => (
                  <option key={c._id} value={c._id}>{c.parent ? '  ↳ ' : ''}{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Description</label>
              <input style={S.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div>
              <label style={S.label}>Sort Order</label>
              <input style={S.input} type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={editCat ? handleUpdate : handleAdd}>
              {editCat ? 'Save Changes' : 'Create'}
            </button>
            <button style={{ ...S.btn, ...S.btnSec }} onClick={() => { setShowAdd(false); setEditCat(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading categories...</div>
      ) : categories.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>No categories yet</p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Click "Sync from Products" to import existing product categories, or add new ones manually.</p>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={handleSync} disabled={syncing}>Sync from Products</button>
        </div>
      ) : (
        categories.map(cat => <CategoryRow key={cat._id} cat={cat} />)
      )}
    </div>
  )
}
