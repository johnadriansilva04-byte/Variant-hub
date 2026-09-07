import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle, Users } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'
import Stat from '../../components/ui/Stat'

export default function Store() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="store"
        zoneLabel="LOJA · WhatsApp"
        title="Analytics da loja"
        description="Conversão é o idioma do WhatsApp: funil de vendas, pedidos, faturamento e a qualidade do atendimento que fecha a venda."
        right={
          <span className="zone-kicker bg-store-500/10 text-store-400 border-store-500/30">
            Últimos 7 dias
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Faturamento (7d)" value="R$ 0,00" tone="store" sub="0%" />
        <Stat label="Pedidos (7d)" value="0" tone="store" sub="0%" />
        <Stat label="Ticket médio" value="R$ 0,00" tone="sky" sub="0%" />
        <Stat label="Conversão conversa → pedido" value="0%" tone="store" sub="meta: 20%" />
      </div>

      <Panel
        title="Pedidos e faturamento (14 dias)"
        subtitle="Barras = pedidos · linha = faturamento em R$"
        tone="store"
        className="rounded-2xl"
      >
        <div className="h-[300px] flex items-center justify-center bg-dark-800/30 rounded-lg">
          <p className="text-sm text-dark-400">Configure a integração para ver dados</p>
        </div>
      </Panel>

      <Panel
        title="Funil de vendas"
        subtitle="Do primeiro 'oi' ao pedido pago"
        tone="store"
        className="rounded-2xl"
      >
        <div className="text-center py-8">
          <p className="text-sm text-dark-400">Configure a integração para ver o funil</p>
          <p className="text-xs text-dark-500 mt-1">Conversa → Interesse → Orçamento → Pedido → Pagamento → Pós-venda</p>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel
          title="Qual calçada traz mais venda?"
          subtitle="Receita atribuída · R$ 0 nos últimos 7 dias"
          tone="calcada"
          className="rounded-2xl"
        >
          <div className="text-center py-8">
            <p className="text-sm text-dark-400">Configure a integração para ver dados</p>
          </div>
        </Panel>

        <Panel title="Produtos mais vendidos" subtitle="Últimos 7 dias · WhatsApp" tone="store" className="rounded-2xl">
          <div className="text-center py-8">
            <p className="text-sm text-dark-400">Nenhum produto ainda</p>
            <Link to="/catalog" className="btn-ghost w-full text-xs mt-4">
              Abrir catálogo
            </Link>
          </div>
        </Panel>

        <Panel title="Atendimento que fecha venda" subtitle="WhatsApp Business · IA + humanos" tone="store" className="rounded-2xl">
          <div className="space-y-4">
            <Stat label="Conversas resolvidas por IA" value="0%" tone="store" sub="0 conversas agora" />
            <Stat label="Tempo 1ª resposta" value="0s" tone="store" sub="0%" />
            <Stat label="SLA cumprido" value="0%" tone="store" sub="meta ≥ 95%" />
            <Stat label="Satisfação (CSAT)" value="0" tone="store" sub="após entrega" />
            <Stat label="LTV médio" value="R$ 0,00" sub="0%" />
          </div>
          <Link to="/whatsapp" className="btn-outline-store w-full text-xs mt-4">
            <MessageCircle className="w-4 h-4" /> Atendimento
          </Link>
        </Panel>
      </div>

      <div className="card !py-4 px-6 flex flex-wrap items-center justify-between gap-3 bg-dark-900/60 border-dark-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="text-xs text-dark-500">Configure a integração para começar</span>
        </div>
        <Link to="/orders" className="btn-store text-xs">
          Acompanhar pedidos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
