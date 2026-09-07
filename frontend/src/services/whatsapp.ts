import { supabase } from '../lib/supabase'

export const whatsappService = {
  async getConversations() {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_timestamp', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getMessages(jid: string) {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('jid', jid)
      .order('timestamp', { ascending: false })
      .limit(50)
    
    if (error) throw error
    return data || []
  },

  async getStats() {
    const { data: conversations, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('jid')
    
    if (convError) throw convError
    
    const { data: messages, error: msgError } = await supabase
      .from('whatsapp_messages')
      .select('direction')
    
    if (msgError) throw msgError
    
    const uniqueContacts = new Set(conversations?.map(c => c.jid) || [])
    const messagesReceived = messages?.filter(m => m.direction === 'inbound').length || 0
    const messagesSent = messages?.filter(m => m.direction === 'outbound').length || 0
    
    return {
      activeConversations: conversations?.length || 0,
      uniqueContacts: uniqueContacts.size,
      messagesReceived,
      messagesSent,
      totalChats: conversations?.length || 0
    }
  }
}
