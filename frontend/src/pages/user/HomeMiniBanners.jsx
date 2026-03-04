import React, { useEffect, useState } from 'react'
import { apiGet, apiPost, apiUpload, mediaUrl } from '../../api'

export default function HomeMiniBanners() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [banners, setBanners] = useState([])
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    title: '',
    active: true,
    link: '',
    country: '',
    bannerDesktop: null,
    bannerMobile: null,
  })

  const COUNTRIES = [
    '','UAE','Saudi Arabia','Oman','Bahrain','India','Kuwait',
    'Qatar','Jordan','Pakistan','USA','UK','Canada','Australia',
  ]

  useEffect(() => {
    loadBanners()
  }, [])

  async function loadBanners() {
    try {
      setLoading(true)
      const res = await apiGet('/api/settings/website/banners?page=home-mini')
      setBanners(Array.isArray(res?.banners) ? res.banners : [])
    } catch {
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.bannerDesktop) {
      setNotice('Please select a banner image')
      return
    }
    try {
      setUploading(true)
      setNotice('')
      const fd = new FormData()
      fd.append('banner', form.bannerDesktop)
      if (form.bannerMobile) fd.append('bannerMobile', form.bannerMobile)
      fd.append('title', form.title || '')
      fd.append('link', form.link || '')
      fd.append('active', form.active ? 'true' : 'false')
      fd.append('page', 'home-mini')
      fd.append('country', form.country || '')

      await apiUpload('/api/settings/website/banners', fd)
      setNotice('Banner uploaded successfully!')
      setForm({ title: '', active: true, link: '', country: '', bannerDesktop: null, bannerMobile: null })
      // Reset file inputs
      const inputs = document.querySelectorAll('input[type="file"]')
      inputs.forEach(i => { i.value = '' })
      loadBanners()
    } catch (err) {
      setNotice(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function toggleBanner(id) {
    try {
      await apiPost(`/api/settings/website/banners/${id}/toggle`)
      loadBanners()
    } catch {}
  }

  async function deleteBanner(id) {
    if (!confirm('Delete this banner?')) return
    try {
      await apiPost(`/api/settings/website/banners/${id}/delete`)
      loadBanners()
    } catch {}
  }

  const s = {
    card: { background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb', marginBottom: 20 },
    label: { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' },
    btn: { padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Home Mini Banners</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Promotional banners shown on the home page before categories. Supports country targeting and custom links.</p>

      {notice && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, background: notice.includes('success') ? '#dcfce7' : '#fef2f2', color: notice.includes('success') ? '#166534' : '#991b1b' }}>
          {notice}
        </div>
      )}

      {/* Upload Form */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Upload New Banner</h3>
        <form onSubmit={handleUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Banner Title</label>
              <input style={s.input} type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Sale 15% Off" />
            </div>
            <div>
              <label style={s.label}>Link URL</label>
              <input style={s.input} type="text" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="/catalog?category=Beauty or https://..." />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Country (leave empty for all)</label>
              <select style={s.input} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c || 'All Countries'}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Active</label>
              <select style={s.input} value={form.active ? 'true' : 'false'} onChange={e => setForm({ ...form, active: e.target.value === 'true' })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Desktop Image *</label>
              <input type="file" accept="image/*" onChange={e => setForm({ ...form, bannerDesktop: e.target.files?.[0] || null })} style={{ fontSize: 13 }} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Recommended: 1200x300px or wider</p>
            </div>
            <div>
              <label style={s.label}>Mobile Image (optional)</label>
              <input type="file" accept="image/*" onChange={e => setForm({ ...form, bannerMobile: e.target.files?.[0] || null })} style={{ fontSize: 13 }} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Recommended: 600x250px</p>
            </div>
          </div>

          <button type="submit" disabled={uploading} style={{ ...s.btn, background: uploading ? '#d1d5db' : '#111827', color: '#fff' }}>
            {uploading ? 'Uploading...' : 'Upload Banner'}
          </button>
        </form>
      </div>

      {/* Existing Banners */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1f2937' }}>
          Existing Banners ({banners.length})
        </h3>

        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading...</p>
        ) : banners.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>No mini banners uploaded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {banners.map(b => (
              <div key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: '#f9fafb', borderRadius: 12, border: '1px solid #f3f4f6' }}>
                <img
                  src={mediaUrl(b.mobileImageUrl || b.imageUrl || '')}
                  alt={b.title || 'Banner'}
                  style={{ width: 120, height: 50, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{b.title || '(Untitled)'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {b.country || 'All countries'} {b.link ? `→ ${b.link}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleBanner(b._id)}
                    style={{ ...s.btn, padding: '6px 14px', fontSize: 12, background: b.active ? '#dcfce7' : '#f3f4f6', color: b.active ? '#166534' : '#6b7280' }}
                  >
                    {b.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteBanner(b._id)}
                    style={{ ...s.btn, padding: '6px 14px', fontSize: 12, background: '#fef2f2', color: '#dc2626' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
