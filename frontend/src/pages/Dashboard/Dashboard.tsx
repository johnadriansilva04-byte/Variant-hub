import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle, Bot } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'
// import KpiCard from '../../components/ui/KpiCard'
import StatusBadge from '../../components/ui/StatusBadge'
import ChannelChip from '../../components/ui/ChannelChip'
import Stat from '../../components/ui/Stat'
import { FunnelSteps } from '../../components/ui/Funnel'
import { useIntegrationStatus } from '../../hooks/useIntegrationStatus'

const calcadaFunnel = [
  { label: 'Alcance', value: 0, note: 'pessoas alcançadas', zone: 'calcada' as const },
  { label: 'Engajamento', value: 0, note: 'curtidas, comentários, DMs', zone: 'calcada' as const },
  { label: 'Cliques → WhatsApp', value: 0, note: 'links, botões e CTAs', zone: 'calcada' as const },
  { label: 'Conversas iniciadas', value: 0, note: 'no WhatsApp da loja', zone: 'store' as const },
  { label: 'Leads qualificados', value: 0, note: 'com intenção de compra', zone: 'store' as const },
]

const defaultChannelStatus = [
  { id: 'whatsapp' as const, name: 'API WhatsApp', state: 'Offline', ok: false },
  { id: 'instagram' as const, name: 'Instagram', state: 'Offline', ok: false },
  { id: 'telegram' as const, name: 'Telegram', state: 'Offline', ok: false },
  { id: 'facebook' as const, name: 'Facebook', state: 'Offline', ok: false },
  { id: 'tiktok' as const, name: 'TikTok', state: 'Offline', ok: false },
]

