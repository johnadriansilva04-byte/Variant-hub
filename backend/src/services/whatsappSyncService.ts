import { supabase } from '../db'
import { evolutionApiService, EvolutionMessage, EvolutionChat } from './evolutionApi'

// ─────────────────────────────────────────────────────────────
// WhatsappSyncService — o painel é um ESPELHO da Evolution API.
//
// Regras:
//  • JID = identidade real (nunca inventar/alterar números)
//  • message_id = chave de deduplicação (nunca duplicar)
//  • nome: pushName → contactName → telefone válido → "Contato"
//  • ordem: sempre last_message_timestamp DESC
//  • fullSync no login/página/manual; incremental a cada 10s
// ─────────────────────────────────────────────────────────────

// ── Helpers de telefone/JID ──────────────────────────────────

export function jidDigits(jid: string | null | undefined): string {
  return (jid || '').trim().split('@')[0].replace(/\D/g, '')
}

/** Só formata se for um telefone brasileiro válido (10 ou 11 dígitos após o 55). Nunca inventa número. */
export function formatBR(jid: string | null | undefined): string | null {
  const d = jidDigits(jid).replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return null
}

/** Normaliza para armazenar: garante prefixo 55 em JID de telefone. @g.us/@lid/@broadcast intactos. */
export function normalizeJidForStore(jid: string | null | undefined): string {
  const s = (jid || '').trim()
  if (!s) return s
  if (s.includes('@g.us') || s.includes('@lid') || s.includes('@broadcast')) return s
  const digits = jidDigits(s)
  if (digits.length === 10 || digits.length === 11) return `55${digits}@s.whatsapp.net`
  if (digits.length === 12 && digits.startsWith('55')) return `${digits}@s.whatsapp.net`
  if (digits.length === 13 && digits.startsWith('55')) return `${digits}@s.whatsapp.net`
  // JID estranho (LID sem @lid, testes com número errado…) — preserva exatamente como veio
  return s.split('@')[0] + '@s.whatsapp.net'
}

/** É o próprio número do operador? */
export function isSelfJid(jid: string | null | undefined, ownerJid?: string | null): boolean {
  if (!jid || !ownerJid) return false
  const a = jidDigits(jid).replace(/^55/, '')
  const b = jidDigits(ownerJid).replace(/^55/, '')
  return a.length > 0 && a === b
}

const JUNK_NAMES = new Set(['contato', 'contact', 'you', 'eu', 'whatsapp', 'unknown', 'sem nome', 'desconhecido'])

/** Nome de exibição: pushName → contactName → telefone válido → grupo/lid → "Contato" */
export function displayName(
  jid: string | null | undefined,
  pushName?: string | null,
  contactName?: string | null,
  ownerJid?: string | null
): string {
  if (isSelfJid(jid, ownerJid)) return 'Você'
  for (const candidate of [pushName, contactName]) {
    const n = (candidate || '').trim()
    if (!n || JUNK_NAMES.has(n.toLowerCase())) continue
    if (n.includes('@')) continue
    if (/^\d{6,}$/.test(n)) continue // número puro não é nome
    return n.slice(0, 60)
  }
  if (jid?.includes('@g.us')) return 'Grupo'
  const phone = formatBR(jid)
  if (phone) return phone
  return 'Contato'
}

/** Iniciais seguras (nunca undefined/null) */
export function initialsOf(name: string): string {
  return (name || 'C').replace(/[^\p{L}\p{N}]/gu, ' ').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'C'
}

// ── Extração de mensagem ─────────────────────────────────────

export interface StoredMessage {
  jid: string
  message_id: string
  message_content: string | null
  message_type: string
  direction: 'inbound' | 'outbound'
  sender_type: 'user' | 'contact'
  sender_jid: string | null
  sender_name: string | null
  timestamp: string
  media: any | null
  media_mime: string | null
  media_caption: string | null
  status: string
  integration_id: string | null
}

const TYPE_LABEL: Record<string, string> = {
  text: '',
  image: '🖼️ Foto',
  audio: '🎤 Áudio',
  video: '🎬 Vídeo',
  document: '📄 Documento',
  sticker: '🖼️ Sticker',
  location: '📍 Localização',
  contact: '👤 Contato',
  reaction: '👍 Reação',
  unknown: '📩 Mensagem'
}

export function typeLabel(type: string | null | undefined, content?: string | null): string {
  if (!type || type === 'text') return content || ''
  return TYPE_LABEL[type] ?? TYPE_LABEL.unknown
}

