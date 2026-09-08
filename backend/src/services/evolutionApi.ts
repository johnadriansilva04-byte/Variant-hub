import axios from 'axios'

// ─────────────────────────────────────────────────────────────
// Evolution API client — única fonte da verdade.
// Regra de ouro: JIDs NUNCA são alterados aqui. O que a
// Evolution retorna é exatamente o que é armazenado.
// ─────────────────────────────────────────────────────────────

const ENV_API_URL = process.env.EVOLUTION_API_URL

export interface EvolutionApiConfig {
  apiUrl: string
  apiKey: string
  instanceName: string
}

export interface EvolutionChat {
  id: string // remoteJid exato (ex: 5548999880030@s.whatsapp.net)
  pushName: string | null
  name: string | null
  lastMessage: any | null
  lastMessageTimestamp: number | null
  unreadCount: number
  isGroup: boolean
}

export interface EvolutionContact {
  id: string
  pushName: string | null
  verifiedName: string | null
  profilePicUrl: string | null
}

export interface EvolutionMessage {
  key: { remoteJid: string; fromMe: boolean; id: string; participant?: string }
  message: any | null
  messageTimestamp: number
  pushName?: string
  status?: string
}

class EvolutionApiService {
  private config: EvolutionApiConfig | null = null

  configure(config: EvolutionApiConfig) {
    this.config = config
  }

  private get apiUrl(): string {
    if (!this.config) throw new Error('Evolution API não configurada')
    return ENV_API_URL || this.config.apiUrl
  }

  private get instanceName(): string {
    if (!this.config) throw new Error('Evolution API não configurada')
    return this.config.instanceName
  }

  private get headers(): Record<string, string> {
    if (!this.config) throw new Error('Evolution API não configurada')
    return { 'Content-Type': 'application/json', apikey: this.config.apiKey }
  }

  // ── Instância ──────────────────────────────────────────────

  async getInstanceStatus(): Promise<{ state: string; phone?: string; ownerJid?: string }> {
    const { data } = await axios.get(
      `${this.apiUrl}/instance/connectionState/${this.instanceName}`,
      { headers: this.headers }
    )
    const state = data?.state || data?.instance?.state || 'close'
    return {
      state,
      phone: data?.phone || data?.instance?.phone || undefined,
      ownerJid: data?.ownerJid || data?.instance?.ownerJid || undefined
    }
  }

  /** Detecta o número dono da instância (o operador) para filtrar conversas consigo mesmo */
  async getOwnerJid(): Promise<string | null> {
    try {
      const { data } = await axios.get(
        `${this.apiUrl}/instance/fetchInstances`,
        { headers: this.headers }
      )
      const list = Array.isArray(data) ? data : data?.instances || []
      const inst = list.find((i: any) => i.instanceName === this.instanceName) || list[0]
      return inst?.ownerJid || inst?.phone?.number || inst?.phone || null
    } catch {
      try {
        const status = await this.getInstanceStatus()
        return status.ownerJid || status.phone || null
      } catch {
        return null
      }
    }
  }

  // ── Chats / Contatos ───────────────────────────────────────

  async getChats(limit = 100): Promise<EvolutionChat[]> {
    const { data } = await axios.post(
      `${this.apiUrl}/chat/findChats/${this.instanceName}`,
      { limit, offset: 0 },
      { headers: this.headers }
    )
    const list: any[] = Array.isArray(data) ? data : data?.chats || []
    return list.map((c: any) => {
      const id = c.remoteJid || c.id || ''
      const lm = c.lastMessage?.message || c.lastMessage || null
      return {
        id,
        pushName: c.pushName || null,
        name: c.name || c.contactName || null,
        lastMessage: lm,
        lastMessageTimestamp: typeof c.lastMessage === 'number' ? c.lastMessage : (lm?.messageTimestamp ?? c.lastMessage?.messageTimestamp ?? null),
        unreadCount: c.unreadCount || 0,
        isGroup: id.includes('@g.us') || id.includes('@broadcast')
      }
    })
  }

