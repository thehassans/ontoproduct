import React from 'react'

const toneMap = {
  orange: { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.22)', fg: '#c2410c' },
  emerald: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.2)', fg: '#047857' },
  sky: { bg: 'rgba(14, 165, 233, 0.12)', border: 'rgba(14, 165, 233, 0.2)', fg: '#0369a1' },
  violet: { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.2)', fg: '#6d28d9' },
  rose: { bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.2)', fg: '#be123c' },
  neutral: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.2)', fg: '#475569' },
}

export function formatMoney(value, currency = 'AED') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'AED').toUpperCase(),
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${String(currency || 'AED').toUpperCase()} ${amount.toLocaleString()}`
  }
}

export function formatDate(value, options) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('en-US', options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

export function PageShell({ eyebrow, title, subtitle, actions, children }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 28,
          padding: '24px clamp(18px, 2.6vw, 30px)',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 45%, rgba(255,247,237,0.98) 100%)',
          border: '1px solid rgba(226, 232, 240, 0.95)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-35% auto auto 62%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, rgba(249,115,22,0) 72%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 'auto auto -45% -8%',
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, rgba(14,165,233,0) 72%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0, display: 'grid', gap: 8 }}>
            {eyebrow ? (
              <span
                style={{
                  width: 'fit-content',
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(15, 23, 42, 0.04)',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#475569',
                }}
              >
                {eyebrow}
              </span>
            ) : null}
            <div style={{ display: 'grid', gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 38px)', lineHeight: 1.05, letterSpacing: '-0.04em', color: '#0f172a' }}>{title}</h1>
              {subtitle ? <p style={{ margin: 0, maxWidth: 860, color: '#64748b', fontSize: 14 }}>{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  )
}

export function MetricGrid({ children, min = 220 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 16 }}>
      {children}
    </div>
  )
}

export function MetricCard({ icon, label, value, hint, tone = 'orange', extra }) {
  const palette = toneMap[tone] || toneMap.orange
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        padding: 18,
        border: '1px solid rgba(226, 232, 240, 0.95)',
        background: 'rgba(255,255,255,0.96)',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 'auto -10% -30% auto',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${palette.bg} 0%, rgba(255,255,255,0) 72%)`,
        }}
      />
      <div style={{ position: 'relative', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 14,
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              color: palette.fg,
            }}
          >
            {icon}
          </div>
          {extra ? <div>{extra}</div> : null}
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.05em', color: '#0f172a' }}>{value}</div>
          {hint ? <div style={{ fontSize: 13, color: '#64748b' }}>{hint}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function Panel({ title, subtitle, action, children, tone = 'neutral' }) {
  const palette = toneMap[tone] || toneMap.neutral
  return (
    <section
      style={{
        borderRadius: 26,
        border: '1px solid rgba(226, 232, 240, 0.95)',
        background: 'rgba(255,255,255,0.97)',
        boxShadow: '0 24px 50px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
      }}
    >
      {(title || action || subtitle) ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 14,
            padding: '18px 20px',
            borderBottom: '1px solid rgba(226, 232, 240, 0.75)',
            background: `linear-gradient(180deg, ${palette.bg} 0%, rgba(255,255,255,0.02) 100%)`,
          }}
        >
          <div style={{ minWidth: 0, display: 'grid', gap: 5 }}>
            {title ? <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{title}</div> : null}
            {subtitle ? <div style={{ color: '#64748b', fontSize: 13 }}>{subtitle}</div> : null}
          </div>
          {action ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{action}</div> : null}
        </div>
      ) : null}
      <div style={{ padding: 20 }}>{children}</div>
    </section>
  )
}

export function StatusBadge({ children, tone = 'neutral' }) {
  const palette = toneMap[tone] || toneMap.neutral
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.fg,
      }}
    >
      {children}
    </span>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: '28px 22px',
        border: '1px dashed rgba(148, 163, 184, 0.35)',
        background: 'linear-gradient(135deg, rgba(248,250,252,0.95) 0%, rgba(255,255,255,0.98) 100%)',
        display: 'grid',
        gap: 10,
        justifyItems: 'start',
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'rgba(15,23,42,0.05)', color: '#475569' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h18" />
          <path d="M7 3h10" />
          <path d="M6 11h12" />
          <path d="M8 15h8" />
          <path d="M10 19h4" />
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{title}</div>
      <div style={{ maxWidth: 540, fontSize: 14, color: '#64748b' }}>{description}</div>
      {action ? <div style={{ marginTop: 4 }}>{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label = 'Loading' }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 280 }}>
      <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid rgba(226,232,240,0.9)',
            borderTopColor: '#f97316',
            animation: 'shop-spin 1s linear infinite',
          }}
        />
        <div style={{ color: '#64748b', fontWeight: 600 }}>{label}</div>
        <style>{`@keyframes shop-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

export function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        borderRadius: 14,
        border: '1px solid rgba(203, 213, 225, 0.9)',
        background: 'rgba(255,255,255,0.98)',
        color: '#0f172a',
        fontSize: 14,
        padding: '12px 14px',
        outline: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        ...(props.style || {}),
      }}
    />
  )
}

export function SelectInput(props) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        borderRadius: 14,
        border: '1px solid rgba(203, 213, 225, 0.9)',
        background: 'rgba(255,255,255,0.98)',
        color: '#0f172a',
        fontSize: 14,
        padding: '12px 14px',
        outline: 'none',
        ...(props.style || {}),
      }}
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        borderRadius: 16,
        border: '1px solid rgba(203, 213, 225, 0.9)',
        background: 'rgba(255,255,255,0.98)',
        color: '#0f172a',
        fontSize: 14,
        padding: '12px 14px',
        outline: 'none',
        resize: 'vertical',
        minHeight: 110,
        ...(props.style || {}),
      }}
    />
  )
}

export function PrimaryButton({ children, tone = 'orange', ...props }) {
  const palette = toneMap[tone] || toneMap.orange
  return (
    <button
      {...props}
      style={{
        border: 'none',
        borderRadius: 14,
        padding: '12px 16px',
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        color: '#fff',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        background: `linear-gradient(135deg, ${palette.fg === '#c2410c' ? '#f97316' : palette.fg}, ${palette.fg === '#c2410c' ? '#ea580c' : palette.fg})`,
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
        ...(props.style || {}),
      }}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        borderRadius: 14,
        padding: '11px 15px',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: '#0f172a',
        border: '1px solid rgba(203, 213, 225, 0.9)',
        background: 'rgba(255,255,255,0.95)',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        ...(props.style || {}),
      }}
    >
      {children}
    </button>
  )
}

export function Label({ children }) {
  return <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{children}</label>
}
