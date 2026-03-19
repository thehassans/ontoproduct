import React from 'react'

export const PANEL_SIDEBAR_LINKS = [
  { to: '/partner', label: 'Dashboard' },
  { to: '/partner/orders', label: 'Orders' },
  { to: '/partner/total-amounts', label: 'Total Amounts' },
  { to: '/partner/purchasing', label: 'Purchasing' },
  { to: '/partner/drivers', label: 'Drivers' },
  { to: '/partner/driver-amounts', label: 'Driver Amounts' },
  { to: '/partner/track', label: 'Track' },
]

export const countries = [
  'UAE',
  'Saudi Arabia',
  'Oman',
  'Bahrain',
  'India',
  'Kuwait',
  'Qatar',
  'Pakistan',
  'Jordan',
  'USA',
  'UK',
  'Canada',
  'Australia',
]

export function formatMoney(value, currency = 'SAR') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0))
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`
  }
}

export function formatDate(value) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '-'
  }
}

export function pageWrapStyle() {
  return {
    display: 'grid',
    gap: 18,
  }
}

export function heroStyle() {
  return {
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: 28,
    background: 'linear-gradient(160deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))',
    color: '#f8fafc',
    padding: '28px clamp(18px, 3vw, 34px)',
    boxShadow: '0 24px 70px rgba(15,23,42,0.22)',
  }
}

export function panelStyle() {
  return {
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: 24,
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 18px 48px rgba(15,23,42,0.08)',
    padding: 'clamp(16px, 2.4vw, 24px)',
  }
}

export function statCardStyle(accent = '#0f172a') {
  return {
    border: `1px solid ${accent}22`,
    borderRadius: 22,
    padding: '18px 18px 16px',
    background: `linear-gradient(180deg, ${accent}10, rgba(255,255,255,0.96))`,
    minHeight: 120,
  }
}

export function chipStyle(active = false) {
  return {
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 700,
    border: active ? '1px solid rgba(15,23,42,0.86)' : '1px solid rgba(148,163,184,0.25)',
    background: active ? '#0f172a' : 'rgba(255,255,255,0.9)',
    color: active ? '#fff' : '#0f172a',
    cursor: 'pointer',
  }
}

export function inputStyle() {
  return {
    width: '100%',
    minHeight: 46,
    borderRadius: 16,
    border: '1px solid rgba(148,163,184,0.28)',
    background: 'rgba(248,250,252,0.96)',
    padding: '0 14px',
    fontSize: 14,
    outline: 'none',
  }
}

export function textAreaStyle() {
  return {
    ...inputStyle(),
    minHeight: 110,
    padding: '12px 14px',
    resize: 'vertical',
  }
}

export function primaryButtonStyle() {
  return {
    minHeight: 46,
    borderRadius: 16,
    border: 'none',
    background: 'linear-gradient(135deg, #0f172a, #334155)',
    color: '#fff',
    padding: '0 18px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 16px 32px rgba(15,23,42,0.18)',
  }
}

export function secondaryButtonStyle() {
  return {
    minHeight: 44,
    borderRadius: 14,
    border: '1px solid rgba(148,163,184,0.24)',
    background: '#fff',
    color: '#0f172a',
    padding: '0 14px',
    fontWeight: 700,
    cursor: 'pointer',
  }
}

export function metricGridStyle() {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
  }
}

export function sectionTitle(title, subtitle) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: '#0f172a' }}>{title}</div>
      {subtitle ? <div style={{ color: '#475569', fontSize: 14 }}>{subtitle}</div> : null}
    </div>
  )
}
