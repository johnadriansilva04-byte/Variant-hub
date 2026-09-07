import { useState } from 'react'
import { Send, RefreshCw, MessageCircle, ArrowLeft } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'
import StatusBadge from '../../components/ui/StatusBadge'
import Stat from '../../components/ui/Stat'
import { useIntegrationStatus } from '../../hooks/useIntegrationStatus'
import { whatsappApi } from '../../services/api'
import { whatsappService } from '../../services/whatsapp'

export default function WhatsApp() {
  const { status } = useIntegrationStatus('whatsapp')
  const [evolutionConfig, setEvolutionConfig] = useState({
    apiUrl: '',
    apiKey: '',
    instanceName: ''
  })
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [stats, setStats] = useState({ activeConversations: 0, uniqueContacts: 0, messagesReceived: 0, messagesSent: 0 })

  const testConnection = async () => {
    setConnectionStatus('connecting')
    try {
      const result = await whatsappApi.getStatus(evolutionConfig)
      if (result.data.connected) {
        setConnectionStatus('connected')
        await loadConversations()
        await loadStats()
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      setConnectionStatus('error')
    }
  }

  const loadConversations = async () => {
    try {
      const result = await whatsappApi.getConversations(evolutionConfig)
      setConversations(result.data || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadStats = async () => {
    try {
      const data = await whatsappService.getStats()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadMessages = async (jid: string) => {
    try {
      const result = await whatsappApi.getMessages(jid, evolutionConfig)
      setMessages(result.data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return
    try {
      await whatsappApi.sendMessage(selectedChat, newMessage, evolutionConfig)
      setNewMessage('')
      await loadMessages(selectedChat)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleChatSelect = (jid: string) => {
    setSelectedChat(jid)
    loadMessages(jid)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="store"
        zoneLabel="LOJA · WhatsApp"
        title="Atendimento WhatsApp"
        description="Conecte com a Evolution API e gerencie todas as conversas em um único lugar."
      />

      <Panel title="Configuração da Evolution API" className="rounded-2xl">
        <p className="text-sm text-dark-400 mb-4">
          Insira os dados da sua instância da Evolution API para conectar o WhatsApp.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="apiUrl" className="block text-xs font-medium text-dark-300">URL da API</label>
            <input
              type="text"
              id="apiUrl"
              className="input"
              value={evolutionConfig.apiUrl}
              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiUrl: e.target.value })}
              placeholder="Ex: http://localhost:8080"
            />
          </div>
          <div>
            <label htmlFor="apiKey" className="block text-xs font-medium text-dark-300">API Key</label>
            <input
              type="text"
              id="apiKey"
              className="input"
              value={evolutionConfig.apiKey}
              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiKey: e.target.value })}
              placeholder="Sua chave de API"
            />
          </div>
          <div>
            <label htmlFor="instanceName" className="block text-xs font-medium text-dark-300">Nome da Instância</label>
            <input
              type="text"
              id="instanceName"
              className="input"
              value={evolutionConfig.instanceName}
              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, instanceName: e.target.value })}
              placeholder="Ex: minha-instancia"
            />
          </div>
          <button
            onClick={testConnection}
            disabled={connectionStatus === 'connecting'}
            className="btn-store text-xs"
          >
            {connectionStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Conectando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Testar conexão
              </>
            )}
          </button>
        </div>
        <div className="mt-4">
          <StatusBadge tone={status === 'online' ? 'green' : 'red'}>
            {status === 'online' ? 'Conectado' : 'Offline'}
          </StatusBadge>
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Conversas ativas" value={stats.activeConversations.toString()} tone="store" sub="agora" />
        <Stat label="Contatos únicos" value={stats.uniqueContacts.toString()} tone="store" sub="total" />
        <Stat label="Mensagens recebidas" value={stats.messagesReceived.toString()} tone="store" sub="hoje" />
        <Stat label="Mensagens enviadas" value={stats.messagesSent.toString()} tone="store" sub="hoje" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <Panel title="Conversas" className="rounded-2xl h-full overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin">
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-dark-400">Nenhuma conversa</p>
                <p className="text-xs text-dark-500 mt-1">Configure a integração para começar</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleChatSelect(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChat === conv.id ? 'bg-dark-800 border border-dark-700' : 'hover:bg-dark-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-800 text-dark-300 text-xs font-bold flex items-center justify-center">
                        {conv.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-200 truncate">{conv.customer}</p>
                        <p className="text-xs text-dark-500 truncate">{conv.context}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title={selectedChat ? 'Chat' : 'Selecione uma conversa'} className="lg:col-span-2 rounded-2xl h-full overflow-hidden">
          {selectedChat ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 p-4 border-b border-dark-800">
                <button onClick={() => setSelectedChat(null)} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark-200">
                    {conversations.find(c => c.id === selectedChat)?.customer}
                  </p>
                  <p className="text-xs text-dark-500">WhatsApp</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-dark-400">Nenhuma mensagem</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.direction === 'outbound'
                            ? 'bg-store-500/20 text-dark-200'
                            : 'bg-dark-800 text-dark-200'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-[10px] text-dark-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-dark-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-sm text-dark-200 focus:outline-none focus:border-dark-600"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="btn-store px-4"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-sm text-dark-400">Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
