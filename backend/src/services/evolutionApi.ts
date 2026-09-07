import axios from 'axios'

const ENV_API_URL = process.env.EVOLUTION_API_URL

function normalizeRemoteJid(jid: string): string {
  const trimmed = jid.trim()
  if (trimmed.includes('@g.us') || trimmed.includes('@broadcast') || trimmed.includes('@lid')) {
    return trimmed.replace(/@s\.whatsapp\.net$/, '')
  }
  const clean = trimmed.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '').replace(/@broadcast$/, '').replace(/@lid$/, '').replace(/[^0-9]/g, '')
  return `${clean}@s.whatsapp.net`
}

export interface EvolutionApiConfig {
  apiUrl: string
  apiKey: string
  instanceName: string
}

export interface InstanceStatus {
  state: 'open' | 'close' | 'connecting'
  instance: {
    instanceName: string
    status: string
  }
}

export interface Chat {
  id: string
  name: string
  lastMessage: string
  lastMessageTimestamp: number
  unreadCount: number
}

export interface Message {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: {
    conversation?: string
    extendedTextMessage?: {
      text: string
    }
  }
  messageTimestamp: number
  pushName?: string
}

class EvolutionApiService {
  private config: EvolutionApiConfig | null = null

  configure(config: EvolutionApiConfig) {
    this.config = config
  }

  private get apiUrl(): string {
    if (!this.config) {
      throw new Error('Evolution API not configured')
    }
    return ENV_API_URL || this.config.apiUrl
  }

  private get headers(): Record<string, string> {
    if (!this.config) {
      throw new Error('Evolution API not configured')
    }
    return {
      'Content-Type': 'application/json',
      'apikey': this.config.apiKey
    }
  }

  async getInstanceStatus(): Promise<InstanceStatus> {
    const response = await axios.get(
      `${this.apiUrl}/instance/connectionState/${this.config?.instanceName}`,
      { headers: this.headers }
    )
    const data = response.data
    const state = data.state || data.instance?.state || 'close'
    return {
      state,
      instance: {
        instanceName: data.instance?.instanceName || this.config!.instanceName,
        status: data.instance?.status || data.instance?.state || state
      }
    }
  }

  async getChats(limit: number = 50): Promise<Chat[]> {
    const response = await axios.post(
      `${this.apiUrl}/chat/findChats/${this.config?.instanceName}`,
      { limit, offset: 0 },
      { headers: this.headers }
    )
    return (response.data || []).map((chat: any) => ({
      id: chat.remoteJid || chat.id,
      name: chat.pushName || chat.name || chat.remoteJid || chat.id,
      lastMessage:
        chat.lastMessage?.message?.conversation ||
        chat.lastMessage?.message?.extendedTextMessage?.text ||
        '',
      lastMessageTimestamp: chat.lastMessage?.messageTimestamp,
      unreadCount: chat.unreadCount || 0
    }))
  }

  async getMessages(jid: string, limit: number = 50): Promise<Message[]> {
    const response = await axios.post(
      `${this.apiUrl}/chat/findMessages/${this.config?.instanceName}`,
      {
        where: { key: { remoteJid: normalizeRemoteJid(jid) } },
        page: 1,
        offset: limit
      },
      { headers: this.headers }
    )
    const records = response.data?.messages?.records || response.data || []
    return records
  }

  async sendMessage(jid: string, text: string): Promise<any> {
    const response = await axios.post(
      `${this.apiUrl}/message/sendText/${this.config?.instanceName}`,
      {
        number: jid,
        text: text
      },
      { headers: this.headers }
    )
    return response.data
  }

  async getContacts(): Promise<any[]> {
    const response = await axios.post(
      `${this.apiUrl}/chat/findContacts/${this.config?.instanceName}`,
      { limit: 50, offset: 0 },
      { headers: this.headers }
    )
    return response.data
  }

  async createInstance(instanceName: string): Promise<any> {
    const response = await axios.post(
      `${this.apiUrl}/instance/create`,
      {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      },
      { headers: this.headers }
    )
    return response.data
  }

  async deleteInstance(instanceName: string): Promise<any> {
    const response = await axios.delete(
      `${this.apiUrl}/instance/delete/${instanceName}`,
      { headers: this.headers }
    )
    return response.data
  }

  async logoutInstance(instanceName: string): Promise<any> {
    const response = await axios.delete(
      `${this.apiUrl}/instance/logout/${instanceName}`,
      { headers: this.headers }
    )
    return response.data
  }
}

export const evolutionApiService = new EvolutionApiService()
