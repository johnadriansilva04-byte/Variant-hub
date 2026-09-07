import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'
import { evolutionApiService } from '../services/evolutionApi'

async function getWhatsAppIntegration() {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('type', 'whatsapp')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getWhatsAppConfig(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const integration = await getWhatsAppIntegration()

    res.json({
      success: true,
      data: integration?.config || {
        apiUrl: '',
        apiKey: '',
        instanceName: '',
        phone: ''
      }
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

    const config = { apiUrl, apiKey, instanceName, phone: phone || '' }
    const integration = await getWhatsAppIntegration()

    let buildError
    let saved

    if (integration) {
      const result = await supabase
        .from('integrations')
        .update({
          config,
          credentials: { apiKey },
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id)
        .select()
        .single()
      buildError = result.error
      saved = result.data
    } else {
      const result = await supabase
        .from('integrations')
        .insert({
          name: 'WhatsApp',
          type: 'whatsapp',
          config,
          credentials: { apiKey },
          status: 'active'
        })
        .select()
        .single()
      buildError = result.error
      saved = result.data
    }

    if (buildError) throw buildError

    res.json({
      success: true,
      data: saved
    })
  } catch (error) {
    next(error)
  }
}

export async function getWhatsAppStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const config = req.body

    if (!config || !config.apiUrl || !config.apiKey || !config.instanceName) {
      throw createError('Configuração incompleta', 400)
    }

    evolutionApiService.configure({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName
    })

    const status = await evolutionApiService.getInstanceStatus()
    
    res.json({
      success: true,
      data: {
        connected: status.state === 'open',
        state: status.state,
        instance: status.instance
      }
    })
  } catch (error) {
    next(error)
  }
}

function normalizeJid(jid: string): string {
  const trimmed = jid.trim()
  if (trimmed.includes('@g.us') || trimmed.includes('@broadcast') || trimmed.includes('@lid')) {
    return trimmed.replace(/@s\.whatsapp\.net$/, '')
  }
  let clean = trimmed.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '').replace(/@broadcast$/, '').replace(/@lid$/, '').replace(/[^0-9]/g, '')
  if (clean.length === 13 && clean.startsWith('55')) {
    clean = clean.slice(2)
  }
  if (/^[1-9]{2}\d{8,9}$/.test(clean) && !clean.startsWith('55')) {
    clean = `55${clean}`
  }
  return clean
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

export async function getWhatsAppConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const candidate = req.body?.config || req.body
    const config = await resolveConfig(candidate)
    const integration = await getWhatsAppIntegration()

    evolutionApiService.configure({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName
    })

    const chats = await evolutionApiService.getChats(50)

    const lastMessageOf = (chat: any) =>
      typeof chat.lastMessage === 'string'
        ? chat.lastMessage
        : chat.lastMessage?.message?.conversation ||
          chat.lastMessage?.message?.extendedTextMessage?.text ||
          ''

    const lastMessageTimestampOf = (chat: any) =>
      typeof chat.lastMessage === 'number'
        ? chat.lastMessage
        : chat.lastMessage?.messageTimestamp

    const rows = chats.map((chat) => ({
      jid: normalizeJid(chat.id),
      name: chat.name || normalizeJid(chat.id),
      last_message: lastMessageOf(chat),
      last_message_timestamp: lastMessageTimestampOf(chat)
        ? new Date(lastMessageTimestampOf(chat) * 1000).toISOString()
        : null,
      unread_count: chat.unreadCount || 0,
      integration_id: integration?.id,
      updated_at: new Date().toISOString()
    }))

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('whatsapp_conversations')
        .upsert(rows, {
          onConflict: 'jid',
          ignoreDuplicates: false
        })
      if (upsertError) throw upsertError
    }

    const { data: savedConversations, error: fetchError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_timestamp', { ascending: false, nullsFirst: false })

    if (fetchError) throw fetchError

    const conversations = (savedConversations || []).map((chat: any) => ({
      id: chat.jid,
      customer: chat.name || chat.jid,
      initials: (chat.name || chat.jid).substring(0, 2).toUpperCase(),
      context: chat.last_message || 'Sem mensagem',
      origin: 'WhatsApp',
      lastActivity: chat.last_message_timestamp 
        ? new Date(chat.last_message_timestamp).toLocaleString('pt-BR')
        : '—',
      handledBy: 'IA' as const,
      status: 'Novo' as const
    }))

    res.json({
      success: true,
      data: conversations
    })
  } catch (error) {
    next(error)
  }
}

export async function getWhatsAppMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jid } = req.params
    const { limit = 50 } = req.body

    if (!jid) throw createError('jid é obrigatório', 400)

    const config = await resolveConfig(req.body?.config || req.body)
    const integration = await getWhatsAppIntegration()

    evolutionApiService.configure({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName
    })

    const messages = await evolutionApiService.getMessages(normalizeJid(jid), Number(limit))

    const { data: existing, error: existingError } = await supabase
      .from('whatsapp_messages')
      .select('id, jid, message_content, timestamp')
      .eq('jid', normalizeJid(jid))

    if (existingError) throw existingError

    const existingKeys = new Set(
      (existing || []).map((m: any) => `${m.timestamp}|${m.message_content}`)
    )

    for (const msg of messages) {
      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
      const timestamp = new Date(msg.messageTimestamp * 1000).toISOString()

      if (content && !existingKeys.has(`${timestamp}|${content}`)) {
        await supabase
          .from('whatsapp_messages')
          .insert({
            jid: normalizeJid(jid),
            message_content: content,
            direction: msg.key.fromMe ? 'outbound' : 'inbound',
            sender_type: msg.key.fromMe ? 'user' : 'contact',
            timestamp,
            push_name: msg.pushName,
            integration_id: integration?.id
          })
      }
    }

    const transformedMessages = messages.map((msg) => ({
      id: msg.key.id,
      content: msg.message.conversation || msg.message.extendedTextMessage?.text || '',
      direction: msg.key.fromMe ? 'outbound' : 'inbound',
      senderType: msg.key.fromMe ? 'user' : 'contact',
      timestamp: new Date(msg.messageTimestamp * 1000).toISOString(),
      pushName: msg.pushName
    }))

    res.json({
      success: true,
      data: transformedMessages
    })
  } catch (error) {
    next(error)
  }
}

export async function sendWhatsAppMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jid, text } = req.body

    if (!jid || !text) throw createError('jid e texto são obrigatórios', 400)

    const config = await resolveConfig(req.body?.config || req.body)
    const integration = await getWhatsAppIntegration()

    if (integration?.config?.phone && normalizeJid(jid) === normalizeJid(integration.config.phone)) {
      const { data: saved, error: saveError } = await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: text,
          last_message_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('jid', normalizeJid(jid))
        .select()
        .maybeSingle()

      if (saveError) throw saveError
      if (!saved) {
        await supabase
          .from('whatsapp_conversations')
          .insert({
            jid: normalizeJid(jid),
            name: 'Eu',
            last_message: text,
            last_message_timestamp: new Date().toISOString(),
            integration_id: integration?.id
          })
      }
    }

    evolutionApiService.configure({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName
    })

    const result = await evolutionApiService.sendMessage(normalizeJid(jid), text)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    next(error)
  }
}
