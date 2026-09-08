import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Send, RefreshCw, MessageCircle, Wifi, WifiOff, Loader2, Settings, X, Info,
  Search, Phone, MapPin, FileText, User, Clock, Download, ChevronRight
} from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge'
import { useIntegrationStatus } from '../../hooks/useIntegrationStatus'
import { whatsappApi } from '../../services/api'

type ConnStatus = 'idle' | 'connecting' | 'connected' | 'error'

// ── Utilidades ───────────────────────────────────────────────

function formatListTime(ts: string | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatBubbleTime(ts: string | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── Renderização de mensagens por tipo ───────────────────────

function MessageContent({ msg, jid }: { msg: any; jid: string }) {
  const mediaSrc = msg.hasMedia ? whatsappApi.mediaUrl(jid, msg.id) : null

  switch (msg.type) {
    case 'image':
      return mediaSrc ? (
        <div className="space-y-1">
          <img src={mediaSrc} alt={msg.caption || 'Foto'} className="rounded-xl max-h-72 w-full object-cover cursor-pointer" loading="lazy" onClick={() => window.open(mediaSrc, '_blank')} />
          {msg.caption && <p className="text-sm whitespace-pre-wrap break-words">{msg.caption}</p>}
        </div>
      ) : <p className="text-sm">🖼️ Foto</p>

    case 'audio':
      return (
        <div className="space-y-1">
          {mediaSrc && <audio controls src={mediaSrc} className="w-56 max-w-full h-9" preload="metadata" />}
          {!mediaSrc && <p className="text-sm">🎤 Áudio</p>}
        </div>
      )

    case 'video':
      return mediaSrc ? (
        <video controls src={mediaSrc} className="rounded-xl max-h-80 max-w-full" preload="metadata" />
      ) : <p className="text-sm">🎬 Vídeo</p>

    case 'document':
      return (
        <a
          href={mediaSrc || '#'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl bg-dark-900/60 border border-dark-700 p-3 hover:border-store-500/50 transition-colors"
        >
          <FileText className="w-6 h-6 text-store-400 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium truncate">{msg.content || 'Documento'}</span>
            <span className="text-[10px] text-dark-500">{msg.mediaMime || 'arquivo'}</span>
          </span>
          <Download className="w-4 h-4 text-dark-400 shrink-0" />
        </a>
      )

    case 'sticker':
      return mediaSrc ? (
        <img src={mediaSrc} alt="Sticker" className="w-32 h-32 object-contain" loading="lazy" />
      ) : <p className="text-sm">🖼️ Sticker</p>

    case 'location': {
      const [lat, lng] = (msg.content || '').split(',').map(Number)
      const mapsUrl = lat && lng
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : 'https://www.google.com/maps'
      return (
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-store-300 hover:underline">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">Localização</span>
        </a>
      )
    }

    case 'contact':
      return (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-store-400" />
          <span className="text-sm font-medium">{msg.content || 'Contato'}</span>
        </div>
      )

    case 'reaction':
      return <p className="text-sm">👍 {msg.content || 'Reagiu'}</p>

    default:
      return msg.content ? (
        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
      ) : (
        <p className="text-sm text-dark-500 italic">Mensagem sem conteúdo</p>
      )
  }
}

// ── Página principal ─────────────────────────────────────────

export default function WhatsApp() {
  const { status } = useIntegrationStatus('whatsapp')
  const [evolutionConfig, setEvolutionConfig] = useState({ apiUrl: '', apiKey: '', instanceName: '', phone: '' })
  const [connectionStatus, setConnectionStatus] = useState<ConnStatus>('idle')
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [contact, setContact] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const cfgRef = useRef(evolutionConfig)
  const selectedChatRef = useRef<string | null>(null)
  const convInFlight = useRef(false)
  const msgInFlight = useRef(false)
  const syncInFlight = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesBoxRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const loadedChatRef = useRef<string | null>(null)

  useEffect(() => { cfgRef.current = evolutionConfig }, [evolutionConfig])
  useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])

  // ── Carregar conversas ─────────────────────────────────────
  const loadConversations = useCallback(async (config?: any, opts: { silent?: boolean } = {}) => {
    if (convInFlight.current) return
    convInFlight.current = true
    if (!opts.silent) setLoadingConversations(true)
    try {
      const result = await whatsappApi.getConversations(config?.apiUrl ? config : undefined)
      const next = result.data || []
      setConversations(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    } catch (error: any) {
      console.error('Erro ao carregar conversas:', error)
      if (!opts.silent) setErrorMsg(error?.message || 'Erro ao carregar conversas')
    } finally {
      convInFlight.current = false
      if (!opts.silent) setLoadingConversations(false)
    }
  }, [])

  // ── Carregar mensagens (replace ou mais antigas) ──────────
  const loadMessages = useCallback(async (jid: string, config?: any, opts: { silent?: boolean; before?: string | null } = {}) => {
    if (msgInFlight.current && !opts.before) return
    if (opts.before) setLoadingOlder(true)
    if (!opts.silent && !opts.before) setLoadingMessages(true)
    try {
      const result = await whatsappApi.getMessages(jid, config?.apiUrl ? config : undefined, {
        limit: 100,
        before: opts.before ?? null
      })
      const next = result.data || []
      if (opts.before) {
        setMessages(prev => {
          const seen = new Set(prev.map((m: any) => m.id))
          const older = next.filter((m: any) => !seen.has(m.id))
          return [...older, ...prev]
        })
        setHasMore(Boolean(result.hasMore))
      } else {
        // Merge: preserva histórico já carregado (scroll pra cima) e só adiciona o que é novo — sem piscar
        const ascending = [...next].reverse()
        setMessages(prev => {
          const seen = new Set(ascending.map((m: any) => m.id))
          const extra = prev.filter((m: any) => !seen.has(m.id))
          const merged = [...extra, ...ascending]
          return JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged
        })
        setHasMore(Boolean(result.hasMore))
      }
      loadedChatRef.current = jid
    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error)
      if (!opts.silent) setErrorMsg(error?.message || 'Erro ao carregar mensagens')
    } finally {
      if (opts.before) setLoadingOlder(false)
      if (!opts.silent && !opts.before) setLoadingMessages(false)
    }
  }, [])

  const loadContact = useCallback(async (jid: string) => {
    try {
      const result = await whatsappApi.getContact(jid)
      setContact(result.data)
    } catch {
      setContact(null)
    }
  }, [])

  // ── Config ─────────────────────────────────────────────────
  const loadSavedConfig = async () => {
    try {
      const result = await whatsappApi.getConfig()
      const cfg = result.data
      if (cfg?.apiUrl || cfg?.instanceName) {
        const next = { apiUrl: cfg.apiUrl || '', apiKey: cfg.apiKey || '', instanceName: cfg.instanceName || '', phone: cfg.phone || '' }
        setEvolutionConfig(next)
        setSaved(true)
        return next
      }
    } catch (error) {
      console.error('Erro ao carregar config salva:', error)
    }
    return null
  }

  const testConnection = useCallback(async (config?: any): Promise<boolean> => {
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
      if (!result.data?.connected) {
        setConnectionStatus('error')
        setErrorMsg('Instância não está conectada no WhatsApp')
        return false
      }
      setConnectionStatus('connected')
      await runFullSync(cfg)
      return true
    } catch (error: any) {
      setConnectionStatus('error')
      setErrorMsg(error?.message || 'Falha ao conectar com a Evolution API')
      return false
    }
  }, [loadConversations])

  const runFullSync = useCallback(async (config?: any) => {
    const cfg = config || cfgRef.current
    if (!cfg?.apiUrl) return
    try {
      await whatsappApi.syncFull(cfg.apiUrl ? cfg : undefined)
    } catch (error: any) {
      console.error('Full sync falhou:', error?.message || error)
    }
    await loadConversations(cfg)
  }, [loadConversations])

  const saveConfig = async () => {
    setConnectionStatus('connecting')
    setErrorMsg('')
    try {
      const result = await whatsappApi.saveConfig(evolutionConfig)
      if (result.success) {
        setSaved(true)
        setConfigOpen(false)
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

  // ── Mount: carrega config → conecta → fullSync ────────────
  useEffect(() => {
    let active = true
    ;(async () => {
      const cfg = await loadSavedConfig()
      if (active && cfg) await testConnection(cfg)
    })()
    return () => { active = false }
  }, [testConnection])

  // ── Sync incremental a cada 10s (só mensagens novas) ──────
  useEffect(() => {
    if (connectionStatus !== 'connected') return
    let stopped = false

    const tick = async () => {
      if (stopped || syncInFlight.current) return
      syncInFlight.current = true
      try {
        const cfg = cfgRef.current
        const result = await whatsappApi.syncIncremental(cfg.apiUrl ? cfg : undefined)
        const synced = Number(result.data?.messagesAdded || 0)
        const updatedJids: string[] = result.data?.updatedJids || []
        if (synced > 0) {
          await loadConversations(cfg, { silent: true })
          const open = selectedChatRef.current
          if (open && updatedJids.includes(open)) {
            await loadMessages(open, cfg, { silent: true })
          }
        }
      } catch {
        // silencioso: nunca trava a UI
      } finally {
        syncInFlight.current = false
      }
    }

    void tick()
    const timer = setInterval(tick, 10000)
    return () => { stopped = true; clearInterval(timer) }
  }, [connectionStatus, loadConversations, loadMessages])

  // ── Seleção de conversa ────────────────────────────────────
  const handleChatSelect = (jid: string) => {
    if (jid === selectedChatRef.current) return
    setSelectedChat(jid)
    loadedChatRef.current = null
    setMessages([])
    atBottomRef.current = true
    const cfg = cfgRef.current
    void loadMessages(jid, cfg)
    void loadContact(jid)
  }

  // ── Scroll: infinito pra cima + autoscroll pra baixo ──────
  const handleScroll = () => {
    const el = messagesBoxRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (el.scrollTop < 50 && hasMore && !loadingOlder && messages.length > 0) {
      const oldest = messages[0]?.timestamp
      if (oldest && loadedChatRef.current) {
        void loadMessages(loadedChatRef.current, cfgRef.current, { before: oldest, silent: true })
      }
    }
  }

  useEffect(() => {
    if (atBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages])

  // ── Envio ──────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return
    const text = newMessage.trim()
    const chatId = selectedChat
    setSending(true)
    const optimistic = {
      id: `local-${Date.now()}`,
      type: 'text',
      content: text,
      direction: 'outbound',
      senderName: null,
      timestamp: new Date().toISOString(),
      hasMedia: false
    }
    setMessages(prev => [...prev, optimistic])
    setNewMessage('')
    atBottomRef.current = true
    try {
      const cfg = cfgRef.current
      await whatsappApi.sendMessage(chatId, text, cfg.apiUrl ? cfg : undefined)
      await loadMessages(chatId, cfg, { silent: true })
      await loadConversations(cfg, { silent: true })
    } catch (error: any) {
      setErrorMsg(error?.message || 'Erro ao enviar mensagem')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  // ── Derivados ──────────────────────────────────────────────
  const filteredConversations = searchTerm.trim()
    ? conversations.filter(c => (c.name || '').toLowerCase().includes(searchTerm.trim().toLowerCase()) || (c.preview || '').toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : conversations

  const activeConv = conversations.find(c => c.id === selectedChat) || null

  const connLabel = { idle: 'Não conectado', connecting: 'Conectando...', connected: 'Conectado', error: 'Erro' }[connectionStatus]
  const connTone = { idle: 'yellow', connecting: 'yellow', connected: 'green', error: 'red' }[connectionStatus] as 'yellow' | 'green' | 'red'
  const apiTone = status === 'online' ? 'green' : 'red'

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dark-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-dark-800 bg-dark-900/80 backdrop-blur shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-store-500/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-store-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-dark-100 leading-tight">WhatsApp</h1>
            <p className="text-[11px] text-dark-500 truncate">Central de atendimento · {conversations.length} conversas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge tone={apiTone} className="hidden sm:inline-flex">
            <span className="flex items-center gap-1">
              {status === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              API: {status === 'online' ? 'online' : 'offline'}
            </span>
          </StatusBadge>
          <StatusBadge tone={connTone}>
            <span className="flex items-center gap-1">
              {connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connLabel}
            </span>
          </StatusBadge>
          <button
            onClick={() => { if (cfgRef.current?.apiUrl) void runFullSync() }}
            disabled={connectionStatus === 'connecting' || !cfgRef.current?.apiUrl}
            className="bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
            title="Sincronizar agora"
          >
            {connectionStatus === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar
          </button>
          <button
            onClick={() => setConfigOpen(v => !v)}
            className="bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="bg-red-500/15 border-b border-red-500/20 text-red-300 text-xs px-4 py-1.5 flex items-center gap-2 shrink-0">
          <Info className="w-3 h-3" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="p-0.5 hover:text-red-200"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Config overlay */}
      {configOpen && (
        <div className="absolute top-14 right-4 z-30 w-full max-w-md rounded-2xl border border-dark-700 bg-dark-900 shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-100">Conexão &amp; Configurações</h3>
            <button onClick={() => setConfigOpen(false)} className="p-1 rounded-md hover:bg-dark-800 text-dark-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-dark-300 mb-1">URL da API</label>
              <input type="text" className="input" value={evolutionConfig.apiUrl} onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiUrl: e.target.value })} placeholder="Ex: https://api.pracinha.online" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-dark-300 mb-1">API Key</label>
              <input type="password" className="input" value={evolutionConfig.apiKey} onChange={(e) => setEvolutionConfig({ ...evolutionConfig, apiKey: e.target.value })} placeholder="Sua chave de API" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-dark-300 mb-1">Nome da Instância</label>
              <input type="text" className="input" value={evolutionConfig.instanceName} onChange={(e) => setEvolutionConfig({ ...evolutionConfig, instanceName: e.target.value })} placeholder="Ex: Variant" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-dark-300 mb-1">Telefone (WhatsApp)</label>
              <input type="text" className="input" value={evolutionConfig.phone} onChange={(e) => setEvolutionConfig({ ...evolutionConfig, phone: e.target.value })} placeholder="Ex: 48999880030" />
            </div>
          </div>
          <p className="text-[10px] text-dark-500">O número do WhatsApp esconde suas próprias conversas da lista. Se vazio, é detectado automaticamente da instância.</p>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={saveConfig} disabled={connectionStatus === 'connecting'} className="btn-store text-xs">
              {saved ? 'Salvo ✓' : 'Salvar configuração'}
            </button>
            <button onClick={() => testConnection()} disabled={connectionStatus === 'connecting'} className="bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              {connectionStatus === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Testar conexão
            </button>
          </div>
        </div>
      )}

      {/* Corpo: 3 painéis */}
      <main className="flex-1 flex min-h-0 relative">
        {/* Painel esquerdo: conversas */}
        <aside className="w-full sm:w-80 lg:w-[340px] border-r border-dark-800 flex flex-col shrink-0 bg-dark-900/40">
          <div className="p-2.5 border-b border-dark-800">
            <div className="relative">
              <Search className="w-4 h-4 text-dark-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversa..."
                className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-store-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12 text-dark-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-10 h-10 text-dark-600 mx-auto mb-2" />
                <p className="text-sm text-dark-400">{searchTerm ? 'Nada encontrado' : 'Nenhuma conversa'}</p>
                {!searchTerm && (
                  <button onClick={() => runFullSync()} className="mt-3 text-xs bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 px-3 py-1.5 rounded-lg">
                    Sincronizar agora
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleChatSelect(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 border-b border-dark-800/50 text-left transition-colors ${selectedChat === conv.id ? 'bg-store-500/10 border-l-2 border-l-store-500' : 'hover:bg-dark-800/50'}`}
                >
                  {conv.photo ? (
                    <img src={conv.photo} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-store-500/20 text-store-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {conv.initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-dark-100 truncate">{conv.name}</p>
                      <span className="text-[10px] text-dark-500 shrink-0">{formatListTime(conv.lastActivity)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-dark-500 truncate">
                        {conv.lastMessageFromMe && <span className="text-store-400">Você: </span>}
                        {conv.preview}
                      </p>
                      {conv.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-store-500 text-dark-950 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {conv.unread > 99 ? '99+' : conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Painel central: conversa */}
        <section className="flex-1 flex flex-col min-w-0 bg-dark-950/40">
          {selectedChat ? (
            <>
              <div className="flex items-center gap-3 p-3 border-b border-dark-800 bg-dark-900/40 shrink-0">
                {activeConv?.photo ? (
                  <img src={activeConv.photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-store-500/20 text-store-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {activeConv?.initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-100 truncate">{activeConv?.name || 'Conversa'}</p>
                  <p className="text-[10px] text-dark-500 truncate">
                    {activeConv?.previewType === 'text' ? 'WhatsApp' : `WhatsApp · ${activeConv?.preview}`}
                  </p>
                </div>
                <button
                  onClick={() => { if (selectedChat) void loadMessages(selectedChat, cfgRef.current); void loadContact(selectedChat) }}
                  className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 transition-colors"
                  title="Recarregar"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div ref={messagesBoxRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-2 min-h-0">
                {loadingOlder && (
                  <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-dark-500" /></div>
                )}
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-16 text-dark-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageCircle className="w-10 h-10 text-dark-600 mx-auto mb-2" />
                    <p className="text-sm text-dark-400">Nenhuma mensagem</p>
                    <p className="text-xs text-dark-500 mt-1">Envie a primeira mensagem ou aguarde o cliente</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] p-2.5 rounded-2xl shadow-sm ${msg.direction === 'outbound' ? 'bg-store-600/40 text-dark-100 rounded-br-md' : 'bg-dark-800 text-dark-200 rounded-bl-md'}`}
                      >
                        {msg.direction === 'inbound' && msg.senderName && (
                          <p className="text-[10px] font-semibold text-store-400 mb-0.5">{msg.senderName}</p>
                        )}
                        <MessageContent msg={msg} jid={selectedChat} />
                        <p className="text-[10px] text-dark-500 mt-1 flex items-center gap-1.5 justify-end">
                          <span>{formatBubbleTime(msg.timestamp)}</span>
                          {msg.direction === 'outbound' && <span className="text-store-400">✓✓</span>}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
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
                  <button onClick={sendMessage} disabled={!newMessage.trim() || sending} className="btn-store px-4">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-store-500/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-store-400" />
                </div>
                <p className="text-sm text-dark-300 font-medium">Selecione uma conversa</p>
                <p className="text-xs text-dark-500 mt-1">As conversas aparecem em ordem de chegada, como no WhatsApp</p>
              </div>
            </div>
          )}
        </section>

        {/* Painel direito: detalhes do contato */}
        {selectedChat && (
          <aside className="hidden md:flex w-72 border-l border-dark-800 flex-col shrink-0 bg-dark-900/40 overflow-y-auto scrollbar-thin">
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider">Detalhes</h3>
              <button onClick={() => setSelectedChat(null)} className="p-1 rounded-md hover:bg-dark-800 text-dark-500"><ChevronRight className="w-4 h-4" /></button>
            </div>
            {contact ? (
              <div className="p-4 space-y-4">
                <div className="flex flex-col items-center text-center">
                  {contact.photo ? (
                    <img src={contact.photo} alt="" className="w-20 h-20 rounded-full object-cover mb-3" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-store-500/20 text-store-300 text-lg font-bold flex items-center justify-center mb-3">
                      {contact.initials}
                    </div>
                  )}
                  <p className="text-sm font-semibold text-dark-100">{contact.name}</p>
                  {contact.isGroup && <p className="text-[10px] text-dark-500 mt-0.5">Grupo</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-dark-300 bg-dark-800/60 rounded-lg px-3 py-2">
                    <Phone className="w-3.5 h-3.5 text-store-400 shrink-0" />
                    <span className="truncate">{contact.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-dark-300 bg-dark-800/60 rounded-lg px-3 py-2">
                    <Clock className="w-3.5 h-3.5 text-store-400 shrink-0" />
                    <span>Última atividade: {contact.lastActivity ? formatListTime(contact.lastActivity) : '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-dark-300 bg-dark-800/60 rounded-lg px-3 py-2">
                    <MessageCircle className="w-3.5 h-3.5 text-store-400 shrink-0" />
                    <span>{contact.totalMessages} mensagens no histórico</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-dark-500">Carregando…</div>
            )}
          </aside>
        )}
      </main>
    </div>
  )
}