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

    // Registra o webhook na Evolution para receber mensagens em tempo real
    try {
      evolutionApiService.configure(config)
      await evolutionApiService.setWebhook()
    } catch {
      // webhook é best-effort; o sync de 30s cobre eventuais falhas
    }

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
    const config = await resolveConfig(req.body?.config || req.body)

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

// ── Phone helpers ──────────────────────────────────────────────
// Brazilian phone: DDD (2) + 9 digits (mobile, starts with 9) or 8 digits (landline)
// JID format from Evolution API: 55XXXXXXXXXXX@s.whatsapp.net (13 digits with country code)

/** Extract digits from a JID, stripping @s.whatsapp.net */
function jidDigits(rawJid: string): string {
  return (rawJid || '').trim().split('@')[0].replace(/[^0-9]/g, '')
}

/** Format Brazilian phone for display: (48) 99880-030 */
function formatBR(digits: string): string {
  const d = digits.replace(/^55/, '')  // strip country code
  if (d.length === 11) {
    // Mobile: DDD(2) + 9(1) + 8 = 11 digits
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }
  if (d.length === 10) {
    // Landline: DDD(2) + 8 = 10 digits
    return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  }
  return d  // fallback: just show digits
}

/** Normalize JID for database key — keep domain suffix for groups/lid */
function normalizeJid(raw: string): string {
  const s = (raw || '').trim()
  if (s.includes('@g.us') || s.includes('@lid') || s.includes('@broadcast')) return s
  // Phone: strip @s.whatsapp.net, keep digits with 55 prefix
  return jidDigits(s)
}

/** Check if JID is the user's own number */
function isSelfJid(rawJid: string, selfPhone?: string): boolean {
  if (!selfPhone) return false
  const sp = String(selfPhone).replace(/[^0-9]/g, '')
  const jd = jidDigits(rawJid)
  return jd === sp || jd === `55${sp}` || jd.replace(/^55/, '') === sp.replace(/^55/, '')
}

