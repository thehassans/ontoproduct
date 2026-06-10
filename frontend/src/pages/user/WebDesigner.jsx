import React, { useRef } from 'react'
import HomeBanners from './HomeBanners'

export default function WebDesigner() {
  const iframeRef = useRef(null)

  function handlePreviewUpdate() {
    if (iframeRef.current) {
      // Force reload the iframe to fetch new banners
      const currentUrl = iframeRef.current.contentWindow.location.href
      iframeRef.current.contentWindow.location.replace(currentUrl)
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'var(--background)' }}>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Web Designer
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
            Banner Manager
          </h1>
        </div>
        <HomeBanners onUpdate={handlePreviewUpdate} />
      </div>
      
      <div style={{ flex: 1, background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px rgba(16,185,129,0.15)' }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Live Preview</div>
          </div>
          <button 
            type="button" 
            onClick={handlePreviewUpdate} 
            style={{ 
              padding: '6px 12px', 
              fontSize: 13, 
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.3)',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              color: '#334155'
            }}
          >
            Refresh Preview
          </button>
        </div>
        <div style={{ flex: 1, padding: 16, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 60px rgba(15,23,42,0.08)', border: '8px solid #0f172a' }}>
            <iframe
              ref={iframeRef}
              src="/"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Storefront Preview"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