export default function Dashboard() {
  const { status: waStatus } = useIntegrationStatus('whatsapp')

  const channelStatus = defaultChannelStatus.map(channel => {
    if (channel.id === 'whatsapp' && waStatus) {
      return {
        ...channel,
        state: waStatus === 'online' ? 'Conectado' : 'Desconectado',
        ok: waStatus === 'online'
      }
    }
    return channel
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="overview"
        zoneLabel="CALÇADA → LOJA"
        title={
          <>
            Da descoberta ao pagamento —{' '}
            <span className="text-gradient-calcada">um funil</span>
          </>
        }
        description="Suas redes atraem e qualificam; o WhatsApp vende. Acompanhe o caminho completo do cliente entre as duas pontas."
        actions={
          <>
            <Link to="/instagram" className="btn-ghost text-xs">
              Analisar calçada <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link to="/store" className="btn-outline-store text-xs">
              Analisar loja <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        }
        right={
          <span className="zone-kicker bg-dark-800/80 text-dark-300 border-dark-700">
            Últimos 7 dias
          </span>
        }
      />

      <div className="card relative overflow-hidden !p-6">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-store-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-[15px] font-semibold text-dark-50">
                Funil de tráfego <span className="text-fuchsia-400">→</span>{' '}
                <span className="text-store-400">venda</span>
              </h3>
              <p className="text-xs text-dark-500 mt-1">
                Cada etapa encolhe com a taxa real do período
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-dark-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-400" />
                CALÇADA · atração
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-store-400" />
                LOJA · conversão
              </span>
            </div>
          </div>
          <FunnelSteps data={calcadaFunnel} />
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Conversão calçada → loja" value="0%" tone="calcada" sub="0%" />
            <Stat label="Custo por lead" value="R$ 0,00" sub="média dos 4 canais" />
            <Stat label="Vendas hoje" value="0" tone="store" sub="R$ 0,00" />
            <Stat label="Ticket médio" value="R$ 0,00" sub="0%" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Panel collapsible defaultOpen
          tone="calcada"
          title="Calçada · descoberta e tráfego"
          subtitle="Instagram, Telegram, Facebook e TikTok alimentando a loja"
          action={
            <Link
              to="/instagram"
              className="text-xs font-semibold text-fuchsia-400 hover:text-fuchsia-300 inline-flex items-center gap-1"
            >
              Analytics calçada <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
          className="rounded-2xl"
        >
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Stat label="Alcance (7 dias)" value="0" tone="calcada" sub="0%" />
            <Stat label="Engajamento" value="0%" tone="calcada" sub="0 pp" />
            <Stat label="Cliques → WhatsApp" value="0" tone="calcada" sub="links e CTAs" />
            <Stat label="Leads qualificados" value="0" tone="calcada" sub="0%" />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500 mb-2">
            Alcance por canal
          </p>
          <div className="space-y-3">
            {['instagram', 'facebook', 'telegram', 'tiktok'].map((channel) => (
              <div key={channel} className="flex items-center gap-3">
                <ChannelChip channel={channel as any} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs font-medium text-dark-200 truncate">{channel}</span>
                    <span className="text-xs font-bold text-dark-50 tabular-nums">0</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-dark-800 overflow-hidden">
                    <div className="h-full rounded-full bg-dark-700" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-dark-800 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-dark-400">
              <span className="font-bold text-store-400">0</span> cliques
              viraram conversa no WhatsApp
            </span>
            <StatusBadge tone="green">0% → loja</StatusBadge>
          </div>
        </Panel>

        <Panel collapsible defaultOpen
          tone="store"
          title="Loja · WhatsApp converte"
          subtitle="Atendimento que vende: pedidos, faturamento e satisfação"
          action={
            <Link
              to="/store"
              className="text-xs font-semibold text-store-400 hover:text-store-300 inline-flex items-center gap-1"
            >
              Analytics loja <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
          className="rounded-2xl"
        >
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Stat label="Vendas hoje" value="0" tone="store" sub="R$ 0,00" />
            <Stat label="Faturamento hoje" value="R$ 0,00" tone="store" sub="0%" />
            <Stat label="Conversão conversa → pedido" value="0%" tone="store" sub="meta: 20%" />
            <Stat label="Atendidas por IA" value="0%" tone="store" sub="SLA 96% dentro do prazo" />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500 mb-2">
            Pedidos por dia (7d)
          </p>
          <div className="h-[132px] flex items-center justify-center bg-dark-800/30 rounded-lg">
            <p className="text-xs text-dark-500">Configure a integração para ver dados</p>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500 mb-2">
              De onde vêm os pedidos (R$)
            </p>
            <div className="flex h-2 rounded-full overflow-hidden bg-dark-800 mb-3">
              <div className="bg-dark-700" style={{ width: '100%' }} />
            </div>
            <p className="text-xs text-dark-500">Nenhum pedido ainda</p>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <Panel collapsible defaultOpen={false}
          title="Atividade recente"
          subtitle="Eventos das duas pontas do funil em tempo real"
          className="xl:col-span-2 rounded-2xl"
          flush
        >
          <div className="text-center py-8">
            <p className="text-sm text-dark-400">Nenhuma atividade recente</p>
            <p className="text-xs text-dark-500 mt-1">Configure as integrações para começar</p>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel collapsible defaultOpen={false} title="Operação da loja agora" className="rounded-2xl" flush>
            <div className="space-y-3">
              <Stat label="Conversas ativas no WhatsApp" value="0" tone="store" sub="agora" />
              <Stat label="IA respondendo" value="0" sub="0% de resolução por IA" />
              <Stat label="Na fila para atendente" value="0" sub="espera média 0s" />
              <Stat label="SLA cumprido" value="0%" tone="store" sub="resposta em até 2 min" />
            </div>
            <Link to="/whatsapp" className="btn-outline-store w-full text-xs mt-4">
              <MessageCircle className="w-4 h-4" /> Abrir atendimento
            </Link>
          </Panel>

          <Panel collapsible defaultOpen={false} title="Canais e serviços" className="rounded-2xl" flush>
            <ul className="space-y-2.5">
              {channelStatus.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <ChannelChip channel={c.id} size="sm" />
                    <span className="text-[13px] text-dark-200 truncate">{c.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.ok ? 'bg-store-400' : 'bg-amber-400'}`} />
                    <span className={c.ok ? 'text-store-400' : 'text-amber-400'}>{c.state}</span>
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 pt-2.5 border-t border-dark-800">
                <span className="inline-flex items-center gap-2.5 text-[13px] text-dark-200">
                  <span className="icon-badge w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400"><Bot className="w-4 h-4" /></span>
                  IA · 0 fluxos ativos
                </span>
                <Link to="/settings" className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
                  Configurar <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
