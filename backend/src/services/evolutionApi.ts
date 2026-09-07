import axios from 'axios'

const ENV_API_URL = process.env.EVOLUTION_API_URL

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

  async getChats(): Promise<Chat[]> {
    const response = await axios.get(
      `${this.apiUrl}/chat/findChats/${this.config?.instanceName}`,
      { headers: this.headers }
    )
    return response.data
  }

  async getMessages(jid: string, limit: number = 50): Promise<Message[]> {
    const response = await axios.get(
      `${this.apiUrl}/chat/findMessages/${this.config?.instanceName}`,
      {
        headers: this.headers,
        params: { jid, limit }
      }
    )
    return response.data
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
    const response = await axios.get(
      `${this.apiUrl}/chat/findContacts/${this.config?.instanceName}`,
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
