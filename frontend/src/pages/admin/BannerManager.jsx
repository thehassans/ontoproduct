import React, { useState, useEffect } from 'react'
import { apiGet, apiPost, apiUpload, mediaUrl } from '../../api'

export default function BannerManager() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPage, setSelectedPage] = useState('catalog')
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ title: '', desktop: null, mobile: null })

  const pages = [
    { id: 'catalog', label: 'Product Catalog' },
    { id: 'home', label: 'Home Page' },
    { id: 'checkout', label: 'Checkout' },
    { id: 'cart', label: 'Cart' }
  ]

  useEffect(() => {
    loadBanners()
  }, [selectedPage])

  async function loadBanners() {
    setLoading(true)
    try {
      const data = await apiGet(`/api/settings/website/banners?page=${selectedPage}`, { skipCache: true })
      setBanners(data.banners || [])
    } catch (err) {
      showToast('Failed to load banners', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e) {
    e?.preventDefault?.()

    const desktop = form.desktop
    const mobile = form.mobile
    if (!desktop) {
      showToast('Please select a desktop banner image', 'error')
      return
    }

    if (!desktop.type?.startsWith('image/')) {
      showToast('Desktop banner must be an image file', 'error')
      return
    }
    if (mobile && !mobile.type?.startsWith('image/')) {
      showToast('Mobile banner must be an image file', 'error')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('banner', desktop)
      if (mobile) formData.append('bannerMobile', mobile)
      formData.append('title', String(form.title || `Banner ${banners.length + 1}`).trim())
      formData.append('page', selectedPage)
      formData.append('active', 'true')

      const result = await apiUpload('/api/settings/website/banners', formData)
      if (result.banner) {
        await loadBanners()
        showToast('✓ Banner uploaded successfully!')
        setForm({ title: '', desktop: null, mobile: null })
        try {
          const a = document.getElementById('banner-upload-desktop')
          if (a) a.value = ''
        } catch {}
        try {
          const b = document.getElementById('banner-upload-mobile')
          if (b) b.value = ''
        } catch {}
      }
    } catch (err) {
      showToast('Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleToggle(bannerId, currentStatus) {
    try {
      await apiPost(`/api/settings/website/banners/${bannerId}/toggle`, { active: !currentStatus })
      await loadBanners()
      showToast(`✓ Banner ${!currentStatus ? 'activated' : 'deactivated'}`)
    } catch (err) {
      showToast('Toggle failed', 'error')
    }
  }

  async function handleDelete(bannerId) {
    if (!confirm('Delete this banner?')) return
    try {
      await apiPost(`/api/settings/website/banners/${bannerId}/delete`, {})
      await loadBanners()
      showToast('✓ Banner deleted')
    } catch (err) {
      showToast('Delete failed', 'error')
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>🖼️ Banner Manager</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Upload and manage banners for different pages</p>
      </div>

      {/* Page Selector */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Select Page:</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setSelectedPage(page.id)}
              style={{
                padding: '8px 16px',
                background: selectedPage === page.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: selectedPage === page.id ? 'white' : '#374151',
                border: '2px solid',
                borderColor: selectedPage === page.id ? '#667eea' : '#e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Section */}
      <div style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Upload New Banner</h3>
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Title (optional)</label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={`e.g. ${selectedPage === 'home' ? 'Ramadan Offers' : 'Sale Banner'}`}
                style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Desktop banner (required)</label>
              <input
                id="banner-upload-desktop"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => setForm((p) => ({ ...p, desktop: e.target.files?.[0] || null }))}
                style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, background: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Mobile banner (optional)</label>
              <input
                id="banner-upload-mobile"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.files?.[0] || null }))}
                style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, background: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={uploading}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: uploading ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: uploading ? 'not-allowed' : 'pointer',
                border: 'none'
              }}
            >
              {uploading ? '⏳ Uploading...' : '📸 Upload Banner'}
            </button>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Desktop: 1920×600 • Mobile: 1080×500 (recommended)
            </div>
          </div>
        </form>
      </div>

      {/* Banners List */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Current Banners ({banners.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p>Loading banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', background: 'white', border: '2px dashed #e5e7eb', borderRadius: '12px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <p>No banners uploaded yet</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Upload your first banner to get started</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {banners.map((banner, idx) => (
              <div key={banner._id} style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center'
              }}>
                {/* Banner Image */}
                <img
                  src={mediaUrl(banner.imageUrl)}
                  alt={banner.title}
                  style={{
                    width: '200px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                />

                {/* Banner Info */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    {banner.title || `Banner ${idx + 1}`}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>
                    Uploaded: {new Date(banner.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                    {banner.mobileImageUrl ? 'Has mobile banner' : 'Desktop banner only'}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleToggle(banner._id, banner.active)}
                    style={{
                      padding: '8px 16px',
                      background: banner.active ? '#10b981' : '#f3f4f6',
                      color: banner.active ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {banner.active ? '✓ Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDelete(banner._id)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 1000
        }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
