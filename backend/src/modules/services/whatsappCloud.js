import crypto from 'crypto'
import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import ffmpegPath from 'ffmpeg-static'
import ChatMeta from '../models/ChatMeta.js'
import RoundRobin from '../models/RoundRobin.js'
import User from '../models/User.js'
import Setting from '../models/Setting.js'
import WaMessage from '../models/WaMessage.js'
import { getIO } from '../config/socket.js'

const GRAPH_VERSION = String(process.env.WA_GRAPH_VERSION || 'v20.0')
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

function getConfig() {
  return {
    accessToken: String(process.env.WA_CLOUD_ACCESS_TOKEN || '').trim(),
    phoneNumberId: String(process.env.WA_CLOUD_PHONE_NUMBER_ID || '').trim(),
    verifyToken: String(process.env.WA_CLOUD_VERIFY_TOKEN || '').trim(),
    appSecret: String(process.env.WA_CLOUD_APP_SECRET || '').trim(),
    wabaId: String(process.env.WA_CLOUD_WABA_ID || '').trim(),
  }
}

function rethrowAsSendError(err) {
  const st = Number(err?.status || 0)
  const msg = String(err?.message || 'failed')
  // Map Graph errors into the existing backend contract used by routes/wa.js
  if (st === 429 || st === 500 || st === 502 || st === 503 || st === 504) {
    throw new Error(`send-transient:${msg}`)
  }
  if (st >= 400 && st < 500) {
    throw new Error(`send-failed:${msg}`)
  }
  throw err
}

function isConfigured() {
  const c = getConfig()
  return Boolean(c.accessToken && c.phoneNumberId)
}

function mask(s, keep = 4) {
  const v = String(s || '')
  if (!v) return ''
  if (v.length <= keep) return v
  return `${'*'.repeat(Math.max(0, v.length - keep))}${v.slice(-keep)}`
}

function normalizeJid(input) {
  if (!input) return null
  const s = String(input).trim()
  if (/@(s\.whatsapp\.net|g\.us|broadcast|newsletter)$/i.test(s)) {
    if (s.endsWith('@s.whatsapp.net')) {
      const digits = s.replace(/[^0-9]/g, '')
      return digits ? `${digits}@s.whatsapp.net` : null
    }
    return s
  }
  const digits = s.replace(/[^0-9]/g, '')
  if (!digits) return null
  return `${digits}@s.whatsapp.net`
}

function jidToPhone(jid) {
  try {
    const njid = normalizeJid(jid)
    if (!njid) return null
    if (!njid.endsWith('@s.whatsapp.net')) return null
    return njid.replace(/@.*/, '')
  } catch {
    return null
  }
}

async function graphFetch(urlPath, { method = 'GET', headers = {}, body = null } = {}) {
  const c = getConfig()
  if (!c.accessToken) throw new Error('wa-not-connected')
  const url = urlPath.startsWith('http') ? urlPath : `${GRAPH_BASE}${urlPath}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${c.accessToken}`,
      ...headers,
    },
    body,
  })

  const contentType = res.headers.get('content-type') || ''
  let payload = null
  try {
    if (/application\/json/i.test(contentType)) payload = await res.json()
    else payload = await res.text()
  } catch {
    payload = null
  }

  if (!res.ok) {
    const msg =
      payload && typeof payload === 'object'
        ? payload?.error?.message || JSON.stringify(payload)
        : String(payload || res.statusText)
    const err = new Error(`wa-cloud-http-${res.status}:${msg}`)
    err.status = res.status
    err.payload = payload
    throw err
  }
  return payload
}

