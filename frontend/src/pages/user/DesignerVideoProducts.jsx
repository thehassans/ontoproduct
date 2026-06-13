import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../api';

export default function DesignerVideoProducts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // Fetch all products (limit 500 to catch most, or you could add search)
        const prodRes = await apiGet('/api/products?limit=500');
        const allProds = prodRes?.products || [];
        
        // Filter products that have a video
        const withVideo = allProds.filter(p => !!p.video);
        
        // Fetch saved settings
        const setRes = await apiGet('/api/settings/website/content?page=home_video_products');
        const elements = Array.isArray(setRes?.content?.elements) ? setRes.content.elements : [];
        const savedEl = elements.find(e => e.id === 'video_product_list');
        
        let savedList = [];
        if (savedEl && savedEl.text) {
          try {
            savedList = JSON.parse(savedEl.text);
          } catch (e) { console.error("Parse error", e); }
        }

        if (alive) {
          // Identify which are selected
          const selectedIds = new Set(savedList.map(s => s.productId));
          const available = withVideo.filter(p => !selectedIds.has(p._id)).map(p => ({
            productId: p._id,
            name: p.name,
            videoUrl: p.video,
            imagePath: p.imagePath || (p.images && p.images[0]) || ''
          }));
          
          setAvailableProducts(available);
          setSelectedProducts(savedList);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleAdd = (prod) => {
    setAvailableProducts(prev => prev.filter(p => p.productId !== prod.productId));
    setSelectedProducts(prev => [...prev, prod]);
  };

  const handleRemove = (prod) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== prod.productId));
    setAvailableProducts(prev => [prod, ...prev]);
  };

  const save = async () => {
    setNotice('');
    setSaving(true);
    try {
      const elements = [
        { 
          id: 'video_product_list', 
          type: 'text', 
          text: JSON.stringify(selectedProducts) 
        }
      ];
      await apiPost('/api/settings/website/content', { page: 'home_video_products', elements });
      
      // Update local storage so WebDesignerLayout forces iframe reload
      localStorage.setItem('__designer_home_video_products_updated', Date.now().toString());
      setNotice('Saved successfully');
    } catch (err) {
      console.error(err);
      setNotice(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="section">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Video Products</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Select which products with videos should appear as floating "Video Toasters" on the home page. 
          If you select more than one, a random one will be chosen each time the page loads.
        </p>
      </div>

      <div className="card" style={{ padding: 20, maxWidth: 900 }}>
        {loading ? (
          <div style={{ padding: 24, color: 'var(--muted)' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gap: 24 }}>
            {notice && (
              <div style={{ fontSize: 13, color: notice.includes('Saved') ? '#10b981' : '#ef4444' }}>
                {notice}
              </div>
            )}

            {/* Selected Products */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Selected for Home Page ({selectedProducts.length})</h3>
              {selectedProducts.length === 0 ? (
                <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                  No video products selected.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {selectedProducts.map(p => (
                    <div key={p.productId} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ aspectRatio: '9/16', background: '#000', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                        <video src={p.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop playsInline />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <button 
                        onClick={() => handleRemove(p)}
                        style={{ padding: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0' }} />

            {/* Available Products */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Available Products with Videos ({availableProducts.length})</h3>
              {availableProducts.length === 0 ? (
                <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                  No more products with videos available.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {availableProducts.map(p => (
                    <div key={p.productId} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ aspectRatio: '9/16', background: '#000', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                        <video src={p.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop playsInline />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <button 
                        onClick={() => handleAdd(p)}
                        style={{ padding: '6px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        Add to Home Page
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
              <button className="btn primary" disabled={saving} onClick={save}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