/** Extrai o conteúdo/tipo/mídia de qualquer mensagem da Evolution */
export function extractMessage(msg: EvolutionMessage, fallbackJid: string): StoredMessage | null {
  const key = msg.key || {}
  const rawJid = key.remoteJid || fallbackJid || ''
  const jid = normalizeJidForStore(rawJid)
  const messageId = key.id
  if (!jid || !messageId) return null

  const body = msg.message || {}
  const fromMe = Boolean(key.fromMe)
  const ts = Number(msg.messageTimestamp)
  const timestamp = ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString()
  const senderJid = normalizeJidForStore(key.participant || null)

  let type = 'unknown'
  let content: string | null = null
  let media: any = null
  let mediaMime: string | null = null
  let mediaCaption: string | null = null

  if (body.conversation) { type = 'text'; content = String(body.conversation) }
  else if (body.extendedTextMessage?.text) { type = 'text'; content = String(body.extendedTextMessage.text) }
  else if (body.buttonsResponseMessage?.selectedButtonText) { type = 'text'; content = String(body.buttonsResponseMessage.selectedButtonText) }
  else if (body.listResponseMessage?.singleSelectReply?.selectedRowId) { type = 'text'; content = `Resposta: ${body.listResponseMessage.singleSelectReply.selectedRowId}` }
  else if (body.imageMessage) {
    type = 'image'
    media = body.imageMessage
    mediaMime = body.imageMessage.mimetype || 'image/jpeg'
    mediaCaption = body.imageMessage.caption || null
    content = mediaCaption
  } else if (body.videoMessage) {
    type = 'video'
    media = body.videoMessage
    mediaMime = body.videoMessage.mimetype || 'video/mp4'
    mediaCaption = body.videoMessage.caption || null
    content = mediaCaption
  } else if (body.audioMessage) {
    type = 'audio'
    media = body.audioMessage
    mediaMime = body.audioMessage.mimetype || 'audio/ogg'
  } else if (body.documentMessage) {
    type = 'document'
    media = body.documentMessage
    mediaMime = body.documentMessage.mimetype || 'application/octet-stream'
    content = body.documentMessage.fileName || null
  } else if (body.stickerMessage) {
    type = 'sticker'
    media = body.stickerMessage
    mediaMime = body.stickerMessage.mimetype || 'image/webp'
  } else if (body.locationMessage) {
    type = 'location'
    const lat = body.locationMessage.degreesLatitude
    const lng = body.locationMessage.degreesLongitude
    content = lat != null && lng != null ? `${lat},${lng}` : null
  } else if (body.contactMessage) {
    type = 'contact'
    content = body.contactMessage.displayName || body.contactMessage.vcard || null
  } else if (body.reactionMessage) {
    type = 'reaction'
    content = body.reactionMessage.text || null
  } else if (body.protocolMessage) {
    type = 'unknown'
    content = null
  }

  return {
    jid,
    message_id: messageId,
    message_content: content,
    message_type: type,
    direction: fromMe ? 'outbound' : 'inbound',
    sender_type: fromMe ? 'user' : 'contact',
    sender_jid: senderJid || null,
    sender_name: msg.pushName || null,
    timestamp,
    media,
    media_mime: mediaMime,
    media_caption: mediaCaption,
    status: msg.status || 'PENDING',
    integration_id: null
  }
}

// ── Persistência ─────────────────────────────────────────────

async function getIntegrationId(): Promise<string | null> {
  const { data } = await supabase
    .from('integrations')
    .select('id')
    .eq('type', 'whatsapp')
    .order('created_at', { ascending: true })
    .limit(1)
  return data?.[0]?.id || null
}

async function storeMessages(rows: StoredMessage[]): Promise<number> {
  if (rows.length === 0) return 0
  let added = 0
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .upsert(chunk, { onConflict: 'jid,message_id', ignoreDuplicates: true })
      .select('jid,message_id')
    if (error) throw error
    added += (data || []).length
  }
  return added
}

async function updateConversation(jid: string, pushName: string | null | undefined, lastMessage: StoredMessage | null, unreadCount = 0) {
  const integrationId = await getIntegrationId()
  const row: any = {
    jid,
    name: pushName || null,
    integration_id: integrationId,
    unread_count: unreadCount,
    updated_at: new Date().toISOString(),
    is_group: jid.includes('@g.us') || jid.includes('@broadcast')
  }
  if (lastMessage) {
    row.last_message = lastMessage.message_content || ''
    row.last_message_timestamp = lastMessage.timestamp
    row.last_message_type = lastMessage.message_type
    row.last_message_from_me = lastMessage.direction === 'outbound'
  }
  const { error } = await supabase
    .from('whatsapp_conversations')
    .upsert(row, { onConflict: 'jid', ignoreDuplicates: false })
  if (error) throw error
}

// ── Sync ─────────────────────────────────────────────────────

export interface SyncResult {
  chatsSynced: number
  messagesAdded: number
  updatedJids: string[]
  ownerJid: string | null
}