async function uploadMediaFromPath(filePath, mimetype, fileName) {
  const c = getConfig()
  if (!c.phoneNumberId) throw new Error('wa-not-connected')

  const buf = fs.readFileSync(filePath)
  const mt = mimetype || mime.lookup(fileName || filePath) || 'application/octet-stream'

  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('type', String(mt))
  form.append('file', new Blob([buf], { type: String(mt) }), fileName || path.basename(filePath))

  let r
  try {
    r = await graphFetch(`/${encodeURIComponent(c.phoneNumberId)}/media`, {
      method: 'POST',
      body: form,
    })
  } catch (err) {
    rethrowAsSendError(err)
  }

  const id = r?.id
  if (!id) throw new Error('wa-cloud-upload-failed')
  return { id, mimeType: String(mt) }
}

function previewFromMessage(msg) {
  try {
    if (!msg) return ''
    if (msg.conversation) return String(msg.conversation).slice(0, 80)
    if (msg.extendedTextMessage?.text) return String(msg.extendedTextMessage.text).slice(0, 80)
    if (msg.imageMessage) return '[image]'
    if (msg.videoMessage) return '[video]'
    if (msg.audioMessage) return '[voice]'
    if (msg.documentMessage) return '[file]'
    if (msg.locationMessage) return '[location]'
  } catch {}
  return ''
}

async function upsertChatMetaOnInbound({ jid, pushName, messageTimestamp }) {
  try {
    const tsMs = Number(messageTimestamp || 0) * 1000 || Date.now()
    const inc = { $inc: { unreadCount: 1 } }
    const set = {
      $set: {
        jid,
        lastMessageAt: new Date(tsMs),
        // If the user previously hid the chat, new inbound messages should make it visible again.
        hiddenForUser: false,
        deletedAt: null,
        deletedBy: null,
      },
      $setOnInsert: {
        name: pushName || '',
      },
    }
    // merge inc + set
    const update = { ...set, ...inc }
    await ChatMeta.updateOne({ jid }, update, { upsert: true })

    // Auto-assign if needed
    let enabled = true
    try {
      const s = await Setting.findOne({ key: 'wa_auto_assign' })
      if (s && typeof s.value === 'boolean') enabled = s.value
    } catch {}

    if (!enabled) return

    const meta = await ChatMeta.findOne({ jid }).lean()
    if (meta?.assignedTo) return

    const agents = await User.find({ role: 'agent' }).sort({ createdAt: 1 }).lean()
    if (!agents.length) return

    const rr = await RoundRobin.findOneAndUpdate(
      { key: 'wa_inbound' },
      { $setOnInsert: { lastIndex: -1 } },
      { upsert: true, new: true }
    )
    const nextIndex = ((rr?.lastIndex ?? -1) + 1) % agents.length
    const agent = agents[nextIndex]
    await RoundRobin.updateOne({ key: 'wa_inbound' }, { $set: { lastIndex: nextIndex } })

    await ChatMeta.updateOne(
      { jid },
      {
        $set: {
          assignedTo: agent?._id,
          assignedBy: null,
          assignedAt: new Date(),
        },
      }
    )
  } catch {
    // best-effort
  }
}

function toClientMessage(doc) {
  return {
    key: { id: doc?.key?.id, fromMe: !!doc?.key?.fromMe },
    fromMe: !!doc?.fromMe,
    message: doc?.message,
    quoted: doc?.quoted || null,
    reactions: Array.isArray(doc?.reactions) ? doc.reactions : [],
    pushName: doc?.pushName,
    messageTimestamp: doc?.messageTimestamp,
    status: doc?.status || (doc?.fromMe ? 'sent' : undefined),
  }
}

async function resolveQuoted(jid, quotedId) {
  try {
    if (!jid || !quotedId) return null
    const doc = await WaMessage.findOne({ jid: String(jid), 'key.id': String(quotedId) }).lean()
    if (!doc) return { id: String(quotedId), preview: null, author: null }
    const preview = previewFromMessage(doc?.message) || null
    const author = doc?.fromMe ? 'You' : (doc?.pushName || String(jid || '').replace(/@.*/, ''))
    return { id: String(quotedId), preview, author }
  } catch {
    return { id: String(quotedId), preview: null, author: null }
  }
}

