import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'
import { evolutionApiService } from '../services/evolutionApi'

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

export async function getWhatsAppConversations(req: AuthRequest, res: Response, next: NextFunction) {
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

    const chats = await evolutionApiService.getChats()

    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('type', 'whatsapp')
      .single()

    for (const chat of chats) {
      await supabase
        .from('whatsapp_conversations')
        .upsert({
          jid: chat.id,
          name: chat.name || chat.id.split('@')[0],
          last_message: chat.lastMessage || '',
          last_message_timestamp: new Date(chat.lastMessageTimestamp * 1000).toISOString(),
          unread_count: chat.unreadCount || 0,
          integration_id: integration?.id,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'jid',
          ignoreDuplicates: false
        })
    }

    const { data: savedConversations, error: fetchError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_timestamp', { ascending: false })

    if (fetchError) throw fetchError

    const conversations = (savedConversations || []).map((chat: any) => ({
      id: chat.jid,
      customer: chat.name,
      initials: (chat.name || chat.jid.split('@')[0]).substring(0, 2).toUpperCase(),
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
    const { limit = 50, ...config } = req.body

    if (!config || !config.apiUrl || !config.apiKey || !config.instanceName) {
      throw createError('Configuração incompleta', 400)
    }

    evolutionApiService.configure({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName
    })

    const messages = await evolutionApiService.getMessages(jid, Number(limit))

    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('type', 'whatsapp')
      .single()

    for (const msg of messages) {
      await supabase
        .from('whatsapp_messages')
        .upsert({
          jid: jid,
          message_content: msg.message.conversation || msg.message.extendedTextMessage?.text || '',
          direction: msg.key.fromMe ? 'outbound' : 'inbound',
          sender_type: msg.key.fromMe ? 'user' : 'contact',
          timestamp: new Date(msg.messageTimestamp * 1000).toISOString(),
          push_name: msg.pushName,
          integration_id: integration?.id
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false
        })
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
    const { jid, text, ...config } = req.body

    if (!config || !config.apiUrl || !config.apiKey || !config.instanceName) {
      throw createError('Configuração incompleta', 400)
    }

    evolutionApiService.configure({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName
    })

    const result = await evolutionApiService.sendMessage(jid, text)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    next(error)
  }
}
