import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { createError } from '../middleware/errorHandler'

async function listIntegrations() {
  const { data, error } = await supabase
    .from('integrations')
    .select('id, type, status, connection_status, config, last_check, last_sync, error_message')
  if (error) throw error
  return data || []
}

const CHANNELS = ['whatsapp', 'instagram', 'facebook', 'telegram', 'tiktok']
const SOCIAL_CHANNELS = CHANNELS.filter(function (c: string) {
  return c !== 'whatsapp'
})

function sumMetric(rows: any[], metric: string): number {
    let total=0;
  for (const r of rows) {
    total += Number(r[metric]) || 0
  }
  return total
}

function latestActivityInfo(messages: any[], orders: any[]) {
  let at: string | null = null
  let from: string | null = null
  if (messages.length > 0) {
    at = messages[0].timestamp
    from = messages[0].direction === 'inbound' ? 'contato' : 'você'
  } else if (orders.length > 0) {
    at = orders[0].created_at
    from = orders[0].customer_name
  }
  return { at, from }
}

function channelSummaries(statsRows: any[], statusMap: any) {
  const out: any[] = []
  for (const t of SOCIAL_CHANNELS) {
    const rows = statsRows.filter(function (s: any) {
      return s.channel_type === t
    })
    out.push({
      type: t,
      configured: Boolean(statusMap[t]?.configured),
      status: statusMap[t]?.status || 'offline',
      stats: {
        reach: sumMetric(rows, 'reach'),
        impressions: sumMetric(rows, 'impressions'),
        engagementRate: sumMetric(rows, 'engagement_rate'),
        clicksToWhatsApp: sumMetric(rows, 'clicks_to_whatsapp'),
        leadsGenerated: sumMetric(rows, 'leads_generated'),
      },
    })
  }
  return out
}
export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const integrations = await listIntegrations()
    const [conv, msgs, orders, stats] = await Promise.all([
      supabase.from('whatsapp_conversations').select('id, jid'),
      supabase.from('whatsapp_messages').select('id, direction, timestamp'),
      supabase.from('orders').select('id, total, status, created_at, origin_channel'),
      supabase.from('channel_stats').select('channel_type, reach, impressions, engagement_rate, clicks_to_whatsapp, leads_generated'),
    ])
    if (conv.error) throw conv.error
    if (msgs.error) throw msgs.error
    if (orders.error) throw orders.error
    if (stats.error) throw stats.error

    const convRows = conv.data || []
    const msgRows = msgs.data || []
    const orderRows = orders.data || []
    const statRows = stats.data || []

    const now = new Date()
    let todayOrders =0
    let todayRevenue =0
    for (const o of orderRows) {
      const d = new Date(o.created_at)
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        todayOrders++
        todayRevenue += Number(o.total) || 0
      }
    }

    const statusMap: Record<string, any> = {}
    for (const i of integrations) {
      statusMap[i.type] = {
        configured: true,
        status: i.connection_status || 'offline',
        lastCheck: i.last_check,
        lastSync: i.last_sync,
      }
    }
    for (const t of CHANNELS) {
      if (!statusMap[t]) {
        statusMap[t] = { configured: false, status: 'not_configured' }
      }
    }

    const lastActivity = latestActivityInfo(msgRows, orderRows)


    res.json({
      success: true,
      data: {
        whatsapp: {
          activeConversations: convRows.length,
          uniqueContacts: new Set(convRows.map(function (c: any) {
            return c.jid
          })).size,
          messagesReceived: msgRows.filter(function (m: any) {
            return m.direction === 'inbound'
          }).length,
          messagesSent: msgRows.filter(function (m: any) {
            return m.direction === 'outbound'
          }).length,
          lastActivityAt: lastActivity.at,
          lastActivityFrom: lastActivity.from,
        },
        orders: {
          todayCount: todayOrders,
          todayRevenue: todayRevenue,
          totalOrders: orderRows.length,
          totalRevenue: orderRows.reduce(function (acc: number, o: any) {
            return acc + (Number(o.total) || 0)
          }, 0),
        },
        channels: statusMap,
        funnel: {
          reach: sumMetric(statRows, 'reach'),
          impressions: sumMetric(statRows, 'impressions'),
          clicksToWhatsApp: sumMetric(statRows, 'clicks_to_whatsapp'),
          conversationsInitiated: convRows.length,
          ordersFromWhatsApp: orderRows.filter(function (o: any) {
            return o.origin_channel === 'whatsapp'
          }).length,
          leadsGenerated: sumMetric(statRows, 'leads_generated'),
        },
        channelTotals: channelSummaries(statRows, statusMap),
      },
    })
  } catch (error) {
    next(error)
  }
}
export async function getActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(Number(req.query.limit) || 15, 30)
    const [msgs, ords] = await Promise.all([
      supabase.from('whatsapp_messages')
        .select('id, jid, message_content, direction, push_name, timestamp')
        .order('timestamp', { ascending: false })
        .limit(limit),
      supabase.from('orders')
        .select('id, order_number, customer_name, total, status, origin_channel, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ])
    if (msgs.error) throw msgs.error
    if (ords.error) throw ords.error

    const events: any[] = []
    const msgRows = msgs.data || []
    for (const m of msgRows) {
      events.push({
        id: m.id + '-msg',
        type: m.direction === 'inbound' ? 'whatsapp_inbound' : 'whatsapp_outbound',
        channel: 'whatsapp',
        title: m.direction === 'inbound' ? 'Nova mensagem no WhatsApp' : 'Mensagem enviada no WhatsApp',
        description: (m.message_content || ' ').substring(0, 180),
        contact: m.push_name || m.jid,
        timestamp: m.timestamp,
      })
    }

    const ordRows = ords.data || []
    for (const o of ordRows) {
      events.push({
        id: o.id + '-order',
        type: 'order',
        channel: o.origin_channel || 'store',
        title: 'Pedido ' + String(o.order_number || '' ).trim(),
        description: o.customer_name,
        contact: o.customer_name,
        timestamp: o.created_at,
      })
    }

    events.sort(function (a: any, b: any) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    const sliced = events.slice(0, limit)

    res.json({ success: true, data: sliced })
  } catch (error) {
    next(error)
  }
}

export async function getChannelAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type } = req.params
    if (!CHANNELS.includes(type) || type === 'whatsapp') {
      throw createError('Canal inválido',400)
    }

    const [intRes, statsRows] = await Promise.all([
      supabase.from('integrations')
        .select('id, type, status, connection_status, config, last_check, last_sync, error_message')
        .eq('type', type)
        .maybeSingle(),
      supabase.from('channel_stats')
        .select('reach, impressions, engagement_rate, clicks_to_whatsapp, leads_generated, stats_date')
        .eq('channel_type', type)
        .order('stats_date', { ascending: false })
        .limit(30),
    ])

    if (intRes.error) throw intRes.error
    const sRows = statsRows.data || []

    const aggr = {
      reach: sumMetric(sRows, 'reach'),
      impressions: sumMetric(sRows, 'impressions'),
      engagementRate: sRows.length > 0 ? sumMetric(sRows, 'engagement_rate') / sRows.length : 0,
      clicksToWhatsApp: sumMetric(sRows, 'clicks_to_whatsapp'),
      leadsGenerated: sumMetric(sRows, 'leads_generated'),
    }

    res.json({
      success: true,
      data: {
        configured: Boolean(intRes.data),
        status: intRes.data?.connection_status || (intRes.data ? 'offline' : 'not_configured'),
        lastCheck: intRes.data?.last_check,
        lastSync: intRes.data?.last_sync,
        error: intRes.data?.error_message,
        stats: aggr,
        latestStats: sRows[0] || null,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getFunnel(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [statsRes, convRes, ordRes] = await Promise.all([
      supabase.from('channel_stats').select('reach, clicks_to_whatsapp, leads_generated'),
      supabase.from('whatsapp_conversations').select('id'),
      supabase.from('orders').select('id, origin_channel'),
    ])

    if (statsRes.error) throw statsRes.error
    if (convRes.error) throw convRes.error
    if (ordRes.error) throw ordRes.error

    const statRows = statsRes.data || []
    const convCount = (convRes.data || []).length
    const whatsappOrders = (ordRes.data || []).filter(function (o: any) {
      return o.origin_channel === 'whatsapp'
    }).length

    const rate = convCount > 0 ? Math.round((whatsappOrders / convCount) * 100) : 0

    res.json({
      success: true,
      data: {
        reach: sumMetric(statRows, 'reach'),
        engagement: sumMetric(statRows, 'leads_generated'),
        clicksToWhatsApp: sumMetric(statRows, 'clicks_to_whatsapp'),
        conversationsInitiated: convCount,
        qualifiedLeads: sumMetric(statRows, 'leads_generated'),
        conversionsToOrder: whatsappOrders,
        conversionRate: rate,
      },
    })
  } catch (error) {
    next(error)
  }
}