async function upsertReaction({ jid, id, emoji, fromMe, by }) {
  try {
    if (!jid || !id) return
    const target = await WaMessage.findOne({ jid: String(jid), 'key.id': String(id) }).lean()
    if (!target) return
    const list = Array.isArray(target?.reactions) ? [...target.reactions] : []
    const who = by || null
    const keyIdx = list.findIndex((r) => !!r && String(r.by || '') === String(who || '') && !!r.fromMe === !!fromMe)
    if (emoji) {
      const item = { emoji: String(emoji), fromMe: !!fromMe, by: who }
      if (keyIdx >= 0) list[keyIdx] = item
      else list.push(item)
    } else {
      if (keyIdx >= 0) list.splice(keyIdx, 1)
    }
    await WaMessage.updateOne(
      { jid: String(jid), 'key.id': String(id) },
      { $set: { reactions: list } }
    )
  } catch {
    // best-effort
  }
}

async function saveAndEmitMessage({ jid, msgDoc }) {
  try {
    const io = getIO()
    if (io) io.emit('message.new', { jid, message: msgDoc })
  } catch {}
}

async function getStatus() {
  const c = getConfig()
  return {
    configured: isConfigured(),
    phoneNumberId: c.phoneNumberId ? mask(c.phoneNumberId) : null,
    wabaId: c.wabaId ? mask(c.wabaId) : null,
  }
}

async function startConnection() {
  return { message: 'WhatsApp Cloud API does not require QR connection', qr: null }
}

async function getQR() {
  return { qr: null }
}

async function logout() {
  return { ok: true }
}

async function listChats() {
  // Build from stored messages + ChatMeta
  const agg = await WaMessage.aggregate([
    { $sort: { messageTimestamp: -1, _id: -1 } },
    {
      $group: {
        _id: '$jid',
        lastTs: { $first: '$messageTimestamp' },
        lastMsg: { $first: '$message' },
      },
    },
    { $sort: { lastTs: -1 } },
    { $limit: 500 },
  ])

  const jids = agg.map((a) => a?._id).filter(Boolean)
  const metas = await ChatMeta.find({ jid: { $in: jids } }).lean()
  const metaByJid = new Map(metas.map((m) => [m.jid, m]))

  return agg.map((a) => {
    const jid = a?._id
    const m = metaByJid.get(jid)
    const name = m?.name || String(jid || '').replace(/@.*/, '')
    const unreadCount = Number(m?.unreadCount || 0)
    return {
      id: jid,
      name,
      unreadCount,
      unread: unreadCount > 0,
      preview: previewFromMessage(a?.lastMsg) || '',
      lastTs: (Number(a?.lastTs || 0) * 1000) || null,
    }
  })
}

async function getMessages(jid, limit = 25, beforeId = null) {
  const njid = normalizeJid(jid)
  if (!njid) throw new Error('invalid-jid')

  const lim = Math.max(1, Math.min(200, Number(limit || 25)))
  const q = { jid: njid }

  if (beforeId) {
    const marker = await WaMessage.findOne({ jid: njid, 'key.id': String(beforeId) }).lean()
    if (marker && typeof marker.messageTimestamp === 'number') {
      q.messageTimestamp = { $lt: marker.messageTimestamp }
    }
  }

  const docs = await WaMessage.find(q).sort({ messageTimestamp: -1, _id: -1 }).limit(lim).lean()
  const items = (docs || []).reverse().map((d) => toClientMessage(d))

  const nextBeforeId = items.length ? items[0]?.key?.id || null : null
  return { items, hasMore: docs.length >= lim, nextBeforeId }
}

async function markRead(jid) {
  const njid = normalizeJid(jid)
  if (!njid) return { ok: false }
  try {
    await ChatMeta.updateOne({ jid: njid }, { $set: { unreadCount: 0 } }, { upsert: true })
  } catch {}
  try {
    const io = getIO()
    if (io) io.emit('chat.read', { jid: njid })
  } catch {}
  return { ok: true }
}

