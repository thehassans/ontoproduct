import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Ultra Premium Notification Modal Component
export default function NotificationModal({
  isOpen,
  onClose,
  onConfirm,
  type = 'info', // 'info', 'success', 'warning', 'error'
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = true,
  autoClose = 0 // ms, 0 = no auto close
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      if (autoClose > 0) {
        const timer = setTimeout(() => {
          handleClose()
        }, autoClose)
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen, autoClose])
  
  function handleClose() {
    setIsAnimating(false)
    setTimeout(() => onClose?.(), 200)
  }
  
  function handleConfirm() {
    setIsAnimating(false)
    setTimeout(() => {
      onConfirm?.()
      onClose?.()
    }, 200)
  }
  
  if (!isOpen) return null
  
  const icons = {
    info: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
    success: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22,4 12,14.01 9,11.01" />
      </svg>
    ),
    warning: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    error: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    shopify: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    )
  }
  
  const colors = {
    info: { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)', icon: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', icon: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', icon: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', icon: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    shopify: { bg: 'rgba(149, 191, 71, 0.15)', border: 'rgba(149, 191, 71, 0.3)', icon: '#95bf47', gradient: 'linear-gradient(135deg, #95bf47, #5e8e3e)' }
  }
  
  const colorScheme = colors[type] || colors.info
  
  const modalContent = (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 10000,
        opacity: isAnimating ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
        padding: 20
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--ds-panel, #1e293b)',
          border: '1px solid var(--ds-border, rgba(255,255,255,0.1))',
          borderRadius: 24,
          padding: 32,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
          transition: 'transform 0.2s ease-out',
          textAlign: 'center'
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: colorScheme.bg,
            border: `2px solid ${colorScheme.border}`,
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 20px',
            color: colorScheme.icon
          }}
        >
          {icons[type] || icons.info}
        </div>
        
        {/* Title */}
        <h2 style={{
          fontSize: 22,
          fontWeight: 800,
          margin: '0 0 12px',
          color: 'var(--ds-text-primary, #f8fafc)',
          letterSpacing: '-0.02em'
        }}>
          {title}
        </h2>
        
        {/* Message */}
        <p style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--ds-text-secondary, #94a3b8)',
          margin: '0 0 28px'
        }}>
          {message}
        </p>
        
        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {showCancel && (
            <button
              onClick={handleClose}
              style={{
                padding: '14px 28px',
                border: '1px solid var(--ds-border, rgba(255,255,255,0.1))',
                borderRadius: 12,
                background: 'var(--ds-glass, rgba(15,23,42,0.6))',
                color: 'var(--ds-text-primary, #f8fafc)',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              padding: '14px 28px',
              border: 'none',
              borderRadius: 12,
              background: colorScheme.gradient,
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${colorScheme.border}`,
              transition: 'all 0.2s ease',
              minWidth: 100
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
  
  return createPortal(modalContent, document.body)
}

// Toast notification for quick messages
export function Toast({ message, type = 'success', isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => onClose?.(), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  const colors = {
    success: { bg: 'linear-gradient(135deg, #10b981, #059669)', icon: '✓' },
    error: { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: '✕' },
    warning: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '⚠' },
    info: { bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', icon: 'ℹ' }
  }
  
  const scheme = colors[type] || colors.success
  
  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        padding: '16px 24px',
        background: scheme.bg,
        borderRadius: 14,
        color: 'white',
        fontWeight: 600,
        fontSize: 15,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        zIndex: 10001,
        animation: 'slideInUp 0.3s ease-out'
      }}
    >
      <span style={{ fontSize: 20 }}>{scheme.icon}</span>
      {message}
    </div>,
    document.body
  )
}
