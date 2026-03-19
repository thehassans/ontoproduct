import mongoose from 'mongoose';
// NOTE: Avoid top-level import of 'mongodb-memory-server'.
// We'll dynamically import it inside connectDB to prevent startup crashes
// when the package initialization blocks (e.g., downloading binaries).

function maskUri(uri=''){
  try{
    if (!uri) return ''
    // hide credentials between '//' and '@'
    return uri.replace(/\/\/(.*?):(.*?)@/, '//***:***@')
  }catch{ return uri }
}

const RETRY_DELAYS_MS = [5000, 10000, 20000, 30000]

let listenersRegistered = false
let connectInFlight = null
let reconnectTimer = null
let lastErrorMessage = ''
let lastAttemptAt = null
let lastConnectedAt = null
let attemptCount = 0

function scheduleReconnect(delayMs = 5000) {
  if (reconnectTimer) return
  if (!process.env.MONGO_URI) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (mongoose.connection.readyState === 1 || connectInFlight) return
    connectDB().catch(() => {})
  }, Math.max(1000, Number(delayMs) || 5000))
}

function registerListeners() {
  if (listenersRegistered) return
  listenersRegistered = true
  mongoose.set('strictQuery', true)
  mongoose.connection.on('connected', ()=> {
    lastErrorMessage = ''
    lastConnectedAt = new Date().toISOString()
    console.log('[mongo] connected', { db: mongoose.connection.name })
  })
  mongoose.connection.on('disconnected', ()=> {
    console.warn('[mongo] disconnected')
    scheduleReconnect(5000)
  })
  mongoose.connection.on('reconnected', ()=> {
    lastErrorMessage = ''
    lastConnectedAt = new Date().toISOString()
    console.log('[mongo] reconnected')
  })
  mongoose.connection.on('error', (err)=> {
    lastErrorMessage = err?.message || String(err || 'Unknown mongo error')
    console.error('[mongo] error:', err?.message || err)
  })
}

function getMongoOptions() {
  const dbName = process.env.DB_NAME || undefined
  const familyRaw = String(process.env.MONGO_FAMILY || '').trim()
  const family = familyRaw === '4' || familyRaw === '6' ? Number(familyRaw) : undefined
  const opts = {
    dbName,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
  }
  if (family) opts.family = family
  return opts
}

export function getDbConnectionMeta() {
  const dbState = mongoose.connection?.readyState ?? 0
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }
  return {
    state: dbState,
    label: stateMap[dbState] || String(dbState),
    ready: dbState === 1,
    lastError: lastErrorMessage || null,
    lastAttemptAt,
    lastConnectedAt,
    attempts: attemptCount,
  }
}

async function connectWithRetry(uri) {
  while (mongoose.connection.readyState !== 1) {
    attemptCount += 1
    lastAttemptAt = new Date().toISOString()
    const opts = getMongoOptions()
    console.log('[mongo] connecting...', {
      uri: maskUri(uri),
      dbName: opts.dbName || '(from URI)',
      family: opts.family || 'auto',
      attempt: attemptCount,
    })
    try {
      await mongoose.connect(uri, opts)
      const con = mongoose.connection
      const host = con.host || (con.client && con.client.s.options && con.client.s.options.srvHost) || 'unknown-host'
      lastErrorMessage = ''
      lastConnectedAt = new Date().toISOString()
      console.log('MongoDB connected:', { host, db: con.name })
      return
    } catch (err) {
      lastErrorMessage = err?.message || String(err || 'Unknown mongo connection error')
      console.error('[mongo] failed to connect:', err?.message || err)
      console.error('[mongo] Hints: ensure MONGO_URI is correct, server IP is whitelisted in Atlas, and network allows egress to MongoDB.')
      const retryDelay = RETRY_DELAYS_MS[Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1)]
      console.warn(`[mongo] retrying connection in ${Math.round(retryDelay / 1000)}s`)
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }
}

export async function connectDB() {
  registerListeners()
  if (mongoose.connection.readyState === 1) return
  if (connectInFlight) return connectInFlight

  const preferMemory = process.env.USE_MEMORY_DB === 'true';
  const haveUri = !!process.env.MONGO_URI;
  let useMemory = preferMemory || !haveUri;
  connectInFlight = (async () => {
    if (useMemory) {
      console.warn('[mongo] Using in-memory MongoDB (USE_MEMORY_DB=true or MONGO_URI missing). Data will NOT persist.')
      try{
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        lastAttemptAt = new Date().toISOString()
        attemptCount += 1
        await mongoose.connect(memUri);
        lastErrorMessage = ''
        lastConnectedAt = new Date().toISOString()
        console.log('MongoDB connected (in-memory)');
        return
      }catch(err){
        lastErrorMessage = err?.message || String(err || 'Unknown in-memory mongo error')
        console.error('[mongo] In-memory MongoDB failed to start:', err?.message || err)
        if (haveUri){
          console.warn('[mongo] Falling back to MONGO_URI connection since in-memory DB failed.')
          useMemory = false;
        } else {
          throw err;
        }
      }
    }

    const uri = process.env.MONGO_URI;
    await connectWithRetry(uri)
  })()

  try {
    await connectInFlight
  } finally {
    connectInFlight = null
  }
}