async function resolveConfig(candidate?: any): Promise<{ apiUrl: string; apiKey: string; instanceName: string; phone?: string }> {
  if (candidate?.apiUrl && candidate?.apiKey && candidate?.instanceName) {
    return { apiUrl: candidate.apiUrl, apiKey: candidate.apiKey, instanceName: candidate.instanceName, phone: candidate.phone }
  }
  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('type', 'whatsapp')
    .limit(1)
  const config = data?.[0]?.config
  if (!config?.apiUrl || !config.apiKey || !config.instanceName) {
    throw new Error('WhatsApp não configurado no backend')
  }
  return config
}

async function runPooled<T>(items: T[], worker: (item: T) => Promise<void>, pool = 4) {
  let idx = 0
  const workers = Array.from({ length: Math.min(pool, items.length) }, async () => {
    while (idx < items.length) {
      const item = items[idx++]
      try { await worker(item) } catch (err: any) {
        console.error('sync worker error:', err?.message || err)
      }
    }
  })
  await Promise.all(workers)
}

async function syncChatMessages(chat: EvolutionChat, integrationId: string | null, ownerJid: string | null, limit = 40): Promise<{ added: number; lastMessage: StoredMessage | null }> {
  let messages: EvolutionMessage[] = []
  try {
    messages = await evolutionApiService.getMessages(chat.id, limit)
  } catch (err: any) {
    console.error('getMessages failed for', chat.id, err?.message || err)
  }

  const stored: StoredMessage[] = []
  for (const m of messages) {
    const sm = extractMessage(m, chat.id)
    if (sm) { sm.integration_id = integrationId; stored.push(sm) }
  }
  const added = await storeMessages(stored)

  // última mensagem real (mais recente por timestamp)
  const last = stored.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null
  return { added, lastMessage: last }
}

export async function fullSync(candidate?: any): Promise<SyncResult> {
  const config = await resolveConfig(candidate)
  evolutionApiService.configure({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    instanceName: config.instanceName
  })

  const ownerJid = await evolutionApiService.getOwnerJid()
  const effectiveOwner = ownerJid || config.phone || null

  // Se descobrimos o dono pela API, guardamos na config para o filtro funcionar sempre
  if (ownerJid && !config.phone) {
    await supabase
      .from('integrations')
      .update({ config: { ...config, phone: jidDigits(ownerJid).replace(/^55/, '') }, last_sync: new Date().toISOString() })
      .eq('type', 'whatsapp')
  }

  const integrationId = await getIntegrationId()

  const chats = await evolutionApiService.getChats(300)
  const contacts = await evolutionApiService.getContacts(500)
  const contactMap = new Map(contacts.map(c => [c.id, c]))

  let messagesAdded = 0
  const updatedJids: string[] = []

  await runPooled(chats, async (chat) => {
    const { added, lastMessage } = await syncChatMessages(chat, integrationId, effectiveOwner, 30)
    messagesAdded += added
    const contact = contactMap.get(chat.id)
    const pushName = chat.pushName || contact?.pushName || contact?.verifiedName || null
    await updateConversation(chat.id, pushName, lastMessage, chat.unreadCount)
    updatedJids.push(chat.id)
  }, 5)

  // Fotos de perfil: só busca quando ainda não temos (cache persistente no banco)
  const { data: convRows } = await supabase
    .from('whatsapp_conversations')
    .select('jid, photo_url')
    .is('photo_url', null)
  const missingPhoto = new Set((convRows || []).map((c: any) => c.jid))
  const photoCandidates = chats.filter(c => missingPhoto.has(c.id)).slice(0, 60)
  await runPooled(photoCandidates, async (chat) => {
    const contact = contactMap.get(chat.id)
    if (contact?.profilePicUrl) {
      await supabase
        .from('whatsapp_conversations')
        .update({ photo_url: contact.profilePicUrl, contact_name: contact.pushName || contact.verifiedName || null })
        .eq('jid', chat.id)
    } else {
      const pic = await evolutionApiService.getProfilePic(chat.id)
      if (pic) {
        await supabase
          .from('whatsapp_conversations')
          .update({ photo_url: pic, contact_name: contact?.pushName || null })
          .eq('jid', chat.id)
      }
    }
  }, 4)

  // Evolução é a fonte da verdade: apaga o que não existe mais lá
  const activeJids = new Set(chats.map(c => c.id))
  const { data: storedChats } = await supabase.from('whatsapp_conversations').select('jid')
  const stale = (storedChats || []).map(c => c.jid).filter(j => !activeJids.has(j))
  if (stale.length > 0) {
    await supabase.from('whatsapp_messages').delete().in('jid', stale)
    await supabase.from('whatsapp_conversations').delete().in('jid', stale)
  }

  // Purga única de dados legados sem message_id (lixo de sincronizações antigas)
  if (activeJids.size > 0) {
    const jidList = [...activeJids]
    for (let i = 0; i < jidList.length; i += 50) {
      await supabase
        .from('whatsapp_messages')
        .delete()
        .in('jid', jidList.slice(i, i + 50))
        .is('message_id', null)
    }
  }

  await supabase
    .from('integrations')
    .update({ last_sync: new Date().toISOString() })
    .eq('type', 'whatsapp')

  return { chatsSynced: chats.length, messagesAdded, updatedJids, ownerJid: effectiveOwner }
}