async function sendText(jid, text, opts = {}) {
  if (!isConfigured()) throw new Error('wa-not-connected')
  const to = jidToPhone(jid)
  if (!to) throw new Error('invalid-jid')

  const c = getConfig()
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: String(text || ''), preview_url: false },
  }
  if (opts?.quotedId) {
    payload.context = { message_id: String(opts.quotedId) }
  }

  let r
  try {
    r = await graphFetch(`/${encodeURIComponent(c.phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    rethrowAsSendError(err)
  }

  const id = r?.messages?.[0]?.id
  if (!id) throw new Error('send-failed:no-message-id')

  const njid = normalizeJid(jid)
  const nowSec = Math.floor(Date.now() / 1000)
  const doc = {
    jid: njid,
    key: { id, fromMe: true },
    fromMe: true,
    message: { conversation: String(text || '') },
    quoted: opts?.quotedId ? (await resolveQuoted(njid, opts.quotedId)) : null,
    reactions: [],
    pushName: null,
    messageTimestamp: nowSec,
    status: 'sent',
  }

  await WaMessage.updateOne({ jid: njid, 'key.id': id }, { $set: doc }, { upsert: true })

  // Best-effort: reset unread count on outbound
  try {
    await ChatMeta.updateOne(
      { jid: njid },
      { $set: { lastMessageAt: new Date() }, $setOnInsert: { jid: njid, hiddenForUser: false } },
      { upsert: true }
    )
  } catch {}

  const clientMsg = toClientMessage(doc)
  await saveAndEmitMessage({ jid: njid, msgDoc: clientMsg })

  return { ok: true, message: clientMsg }
}

async function sendMedia(jid, files, opts = {}) {
  if (!isConfigured()) throw new Error('wa-not-connected')
  const to = jidToPhone(jid)
  if (!to) throw new Error('invalid-jid')

  const c = getConfig()
  const njid = normalizeJid(jid)
  const caption = String(opts?.caption || '')

  const list = Array.isArray(files) ? files : []
  for (let i = 0; i < list.length; i++) {
    const f = list[i]
    const filePath = f?.path
    const fileName = f?.originalname || (filePath ? path.basename(filePath) : 'file')
    const mt = f?.mimetype || mime.lookup(fileName) || 'application/octet-stream'

    if (!filePath) continue

    const up = await uploadMediaFromPath(filePath, mt, fileName)

    let type = 'document'
    if (String(mt).startsWith('image/')) type = 'image'
    else if (String(mt).startsWith('video/')) type = 'video'
    else if (String(mt).startsWith('audio/')) type = 'audio'

    const cap = i === 0 ? caption : ''
    const msgNode = {}
    if (type === 'image') msgNode.image = { id: up.id, caption: cap || undefined }
    else if (type === 'video') msgNode.video = { id: up.id, caption: cap || undefined }
    else if (type === 'audio') msgNode.audio = { id: up.id }
    else msgNode.document = { id: up.id, filename: fileName, caption: cap || undefined }

    const sendPayload = {
      messaging_product: 'whatsapp',
      to,
      type,
      ...msgNode,
    }
    if (opts?.quotedId) {
      sendPayload.context = { message_id: String(opts.quotedId) }
    }

    let r
    try {
      r = await graphFetch(`/${encodeURIComponent(c.phoneNumberId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendPayload),
      })
    } catch (err) {
      rethrowAsSendError(err)
    }

    const id = r?.messages?.[0]?.id
    if (!id) throw new Error('send-failed:no-message-id')

    const nowSec = Math.floor(Date.now() / 1000)

    let message = { conversation: '[file]' }
    if (type === 'image') {
      message = { imageMessage: { mimetype: up.mimeType, caption: caption || '', mediaId: up.id, fileName } }
    } else if (type === 'video') {
      message = { videoMessage: { mimetype: up.mimeType, caption: caption || '', mediaId: up.id, fileName } }
    } else if (type === 'audio') {
      message = { audioMessage: { mimetype: up.mimeType, seconds: 1, ptt: true, mediaId: up.id, fileName } }
    } else {
      message = { documentMessage: { mimetype: up.mimeType, fileName, fileLength: f?.size, mediaId: up.id, caption: caption || '' } }
    }

    const doc = {
      jid: njid,
      key: { id, fromMe: true },
      fromMe: true,
      message,
      pushName: null,
      messageTimestamp: nowSec,
      status: 'sent',
    }

    await WaMessage.updateOne({ jid: njid, 'key.id': id }, { $set: doc }, { upsert: true })

    const clientMsg = toClientMessage(doc)
    await saveAndEmitMessage({ jid: njid, msgDoc: clientMsg })

    try {
      fs.unlinkSync(filePath)
    } catch {}
  }

  return { ok: true }
}

