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
      {/* Minimal toast - bottom center */}
      <div style={{ 
        position: 'fixed', 
        bottom: 24, 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 99999, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none'
      }} aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} role="status" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 50,
            background: t.type === 'error' ? '#dc2626' 
                      : t.type === 'success' ? '#16a34a' 
                      : t.type === 'warn' ? '#d97706' 
                      : '#0f172a',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            animation: 'toastSlideUp 0.3s ease',
            pointerEvents: 'auto'
          }}>
            <span style={{ fontSize: 16 }}>
              {t.type === 'error' ? '✕' : t.type === 'success' ? '✓' : t.type === 'warn' ? '!' : 'i'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastCtx.Provider>
  )
}

export function useToast(){ return useContext(ToastCtx) }