  async getContacts(limit = 200): Promise<EvolutionContact[]> {
    const { data } = await axios.post(
      `${this.apiUrl}/chat/findContacts/${this.instanceName}`,
      { limit, offset: 0 },
      { headers: this.headers }
    )
    const list: any[] = Array.isArray(data) ? data : data?.contacts || []
    return list.map((c: any) => ({
      id: c.remoteJid || c.id || '',
      pushName: c.pushName || null,
      verifiedName: c.verifiedName || c.verifiedNameBusiness || null,
      profilePicUrl: c.profilePicUrl || null
    }))
  }

  async getProfilePic(jid: string): Promise<string | null> {
    try {
      const { data } = await axios.post(
        `${this.apiUrl}/chat/findProfilePic/${this.instanceName}`,
        { remoteJid: jid },
        { headers: this.headers }
      )
      return data?.profilePicUrl || data?.url || null
    } catch {
      return null
    }
  }

  // ── Mensagens ──────────────────────────────────────────────

  async getMessages(jid: string, limit = 50): Promise<EvolutionMessage[]> {
    const { data } = await axios.post(
      `${this.apiUrl}/chat/findMessages/${this.instanceName}`,
      {
        where: { key: { remoteJid: jid } },
        page: 1,
        offset: 0,
        limit
      },
      { headers: this.headers }
    )
    const records: any[] = data?.messages?.records || (Array.isArray(data) ? data : [])
    return records
  }

  /** Busca a mídia (base64) de uma mensagem diretamente na Evolution */
  async getMediaBase64(message: any): Promise<{ base64: string; mimetype: string } | null> {
    if (!message?.message) return null
    try {
      const { data } = await axios.post(
        `${this.apiUrl}/chat/getBase64FromMediaMessage/${this.instanceName}`,
        { message: message.message },
        { headers: this.headers, timeout: 20000 }
      )
      const base64 = data?.base64 || data?.data || null
      const mimetype =
        data?.mimetype ||
        message.message?.imageMessage?.mimetype ||
        message.message?.videoMessage?.mimetype ||
        message.message?.audioMessage?.mimetype ||
        message.message?.documentMessage?.mimetype ||
        'application/octet-stream'
      return base64 ? { base64, mimetype } : null
    } catch (err: any) {
      console.error('getMediaBase64 failed:', err?.response?.data?.message || err?.message)
      return null
    }
  }

  // ── Envio ──────────────────────────────────────────────────

  async sendMessage(jid: string, text: string): Promise<any> {
    const isGroup = jid.includes('@g.us') || jid.includes('@broadcast')
    const number = isGroup ? jid : jid.split('@')[0]
    const { data } = await axios.post(
      `${this.apiUrl}/message/sendText/${this.instanceName}`,
      { number, text },
      { headers: this.headers }
    )
    return data
  }

  // ── Webhook ────────────────────────────────────────────────

  async setWebhook(events: string[] = ['messages.upsert', 'messages.update', 'send.update', 'connection.update']): Promise<void> {
    if (!this.config) return
    const url = `${process.env.PUBLIC_BASE_URL || 'https://variant-hub.vercel.app'}/api/whatsapp/webhook`
    try {
      await axios.post(
        `${this.apiUrl}/webhook/set/${this.instanceName}`,
        { webhook: { url, events, enabled: true } },
        { headers: this.headers }
      )
    } catch {
      try {
        await axios.post(
          `${this.apiUrl}/webhook/set/${this.instanceName}`,
          { url, events, enabled: true },
          { headers: this.headers }
        )
      } catch (err2: any) {
        console.error('setWebhook failed:', err2?.response?.data?.message || err2?.message)
      }
    }
  }

  // ── Gerenciamento (manutenção) ─────────────────────────────

  async createInstance(instanceName: string): Promise<any> {
    const { data } = await axios.post(
      `${this.apiUrl}/instance/create`,
      { instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
      { headers: this.headers }
    )
    return data
  }

  async deleteInstance(instanceName: string): Promise<any> {
    const { data } = await axios.delete(
      `${this.apiUrl}/instance/delete/${instanceName}`,
      { headers: this.headers }
    )
    return data
  }

  async logoutInstance(instanceName: string): Promise<any> {
    const { data } = await axios.delete(
      `${this.apiUrl}/instance/logout/${instanceName}`,
      { headers: this.headers }
    )
    return data
  }
}

export const evolutionApiService = new EvolutionApiService()