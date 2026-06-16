import React, { useState } from 'react';
import { apiPost } from '../../api';
import { useToast } from '../../ui/Toast';

const AVAILABLE_COUNTRIES = [
  { code: 'pk', name: 'Pakistan', flag: '🇵🇰', color: '#118C4F', currency: 'PKR' },
  { code: 'ar', name: 'Saudi Arabia', flag: '🇸🇦', color: '#006C35', currency: 'SAR' },
  { code: 'ae', name: 'UAE', flag: '🇦🇪', color: '#FF0000', currency: 'AED' },
  { code: 'in', name: 'India', flag: '🇮🇳', color: '#FF9933', currency: 'INR' },
  { code: 'uk', name: 'United Kingdom', flag: '🇬🇧', color: '#00247D', currency: 'GBP' },
  { code: 'us', name: 'United States', flag: '🇺🇸', color: '#B22234', currency: 'USD' },
  { code: 'om', name: 'Oman', flag: '🇴🇲', color: '#DB161B', currency: 'OMR' },
  { code: 'bh', name: 'Bahrain', flag: '🇧🇭', color: '#CE1126', currency: 'BHD' },
  { code: 'kw', name: 'Kuwait', flag: '🇰🇼', color: '#007A3D', currency: 'KWD' },
  { code: 'qa', name: 'Qatar', flag: '🇶🇦', color: '#8A1538', currency: 'QAR' },
  { code: 'jo', name: 'Jordan', flag: '🇯🇴', color: '#CE1126', currency: 'JOD' },
  { code: 'au', name: 'Australia', flag: '🇦🇺', color: '#00008B', currency: 'AUD' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', color: '#FF0000', currency: 'CAD' }
];

function PanelCard({ country, protocol, baseDomain }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token') || '';
  const meStr = localStorage.getItem('me') || '{}';
  const meBase64 = btoa(encodeURIComponent(meStr));
  const panelUrl = `${protocol}${country.code}.${baseDomain}/login`;
  const autoLoginUrl = `${panelUrl}?token=${token}&me=${meBase64}`;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Email and password required');
    setLoading(true);
    try {
      await apiPost('/api/users/panel-login', { country: country.name, email, password });
      toast.success(`${country.name} panel credentials set successfully!`);
      setEmail('');
      setPassword('');
    } catch (err) {
      toast.error(err?.message || 'Failed to set credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32 }}>{country.flag}</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#222' }}>{country.name}</h3>
            <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: country.color }}></span>
              {country.currency} Region
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: 8, fontSize: 13, color: '#555', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {panelUrl}
      </div>

      <div style={{ borderTop: '1px solid #eee', paddingTop: 16, marginTop: 'auto' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 13, color: '#444', fontWeight: 600 }}>Set Panel Login Credentials</h4>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input 
            type="email" 
            placeholder="Admin Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
          />
          <input 
            type="text" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              background: '#f1f3f5', color: '#333', border: 'none', padding: '8px', 
              borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : 'Save Credentials'}
          </button>
        </form>
      </div>

      <a 
        href={autoLoginUrl} 
        target="_blank" 
        rel="noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: country.color,
          color: '#fff',
          textDecoration: 'none',
          padding: '12px',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          marginTop: 8,
          opacity: 0.95,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.95'}
      >
        Auto Open & Login
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}

export default function CountryPanels() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('me') || 'null');
  } catch (e) {}
  
  if (user?.role !== 'admin' && user?.role !== 'user') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: '#ff3333' }}>Access Denied</h2>
        <p>You do not have permission to view country panels.</p>
      </div>
    );
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const baseDomain = isLocalhost ? 'localhost:5173' : 'buysial.com';
  const protocol = isLocalhost ? 'http://' : 'https://';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '30px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 30 }}>
        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #1A2980 0%, #26D0CE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px' }}>Country Panel Logins</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#666' }}>Set up panel accounts and directly access regional domains.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {AVAILABLE_COUNTRIES.map(country => (
          <PanelCard key={country.code} country={country} protocol={protocol} baseDomain={baseDomain} />
        ))}
      </div>
    </div>
  );
}