/** Resolve display name for a chat */
function cleanChatName(rawJid: string, pushName: string | null | undefined, selfPhone?: string): string {
  const name = (pushName || '').trim()
  // 1. Self → "Você"
  if (isSelfJid(rawJid, selfPhone)) return 'Você'
  // 2. Real push name (not a number, not junk)
  if (name && !name.includes('@') && !/^\d{6,}$/.test(name) && !['contato','you','eu'].includes(name.toLowerCase())) {
    return name
  }
  // 3. Group
  if (rawJid.includes('@g.us')) return 'Grupo'
  // 4. LID / broadcast — no phone number available
  if (rawJid.includes('@lid') || rawJid.includes('@broadcast')) {
    return name || 'Sem nome'
  }
  // 5. Phone number → format
  const digits = jidDigits(rawJid)
  if (digits.length >= 10) return formatBR(digits)
  return name || 'Sem nome'
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

const selfPhone = (candidate && candidate.phone) || (integration?.config && (integration.config as any).phone)
    // Cache curto: se o Supabase ja foi sincronizado ha menos de 25s,
    // retorna direto do banco sem chamar a Evolution API (evita lentidao no painel
    const { data: lastUpdatedRows } = await supabase
      .from('whatsapp_conversations')
      .select('updated_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)

    const lastUpdated = lastUpdatedRows?.[0]?.updated_at
    const fresh = lastUpdated &&
      Date.now() - new Date(lastUpdated).getTime() < 25_000

    if (fresh) {
      const { data: cachedConversations, error: cacheError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_timestamp', { ascending: false, nullsFirst: false })
        .limit(200)

      if (cacheError) throw cacheError

      const rawCached = (cachedConversations || []).map((chat: any) => {
        const displayName = cleanChatName(chat.jid, chat.name, selfPhone)
        const rawPreview = chat.last_message || ''
        const preview = rawPreview.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Sem mensagem'
        const isSelf = isSelfJid(chat.jid, selfPhone)
        return {
          id: chat.jid,
          customer: displayName,
          initials: displayName.substring(0, 2).toUpperCase(),
          context: preview,
          origin: 'WhatsApp',
          isSelf,
          lastActivity: chat.last_message_timestamp
            ? new Date(chat.last_message_timestamp).toLocaleString('pt-BR')
            : '—',
          lastTimestamp: chat.last_message_timestamp || null,
          handledBy: 'IA' as const,
          status: 'Novo' as const
        }
      })
      const cachedConversationsSorted = rawCached
        .filter((c: any) => !c.isSelf)
        .sort((a: any, b: any) => {
          const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0
          const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0
          return tb - ta
        })
        .map(({ lastTimestamp: _, isSelf: __, ...rest }: any) => rest)

      return res.json({
        success: true,
        data: cachedConversationsSorted
      })
    }

    evolutionApiService.configure({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName
    })

    const chats = await evolutionApiService.getChats(500)

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
      name: cleanChatName(chat.id, chat.name, selfPhone),
      last_message: lastMessageOf(chat),
      last_message_timestamp: lastMessageTimestampOf(chat)
        ? new Date(lastMessageTimestampOf(chat) * 1000).toISOString()
        : null,
      unread_count: chat.unreadCount || 0,
      integration_id: integration?.id,
      updated_at: new Date().toISOString()
    }))

    const canonicalJids = rows.map(r => r.jid)
    const legacyToCanonical = new Map<string, string>()

    const digitsOf = (jid: string): string => jid.split('@')[0].replace(/[^0-9]/g, '')
    const shortOf = (jid: string): string => { const d = digitsOf(jid); return d.startsWith('55') ? d.slice(2) : d }
    const canonicalize = (jid: string): string | null => {
      const dig = digitsOf(jid)
      if (dig.length < 10 || dig.length > 13) return null
      const ddd = shortOf(jid).slice(0, 2)
      const tail = shortOf(jid).slice(-6)
      const cands = canonicalJids.filter(o => {
        const od = digitsOf(o)
        if (od.length !== 12 || !od.startsWith('55')) return false
        const os = shortOf(o)
        return os.slice(0, 2) === ddd && os.slice(-6) === tail
      })
      if (cands.length === 0) return null
      return cands[0]
    }

    for (const jid of canonicalJids) {
      const canon = canonicalize(jid)
      if (canon && canon !== jid) legacyToCanonical.set(jid, canon)
    }

    const canonicalGroups = new Map<string, string[]>()
    for (const [legacy, canon] of legacyToCanonical.entries()) {
      const list = canonicalGroups.get(canon) || []
      list.push(legacy)
      canonicalGroups.set(canon, list)
    }
    await Promise.all([...canonicalGroups.entries()].map(async ([canon, legacies]) => {
      const { error: reasError } = await supabase
        .from('whatsapp_messages')
        .update({ jid: canon })
        .in('jid', legacies)
      if (reasError) throw reasError

      const { error: delError } = await supabase
        .from('whatsapp_conversations')
        .delete()
        .in('jid', legacies)
      if (delError) throw delError
    }))
    const seenRows = new Set<string>()
    const uniqueRows = rows.filter((r: any) => {
      const k = r.jid
      if (seenRows.has(k)) return false
      seenRows.add(k)
      return true
    })
    if (uniqueRows.length > 0) {
      for (let i = 0; i < uniqueRows.length; i += 100) {
        const { error: upsertError } = await supabase
          .from('whatsapp_conversations')
          .upsert(uniqueRows.slice(i, i + 100), {
            onConflict: 'jid',
            ignoreDuplicates: false
          })
        if (upsertError) throw upsertError
      }

      const activeJids = new Set(uniqueRows.map(r => r.jid))
      const { data: staleAll, error: staleErr } = await supabase
        .from('whatsapp_conversations')
        .select('jid')
      if (staleErr) throw staleErr
      const staleJids = (staleAll || []).map((c: any) => c.jid).filter((j: string) => !activeJids.has(j))
      if (staleJids.length > 0) {
        await supabase.from('whatsapp_messages').delete().in('jid', staleJids)
        await supabase.from('whatsapp_conversations').delete().in('jid', staleJids)
      }
    }

    const { data: savedConversations, error: fetchError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_timestamp', { ascending: false, nullsFirst: false })
      .limit(200)

    if (fetchError) throw fetchError
    const savedJids = (savedConversations || []).map((c: any) => c.jid)
    const shortOf2 = (jid: string): string => { const d = jid.split('@')[0].replace(/[^0-9]/g, ''); return d.startsWith('55') ? d.slice(2) : d }
    const canonOf = (jid: string): string | null => {
      const dig = jid.split('@')[0].replace(/[^0-9]/g, '')
      if (dig.length < 10 || dig.length > 13) return null
      const ddd = shortOf2(jid).slice(0, 2)
      const tail = shortOf2(jid).slice(-6)
      const cands = savedJids.filter(o => {
        const od = o.split('@')[0].replace(/[^0-9]/g, '')
        if (od.length !== 12 || !od.startsWith('55')) return false
        const os = shortOf2(o)
        return os.slice(0, 2) === ddd && os.slice(-6) === tail
      })
      if (cands.length === 0) return null
      return cands[0]
    }

    const legacyPairs = new Map<string, string>()
    for (const jid of savedJids) {
      const canon = canonOf(jid)
      if (canon && canon !== jid) legacyPairs.set(jid, canon)
    }

    const legacyGroups = new Map<string, string[]>()
    for (const [legacy, canon] of legacyPairs.entries()) {
      const list = legacyGroups.get(canon) || []
      list.push(legacy)
      legacyGroups.set(canon, list)
    }
    await Promise.all([...legacyGroups.entries()].map(async ([canon, legacies]) => {
      await supabase.from('whatsapp_messages').update({ jid: canon }) .in('jid', legacies)
      await supabase.from('whatsapp_conversations').delete().in('jid', legacies)
    }))


    const rawConversations = (savedConversations || []).map((chat: any) => {
      const displayName = cleanChatName(chat.jid, chat.name, selfPhone)
      const rawPreview = chat.last_message || ''
      // Trunca preview: max 80 chars, sem quebras de linha
      const preview = rawPreview.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Sem mensagem'
      return {
        id: chat.jid,
        customer: displayName,
        initials: displayName.substring(0, 2).toUpperCase(),
        context: preview,
        origin: 'WhatsApp',
        isSelf: isSelfJid(chat.jid, selfPhone),
        lastActivity: chat.last_message_timestamp 
          ? new Date(chat.last_message_timestamp).toLocaleString('pt-BR')
          : '—',
        lastTimestamp: chat.last_message_timestamp || null,
        handledBy: 'IA' as const,
        status: 'Novo' as const
      }
    })

    // Filtra self e ordena por timestamp desc
    const conversations = rawConversations
      .filter((c: any) => !c.isSelf)
      .sort((a: any, b: any) => {
        const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0
        const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0
        return tb - ta
      })
      .map(({ lastTimestamp: _, isSelf: __, ...rest }: any) => rest)

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

    const toInsert = messages
      .filter((msg: any) => {
        const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
        const timestamp = new Date(Number(msg.messageTimestamp) * 1000).toISOString()
        return content && !existingKeys.has(`${timestamp}|${content}`)
      })
      .map((msg: any) => ({
        jid: normalizeJid(jid),
        message_content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
        direction: msg.key.fromMe ? 'outbound' : 'inbound',
        sender_type: msg.key.fromMe ? 'user' : 'contact',
        timestamp: new Date(Number(msg.messageTimestamp) * 1000).toISOString(),
        push_name: msg.pushName,
        integration_id: integration?.id
      }))

    if (toInsert.length > 0) {
      for (let i = 0; i < toInsert.length; i += 100) {
        const { error: insertError } = await supabase
          .from('whatsapp_messages')
          .insert(toInsert.slice(i, i + 100))
        if (insertError) throw insertError
      }
    }

    const transformedMessages = messages.map((msg) => ({
      id: msg.key.id,
      content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
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

    const normalizedJid = normalizeJid(jid)
    const isSelf = integration?.config?.phone && normalizedJid === normalizeJid(integration.config.phone)

    // Atualiza a conversa (existe ou cria) com a última mensagem
    const { data: saved, error: saveError } = await supabase
      .from('whatsapp_conversations')
      .update({
        last_message: text,
        last_message_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('jid', normalizedJid)
      .select()
      .maybeSingle()

    if (saveError) throw saveError
    if (!saved) {
      const { error: insertConvError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          jid: normalizedJid,
          name: isSelf ? 'Eu' : normalizedJid,
          last_message: text,
          last_message_timestamp: new Date().toISOString(),
          integration_id: integration?.id
        })
      if (insertConvError) throw insertConvError
    }

    // Persiste a mensagem enviada no banco para o painel refletir imediatamente
    const sentTimestamp = new Date().toISOString()
    const { error: insertMsgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        jid: normalizedJid,
        message_content: text,
        direction: 'outbound',
        sender_type: 'user',
        timestamp: sentTimestamp,
        push_name: null,
        integration_id: integration?.id
      })
    if (insertMsgError) throw insertMsgError

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
