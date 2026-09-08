import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'
import { evolutionApiService } from '../services/evolutionApi'
import {
  fullSync,
  incrementalSync,
  getMediaForMessage,
  displayName,
  initialsOf,
  isSelfJid,
  jidDigits,
  normalizeJidForStore,
  typeLabel
} from '../services/whatsappSyncService'

// ─────────────────────────────────────────────────────────────
// WhatsApp Controller — REBUILD
// O banco é um espelho da Evolution API. Tudo aqui LÊ do banco
// (que é preenchido pelo WhatsappSyncService), nunca inventa
// dados, e sempre ordena por última mensagem (chegada) DESC.
// ─────────────────────────────────────────────────────────────

async function getWhatsAppIntegration() {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('type', 'whatsapp')
    .maybeSingle()
  if (error) throw error
  return data
}

async function resolveConfig(candidate: any) {
  if (candidate?.apiUrl && candidate?.apiKey && candidate?.instanceName) {
    return candidate
  }
  const integration = await getWhatsAppIntegration()
  if (!integration?.config?.apiUrl || !integration.config.apiKey || !integration.config.instanceName) {
    throw createError('WhatsApp não configurado no backend', 400)
  }
  return integration.config
}

// ── Config / Status ──────────────────────────────────────────

export async function getWhatsAppConfig(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const integration = await getWhatsAppIntegration()
    res.json({
      success: true,
      data: integration?.config || { apiUrl: '', apiKey: '', instanceName: '', phone: '' }
    })
  } catch (error) {
    next(error)
  }
}

export async function saveWhatsAppConfig(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { apiUrl, apiKey, instanceName, phone } = req.body
    if (!apiUrl || !apiKey || !instanceName) {
      throw createError('Configuração incompleta', 400)
    }

    const config = { apiUrl, apiKey, instanceName, phone: phone ? String(phone).replace(/\D/g, '') : '' }
    const integration = await getWhatsAppIntegration()

    let saved: any
    if (integration) {
      const result = await supabase
        .from('integrations')
        .update({ config, credentials: { apiKey }, status: 'active', updated_at: new Date().toISOString() })
        .eq('id', integration.id)
        .select()
        .single()
      if (result.error) throw result.error
      saved = result.data
    } else {
      const result = await supabase
        .from('integrations')
        .insert({ name: 'WhatsApp', type: 'whatsapp', config, credentials: { apiKey }, status: 'active' })
        .select()
        .single()
      if (result.error) throw result.error
      saved = result.data
    }

    try {
      evolutionApiService.configure(config)
      await evolutionApiService.setWebhook()
    } catch {
      // webhook é best-effort; o sync incremental cobre falhas
    }

    res.json({ success: true, data: saved })
  } catch (error) {
    next(error)
  }
}

export async function getWhatsAppStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const config = await resolveConfig(req.body?.config || req.body)
    evolutionApiService.configure({ apiUrl: config.apiUrl, apiKey: config.apiKey, instanceName: config.instanceName })
    const status = await evolutionApiService.getInstanceStatus()
    res.json({
      success: true,
      data: {
        connected: status.state === 'open',
        state: status.state,
        instance: { instanceName: config.instanceName, status: status.state }
      }
    })
  } catch (error) {
    next(error)
  }
}

// ── Conversas (espelho do banco, ordem de chegada) ───────────

function previewOf(conv: any): { preview: string; previewType: string } {
  const label = typeLabel(conv.last_message_type, conv.last_message || null)
  const raw = (conv.last_message || '').replace(/\s+/g, ' ').trim()
  const preview = label && raw ? `${label} · ${raw}` : label || raw || 'Sem mensagem'
  return { preview: preview.slice(0, 120), previewType: conv.last_message_type || 'text' }
}

export async function getWhatsAppConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const config = await resolveConfig(req.body?.config || req.body)
    const integration = await getWhatsAppIntegration()
    const selfPhone = req.body?.config?.phone || integration?.config?.phone || null
    const ownerJid = selfPhone ? `55${String(selfPhone).replace(/\D/g, '')}` : null

    // Sempre lê do banco (preenchido pelo sync). Ordem = última mensagem DESC.
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_timestamp', { ascending: false, nullsFirst: false })
      .limit(300)

    if (error) throw error

    const conversations = (data || [])
      .filter((chat: any) => !isSelfJid(chat.jid, ownerJid))
      .map((chat: any) => {
        const name = displayName(chat.jid, chat.name, chat.contact_name, ownerJid)
        const { preview, previewType } = previewOf(chat)
        return {
          id: chat.jid,
          name,
          initials: initialsOf(name),
          photo: chat.photo_url || null,
          preview,
          previewType,
          lastMessageFromMe: Boolean(chat.last_message_from_me),
          lastActivity: chat.last_message_timestamp || null,
          unread: chat.unread_count || 0,
          isGroup: Boolean(chat.is_group) || chat.jid.includes('@g.us') || chat.jid.includes('@broadcast'),
          origin: 'WhatsApp'
        }
      })
      .sort((a: any, b: any) => {
        const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
        const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
        return tb - ta
      })

    res.json({ success: true, data: conversations })
  } catch (error) {
    next(error)
  }
}

