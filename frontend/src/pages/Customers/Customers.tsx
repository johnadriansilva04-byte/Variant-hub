import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Repeat, ShoppingBag, ArrowUpRight } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'
import { customersService } from '../../services/customers'

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])

  const stages = ['Novo lead', 'Em orçamento', '1ª compra', 'Recorrente', 'Inativo']

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="store"
        zoneLabel="LOJA · Clientes"
        title="Clientes e pipeline"
        description="Cada pessoa que chega pela calçada vira um contato na loja. Acompanhe a jornada até a recompra — e o dinheiro que ela representa."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-store-500/10 text-store-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500">Clientes na base</p>
              <p className="text-lg font-bold text-dark-50">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500">Leads qualificados</p>
              <p className="text-lg font-bold text-dark-50">0</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500">Clientes recorrentes</p>
              <p className="text-lg font-bold text-dark-50">0%</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-store-500/10 text-store-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500">Receita média</p>
              <p className="text-lg font-bold text-dark-50">R$ 0,00</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-dark-50">
            Pipeline de vendas <span className="text-dark-500 font-normal text-sm">· arrastar cards movimenta o estágio</span>
          </h3>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin -mx-1 px-1">
          {stages.map((stage) => (
            <div key={stage} className="w-[260px] flex-shrink-0 rounded-2xl bg-dark-900/70 border border-dark-800 p-3 flex flex-col max-h-[440px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-store-400" />
                  <div>
                    <p className="text-[13px] font-semibold text-dark-50 leading-tight">{stage}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-dark-200 tabular-nums">
                  {customers.filter(c => c.stage === stage).length}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto scrollbar-thin pr-0.5">
                {customers.filter(c => c.stage === stage).map((customer) => (
                  <div key={customer.id} className="rounded-xl bg-dark-800/80 border border-dark-700/60 p-3 hover:border-dark-500/60 hover:bg-dark-800 transition-colors cursor-grab">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-dark-700 text-dark-200 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {customer.name.substring(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-dark-50 truncate">{customer.name}</p>
                        <p className="text-[10px] text-dark-500">origem · {customer.origin_channel}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-dark-700/60">
                      <span className="text-[11px] text-dark-400">
                        {customer.total_orders > 0 ? `${customer.total_orders} pedido${customer.total_orders > 1 ? 's' : ''}` : 'sem pedido'}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums text-store-400">
                        R$ {customer.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
                {customers.filter(c => c.stage === stage).length === 0 && (
                  <div className="rounded-xl border border-dashed border-dark-700 p-6 text-center text-[11px] text-dark-500">
                    Solte um contato aqui
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Panel title="Maiores compradores" subtitle="Quem mais fatura com você — priorize o pós-venda" tone="store" className="rounded-2xl" flush>
        <div className="text-center py-8">
          <p className="text-sm text-dark-400">Nenhum cliente ainda</p>
          <p className="text-xs text-dark-500 mt-1">Configure a integração para começar</p>
        </div>
      </Panel>

      <div className="card !py-4 px-6 flex flex-wrap items-center justify-between gap-3 bg-dark-900/60 border-dark-800 rounded-2xl">
        <div className="flex items-center gap-3 text-xs text-dark-500">
          <span className="text-dark-400">Configure a integração para começar</span>
        </div>
        <Link to="/store" className="btn-outline-store text-xs">
          Ver analytics da loja <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
