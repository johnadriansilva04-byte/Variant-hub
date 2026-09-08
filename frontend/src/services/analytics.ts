import { api } from './api'

export interface DashboardData {
  whatsapp?: {
    activeConversations?: number
    uniqueContacts?: number
    messagesReceived?: number
    messagesSent?: number
    lastActivityAt?: string | null
    lastActivityFrom?: string | null
  }
  orders?: {
    todayCount?: number
    todayRevenue?: number
    totalOrders?: number
    totalRevenue?: number
  }
  channels?: Record<string, {
    configured?: boolean
    status?: string
    lastCheck?: string | null
    lastSync?: string | null
  }>
  funnel?: {
    reach?: number
    impressions?: number
    clicksToWhatsApp?: number
    conversationsInitiated?: number
    ordersFromWhatsApp?: number
    leadsGenerated?: number
  }
  channelTotals?: Record<string, {
    reach?: number
    impressions?: number
    engagementRate?: number
    clicksToWhatsApp?: number
    leadsGenerated?: number
  }>
}

const emptyFunnel = {
  reach: 0,
  impressions:  0,
  clicksToWhatsApp:  0,
  conversationsInitiated:  0,
  ordersFromWhatsApp:  0,
  leadsGenerated:  0,
}

function normalizeDashboard(data: any): DashboardData {
  if (!data || typeof data !== 'object') return {}
  return {
    whatsapp: data.whatsapp || {},
    orders: data.orders || {},
    channels: data.channels || {},
    funnel: { ...emptyFunnel, ...(data.funnel || {}) },
    channelTotals: data.channelTotals || {},
  }
}

export const analyticsService = {
  async getDashboard(): Promise<DashboardData> {
    try {
      const res = await api.get('/analytics/dashboard')
      return normalizeDashboard(res?.data || {})
    } catch {
      // Em dev sem backend, mantém a UI viva com zeros
      return {}
    }
  },

  async getActivity(limit: number = 15) {
    try {
      const res = await api.get(`/analytics/activity?limit=${limit}`)
      return res?.data || []
    } catch {
      return []
    }
  },
}

export function formatCurrency(value: number): string {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}