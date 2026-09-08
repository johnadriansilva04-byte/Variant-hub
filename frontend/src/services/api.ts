const API_URL = import.meta.env.VITE_API_URL || '/api'

export const API_TOKEN = 'variant-hub-demo-token'

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
  }
}

async function parseResponse(response: Response) {
  const json = await response.json().catch(() => ({}))
  if (!response.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || `Erro ${response.status} na API`)
  }
  return json
}

export const api = {
  async get(endpoint: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: authHeaders(),
    })
    return parseResponse(response)
  },

  async post(endpoint: string, body: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    return parseResponse(response)
  },

  async put(endpoint: string, body: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    return parseResponse(response)
  },

  async delete(endpoint: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    return parseResponse(response)
  },
}

export const integrationsApi = {
  async list() {
    return api.get('/integrations')
  },

  async get(id: string) {
    return api.get(`/integrations/${id}`)
  },

  async create(data: any) {
    return api.post('/integrations', data)
  },

  async update(id: string, data: any) {
    return api.put(`/integrations/${id}`, data)
  },

  async delete(id: string) {
    return api.delete(`/integrations/${id}`)
  },
}

export const whatsappApi = {
  async getConfig() {
    return api.get('/whatsapp/config')
  },

  async saveConfig(config: any) {
    return api.post('/whatsapp/config', config)
  },

  async getStatus(config: any) {
    return api.post('/whatsapp/status', config ?? {})
  },

  async getConversations(config?: any) {
    return api.post('/whatsapp/conversations', { config: config ?? {} })
  },

  async getMessages(jid: string, config?: any, limit = 50) {
    return api.post(`/whatsapp/messages/${jid}`, { config: config ?? {}, limit })
  },

  async sendMessage(jid: string, text: string, config?: any) {
    return api.post('/whatsapp/send', { jid, text, config: config ?? {} })
  },
}
