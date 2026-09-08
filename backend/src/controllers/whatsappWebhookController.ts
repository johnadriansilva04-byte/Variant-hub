import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'

function normalizeInboundJid(raw: string): string {
  const trimmed = (raw || '').trim().replace(/@s\.whatsapp\.net$/, '')
  if (trimmed.includes('@g.us') || trimmed.includes('@broadcast') || trimmed.includes('@lid')) {
    return trimmed
  }
  let clean = trimmed.replace(/[^0-9]/g, '')
  if (clean.length === 13 && clean.startsWith('55')) {
    clean = clean.slice(2)
  }
  if (/^[1-9]{2}\d{8,9}$/.test(clean) && !clean.startsWith('55')) {
    clean = `55${clean}`
  }
  return `${clean}@s.whatsapp.net`
}

function extractMessagePayload(event: any): any | null {
  const msg = event.data?.message || event.message || event.data
  if (!msg) return null
  const key = msg.key || event.data?.key || {}
  const remoteJid = key.remoteJid || msg.remoteJid || ''
  const fromMe = Boolean(key.fromMe || msg.fromMe)
  const content =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    msg.message?.listMessage?.title ||
    msg.message?.buttonsResponseMessage?.selectedButtonText ||
    msg.conversation ||
    ''
  const timestamp = msg.messageTimestamp || event.data?.messageTimestamp || Math.floor(Date.now() / 1000)
  return {
    remoteJid,
    fromMe,
    content,
    timestamp: Number(timestamp),
    pushName: msg.pushName || event.data?.pushName || null,
    messageId: key.id || null,
  }
}

async function saveInboundMessage(payload: any): Promise<{ messageId: string | null; isNew: boolean }> {
  if (!payload.remoteJid || !payload.content) {
    return { messageId: null, isNew: false }
  }

  const jid = normalizeInboundJid(payload.remoteJid)
  const tsIso = new Date(Number(payload.timestamp) * 1000).toISOString()

  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('timestamp', tsIso)
    .eq('jid', jid)
    .eq('message_content', payload.content)
    .limit(1)

  if (existing && existing.length > 0) {
    return { messageId: existing[0].id, isNew: false }
  }

  const { data: integration } = await supabase
    .from('integrations')
    .select('id')
    .eq('type', 'whatsapp')
    .limit(1)

  const { data: inserted, error } = await supabase
    .from('whatsapp_messages')
    .insert({
      jid,
      message_content: payload.content,
      direction: payload.fromMe ? 'outbound' : 'inbound',
      sender_type: payload.fromMe ? 'user' : 'contact',
      timestamp: tsIso,
      push_name: payload.pushName,
      integration_id: integration?.[0]?.id || null,
    })
    .select('id')
    .single()

  if (error) throw error

  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('id, name')
    .eq('jid', jid)
    .limit(1)

  const convName = payload.pushName || payload.remoteJid || jid
  if (conv && conv.length > 0) {
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message: payload.content,
        last_message_timestamp: tsIso,
        updated_at: new Date().toISOString(),
      })
      .eq('jid', jid)
  } else {
    await supabase
      .from('whatsapp_conversations')
      .upsert({
        jid,
        name: convName,
        last_message: payload.content,
        last_message_timestamp: tsIso,
        integration_id: integration?.[0]?.id || null,
      }, { onConflict: "jid", ignoreDuplicates: true })


  }

  return { messageId: inserted?.id || null, isNew: true }
}

export async function receiveWhatsAppWebhook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = req.body || {}
    const events = Array.isArray(body) ? body : Array.isArray(body.events) ? body.events : [body]

    let savedCount = 0
    for (const event of events) {
      if (event.event === 'connection.update' || event.event === 'qrcode.updated' || event.event === 'presence.update') {
        continue
      }
      const payload = extractMessagePayload(event)
      if (payload && payload.content) {
        const result = await saveInboundMessage(payload)
        if (result.isNew) savedCount++
      }
    }

    res.json({ success: true, saved: savedCount })
  } catch (error) {
    next(error)
  }
}

export async function syncWhatsAppMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { data: conversations } = await supabase
      .from('whatsapp_conversations')
      .select('jid, name')
      .order('last_message_timestamp', { ascending: false, nullsFirst: false })
      .limit(25)

    const rows = conversations || []
    if (rows.length === 0) {
      return res.json({ success: true, synced: 0, total: 0 })
    }

    const jidList = rows.map((r: any) => r.jid)

    const integration = await supabase
      .from('integrations')
      .select('config')
      .eq('type', 'whatsapp')
      .limit(1)

    const config = integration?.data?.[0]?.config
    if (!config?.apiUrl || !config.apiKey || !config.instanceName) {

      return res.json({ success: true, synced: 0, total: rows.length, error: 'whatsapp_nao_configurado' })
    }

    const { evolutionApiService } = await import('../services/evolutionApi')
    evolutionApiService.configure({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName
    })

    let syncedCount =  0
    const nowIso = new Date().toISOString()
    const syncRows = rows.slice(0, 10)
    await Promise.all(syncRows.map(async (row) => {
      try {
        const messages = await evolutionApiService.getMessages(row.jid, 30)
        for (const msg of messages) {
          const payload = extractMessagePayload({ data: msg } )
          if (payload && payload.content) {
            const before = await saveInboundMessage(payload)
            if (before.isNew) syncedCount++
          }
        }
      } catch (err: any) {
        console.error('sync failed for', row.jid, err?.message || err)
      }
    }))

    const { error: touchError } = await supabase
      .from('whatsapp_conversations')
      .update({ updated_at: nowIso })
      .in('jid', jidList)
    if (touchError) console.error('touch failed', touchError.message || touchError)

    res.json({ success: true, synced: syncedCount, total: rows.length })
  } catch (error) {
    next(error)
  }
}