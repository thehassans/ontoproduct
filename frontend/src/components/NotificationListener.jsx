import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { API_BASE, apiPost } from '../api.js'
import { playNotificationSound, isSoundEnabled, getSoundVolume } from '../utils/notificationSounds.js'
import { requestFCMToken, onForegroundMessage } from '../firebase.js'

/**
 * NotificationListener - invisible component that:
 * 1. Registers Firebase Cloud Messaging for real push notifications (screen pop-out even when tab is in background)
 * 2. Listens for foreground Firebase messages and plays ringtone + shows in-app toast
 * 3. Falls back to socket.io for real-time in-app notifications
 */
export default function NotificationListener() {
  const socketRef = useRef(null)
  const fcmInitialized = useRef(false)

  // Firebase Cloud Messaging setup
  useEffect(() => {
    if (fcmInitialized.current) return
    fcmInitialized.current = true

    const authToken = localStorage.getItem('token') || ''
    if (!authToken) return

    ;(async () => {
      try {
        // Request permission + get FCM device token
        const fcmToken = await requestFCMToken()
        if (fcmToken) {
          // Register FCM token with our backend so server can send pushes to this device
          try {
            await apiPost('/api/notifications/fcm-token', { token: fcmToken })
            console.log('[FCM] Token registered with backend')
          } catch (err) {
            console.warn('[FCM] Failed to register token:', err)
          }
        }

        // Listen for foreground FCM messages (when tab IS in focus)
        // Background messages are handled by firebase-messaging-sw.js automatically
        onForegroundMessage((payload) => {
          const data = {
            title: payload.notification?.title || payload.data?.title || 'BuySial',
            message: payload.notification?.body || payload.data?.body || '',
            type: payload.data?.type || '',
            _id: payload.data?.notificationId || '',
          }
          handleNotification(data)
        })
      } catch (err) {
        console.warn('[FCM] Setup failed, falling back to socket.io only:', err)
      }
    })()
  }, [])

  // Socket.IO fallback for real-time in-app notifications
  useEffect(() => {
    const token = localStorage.getItem('token') || ''
    if (!token) return

    let socket
    try {
      socket = io(API_BASE || undefined, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        withCredentials: true,
        auth: { token },
      })
      socketRef.current = socket

      socket.on('notification.new', (data) => {
        if (!data) return
        handleNotification(data)
      })
    } catch {}

    return () => {
      try { socket && socket.off('notification.new') } catch {}
      try { socket && socket.disconnect() } catch {}
      socketRef.current = null
    }
  }, [])

  return null // invisible component
}

// Shared handler for both Firebase foreground messages and socket.io events
function handleNotification(data) {
  // Play ringtone sound
  if (isSoundEnabled()) {
    playNotificationSound({ enabled: true, volume: getSoundVolume() })
  }

  // Show in-app toast notification
  try {
    showInAppToast(data)
  } catch {}
}

// Simple in-app toast that doesn't depend on external toast library
function showInAppToast(data) {
  // Create toast container if not exists
  let container = document.getElementById('buysial-toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'buysial-toast-container'
    Object.assign(container.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: '99999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
      maxWidth: '380px',
      width: '100%',
    })
    document.body.appendChild(container)
  }

  const isDelivered = data.type === 'order_delivered_agent'
  const isCancelled = data.type === 'order_cancelled_agent'
  const isNewOrder = data.type === 'order_created'

  let accentColor = '#6366f1' // default indigo
  let icon = '🔔'
  if (isDelivered) { accentColor = '#10b981'; icon = '✅' }
  if (isCancelled) { accentColor = '#ef4444'; icon = '❌' }
  if (isNewOrder) { accentColor = '#f59e0b'; icon = '📦' }

  const toast = document.createElement('div')
  toast.style.pointerEvents = 'auto'
  Object.assign(toast.style, {
    background: 'var(--panel, #1e1e2e)',
    border: `1px solid ${accentColor}40`,
    borderLeft: `4px solid ${accentColor}`,
    borderRadius: '10px',
    padding: '12px 16px',
    boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px ${accentColor}20`,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    color: 'var(--fg, #e2e8f0)',
    animation: 'buysialToastIn 0.3s ease-out',
    cursor: 'pointer',
    maxWidth: '100%',
    backdropFilter: 'blur(16px)',
  })

  toast.innerHTML = `
    <div style="font-size:20px;line-height:1;flex-shrink:0;margin-top:2px">${icon}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:13px;margin-bottom:2px;color:${accentColor}">${data.title || 'Notification'}</div>
      <div style="font-size:12px;opacity:0.85;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${data.message || ''}</div>
    </div>
    <div style="font-size:16px;opacity:0.4;cursor:pointer;flex-shrink:0;padding:0 2px" onclick="this.parentElement.remove()">✕</div>
  `

  // Add animation keyframes if not yet added
  if (!document.getElementById('buysial-toast-style')) {
    const style = document.createElement('style')
    style.id = 'buysial-toast-style'
    style.textContent = `
      @keyframes buysialToastIn {
        from { opacity: 0; transform: translateX(40px) scale(0.95); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes buysialToastOut {
        from { opacity: 1; transform: translateX(0) scale(1); }
        to { opacity: 0; transform: translateX(40px) scale(0.95); }
      }
    `
    document.head.appendChild(style)
  }

  container.appendChild(toast)

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'buysialToastOut 0.25s ease-in forwards'
    setTimeout(() => { try { toast.remove() } catch {} }, 300)
  }, 5000)
}
