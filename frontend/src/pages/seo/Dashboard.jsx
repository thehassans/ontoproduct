import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api'
import { useToast } from '../../ui/Toast'

export default function SEODashboard() {
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Map URL paths to tab IDs
  const getTabFromPath = (pathname) => {
    if (pathname.includes('meta-tags')) return 'meta'
    if (pathname.includes('pixels')) return 'pixels'
    if (pathname.includes('analytics')) return 'analytics'
    if (pathname.includes('countries')) return 'countries'
    if (pathname.includes('products')) return 'products'
    if (pathname.includes('schema')) return 'schema'
    if (pathname.includes('advanced')) return 'advanced'
    return 'overview'
  }
  
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname))
  const [products, setProducts] = useState([])
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [countrySeo, setCountrySeo] = useState({})
  const [productSeo, setProductSeo] = useState({})
  const [seoStats, setSeoStats] = useState({
    totalProducts: 0,
    productsWithSeo: 0,
    countriesConfigured: 0,
    pixelsActive: 0,
  })
  const [seo, setSeo] = useState({
    siteTitle: '',
    siteDescription: '',
    keywords: '',
    ogImage: '',
    twitterCard: 'summary_large_image',
    googleAnalytics: '',
    googleTagManager: '',
    facebookPixel: '',
    tiktokPixel: '',
    snapchatPixel: '',
    pinterestTag: '',
    twitterPixel: '',
    linkedinTag: '',
    hotjarId: '',
    clarityId: '',
    customHeadCode: '',
    customBodyCode: '',
    robotsTxt: '',
    structuredData: true,
    canonicalUrl: '',
    noIndex: false,
    noFollow: false,
    hreflangTags: [],
    schemaType: 'WebSite',
    localBusiness: {},
    breadcrumbs: true,
    sitemapPriority: '1.0',
    sitemapFrequency: 'daily',
  })

  // Sync tab with URL path when location changes
  useEffect(() => {
    const tabFromPath = getTabFromPath(location.pathname)
    if (tabFromPath !== activeTab) {
      setActiveTab(tabFromPath)
    }
  }, [location.pathname])

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    try {
      setLoading(true)
      const [seoRes, productsRes, countriesRes, countrySeoRes] = await Promise.all([
        apiGet('/api/settings/seo'),
        apiGet('/api/products/public?limit=500').catch(() => ({ products: [] })),
        apiGet('/api/settings/countries').catch(() => ({ countries: [] })),
        apiGet('/api/settings/country-seo').catch(() => ({ countrySeo: {} })),
      ])
      
      if (seoRes.seo) {
        setSeo(prev => ({ ...prev, ...seoRes.seo }))
      }
      
      const prods = productsRes.products || []
      setProducts(prods)
      
      let ctrs = countriesRes.countries || [
        'UAE', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 
        'Egypt', 'Jordan', 'Lebanon', 'Iraq', 'India', 'Pakistan',
        'USA', 'UK', 'Canada', 'Australia', 'KSA'
      ]
      ctrs = Array.isArray(ctrs) ? ctrs : Object.keys(ctrs)

      // Filter countries for seo_manager role based on assigned seoCountries
      try {
        const me = JSON.parse(localStorage.getItem('me') || '{}')
        if (me.role === 'seo_manager' && Array.isArray(me.seoCountries) && me.seoCountries.length > 0) {
          ctrs = ctrs.filter(c => me.seoCountries.includes(c))
        }
      } catch {}

      setCountries(ctrs)
      
      if (countrySeoRes.countrySeo) {
        setCountrySeo(countrySeoRes.countrySeo)
      }
      
      // Calculate stats
      const pixelCount = [seoRes.seo?.facebookPixel, seoRes.seo?.tiktokPixel, seoRes.seo?.snapchatPixel, 
        seoRes.seo?.pinterestTag, seoRes.seo?.twitterPixel, seoRes.seo?.linkedinTag,
        seoRes.seo?.googleAnalytics, seoRes.seo?.googleTagManager].filter(Boolean).length
      
      setSeoStats({
        totalProducts: prods.length,
        productsWithSeo: prods.filter(p => p.seoTitle || p.seoDescription).length,
        countriesConfigured: Object.keys(countrySeoRes.countrySeo || {}).length,
        pixelsActive: pixelCount,
      })
    } catch (err) {
      toast.error('Failed to load SEO settings')
    } finally {
      setLoading(false)
    }
  }

  async function loadSEOSettings() {
    try {
      const res = await apiGet('/api/settings/seo')
      if (res.seo) {
        setSeo(prev => ({ ...prev, ...res.seo }))
      }
    } catch (err) {
      toast.error('Failed to load SEO settings')
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      await apiPost('/api/settings/seo', seo)
      toast.success('SEO settings saved successfully')
    } catch (err) {
      toast.error(err?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const tabIcons = {
    overview: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    meta: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>,
    pixels: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>,
    analytics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
    countries: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    products: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    schema: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    advanced: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'meta', label: 'Meta Tags' },
    { id: 'pixels', label: 'Pixels' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'countries', label: 'Country SEO' },
    { id: 'products', label: 'Product SEO' },
    { id: 'schema', label: 'Schema' },
    { id: 'advanced', label: 'Advanced' },
  ]

  async function saveCountrySeo(country, data) {
    try {
      setSaving(true)
      const updated = { ...countrySeo, [country]: data }
      await apiPost('/api/settings/country-seo', { countrySeo: updated })
      setCountrySeo(updated)
      toast.success(`SEO settings saved for ${country}`)
    } catch (err) {
      toast.error('Failed to save country SEO')
    } finally {
      setSaving(false)
    }
  }

  async function saveProductSeo(productId, data) {
    try {
      setSaving(true)
      await apiPost(`/api/products/${productId}/seo`, data)
      toast.success('Product SEO saved successfully')
      // Update local state
      setProducts(prev => prev.map(p => 
        p._id === productId ? { ...p, ...data } : p
      ))
    } catch (err) {
      toast.error('Failed to save product SEO')
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = products.filter(p => 
    !productSearch || 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  )

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    transition: 'border-color 0.2s',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: 8,
    fontWeight: 600,
    color: '#374151',
    fontSize: 14,
  }

  const helpTextStyle = {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  }

  const cardStyle = {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #e2e8f0',
    boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
    marginBottom: 20,
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          Loading SEO Settings...
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Ultra Premium Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #f1f5f9',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 750, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>SEO Center</h1>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 500, letterSpacing: '0.01em' }}>Search engine optimization & tracking</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saving && (
                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'seoPulse 1s ease-in-out infinite' }} />
                  Saving...
                </span>
              )}
              <div style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: seoStats.pixelsActive > 0 ? '#22c55e' : '#e2e8f0', display: 'inline-block' }} />
                {seoStats.pixelsActive} pixel{seoStats.pixelsActive !== 1 ? 's' : ''} active
              </div>
            </div>
          </div>

          {/* Ultra Premium Navigation */}
          <div style={{
            display: 'flex',
            gap: 1,
            paddingBottom: 0,
            overflowX: 'auto',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 16px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: isActive ? '#0f172a' : '#94a3b8',
                    fontWeight: isActive ? 650 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    fontSize: 13,
                    position: 'relative',
                    letterSpacing: '-0.01em',
                    borderBottom: isActive ? '2px solid #0f172a' : '2px solid transparent',
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.5, transition: 'opacity 0.2s', display: 'flex' }}>{tabIcons[tab.id]}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>

        <style>{`
          @keyframes seoPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={{ ...cardStyle, borderRadius: 16, boxShadow: '0 12px 28px rgba(15,23,42,0.06)' }}>
                <div style={{ fontSize: 28, fontWeight: 850, color: '#0f172a' }}>{seoStats.pixelsActive}</div>
                <div style={{ color: '#64748b', marginTop: 2 }}>Active Pixels</div>
              </div>
              <div style={{ ...cardStyle, borderRadius: 16, boxShadow: '0 12px 28px rgba(15,23,42,0.06)' }}>
                <div style={{ fontSize: 28, fontWeight: 850, color: '#0f172a' }}>{seoStats.countriesConfigured}</div>
                <div style={{ color: '#64748b', marginTop: 2 }}>Countries Configured</div>
              </div>
              <div style={{ ...cardStyle, borderRadius: 16, boxShadow: '0 12px 28px rgba(15,23,42,0.06)' }}>
                <div style={{ fontSize: 28, fontWeight: 850, color: '#0f172a' }}>{seoStats.productsWithSeo}/{seoStats.totalProducts}</div>
                <div style={{ color: '#64748b', marginTop: 2 }}>Products with SEO</div>
              </div>
              <div style={{ ...cardStyle, borderRadius: 16, boxShadow: '0 12px 28px rgba(15,23,42,0.06)' }}>
                <div style={{ fontSize: 28, fontWeight: 850, color: '#0f172a' }}>{seo.structuredData ? '✓' : '✗'}</div>
                <div style={{ color: '#64748b', marginTop: 2 }}>Schema Markup</div>
              </div>
            </div>

            {/* Quick Status */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b' }}>SEO Health Check</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { label: 'Site Title', value: seo.siteTitle, status: seo.siteTitle ? 'good' : 'missing' },
                  { label: 'Site Description', value: seo.siteDescription, status: seo.siteDescription ? 'good' : 'missing' },
                  { label: 'Google Analytics', value: seo.googleAnalytics, status: seo.googleAnalytics ? 'good' : 'missing' },
                  { label: 'Facebook Pixel', value: seo.facebookPixel, status: seo.facebookPixel ? 'good' : 'optional' },
                  { label: 'TikTok Pixel', value: seo.tiktokPixel, status: seo.tiktokPixel ? 'good' : 'optional' },
                  { label: 'Schema Markup', value: seo.structuredData, status: seo.structuredData ? 'good' : 'warning' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: 20, 
                      fontSize: 12, 
                      fontWeight: 600,
                      background: item.status === 'good' ? '#dcfce7' : item.status === 'missing' ? '#fee2e2' : '#fef3c7',
                      color: item.status === 'good' ? '#166534' : item.status === 'missing' ? '#991b1b' : '#92400e',
                    }}>
                      {item.status === 'good' ? '✓ Configured' : item.status === 'missing' ? '✗ Missing' : '○ Optional'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ ...cardStyle, marginTop: 20 }}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b' }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Setup Meta Tags', tab: 'meta' },
                  { label: 'Configure Pixels', tab: 'pixels' },
                  { label: 'Country SEO', tab: 'countries' },
                  { label: 'Product SEO', tab: 'products' },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(action.tab)}
                    style={{
                      padding: 16,
                      border: '2px dashed #e2e8f0',
                      borderRadius: 12,
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#374151' }}>{action.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Meta Tags Tab */}
        {activeTab === 'meta' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Basic Meta Tags
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Site Title</label>
                  <input
                    type="text"
                    value={seo.siteTitle}
                    onChange={e => setSeo({ ...seo, siteTitle: e.target.value })}
                    style={inputStyle}
                    placeholder="Your E-commerce Store"
                  />
                  <p style={helpTextStyle}>This appears in browser tabs and search results</p>
                </div>

                <div>
                  <label style={labelStyle}>Site Description</label>
                  <textarea
                    value={seo.siteDescription}
                    onChange={e => setSeo({ ...seo, siteDescription: e.target.value })}
                    style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                    placeholder="A brief description of your store for search engines..."
                  />
                  <p style={helpTextStyle}>Keep it under 160 characters for best SEO results</p>
                </div>

                <div>
                  <label style={labelStyle}>Keywords</label>
                  <input
                    type="text"
                    value={seo.keywords}
                    onChange={e => setSeo({ ...seo, keywords: e.target.value })}
                    style={inputStyle}
                    placeholder="skincare, beauty, cosmetics, online shopping"
                  />
                  <p style={helpTextStyle}>Comma-separated keywords relevant to your store</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Open Graph / Social Media
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>OG Image URL</label>
                  <input
                    type="url"
                    value={seo.ogImage}
                    onChange={e => setSeo({ ...seo, ogImage: e.target.value })}
                    style={inputStyle}
                    placeholder="https://yourdomain.com/og-image.jpg"
                  />
                  <p style={helpTextStyle}>Image shown when your site is shared on social media (recommended: 1200x630px)</p>
                </div>

                <div>
                  <label style={labelStyle}>Twitter Card Type</label>
                  <select
                    value={seo.twitterCard}
                    onChange={e => setSeo({ ...seo, twitterCard: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="summary">Summary</option>
                    <option value="summary_large_image">Summary Large Image</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Pixels Tab */}
        {activeTab === 'pixels' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Social Media Pixels
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={labelStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#1877f2' }}>●</span> Facebook/Meta Pixel ID
                      </span>
                    </label>
                    <input
                      type="text"
                      value={seo.facebookPixel}
                      onChange={e => setSeo({ ...seo, facebookPixel: e.target.value })}
                      style={inputStyle}
                      placeholder="123456789012345"
                    />
                    <p style={helpTextStyle}>Find in Meta Events Manager → Data Sources</p>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#000' }}>●</span> TikTok Pixel ID
                      </span>
                    </label>
                    <input
                      type="text"
                      value={seo.tiktokPixel}
                      onChange={e => setSeo({ ...seo, tiktokPixel: e.target.value })}
                      style={inputStyle}
                      placeholder="CXXXXXXXXXXXXXXXXX"
                    />
                    <p style={helpTextStyle}>Find in TikTok Ads Manager → Events</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={labelStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#fffc00' }}>●</span> Snapchat Pixel ID
                      </span>
                    </label>
                    <input
                      type="text"
                      value={seo.snapchatPixel}
                      onChange={e => setSeo({ ...seo, snapchatPixel: e.target.value })}
                      style={inputStyle}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                    <p style={helpTextStyle}>Find in Snapchat Ads Manager → Events Manager</p>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#e60023' }}>●</span> Pinterest Tag ID
                      </span>
                    </label>
                    <input
                      type="text"
                      value={seo.pinterestTag}
                      onChange={e => setSeo({ ...seo, pinterestTag: e.target.value })}
                      style={inputStyle}
                      placeholder="123456789012"
                    />
                    <p style={helpTextStyle}>Find in Pinterest Ads → Conversions</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={labelStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#1da1f2' }}>●</span> Twitter/X Pixel ID
                      </span>
                    </label>
                    <input
                      type="text"
                      value={seo.twitterPixel}
                      onChange={e => setSeo({ ...seo, twitterPixel: e.target.value })}
                      style={inputStyle}
                      placeholder="tw-xxxxx-xxxxx"
                    />
                    <p style={helpTextStyle}>Find in X Ads → Events Manager</p>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#0a66c2' }}>●</span> LinkedIn Insight Tag ID
                      </span>
                    </label>
                    <input
                      type="text"
                      value={seo.linkedinTag}
                      onChange={e => setSeo({ ...seo, linkedinTag: e.target.value })}
                      style={inputStyle}
                      placeholder="1234567"
                    />
                    <p style={helpTextStyle}>Find in LinkedIn Campaign Manager → Insight Tag</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              ...cardStyle, 
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                Pro Tip
              </h4>
              <p style={{ margin: 0, color: '#78350f', fontSize: 14 }}>
                Make sure to test your pixels using browser extensions like Meta Pixel Helper, TikTok Pixel Helper, 
                or the respective platform's debugging tools before going live.
              </p>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Google Analytics & Tag Manager
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Google Analytics 4 Measurement ID</label>
                  <input
                    type="text"
                    value={seo.googleAnalytics}
                    onChange={e => setSeo({ ...seo, googleAnalytics: e.target.value })}
                    style={inputStyle}
                    placeholder="G-XXXXXXXXXX"
                  />
                  <p style={helpTextStyle}>Find in GA4 Admin → Data Streams → Measurement ID</p>
                </div>

                <div>
                  <label style={labelStyle}>Google Tag Manager Container ID</label>
                  <input
                    type="text"
                    value={seo.googleTagManager}
                    onChange={e => setSeo({ ...seo, googleTagManager: e.target.value })}
                    style={inputStyle}
                    placeholder="GTM-XXXXXXX"
                  />
                  <p style={helpTextStyle}>Use GTM to manage all your tags in one place</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Heatmaps & Session Recording
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Hotjar Site ID</label>
                  <input
                    type="text"
                    value={seo.hotjarId}
                    onChange={e => setSeo({ ...seo, hotjarId: e.target.value })}
                    style={inputStyle}
                    placeholder="1234567"
                  />
                  <p style={helpTextStyle}>Find in Hotjar → Sites & Organizations</p>
                </div>

                <div>
                  <label style={labelStyle}>Microsoft Clarity Project ID</label>
                  <input
                    type="text"
                    value={seo.clarityId}
                    onChange={e => setSeo({ ...seo, clarityId: e.target.value })}
                    style={inputStyle}
                    placeholder="xxxxxxxxxx"
                  />
                  <p style={helpTextStyle}>Find in Clarity → Project Settings</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Country SEO Tab */}
        {activeTab === 'countries' && (
          <div>
            {/* Subfolder URL Structure Guide */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Country Subfolder URL Structure
              </h3>
              <p style={helpTextStyle}>Use subfolders for authority consolidation. Each country gets a separate crawlable URL, sitemap, product URLs, categories, internal linking, structured data, and hreflang setup.</p>
              <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 18px', marginTop: 14, fontFamily: 'monospace', fontSize: 13, color: '#94a3b8', lineHeight: 1.8, overflowX: 'auto' }}>
                {[
                  { code: 'uk', label: 'UK' }, { code: 'ae', label: 'UAE' }, { code: 'sa', label: 'Saudi Arabia' },
                  { code: 'qa', label: 'Qatar' }, { code: 'in', label: 'India' }, { code: 'pk', label: 'Pakistan' },
                  { code: 'bh', label: 'Bahrain' }, { code: 'om', label: 'Oman' }, { code: 'kw', label: 'Kuwait' },
                  { code: 'jo', label: 'Jordan' }, { code: 'us', label: 'USA' }, { code: 'ca', label: 'Canada' }, { code: 'au', label: 'Australia' },
                ].map(c => (
                  <div key={c.code}><span style={{ color: '#38bdf8' }}>buysial.com</span><span style={{ color: '#f97316' }}>/{c.code}/</span> <span style={{ color: '#475569', fontSize: 11 }}>— {c.label}</span></div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {[
                  'Separate crawlable URL', 'Separate sitemap', 'Separate product URLs',
                  'Separate categories', 'Separate internal linking', 'Separate structured data', 'Hreflang setup',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Country-Specific SEO Settings
              </h3>
              <p style={helpTextStyle}>Configure unique SEO settings, meta tags, and tracking pixels for each country.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 24, marginTop: 20 }}>
                {/* Country List */}
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, color: '#374151' }}>Select Country</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {countries.map(country => (
                      <button
                        key={country}
                        onClick={() => setSelectedCountry(country)}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          background: selectedCountry === country ? '#fff7ed' : 'white',
                          color: selectedCountry === country ? '#9a3412' : '#334155',
                          fontWeight: 650,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{country}</span>
                        {countrySeo[country] && <span style={{ fontSize: 12, opacity: 0.7 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country SEO Form */}
                <div>
                  {selectedCountry ? (
                    <div style={{ display: 'grid', gap: 20 }}>
                      <div style={{ padding: 16, background: '#fff7ed', borderRadius: 16, border: '1px solid #fed7aa', color: '#9a3412' }}>
                        <h4 style={{ margin: 0 }}>SEO Settings for {selectedCountry}</h4>
                      </div>
                      
                      <div>
                        <label style={labelStyle}>Country-Specific Title Tag</label>
                        <input
                          type="text"
                          value={countrySeo[selectedCountry]?.title || ''}
                          onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], title: e.target.value } })}
                          style={inputStyle}
                          placeholder={`Best Products in ${selectedCountry} | Your Store`}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Country-Specific Description</label>
                        <textarea
                          value={countrySeo[selectedCountry]?.description || ''}
                          onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], description: e.target.value } })}
                          style={{ ...inputStyle, minHeight: 80 }}
                          placeholder={`Shop the best products with fast delivery to ${selectedCountry}...`}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Country Facebook Pixel</label>
                          <input
                            type="text"
                            value={countrySeo[selectedCountry]?.facebookPixel || ''}
                            onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], facebookPixel: e.target.value } })}
                            style={inputStyle}
                            placeholder="Country-specific pixel ID"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Country TikTok Pixel</label>
                          <input
                            type="text"
                            value={countrySeo[selectedCountry]?.tiktokPixel || ''}
                            onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], tiktokPixel: e.target.value } })}
                            style={inputStyle}
                            placeholder="Country-specific pixel ID"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Country Google Analytics</label>
                          <input
                            type="text"
                            value={countrySeo[selectedCountry]?.googleAnalytics || ''}
                            onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], googleAnalytics: e.target.value } })}
                            style={inputStyle}
                            placeholder="G-XXXXXXXXXX"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Hreflang Code</label>
                          <input
                            type="text"
                            value={countrySeo[selectedCountry]?.hreflang || ''}
                            onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], hreflang: e.target.value } })}
                            style={inputStyle}
                            placeholder="en-AE, ar-SA, etc."
                          />
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>Country Keywords</label>
                        <input
                          type="text"
                          value={countrySeo[selectedCountry]?.keywords || ''}
                          onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], keywords: e.target.value } })}
                          style={inputStyle}
                          placeholder="country-specific, keywords, here"
                        />
                      </div>

                      <button
                        onClick={() => saveCountrySeo(selectedCountry, countrySeo[selectedCountry])}
                        disabled={saving}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          borderRadius: 8,
                          background: '#0f172a',
                          color: 'white',
                          fontWeight: 600,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          width: 'fit-content',
                        }}
                      >
                        {saving ? 'Saving...' : `Save ${selectedCountry} Settings`}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🌍</div>
                      <p>Select a country to configure its SEO settings</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product SEO Tab */}
        {activeTab === 'products' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Product-Level SEO Optimization
              </h3>
              
              {/* Search */}
              <div style={{ marginBottom: 20 }}>
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 400 }}
                  placeholder="Search products by name or SKU..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 24 }}>
                {/* Product List */}
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, maxHeight: 500, overflow: 'auto' }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                    Products ({filteredProducts.length})
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {filteredProducts.slice(0, 50).map(product => (
                      <button
                        key={product._id}
                        onClick={() => {
                          setSelectedProduct(product)
                          setProductSeo({
                            seoTitle: product.seoTitle || product.name || '',
                            seoDescription: product.seoDescription || product.description?.slice(0, 160) || '',
                            seoKeywords: product.seoKeywords || '',
                            metaTitle: product.metaTitle || '',
                            metaDescription: product.metaDescription || '',
                            slug: product.slug || '',
                            canonicalUrl: product.canonicalUrl || '',
                            noIndex: product.noIndex || false,
                          })
                        }}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          background: selectedProduct?._id === product._id ? '#fff7ed' : 'white',
                          color: selectedProduct?._id === product._id ? '#9a3412' : '#334155',
                          fontWeight: 650,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                          SKU: {product.sku || 'N/A'} {product.seoTitle && '• SEO ✓'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product SEO Form */}
                <div>
                  {selectedProduct ? (
                    <div style={{ display: 'grid', gap: 20 }}>
                      <div style={{ padding: 16, background: '#fff7ed', borderRadius: 16, border: '1px solid #fed7aa', color: '#9a3412' }}>
                        <h4 style={{ margin: 0 }}>SEO for: {selectedProduct.name}</h4>
                      </div>

                      <div>
                        <label style={labelStyle}>SEO Title (60-70 chars recommended)</label>
                        <input
                          type="text"
                          value={productSeo.seoTitle}
                          onChange={e => setProductSeo({ ...productSeo, seoTitle: e.target.value })}
                          style={inputStyle}
                          placeholder="Product Name | Category | Brand"
                        />
                        <p style={{ ...helpTextStyle, color: productSeo.seoTitle.length > 70 ? '#dc2626' : '#64748b' }}>
                          {productSeo.seoTitle.length}/70 characters
                        </p>
                      </div>

                      <div>
                        <label style={labelStyle}>SEO Description (150-160 chars recommended)</label>
                        <textarea
                          value={productSeo.seoDescription}
                          onChange={e => setProductSeo({ ...productSeo, seoDescription: e.target.value })}
                          style={{ ...inputStyle, minHeight: 80 }}
                          placeholder="Compelling product description for search engines..."
                        />
                        <p style={{ ...helpTextStyle, color: productSeo.seoDescription.length > 160 ? '#dc2626' : '#64748b' }}>
                          {productSeo.seoDescription.length}/160 characters
                        </p>
                      </div>

                      <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0369a1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          🏷️ Product Page Meta Tags
                        </div>
                        <div style={{ display: 'grid', gap: 16 }}>
                          <div>
                            <label style={labelStyle}>Meta Title (appears in browser tab &amp; search results)</label>
                            <input
                              type="text"
                              value={productSeo.metaTitle}
                              onChange={e => setProductSeo({ ...productSeo, metaTitle: e.target.value })}
                              style={inputStyle}
                              placeholder="Custom page title for this product..."
                            />
                            <p style={{ ...helpTextStyle, color: productSeo.metaTitle.length > 60 ? '#dc2626' : '#64748b' }}>
                              {productSeo.metaTitle.length}/60 characters {productSeo.metaTitle.length === 0 && '(falls back to SEO Title or product name)'}
                            </p>
                          </div>
                          <div>
                            <label style={labelStyle}>Meta Description (appears in search result snippet)</label>
                            <textarea
                              value={productSeo.metaDescription}
                              onChange={e => setProductSeo({ ...productSeo, metaDescription: e.target.value })}
                              style={{ ...inputStyle, minHeight: 70 }}
                              placeholder="Custom meta description for this product page..."
                            />
                            <p style={{ ...helpTextStyle, color: productSeo.metaDescription.length > 160 ? '#dc2626' : '#64748b' }}>
                              {productSeo.metaDescription.length}/160 characters {productSeo.metaDescription.length === 0 && '(falls back to SEO Description or product description)'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>SEO Keywords</label>
                        <input
                          type="text"
                          value={productSeo.seoKeywords}
                          onChange={e => setProductSeo({ ...productSeo, seoKeywords: e.target.value })}
                          style={inputStyle}
                          placeholder="product, keywords, separated, by, commas"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={labelStyle}>URL Slug</label>
                          <input
                            type="text"
                            value={productSeo.slug}
                            onChange={e => setProductSeo({ ...productSeo, slug: e.target.value })}
                            style={inputStyle}
                            placeholder="product-url-slug"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Canonical URL</label>
                          <input
                            type="text"
                            value={productSeo.canonicalUrl}
                            onChange={e => setProductSeo({ ...productSeo, canonicalUrl: e.target.value })}
                            style={inputStyle}
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="checkbox"
                            checked={productSeo.noIndex}
                            onChange={e => setProductSeo({ ...productSeo, noIndex: e.target.checked })}
                            style={{ width: 18, height: 18 }}
                          />
                          No Index (hide from search engines)
                        </label>
                      </div>

                      <button
                        onClick={() => saveProductSeo(selectedProduct._id, productSeo)}
                        disabled={saving}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          borderRadius: 8,
                          background: '#0f172a',
                          color: 'white',
                          fontWeight: 600,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          width: 'fit-content',
                        }}
                      >
                        {saving ? 'Saving...' : 'Save Product SEO'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                      <p>Select a product to optimize its SEO</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schema Tab */}
        {activeTab === 'schema' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Schema Markup (Structured Data)
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Schema Type</label>
                  <select
                    value={seo.schemaType}
                    onChange={e => setSeo({ ...seo, schemaType: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="WebSite">WebSite</option>
                    <option value="Organization">Organization</option>
                    <option value="LocalBusiness">Local Business</option>
                    <option value="Store">Online Store</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Sitemap Priority</label>
                    <select
                      value={seo.sitemapPriority}
                      onChange={e => setSeo({ ...seo, sitemapPriority: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="1.0">1.0 (Highest)</option>
                      <option value="0.8">0.8</option>
                      <option value="0.5">0.5</option>
                      <option value="0.3">0.3 (Lowest)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Sitemap Frequency</label>
                    <select
                      value={seo.sitemapFrequency}
                      onChange={e => setSeo({ ...seo, sitemapFrequency: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="always">Always</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={seo.breadcrumbs}
                      onChange={e => setSeo({ ...seo, breadcrumbs: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    Enable Breadcrumb Schema
                  </label>
                  <p style={helpTextStyle}>Adds breadcrumb navigation schema for better search results</p>
                </div>

                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={seo.structuredData}
                      onChange={e => setSeo({ ...seo, structuredData: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    Enable Product Schema (JSON-LD)
                  </label>
                  <p style={helpTextStyle}>Adds rich product snippets to search results</p>
                </div>

                <div>
                  <label style={labelStyle}>Canonical URL</label>
                  <input
                    type="url"
                    value={seo.canonicalUrl}
                    onChange={e => setSeo({ ...seo, canonicalUrl: e.target.value })}
                    style={inputStyle}
                    placeholder="https://yourdomain.com"
                  />
                  <p style={helpTextStyle}>Main URL for your site (prevents duplicate content issues)</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={seo.noIndex}
                        onChange={e => setSeo({ ...seo, noIndex: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                      />
                      No Index (hide site from search)
                    </label>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={seo.noFollow}
                        onChange={e => setSeo({ ...seo, noFollow: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                      />
                      No Follow (prevent link following)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Custom Code Injection
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Custom Head Code</label>
                  <textarea
                    value={seo.customHeadCode}
                    onChange={e => setSeo({ ...seo, customHeadCode: e.target.value })}
                    style={{ ...inputStyle, minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
                    placeholder="<!-- Add custom scripts, styles, or meta tags here -->"
                  />
                  <p style={helpTextStyle}>Code will be injected in the &lt;head&gt; section</p>
                </div>

                <div>
                  <label style={labelStyle}>Custom Body Code</label>
                  <textarea
                    value={seo.customBodyCode}
                    onChange={e => setSeo({ ...seo, customBodyCode: e.target.value })}
                    style={{ ...inputStyle, minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
                    placeholder="<!-- Add custom scripts here (e.g., chat widgets, noscript tags) -->"
                  />
                  <p style={helpTextStyle}>Code will be injected at the end of &lt;body&gt;</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                Robots & Crawlers
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Custom robots.txt Content</label>
                  <textarea
                    value={seo.robotsTxt}
                    onChange={e => setSeo({ ...seo, robotsTxt: e.target.value })}
                    style={{ ...inputStyle, minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
                    placeholder={`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://yourdomain.com/sitemap.xml`}
                  />
                  <p style={helpTextStyle}>Control how search engines crawl your site</p>
                </div>

                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={seo.structuredData}
                      onChange={e => setSeo({ ...seo, structuredData: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    Enable JSON-LD Structured Data
                  </label>
                  <p style={helpTextStyle}>Adds schema.org structured data for better search results</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ 
          position: 'sticky', 
          bottom: 24, 
          background: 'white', 
          padding: 16, 
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}>
          <button
            onClick={loadSEOSettings}
            style={{
              padding: '12px 24px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: 'white',
              color: '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 32px',
              border: 'none',
              borderRadius: 8,
              background: '#0f172a',
              color: 'white',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save All Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
