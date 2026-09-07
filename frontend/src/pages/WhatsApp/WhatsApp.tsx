import { useState, useEffect, useCallback } from 'react'
import { Send, RefreshCw, MessageCircle, ArrowLeft, Wifi, WifiOff, Loader2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'
import StatusBadge from '../../components/ui/StatusBadge'
import Stat from '../../components/ui/Stat'
import { useIntegrationStatus } from '../../hooks/useIntegrationStatus'
import { whatsappApi } from '../../services/api'
import { whatsappService } from '../../services/whatsapp'

type ConnStatus = 'idle' | 'connecting' | 'connected' | 'error'

export default function WhatsApp() {
  const { status } = useIntegrationStatus('whatsapp')
  const [evolutionConfig, setEvolutionConfig] = useState({
    apiUrl: '',
    apiKey: '',
    instanceName: '',
    phone: ''
  })
  const [connectionStatus, setConnectionStatus] = useState<ConnStatus>('idle')
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [stats, setStats] = useState({ activeConversations: 0, uniqueContacts: 0, messagesReceived: 0, messagesSent:  0 })
    const [saved, setSaved] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const loadConversations = useCallback(async (config?: any) => {
    setLoadingConversations(true)
    setErrorMsg('')
    try {
      const result = await whatsappApi.getConversations(config?.apiUrl ? config : undefined)
      setConversations(result.data || [])
    } catch (error: any) {
      setErrorMsg(error?.message || 'Erro ao carregar conversas')
      console.error('Error loading conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const data = await whatsappService.getStats()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [])

  const loadMessages = useCallback(async (jid: string, config?: any) => {
    setLoadingMessages(true)
    try {
      const result = await whatsappApi.getMessages(jid, config?.apiUrl ? config : undefined)
      setMessages(result.data || [])
    } catch (error: any) {
      setErrorMsg(error?.message || 'Erro ao carregar mensagens')
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const loadSavedConfig = async () => {
    try {
      const result = await whatsappApi.getConfig()
      const cfg = result.data
      if (cfg?.apiUrl || cfg?.instanceName) {
        setEvolutionConfig({
          apiUrl: cfg.apiUrl || '',
          apiKey: cfg.apiKey || '',
          instanceName: cfg.instanceName || '',
          phone: cfg.phone || ''
        })
        setSaved(true)
        return cfg
      }
    } catch (error) {
      console.error('Error loading saved config:', error)
    }
    return null
  }

  const testConnection = async (config?: any) => {
    const cfg = config || evolutionConfig
    if (!cfg.apiUrl || !cfg.apiKey || !cfg.instanceName) {
      setConnectionStatus('error')
      setErrorMsg('Preencha URL, API Key e nome da instância')
      return false
    }

    setConnectionStatus('connecting')
    setErrorMsg('')
    try {
      const result = await whatsappApi.getStatus(cfg)
      if (result.data?.connected) {
        setConnectionStatus('connected')
        await loadConversations(cfg)
        await loadStats()
        return true
      } else {
        setConnectionStatus('error')
        setErrorMsg('Instância não está conectada no WhatsApp')
        return false
      }
    } catch (error: any) {
      setConnectionStatus('error')
      setErrorMsg(error?.message || 'Falha ao conectar com a Evolution API')
      return false
    }
  }

  const saveConfig = async () => {
    setConnectionStatus('connecting')
    setErrorMsg('')
    try {
      const result = await whatsappApi.saveConfig(evolutionConfig)
      if (result.success) {
        setSaved(true)
        const ok = await testConnection(evolutionConfig)
        if (!ok) setConnectionStatus('error')
      } else {
        setConnectionStatus('error')
        setErrorMsg('Falha ao salvar configuração')
      }
    } catch (error: any) {
      setConnectionStatus('error')
      setErrorMsg(error?.message || 'Falha ao salvar configuração')
    }
  }

  useEffect(() => {
    loadSavedConfig().then((cfg) => {
      if (cfg) {
        void testConnection(cfg)
      }
    })
  }, [])

  const handleChatSelect = (jid: string) => {
    setSelectedChat(jid)
    loadMessages(jid, evolutionConfig)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return
    setSending(true)
    try {
      const result = await whatsappApi.sendMessage(selectedChat, newMessage, evolutionConfig.apiUrl ? evolutionConfig : undefined)
      console.log('Send result:', result)
      setNewMessage('')
      await loadMessages(selectedChat, evolutionConfig)
      await loadConversations(evolutionConfig)
    } catch (error: any) {
      setErrorMsg(error?.message || 'Erro ao enviar mensagem')
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const formatRelativeTime = (ts: string) => {
    if (!ts) return '—'
    const date = new Date(ts)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('pt-BR')
  }

  const connectionStatusLabel = {
    idle: 'Não conectado',
    connecting: 'Conectando...',
    connected: 'Conectado',
    error: 'Erro na conexão',
  }[connectionStatus]

  const connectionTone = {
    idle: 'yellow' as const,
    connecting: 'yellow' as const,
    connected: 'green' as const,
    error: 'red' as const,
  }[connectionStatus]

  const onlineTone = status === 'online' ? ('green' as const) : ('red' as const)

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="apiUrl" className="block text-xs font-medium text-dark-300">URL da API</label>
            <input
              type="text"
              id="apiUrl"
              className="input"
              value={evolutionConfig.apiUrl}
              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiUrl: e.target.value })}
              placeholder="Ex: https://api.pracinha.online"
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
              placeholder="Ex: Variante"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-dark-300">Telefone (WhatsApp)</label>
            <input
              type="text"
              id="phone"
              className="input"
              value={evolutionConfig.phone}
              onChange={(e) => setEvolutionConfig({ ...evolutionConfig, phone: e.target.value })}
              placeholder="Ex: 48999880030"
            />
            <p className="text-[10px] text-dark-500 mt-1">Número do WhatsApp (só dígitos com DDI). Use para identificar suas próprias mensagens.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            onClick={saveConfig}
            disabled={connectionStatus === 'connecting'}
            className="btn-store text-xs"
          >
            {saved ? 'Salvo ✓' : 'Salvar configuração'}
          </button>
          <button
            onClick={() => testConnection()}
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
          <button
            onClick={() => { setConnectionStatus('connecting'); void testConnection() }}
            disabled={connectionStatus === 'connecting'}
            className="bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar conversas
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <StatusBadge tone={connectionTone}>
              <span className="flex items-center gap-1">
                {connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {connectionStatusLabel}
              </span>
            </StatusBadge>
            <StatusBadge tone={onlineTone}>
              API: {status === 'online' ? 'online' : 'offline'}
            </StatusBadge>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Conversas ativas" value={stats.activeConversations.toString()} tone="store" sub="agora" />
        <Stat label="Contatos únicos" value={stats.uniqueContacts.toString()} tone="store" sub="total" />
        <Stat label="Mensagens recebidas" value={stats.messagesReceived.toString()} tone="store" sub="hoje" />
        <Stat label="Mensagens enviadas" value={stats.messagesSent.toString()} tone="store" sub="hoje" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <Panel title={`Conversas (${conversations.length})`} className="rounded-2xl h-full overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-10 text-dark-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-dark-600 mx-auto mb-2" />
                <p className="text-sm text-dark-400">Nenhuma conversa</p>
                <p className="text-xs text-dark-500 mt-1">Clique em "Testar conexão" para carregar</p>
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
                      <div className="w-10 h-10 rounded-full bg-dark-800 text-dark-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {conv.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-200 truncate">{conv.customer}</p>
                        <p className="text-xs text-dark-500 truncate">{conv.context}</p>
                      </div>
                      {conv.lastActivity !== '—' && (
                        <span className="text-[10px] text-dark-500 shrink-0">{conv.lastActivity}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title={selectedChat ? 'Conversa' : 'Selecione uma conversa'} className="lg:col-span-2 rounded-2xl h-full overflow-hidden">
          {selectedChat ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 p-4 border-b border-dark-800">
                <button onClick={() => setSelectedChat(null)} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-200 truncate">
                    {conversations.find(c => c.id === selectedChat)?.customer}
                  </p>
                  <p className="text-xs text-dark-500">WhatsApp</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-dark-950/30">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-10 text-dark-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-dark-400">Nenhuma mensagem</p>
                    <p className="text-xs text-dark-500 mt-1">Envie a primeira mensagem ou aguarde o cliente</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl ${
                          msg.direction === 'outbound'
                            ? 'bg-store-600/30 text-dark-100 rounded-br-md'
                            : 'bg-dark-800 text-dark-200 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className="text-[10px] text-dark-500 mt-1 flex items-center gap-2">
                          {msg.pushName && msg.direction === 'inbound' && <span>{msg.pushName}</span>}
                          <span>{formatRelativeTime(msg.timestamp)}</span>
                          {msg.direction === 'outbound' && <span className="text-store-400">✓</span>}
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
                    disabled={!newMessage.trim() || sending}
                    className="btn-store px-4"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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