async function sendVoice(jid, file, opts = {}) {
  // Best-effort: convert to OGG/OPUS for WhatsApp compatibility
  try {
    const p = file?.path
    const mt = String(file?.mimetype || '')
    if (p && ffmpegPath && !/audio\/ogg/i.test(mt)) {
      const out = `${p}.ogg`
      await new Promise((resolve, reject) => {
        execFile(
          ffmpegPath,
          ['-y', '-i', p, '-c:a', 'libopus', '-b:a', '32k', '-ac', '1', out],
          (err) => (err ? reject(err) : resolve(null))
        )
      })
      try {
        const stat = fs.statSync(out)
        if (stat && stat.size > 0) {
          file.path = out
          file.originalname = (file.originalname || 'voice') + '.ogg'
          file.mimetype = 'audio/ogg'
          try { fs.unlinkSync(p) } catch {}
        }
      } catch {}
    }
  } catch {}
  return sendMedia(jid, [file], opts || {})
}

async function sendDocument(jid, filePath, fileName = null, caption = '') {
  const fName = fileName || path.basename(filePath)
  const mt = mime.lookup(fName) || 'application/pdf'
  const tmp = {
    path: filePath,
    originalname: fName,
    mimetype: mt,
  }
  return sendMedia(jid, [tmp], { caption })
}

