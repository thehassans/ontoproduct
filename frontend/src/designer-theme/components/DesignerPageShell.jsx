import React from 'react'
import { useDesigner } from '../DesignerContext.jsx'

/**
 * DesignerPageShell — Ultra-premium page wrapper for every designer section.
 * Provides: themed header, subtitle, action buttons, toast, loading states.
 * All pages should wrap their content with this.
 */
export default function DesignerPageShell({
  title,
  subtitle,
  actions = null,
  children,
  loading = false,
  toast = null,
  onToastDismiss,
}) {
  const { theme } = useDesigner()
  const t = theme

  return (
    <div style={{ padding: t.spacing.pagePadding }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: '10px 20px',
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            borderRadius: t.spacing.cardRadius,
            fontWeight: 600,
            fontSize: t.fontSizes.sm,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.2s ease',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: t.fontSizes['3xl'],
              fontWeight: t.fontWeights.bold,
              color: t.colors.heading,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                color: t.colors.body,
                fontSize: t.fontSizes.md,
                margin: '4px 0 0',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {actions}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: t.colors.muted,
            fontSize: t.fontSizes.base,
          }}
        >
          Loading…
        </div>
      )}

      {/* Content */}
      {!loading && children}
    </div>
  )
}

/* ── Reusable Action Buttons ── */
export function BtnPrimary({ children, onClick, disabled, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontSize: 13,
        background: '#f97316',
        color: '#fff',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
      onMouseOver={(e) => {
        if (!disabled) e.currentTarget.style.background = '#ea580c'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#f97316'
      }}
    >
      {children}
    </button>
  )
}

export function BtnSecondary({ children, onClick, disabled, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontSize: 13,
        background: '#f8fafc',
        color: '#475569',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = '#f1f5f9'
          e.currentTarget.style.borderColor = '#cbd5e1'
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#f8fafc'
        e.currentTarget.style.borderColor = '#e2e8f0'
      }}
    >
      {children}
    </button>
  )
}

/* ── Card Component ── */
export function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── Inline Action Button (tiny pill) ── */
export function ActionPill({ children, onClick, color = 'neutral', disabled }) {
  const map = {
    neutral:  { bg: '#ffffff', text: '#475569', border: '#e2e8f0', hoverBg: '#f8fafc' },
    blue:     { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', hoverBg: '#e0f2fe' },
    orange:   { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', hoverBg: '#ffedd5' },
    green:    { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', hoverBg: '#dcfce7' },
    red:      { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', hoverBg: '#fee2e2' },
    ghost:    { bg: 'transparent', text: '#dc2626', border: 'transparent', hoverBg: 'transparent' },
  }
  const c = map[color] || map.neutral
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        border: `1px solid ${c.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        background: c.bg,
        color: c.text,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
      }}
      onMouseOver={(e) => {
        if (!disabled) e.currentTarget.style.background = c.hoverBg
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = c.bg
      }}
    >
      {children}
    </button>
  )
}

/* ── Badge ── */
export function Badge({ children, color = 'green' }) {
  const map = {
    green:  { bg: '#f0fdf4', text: '#16a34a' },
    red:    { bg: '#fef2f2', text: '#dc2626' },
    orange: { bg: '#fff7ed', text: '#c2410c' },
    gray:   { bg: '#f3f4f6', text: '#6b7280' },
  }
  const c = map[color] || map.green
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.text,
      }}
    >
      {children}
    </span>
  )
}

/* ── Input ── */
export function Input({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 14,
        outline: 'none',
        transition: 'border-color 0.15s ease',
        ...style,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = '#f97316')}
      onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
    />
  )
}

export { DesignerPageShell }
