import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let messaging = null

/**
 * Initialize Firebase app and messaging.
 * Returns null if config is missing or browser doesn't support notifications.
 */
export function initFirebaseMessaging() {
  if (messaging) return messaging

  // Check if all required config values are present
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId) {
    console.warn('[Firebase] Missing config. Set VITE_FIREBASE_* env vars.')
    return null
  }

  // Check browser support
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[Firebase] Browser does not support push notifications')
    return null
  }

  try {
    app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
    return messaging
  } catch (err) {
    console.error('[Firebase] Init failed:', err.message)
    return null
  }
}

/**
 * Request notification permission and get FCM token.
 * Registers the service worker and returns the device token.
 * @returns {Promise<string|null>} FCM token or null
 */
export async function requestFCMToken() {
  try {
    const msg = initFirebaseMessaging()
    if (!msg) return null

    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('[Firebase] Notification permission denied')
      return null
    }

    // Register the Firebase messaging service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    })

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready

    // Send Firebase config to the service worker for background message handling
    if (registration.active) {
      registration.active.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig,
      })
    }

    // Get FCM token with VAPID key
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn('[Firebase] Missing VITE_FIREBASE_VAPID_KEY')
      return null
    }

    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      console.log('[Firebase] FCM token obtained')
      return token
    } else {
      console.warn('[Firebase] No FCM token available')
      return null
    }
  } catch (err) {
    console.error('[Firebase] Failed to get token:', err.message)
    return null
  }
}

/**
 * Listen for foreground FCM messages.
 * @param {function} callback - Called with message payload when received
 * @returns {function|null} Unsubscribe function
 */
export function onForegroundMessage(callback) {
  const msg = initFirebaseMessaging()
  if (!msg) return null

  return onMessage(msg, (payload) => {
    console.log('[Firebase] Foreground message:', payload)
    callback(payload)
  })
}