async function sendReaction(jid, id, emoji) {
  if (!isConfigured()) throw new Error('wa-not-connected')
  const to = jidToPhone(jid)
  if (!to) throw new Error('invalid-jid')
  if (!id) throw new Error('send-failed:missing-message-id')
  const c = getConfig()
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'reaction',
    reaction: {
      message_id: String(id),
      emoji: String(emoji || '❤'),
    },
  }
  try {
    await graphFetch(`/${encodeURIComponent(c.phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    rethrowAsSendError(err)
  }

  // Optimistic UI update (webhook may arrive later)
  try {
    const njid = normalizeJid(jid)
    const io = getIO()
    await upsertReaction({ jid: njid, id: String(id), emoji: String(emoji || '❤'), fromMe: true, by: null })
    if (io && njid) io.emit('message.react', { jid: njid, id: String(id), emoji: String(emoji || '❤'), fromMe: true, by: null })
  } catch {}
  return { ok: true }
}

async function cancelVoice() {
  return { ok: true }
}

async function getMediaMeta(jid, id) {
  const njid = normalizeJid(jid)
  if (!njid) return { hasMedia: false }

  const doc = await WaMessage.findOne({ jid: njid, 'key.id': String(id) }).lean()
  const msg = doc?.message || {}

  let node = null
  let type = null
  let fileName = null
  let mimeType = null
  let fileLength = undefined

  if (msg.imageMessage) {
    node = msg.imageMessage
    type = 'image'
  } else if (msg.videoMessage) {
    node = msg.videoMessage
    type = 'video'
  } else if (msg.audioMessage) {
    node = msg.audioMessage
    type = 'audio'
  } else if (msg.documentMessage) {
    node = msg.documentMessage
    type = 'document'
    fileName = msg.documentMessage.fileName || null
  }

  if (!node) return { hasMedia: false }

  try {
    mimeType = node.mimetype || node.mimeType || (fileName ? mime.lookup(fileName) : null) || null
  } catch {
    mimeType = null
  }
  try {
    if (typeof node.fileLength === 'number') fileLength = Number(node.fileLength)
  } catch {}

  if (!fileName) {
    try {
      fileName = node.fileName || null
    } catch {}
  }

  return { hasMedia: true, type, fileName, mimeType, fileLength }
}

async function getMedia(jid, id) {
  const njid = normalizeJid(jid)
  if (!njid) return null

  const doc = await WaMessage.findOne({ jid: njid, 'key.id': String(id) }).lean()
  const msg = doc?.message || {}

  let node = null
  let fileName = null
  let mimeType = null
  let mediaId = null

  if (msg.imageMessage) node = msg.imageMessage
  else if (msg.videoMessage) node = msg.videoMessage
  else if (msg.audioMessage) node = msg.audioMessage
  else if (msg.documentMessage) node = msg.documentMessage
  if (!node) return null

  try {
    mediaId = node.mediaId || node.id || null
  } catch {
    mediaId = null
  }
  if (!mediaId) return null

  try {
    fileName = node.fileName || (msg.documentMessage?.fileName || null)
  } catch {}
  try {
    mimeType = node.mimetype || node.mimeType || (fileName ? mime.lookup(fileName) : null) || null
  } catch {}

  const info = await graphFetch(`/${encodeURIComponent(mediaId)}`)
  const url = info?.url
  const mt = info?.mime_type || mimeType || 'application/octet-stream'

  if (!url) return null

  const c = getConfig()
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${c.accessToken}`,
    },
  })
  if (!res.ok) return null

  const ab = await res.arrayBuffer()
  const buffer = Buffer.from(ab)

  return { buffer, mimeType: String(mt), fileName: fileName || null }
}

