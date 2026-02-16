import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ToastCtx = createContext({
  push: (_type, _message, _opts) => {},
  success: (_m, _o) => {},
  error: (_m, _o) => {},
  info: (_m, _o) => {},
  warn: (_m, _o) => {},
})

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  function remove(id){
    setToasts((prev) => prev.filter(t => t.id !== id))
    try{ const tm = timersRef.current.get(id); if (tm){ clearTimeout(tm); timersRef.current.delete(id) } }catch{}
  }

  function push(type, message, opts={}){
    if (!message) return
    const id = `${Date.now()}:${Math.random().toString(36).slice(2,7)}`
    const toast = {
      id,
      type: (type || 'info'),
      message: String(message),
      duration: (typeof opts.duration === 'number' ? opts.duration : (type==='error' ? 3000 : 2000))
    }
    setToasts(prev => [...prev.slice(-2), toast]) // Keep only last 3 toasts
    const tm = setTimeout(()=> remove(id), toast.duration)
    timersRef.current.set(id, tm)
  }

  const api = useMemo(()=>({
    push,
    success: (m,o)=> push('success', m, o),
    error:   (m,o)=> push('error',   m, o),
    info:    (m,o)=> push('info',    m, o),
    warn:    (m,o)=> push('warn',    m, o),
  }),[])

  useEffect(()=>{
    try{ window.__toast = { error: (m,o)=>api.error(m,o), success:(m,o)=>api.success(m,o), info:(m,o)=>api.info(m,o), warn:(m,o)=>api.warn(m,o) } }catch{}
    return ()=>{ try{ delete window.__toast }catch{} }
  }, [api])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Ultra-premium minimalist toast */}
      <div style={{ 
        position: 'fixed', 
        bottom: 90, 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 99999, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
        width: '92%',
        maxWidth: 380
      }} aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} role="status" onClick={() => remove(t.id)} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 20px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.85)',
            WebkitBackdropFilter: 'blur(20px)',
            backdropFilter: 'blur(20px)',
            color: '#1e293b',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid rgba(255,255,255,0.6)',
            animation: 'toastSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            width: '100%'
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
              background: t.type === 'error' ? '#fef2f2' : t.type === 'success' ? '#f0fdf4' : t.type === 'warn' ? '#fffbeb' : '#f0f9ff',
              color: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#16a34a' : t.type === 'warn' ? '#d97706' : '#0284c7'
            }}>
              {t.type === 'error' ? '✕' : t.type === 'success' ? '✓' : t.type === 'warn' ? '!' : 'i'}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastCtx.Provider>
  )
}

export function useToast(){ return useContext(ToastCtx) }
