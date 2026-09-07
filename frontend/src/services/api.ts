const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = {
  async get(endpoint: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return response.json()
  },

  async post(endpoint: string, body: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    return response.json()
  },

  async put(endpoint: string, body: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    return response.json()
  },

  async delete(endpoint: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return response.json()
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
  async getStatus(config: any) {
    return api.post('/whatsapp/status', config)
  },

  async getConversations(config: any) {
    return api.post('/whatsapp/conversations', config)
  },

  async getMessages(jid: string, config: any, limit = 50) {
    return api.post(`/whatsapp/messages/${jid}`, { ...config, limit })
  },

  async sendMessage(jid: string, text: string, config: any) {
    return api.post('/whatsapp/send', { jid, text, ...config })
  },
}