function verifyWebhookSignature(req) {
  const c = getConfig()
  if (!c.appSecret) return true

  const sig = String(req.headers?.['x-hub-signature-256'] || '')
  if (!sig.startsWith('sha256=')) return false
  const received = sig.slice('sha256='.length)

  const raw = req.rawBody
  if (!raw || !(raw instanceof Buffer)) return false

  const expected = crypto.createHmac('sha256', c.appSecret).update(raw).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

async function handleWebhook(req) {
  if (!verifyWebhookSignature(req)) {
    const err = new Error('wa-webhook-signature-invalid')
    err.status = 401
    throw err
  }

  const body = req.body || {}
  const entry = Array.isArray(body.entry) ? body.entry : []

  for (const e of entry) {
    const changes = Array.isArray(e?.changes) ? e.changes : []
    for (const ch of changes) {
      const v = ch?.value || {}
      const contacts = Array.isArray(v.contacts) ? v.contacts : []
      const contactByWaId = new Map()
      for (const c of contacts) {
        const waId = String(c?.wa_id || '')
        const name = c?.profile?.name || ''
        if (waId) contactByWaId.set(waId, name)
      }

      const msgs = Array.isArray(v.messages) ? v.messages : []
      for (const m of msgs) {
        const from = String(m?.from || '')
        const jid = from ? `${from}@s.whatsapp.net` : null
        if (!jid) continue

        const ts = Number(m?.timestamp || 0) || Math.floor(Date.now() / 1000)
        const pushName = contactByWaId.get(from) || null

        const type = String(m?.type || '')

        // Reactions are delivered as their own event payload; fold into target message.
        if (type === 'reaction') {
          const targetId = String(m?.reaction?.message_id || '')
          const emoji = String(m?.reaction?.emoji || '')
          if (targetId) {
            try {
              const io = getIO()
              await upsertReaction({ jid, id: targetId, emoji, fromMe: false, by: pushName || null })
              if (io) io.emit('message.react', { jid, id: targetId, emoji, fromMe: false, by: pushName || null })
            } catch {}
          }
          continue
        }

        const quotedId = String(m?.context?.id || m?.context?.message_id || '')

        let message = { conversation: '[unsupported]' }

        if (type === 'text') {
          message = { conversation: String(m?.text?.body || '') }
        } else if (type === 'image') {
          message = {
            imageMessage: {
              caption: String(m?.image?.caption || ''),
              mimetype: String(m?.image?.mime_type || ''),
              mediaId: m?.image?.id || null,
              fileName: null,
            },
          }
        } else if (type === 'video') {
          message = {
            videoMessage: {
              caption: String(m?.video?.caption || ''),
              mimetype: String(m?.video?.mime_type || ''),
              mediaId: m?.video?.id || null,
              fileName: null,
            },
          }
        } else if (type === 'audio') {
          message = {
            audioMessage: {
              mimetype: String(m?.audio?.mime_type || ''),
              seconds: 1,
              ptt: true,
              mediaId: m?.audio?.id || null,
              fileName: null,
            },
          }
        } else if (type === 'document') {
          message = {
            documentMessage: {
              fileName: m?.document?.filename || null,
              mimetype: String(m?.document?.mime_type || ''),
              fileLength: m?.document?.file_size,
              mediaId: m?.document?.id || null,
              caption: String(m?.document?.caption || ''),
            },
          }
        } else if (type === 'location') {
          message = {
            locationMessage: {
              degreesLatitude: m?.location?.latitude,
              degreesLongitude: m?.location?.longitude,
              name: m?.location?.name || '',
              address: m?.location?.address || '',
            },
          }
        } else if (type === 'interactive') {
          const t = m?.interactive?.type
          if (t === 'button_reply') {
            message = { conversation: String(m?.interactive?.button_reply?.title || '') }
          } else if (t === 'list_reply') {
            message = { conversation: String(m?.interactive?.list_reply?.title || '') }
          }
        } else if (type === 'button') {
          message = { conversation: String(m?.button?.text || '') }
        }

        const msgDoc = {
          jid,
          key: { id: String(m?.id || ''), fromMe: false },
          fromMe: false,
          message,
          quoted: quotedId ? (await resolveQuoted(jid, quotedId)) : null,
          reactions: [],
          pushName,
          messageTimestamp: ts,
          status: null,
        }

        if (!msgDoc.key.id) continue

        await WaMessage.updateOne(
          { jid, 'key.id': msgDoc.key.id },
          { $set: msgDoc },
          { upsert: true }
        )

        await upsertChatMetaOnInbound({ jid, pushName, messageTimestamp: ts })

        const clientMsg = toClientMessage(msgDoc)
        await saveAndEmitMessage({ jid, msgDoc: clientMsg })
      }

      const statuses = Array.isArray(v.statuses) ? v.statuses : []
      for (const st of statuses) {
        const id = String(st?.id || '')
        const status = String(st?.status || '').toLowerCase()
        if (!id) continue

        let mapped = null
        if (status === 'sent') mapped = 'sent'
        else if (status === 'delivered') mapped = 'delivered'
        else if (status === 'read') mapped = 'read'

        if (!mapped) continue

        const doc = await WaMessage.findOneAndUpdate(
          { 'key.id': id },
          { $set: { status: mapped } },
          { new: true }
        ).lean()

        const jid = doc?.jid
        if (!jid) continue

        try {
          const io = getIO()
          if (io) io.emit('message.status', { jid, id, status: mapped })
        } catch {}
      }
    }
  }

  return { ok: true }
}

const service = {
  getStatus,
  startConnection,
  getQR,
  logout,
  listChats,
  getMessages,
  sendText,
  sendDocument,
  sendMedia,
  sendVoice,
  sendReaction,
  cancelVoice,
  getMedia,
  getMediaMeta,
  normalizeJid,
  getConnectedNumber: () => null,
  markRead,
  clearStore: () => ({ ok: true }),
  handleWebhook,
}

export function getWaService() {
  return service
}

export default service
