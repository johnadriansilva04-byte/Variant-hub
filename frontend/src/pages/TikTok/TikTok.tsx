import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'
import StatusBadge from '../../components/ui/StatusBadge'
import Stat from '../../components/ui/Stat'
import { useIntegrationStatus } from '../../hooks/useIntegrationStatus'

export default function TikTok() {
  const { status } = useIntegrationStatus('tiktok')

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="calcada"
        zoneLabel="CALÇADA · TikTok"
        title="Analytics TikTok"
        description="Acompanhe o desempenho do TikTok na geração de tráfego para o WhatsApp."
        right={
          <StatusBadge tone={status === 'online' ? 'green' : 'red'}>
            {status === 'online' ? 'Conectado' : 'Offline'}
          </StatusBadge>
        }
      />

      <Panel title="Perfil do TikTok" className="rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Seguidores" value="0" tone="calcada" sub="total" />
          <Stat label="Vídeos" value="0" tone="calcada" sub="total" />
          <Stat label="Crescimento (7d)" value="0%" sub="seguidores" />
          <Stat label="Engajamento" value="0%" sub="média" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="KPIs da Semana" className="rounded-2xl">
          <div className="space-y-4">
            <Stat label="Alcance" value="0" tone="calcada" sub="pessoas" />
            <Stat label="Impressões" value="0" tone="calcada" sub="total" />
            <Stat label="Engajamento" value="0%" tone="calcada" sub="taxa" />
            <Stat label="Cliques → WhatsApp" value="0" tone="calcada" sub="links" />
            <Stat label="Leads gerados" value="0" tone="calcada" sub="qualificados" />
          </div>
        </Panel>

        <Panel title="Funil da Semana" className="rounded-2xl">
          <div className="text-center py-8">
            <p className="text-sm text-dark-400">Configure a integração para ver o funil</p>
            <p className="text-xs text-dark-500 mt-1">Alcance → Cliques → Conversas → Pedidos → Receita</p>
          </div>
        </Panel>
      </div>

      <Panel title="Vídeos que Performaram" className="rounded-2xl">
        <div className="text-center py-8">
          <p className="text-sm text-dark-400">Nenhum vídeo ainda</p>
          <p className="text-xs text-dark-500 mt-1">Configure a integração para começar</p>
        </div>
      </Panel>

      <Panel title="Insights do que Funciona" className="rounded-2xl">
        <div className="text-center py-8">
          <p className="text-sm text-dark-400">Nenhum insight ainda</p>
          <p className="text-xs text-dark-500 mt-1">Configure a integração para começar</p>
        </div>
      </Panel>
    </div>
  )
}
