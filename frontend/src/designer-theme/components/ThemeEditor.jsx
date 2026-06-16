import React, { useState } from 'react'
import { useDesigner } from '../DesignerContext.jsx'

export default function ThemeEditor() {
  const { theme } = useDesigner()
  const [open, setOpen] = useState(false)

  const handleColorChange = (key, value) => {
    const root = document.documentElement
    root.style.setProperty(`--designer-${key}`, value)
  }

  const swatches = [
    { key: 'sidebarBg', label: 'Sidebar BG', default: theme.colors.sidebarBg },
    { key: 'sidebarText', label: 'Nav Text', default: theme.colors.sidebarText },
    { key: 'sidebarTextActive', label: 'Active Text', default: theme.colors.sidebarTextActive },
    { key: 'mainBg', label: 'Main BG', default: theme.colors.mainBg },
    { key: 'heading', label: 'Heading', default: theme.colors.heading },
    { key: 'primaryBg', label: 'Primary', default: theme.colors.primaryBg },
  ]

  return (
    <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v10m11-7h-6m-6 0H1m20.5-4.5L16 12m-8 0L2.5 7.5M20.5 16.5L16 12m-8 0L2.5 16.5"/>
          </svg>
          Theme
        </span>
        <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
          {swatches.map(({ key, label, default: def }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="color"
                  defaultValue={def}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{ width: 24, height: 24, padding: 0, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, background: 'transparent', cursor: 'pointer' }}
                />
              </div>
            </label>
          ))}
          <button
            onClick={() => {
              const root = document.documentElement
              swatches.forEach(({ key, default: def }) => root.style.setProperty(`--designer-${key}`, def))
            }}
            style={{
              marginTop: 4,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            Reset Defaults
          </button>
        </div>
      )}
    </div>
  )
}