// ── Mensagens (paginação por timestamp) ──────────────────────

export async function getWhatsAppMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jid } = req.params
    const limit = Math.min(Number(req.body?.limit) || 100, 200)
    const before = req.body?.before || null // timestamp ISO: busca mensagens MAIS ANTIGAS

    if (!jid) throw createError('jid é obrigatório', 400)
    const jidStored = normalizeJidForStore(jid)

    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('jid', jidStored)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('timestamp', before)
    }

    const { data, error } = await query
    if (error) throw error

    const messages = (data || []).map((m: any) => ({
      id: m.message_id || m.id,
      type: m.message_type || 'text',
      content: m.message_content || '',
      caption: m.media_caption || null,
      direction: m.direction || 'inbound',
      senderType: m.sender_type || 'contact',
      senderName: m.sender_name || null,
      timestamp: m.timestamp,
      hasMedia: Boolean(m.media),
      mediaMime: m.media_mime || null,
      status: m.status || 'PENDING'
    }))

    res.json({
      success: true,
      data: messages,
      hasMore: (data || []).length >= limit
    })
  } catch (error) {
    next(error)
  }
}

// ── Contato (painel de detalhes) ─────────────────────────────

export async function getWhatsAppContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jid } = req.params
    if (!jid) throw createError('jid é obrigatório', 400)
    const jidStored = normalizeJidForStore(jid)

    const { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('jid', jidStored)
      .limit(1)

    const { count } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('jid', jidStored)

    const c = conv?.[0]
    const config = await resolveConfig(req.body?.config || req.body)
    const ownerJid = config.phone ? `55${String(config.phone).replace(/\D/g, '')}` : null
    const name = displayName(jidStored, c?.name, c?.contact_name, ownerJid)

    res.json({
      success: true,
      data: {
        jid: jidStored,
        name,
        initials: initialsOf(name),
        photo: c?.photo_url || null,
        phone: jidDigits(jidStored) || null,
        isGroup: Boolean(c?.is_group) || jidStored.includes('@g.us'),
        unread: c?.unread_count || 0,
        totalMessages: count || 0,
        lastActivity: c?.last_message_timestamp || null
      }
    })
  } catch (error) {
    next(error)
  }
}

// ── Envio ────────────────────────────────────────────────────

export async function sendWhatsAppMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jid, text } = req.body
    if (!jid || !text) throw createError('jid e texto são obrigatórios', 400)

    const config = await resolveConfig(req.body?.config || req.body)
    const integration = await getWhatsAppIntegration()
    const jidStored = normalizeJidForStore(jid)

    evolutionApiService.configure({ apiUrl: config.apiUrl, apiKey: config.apiKey, instanceName: config.instanceName })
    const result = await evolutionApiService.sendMessage(jidStored, text)

    // Confirmação imediata no painel (mensagem enviada)
    const sentTs = new Date().toISOString()
    const messageId = result?.key?.id || `out-${Date.now()}`
    await supabase.from('whatsapp_messages').upsert({
      jid: jidStored,
      message_id: messageId,
      message_content: text,
      message_type: 'text',
      direction: 'outbound',
      sender_type: 'user',
      timestamp: sentTs,
      status: 'SENT',
      integration_id: integration?.id || null
    }, { onConflict: 'jid,message_id', ignoreDuplicates: true })

    await supabase.from('whatsapp_conversations').upsert({
      jid: jidStored,
      name: null,
      last_message: text,
      last_message_timestamp: sentTs,
      last_message_type: 'text',
      last_message_from_me: true,
      unread_count: 0,
      integration_id: integration?.id || null,
      updated_at: sentTs
    }, { onConflict: 'jid', ignoreDuplicates: false })

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

// ── Sync ─────────────────────────────────────────────────────

export async function runFullSync(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await fullSync(req.body?.config || req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function runIncrementalSync(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await incrementalSync(req.body?.config || req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

// ── Mídia (proxy) ────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
  'application/pdf': 'pdf', 'text/plain': 'txt'
}

export async function getMedia(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jid, messageId } = req.params
    if (!jid || !messageId) throw createError('jid e messageId são obrigatórios', 400)

    const media = await getMediaForMessage(decodeURIComponent(jid), decodeURIComponent(messageId))
    if (!media) throw createError('Mídia não encontrada', 404)

    const ext = MIME_TO_EXT[media.mimetype] || 'bin'
    const buffer = Buffer.from(media.base64, 'base64')
    res.setHeader('Content-Type', media.mimetype)
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.setHeader('Content-Disposition', `inline; filename="media-${messageId}.${ext}"`)
    res.send(buffer)
  } catch (error) {
    next(error)
  }
}