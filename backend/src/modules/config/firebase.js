// firebase-admin is loaded lazily via dynamic import() so the backend
// does NOT crash when the package is missing or misconfigured.

let firebaseApp = null;
let adminMod = null; // will hold the default export of firebase-admin

async function loadAdmin() {
  if (adminMod) return adminMod;
  try {
    const mod = await import('firebase-admin');
    adminMod = mod.default || mod;
    return adminMod;
  } catch (err) {
    console.warn('[Firebase] firebase-admin not available:', err.message);
    return null;
  }
}

/**
 * Initialize Firebase Admin SDK (async, safe to call at startup).
 */
export async function initFirebase() {
  if (firebaseApp) return firebaseApp;

  const admin = await loadAdmin();
  if (!admin) return null;

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(serviceAccount);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      console.warn('[Firebase] No credentials found. Push notifications disabled.');
      return null;
    }

    firebaseApp = admin.initializeApp({ credential });
    console.log('[Firebase] Admin SDK initialized successfully');
    return firebaseApp;
  } catch (err) {
    console.error('[Firebase] Failed to initialize:', err.message);
    return null;
  }
}

/**
 * Send FCM push notification to one or more device tokens.
 */
export async function sendPushNotification(tokens, notification, data = {}) {
  if (!firebaseApp) {
    await initFirebase();
    if (!firebaseApp) return;
  }

  const admin = await loadAdmin();
  if (!admin) return;

  if (!tokens || tokens.length === 0) return;

  const validTokens = tokens.filter(t => t && typeof t === 'string' && t.length > 10);
  if (validTokens.length === 0) return;

  const stringData = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = String(v ?? '');
  }

  try {
    const message = {
      notification: {
        title: notification.title || 'BuySial',
        body: notification.body || '',
        ...(notification.image ? { image: notification.image } : {}),
      },
      data: stringData,
      webpush: {
        notification: {
          title: notification.title || 'BuySial',
          body: notification.body || '',
          icon: '/BuySial2.png',
          badge: '/BuySial2.png',
          requireInteraction: true,
        },
        fcmOptions: {
          link: notification.link || '/',
        },
      },
    };

    if (validTokens.length === 1) {
      message.token = validTokens[0];
      await admin.messaging().send(message);
    } else {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: validTokens,
        notification: message.notification,
        data: message.data,
        webpush: message.webpush,
      });

      if (response.failureCount > 0) {
        const failed = response.responses
          .map((r, i) => (!r.success ? { token: validTokens[i], error: r.error?.message } : null))
          .filter(Boolean);
        console.warn(`[Firebase] ${response.failureCount}/${validTokens.length} push(es) failed:`, failed.slice(0, 3));
      }
    }
  } catch (err) {
    console.warn('[Firebase] Push notification failed:', err.message);
  }
}

/**
 * Remove invalid/expired FCM tokens from a user document.
 */
export async function cleanupInvalidTokens(userId, invalidTokens) {
  if (!invalidTokens || invalidTokens.length === 0) return;
  try {
    const { default: User } = await import('../models/User.js');
    await User.updateOne(
      { _id: userId },
      { $pull: { fcmTokens: { $in: invalidTokens } } }
    );
  } catch (err) {
    console.warn('[Firebase] Failed to cleanup tokens:', err.message);
  }
}