export async function incrementalSync(candidate?: any): Promise<SyncResult> {
  const config = await resolveConfig(candidate)
  evolutionApiService.configure({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    instanceName: config.instanceName
  })

  const ownerJid = await evolutionApiService.getOwnerJid()
  const effectiveOwner = ownerJid || config.phone || null
  const integrationId = await getIntegrationId()

  const chats = await evolutionApiService.getChats(100)
  let messagesAdded = 0
  const updatedJids: string[] = []

  await runPooled(chats, async (chat) => {
    // timestamp da última mensagem que já temos
    const { data: lastRows } = await supabase
      .from('whatsapp_messages')
      .select('timestamp')
      .eq('jid', chat.id)
      .order('timestamp', { ascending: false })
      .limit(1)
    const lastTs = lastRows?.[0]?.timestamp ? new Date(lastRows[0].timestamp).getTime() : 0

    const messages = await evolutionApiService.getMessages(chat.id, 50)
    const fresh = messages
      .filter(m => Number(m.messageTimestamp) * 1000 > lastTs)
      .map(m => extractMessage(m, chat.id))
      .filter((m): m is StoredMessage => m !== null)

    if (fresh.length > 0) {
      fresh.forEach(m => (m.integration_id = integrationId))
      messagesAdded += await storeMessages(fresh)
      const newest = fresh.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      await updateConversation(chat.id, chat.pushName || null, newest, chat.unreadCount)
      updatedJids.push(chat.id)
    } else if (chat.unreadCount > 0) {
      // só atualiza contador não-lido
      await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: chat.unreadCount, updated_at: new Date().toISOString() })
        .eq('jid', chat.id)
    }
  }, 5)

  return { chatsSynced: chats.length, messagesAdded, updatedJids, ownerJid: effectiveOwner }
}

// ── Webhook (tempo real) ─────────────────────────────────────

export async function processWebhookEvent(event: any): Promise<{ saved: boolean; jid?: string }> {
  const body = event?.data?.message || event?.message || event?.data || event
  if (!body?.key) return { saved: false }

  const msg: EvolutionMessage = {
    key: body.key || {},
    message: body.message || null,
    messageTimestamp: body.messageTimestamp || Math.floor(Date.now() / 1000),
    pushName: body.pushName || event?.data?.pushName || null,
    status: body.status
  }

  const stored = extractMessage(msg, body.key.remoteJid || '')
  if (!stored) return { saved: false }

  // mensagens do próprio operador vindas do webhook (echo) não criam conversa fantasma
  let ownerJid: string | null = null
  try {
    const config = await resolveConfig()
    ownerJid = config.phone || null
    if (!ownerJid) {
      evolutionApiService.configure({ apiUrl: config.apiUrl, apiKey: config.apiKey, instanceName: config.instanceName })
      ownerJid = await evolutionApiService.getOwnerJid()
    }
  } catch {
    return { saved: false }
  }
  if (isSelfJid(stored.jid, ownerJid)) return { saved: false }

  stored.integration_id = await getIntegrationId()
  const added = await storeMessages([stored])
  if (added > 0) {
    await updateConversation(stored.jid, stored.sender_name, stored, 0)
  }
  return { saved: added > 0, jid: stored.jid }
}

// ── Mídia sob demanda ────────────────────────────────────────

const mediaCache = new Map<string, { base64: string; mimetype: string; at: number }>()

export async function getMediaForMessage(jid: string, messageId: string): Promise<{ base64: string; mimetype: string } | null> {
  const cacheKey = `${jid}|${messageId}`
  const cached = mediaCache.get(cacheKey)
  if (cached && Date.now() - cached.at < 120_000) return { base64: cached.base64, mimetype: cached.mimetype }

  const { data } = await supabase
    .from('whatsapp_messages')
    .select('jid, message_id, message_type, media, media_mime, timestamp')
    .eq('jid', jid)
    .eq('message_id', messageId)
    .limit(1)

  const row = data?.[0]
  if (!row || !row.media) return null

  const config = await resolveConfig()
  evolutionApiService.configure({ apiUrl: config.apiUrl, apiKey: config.apiKey, instanceName: config.instanceName })
  const media = await evolutionApiService.getMediaBase64({ message: row.media })
  if (!media) return null

  mediaCache.set(cacheKey, { ...media, at: Date.now() })
  return media
}