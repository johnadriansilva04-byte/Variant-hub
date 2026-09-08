import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, RefreshCw, MessageCircle, ArrowLeft, Wifi, WifiOff, Loader2, Settings, X, Info, ChevronDown, BarChart3 } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge'
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
  const [expandedModules, setExpandedModules] = useState({
    atendimento: true,
    operacao: false,
    conexao: false
  })
  const cfgRef = useRef(evolutionConfig)
  const selectedChatRef = useRef<string | null>(null)
  const convInFlightRef = useRef(false)
  const msgInFlightRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    cfgRef.current = evolutionConfig
  }, [evolutionConfig])

  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])

  const loadConversations = useCallback(async (config?: any, opts: { silent?: boolean } = {}) => {
    if (convInFlightRef.current) return
    convInFlightRef.current = true
    if (!opts.silent) setLoadingConversations(true)
    if (!opts.silent) setErrorMsg('')
    try {
      const result = await whatsappApi.getConversations(config?.apiUrl ? config : undefined)
      const next = result.data || []
      setConversations(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next)
    } catch (error: any) {
      console.error('Error loading conversations:', error)
      if (!opts.silent) setErrorMsg(error?.message || 'Erro ao carregar conversas')
    } finally {
      convInFlightRef.current = false
      if (!opts.silent) setLoadingConversations(false)
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

  const loadMessages = useCallback(async (jid: string, config?: any, opts: { silent?: boolean } = {}) => {
    if (msgInFlightRef.current[jid]) return
    msgInFlightRef.current[jid] = true
    if (!opts.silent) setLoadingMessages(true)
    try {
      const result = await whatsappApi.getMessages(jid, config?.apiUrl ? config : undefined)
      const next = result.data || []
      setMessages(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next)
    } catch (error: any) {
      console.error('Error loading messages:', error)
      if (!opts.silent) setErrorMsg(error?.message || 'Erro ao carregar mensagens')
    } finally {
      msgInFlightRef.current[jid] = false
      if (!opts.silent) setLoadingMessages(false)
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
    const cfg = config || cfgRef.current
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
        setExpandedModules(prev => ({ ...prev, conexao: false }))
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

  // Actualizacao em tempo real (polling silencioso sem sobreposição)
  useEffect(() => {
    if (connectionStatus !== 'connected') return
    const cfg = cfgRef.current
    if (!cfg?.apiUrl) return

    let stopped = false
    void loadConversations(cfg, { silent: true })
    void loadStats()

    const syncAll = async () => {
      if (document.visibilityState === 'visible') {
        await loadConversations(cfgRef.current, { silent: true })
        await loadStats()
      }
      const chatId = selectedChatRef.current
      if (chatId && document.visibilityState === 'visible') {
        await loadMessages(chatId, cfgRef.current, { silent: true })
      }
    }

    let convTimer: ReturnType<typeof setTimeout> = setTimeout(function tick() {
      if (stopped) return
      void syncAll().finally(() => {
        if (!stopped) convTimer = setTimeout(tick, 10000)
      })
    }, 10000)

    let msgTimer: ReturnType<typeof setTimeout> | null = null
    const currentChat = selectedChatRef.current
    if (currentChat) {
      void loadMessages(currentChat, cfgRef.current, { silent: true })
      msgTimer = setTimeout(function msgTick() {
        if (stopped) return
        const chatId = selectedChatRef.current
        if (chatId && document.visibilityState === 'visible') {
          void loadMessages(chatId, cfgRef.current, { silent: true }).finally(() => {
            if (!stopped) msgTimer = setTimeout(msgTick, 3000)
          })
        } else {
          msgTimer = setTimeout(msgTick, 3000)
        }
      }, 3000)
    }

    return () => {
      stopped = true
      clearTimeout(convTimer)
      if (msgTimer) clearTimeout(msgTimer)
    }
  }, [connectionStatus, loadConversations, loadMessages, loadStats, selectedChat])

  const handleChatSelect = (jid: string) => {
    setSelectedChat(jid)
    loadMessages(jid, cfgRef.current)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return
    const text = newMessage.trim()
    const chatId = selectedChat
    setSending(true)
    const optimisticMsg = {
      id: `local-${Date.now()}`,
      content: text,
      direction: 'outbound',
      senderType: 'user',
      timestamp: new Date().toISOString(),
      pushName: null
    }
    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')
    try {
      const result = await whatsappApi.sendMessage(chatId, text, cfgRef.current.apiUrl ? cfgRef.current : undefined)
      console.log('Send result:', result)
      await loadMessages(chatId, cfgRef.current, { silent: true })
      await loadConversations(cfgRef.current, { silent: true })
    } catch (error: any) {
      setErrorMsg(error?.message || 'Erro ao enviar mensagem')
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
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
<div className="flex flex-col h-screen overflow-hidden bg-dark-950">
      <header className="flex items-center justify-between px-5 py-3 border-b border-dark-800 bg-dark-900/80 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-store-500/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-store-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-dark-100">WhatsApp</h1>
            <p className="text-xs text-dark-500">Central de atendimento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={onlineTone}>
            <span className="flex items-center gap-1">
              {status === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              API: {status === 'online' ? 'online' : 'offline'}
            </span>
          </StatusBadge>
          <StatusBadge tone={connectionTone}>
            <span className="flex items-center gap-1">
              {connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connectionStatusLabel}
            </span>
          </StatusBadge>
          <button
            onClick={() => testConnection()}
            disabled={connectionStatus === 'connecting'}
            className="bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2"
            title="Atualizar agora"
          >
            {connectionStatus === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar
          </button>
          <button
            onClick={() => {
              setExpandedModules(prev => ({ ...prev, conexao: !prev.conexao }))
            }}
            className="bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="bg-red-500/15 border-b border-red-500/20 text-red-300 text-xs px-5 py-2 flex items-center gap-2 shrink-0">
          <Info className="w-3 h-3" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="p-0.5 hover:text-red-200">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 min-h-0">
        {/* Módulo Atendimento */}
        <section className={`rounded-2xl border bg-dark-900/60 transition-all ${expandedModules.atendimento ? 'border-dark-700' : 'border-dark-800'}`}>
          <button
            onClick={() => setExpandedModules(prev => ({ ...prev, atendimento: !prev.atendimento }))}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expandedModules.atendimento ? 'bg-store-500/20 text-store-400' : 'bg-dark-800 text-dark-400'}`}>
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-semibold text-dark-200">Atendimento</h2>
                <p className="text-xs text-dark-500">{conversations.length} conversas · atualiza automaticamente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${connectionStatus === 'connected' ? 'bg-store-500/15 text-store-300' : 'bg-dark-800 text-dark-500'}`}>
                {connectionStatus === 'connected' ? 'Conectado' : connectionStatusLabel}
              </span>
              <ChevronDown className={`w-4 h-4 text-dark-500 transition-transform ${expandedModules.atendimento ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {expandedModules.atendimento && (
            <div className="flex border-t border-dark-800 min-h-[420px] max-h-[62vh]">
              <aside className="w-72 border-r border-dark-800 flex flex-col shrink-0">
                <div className="p-2.5 border-b border-dark-800 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider">Conversas</h3>
                  <button
                    onClick={() => testConnection()}
                    disabled={connectionStatus === 'connecting'}
                    className="p-1 rounded-md hover:bg-dark-800 text-dark-500"
                    title="Atualizar conversas"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  {loadingConversations ? (
                    <div className="flex items-center justify-center py-10 text-dark-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-dark-400">Nenhuma conversa</p>
                      <p className="text-xs text-dark-500 mt-1">Clique em "Atualizar" para carregar</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleChatSelect(conv.id)}
                        className={`w-full text-left p-3 border-b border-dark-800/60 transition-colors ${selectedChat === conv.id ? 'bg-store-500/10 border-l-2 border-l-store-500' : 'hover:bg-dark-800/50'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-dark-800 text-dark-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {conv.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-dark-200 truncate">{conv.customer}</p>
                            </div>
                            <p className="text-xs text-dark-500 truncate">{conv.context}</p>
                            {conv.lastActivity !== '—' && (
                              <p className="text-[10px] text-dark-600 mt-0.5">{conv.lastActivity}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </aside>

              <section className="flex-1 flex flex-col min-w-0 bg-dark-950/40">
                {selectedChat ? (
                  <>
                    <div className="flex items-center gap-2.5 p-3 border-b border-dark-800 bg-dark-900/40 shrink-0">
                      <button onClick={() => setSelectedChat(null)} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400">
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark-200 truncate">
                          {conversations.find(c => c.id === selectedChat)?.customer}
                        </p>
                        <p className="text-[10px] text-dark-500">WhatsApp</p>
                      </div>
                      <button
                        onClick={() => { loadMessages(selectedChat, cfgRef.current); loadConversations(cfgRef.current) }}
                        className="p-2 rounded-lg hover:bg-dark-800 text-dark-400"
                        title="Recarregar mensagens"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 min-h-0">
                      {loadingMessages ? (
                        <div className="flex items-center justify-center py-10 text-dark-400">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-10">
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
                              className={`max-w-[75%] p-3 rounded-2xl ${msg.direction === 'outbound' ? 'bg-store-600/30 text-dark-100 rounded-br-md' : 'bg-dark-800 text-dark-200 rounded-bl-md'}`}
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

                    <div className="p-3 border-t border-dark-800 bg-dark-900/40 shrink-0">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-store-500"
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                      <p className="text-sm text-dark-400">Selecione uma conversa para começar</p>
                      <p className="text-xs text-dark-500 mt-1">As conversas atualizam automaticamente</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>

        {/* Módulo Operação */}
        <section className={`rounded-2xl border bg-dark-900/60 transition-all ${expandedModules.operacao ? 'border-dark-700' : 'border-dark-800'}`}>
          <button
            onClick={() => setExpandedModules(prev => ({ ...prev, operacao: !prev.operacao }))}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expandedModules.operacao ? 'bg-store-500/20 text-store-400' : 'bg-dark-800 text-dark-400'}`}>
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-semibold text-dark-200">Operação</h2>
                <p className="text-xs text-dark-500">Indicadores do atendimento</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-dark-500 transition-transform ${expandedModules.operacao ? 'rotate-180' : ''}`} />
          </button>

          {expandedModules.operacao && (
            <div className="p-4 border-t border-dark-800 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-3.5">
                <p className="text-[11px] text-dark-500 font-medium">Conversas ativas</p>
                <p className="text-2xl font-bold text-store-400 mt-1">{stats.activeConversations}</p>
                <p className="text-[10px] text-dark-600 mt-0.5">agora</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-3.5">
                <p className="text-[11px] text-dark-500 font-medium">Contatos únicos</p>
                <p className="text-2xl font-bold text-store-400 mt-1">{stats.uniqueContacts}</p>
                <p className="text-[10px] text-dark-600 mt-0.5">total</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-3.5">
                <p className="text-[11px] text-dark-500 font-medium">Mensagens recebidas</p>
                <p className="text-2xl font-bold text-store-400 mt-1">{stats.messagesReceived}</p>
                <p className="text-[10px] text-dark-600 mt-0.5">hoje</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-3.5">
                <p className="text-[11px] text-dark-500 font-medium">Mensagens enviadas</p>
                <p className="text-2xl font-bold text-store-400 mt-1">{stats.messagesSent}</p>
                <p className="text-[10px] text-dark-600 mt-0.5">hoje</p>
              </div>
            </div>
          )}
        </section>

        {/* Módulo Conexão */}
        <section className={`rounded-2xl border bg-dark-900/60 transition-all ${expandedModules.conexao ? 'border-store-500/40' : 'border-dark-800'}`}>
          <button
            onClick={() => setExpandedModules(prev => ({ ...prev, conexao: !prev.conexao }))}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expandedModules.conexao ? 'bg-store-500/20 text-store-400' : 'bg-dark-800 text-dark-400'}`}>
                <Settings className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-semibold text-dark-200">Conexão &amp; Configurações</h2>
                <p className="text-xs text-dark-500">Evolution API · instância {evolutionConfig.instanceName || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${connectionStatus === 'connected' ? 'bg-store-500/15 text-store-300' : 'bg-dark-800 text-dark-500'}`}>
                {connectionStatus === 'connected' ? 'Online' : connectionStatusLabel}
              </span>
              <ChevronDown className={`w-4 h-4 text-dark-500 transition-transform ${expandedModules.conexao ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {expandedModules.conexao && (
            <div className="p-4 border-t border-dark-800 grid md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">URL da API</label>
                  <input
                    type="text"
                    className="input"
                    value={evolutionConfig.apiUrl}
                    onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiUrl: e.target.value })}
                    placeholder="Ex: https://api.pracinha.online"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">API Key</label>
                  <input
                    type="password"
                    className="input"
                    value={evolutionConfig.apiKey}
                    onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiKey: e.target.value })}
                    placeholder="Sua chave de API"
                  />
                </div>
              </div>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">Nome da Instância</label>
                  <input
                    type="text"
                    className="input"
                    value={evolutionConfig.instanceName}
                    onChange={(e) => setEvolutionConfig({ ...evolutionConfig, instanceName: e.target.value })}
                    placeholder="Ex: Variante"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-300 mb-1">Telefone (WhatsApp)</label>
                  <input
                    type="text"
                    className="input"
                    value={evolutionConfig.phone}
                    onChange={(e) => setEvolutionConfig({ ...evolutionConfig, phone: e.target.value })}
                    placeholder="Ex: 48999880030"
                  />
                  <p className="text-[10px] text-dark-500 mt-1">Número do WhatsApp para identificar suas mensagens.</p>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center gap-2 pt-1">
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
                  className="bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2"
                >
                  {connectionStatus === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Testar conexão
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
