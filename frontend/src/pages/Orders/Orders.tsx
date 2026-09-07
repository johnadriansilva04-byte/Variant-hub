import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, PackageCheck, Plus, CreditCard } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'
import StatusBadge from '../../components/ui/StatusBadge'
import ChannelChip from '../../components/ui/ChannelChip'
import { ordersService } from '../../services/orders'

export default function Orders() {
  const [status, setStatus] = useState('Todos')
  const [orders, setOrders] = useState<any[]>([])

  const statusFilter = ['Todos', 'Aguardando cliente', 'Pagamento pendente', 'Confirmado', 'Em separação', 'Enviado', 'Entregue']

  const filteredOrders = status === 'Todos' ? orders : orders.filter(o => o.status === status)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="store"
        zoneLabel="LOJA · Pedidos"
        title="Pedidos"
        description="Do 'fechou' no WhatsApp até a entrega: pagamento, separação, envio e pós-venda num único lugar."
        actions={
          <>
            <button className="btn-store text-xs">
              <Plus className="w-4 h-4" /> Novo pedido manual
            </button>
            <button className="btn-ghost text-xs">
              <CreditCard className="w-4 h-4" /> Formas de pagamento
            </button>
          </>
        }
      />

      <div className="card !py-4 px-6 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-sm font-medium text-dark-100">
            Meta de hoje:{' '}
            <span className="text-dark-50 font-bold">0 pedidos</span>{' '}
            <span className="text-dark-500">— 0 fechados (0%)</span>
          </p>
        </div>
        <div className="h-2 rounded-full bg-dark-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-store-600 to-store-400" style={{ width: '0%' }} />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {statusFilter.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              status === s ? 'bg-store-500 text-dark-950' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Panel flush className="!p-0 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-dark-800 bg-dark-900/60">
                <th className="table-head">Pedido</th>
                <th className="table-head">Cliente</th>
                <th className="table-head">Itens</th>
                <th className="table-head">Total</th>
                <th className="table-head">Status</th>
                <th className="table-head">Venda por</th>
                <th className="table-head">Agente</th>
                <th className="table-head text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
             {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center py-8">
                    <p className="text-sm text-dark-400">Nenhum pedido ainda</p>
                    <p className="text-xs text-dark-500 mt-1">Configure a integração para começar</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-dark-800/60 last:border-0 hover:bg-dark-800/40 transition-colors">
                    <td className="table-cell font-semibold text-store-400">{order.order_number}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-store-500/15 text-store-400 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {order.customer_name.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-dark-50 truncate">{order.customer_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-dark-300 max-w-[220px]">
                      <p className="truncate">{JSON.stringify(order.items)}</p>
                    </td>
                    <td className="table-cell font-semibold text-dark-50 tabular-nums">
                      R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="table-cell">
                      <StatusBadge tone="green">{order.status}</StatusBadge>
                    </td>
                    <td className="table-cell">
                      <ChannelChip channel={order.origin_channel as any} size="sm" />
                    </td>
                    <td className="table-cell">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-store-500/10 text-store-400">
                        IA
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-store-400 transition-colors" title="Abrir conversa">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-dark-800 bg-dark-900/40">
          <p className="text-xs text-dark-500">
            Mostrando {filteredOrders.length} de {orders.length} pedidos recentes
          </p>
          <Link to="/store" className="text-xs font-semibold text-store-400 hover:text-store-300 inline-flex items-center gap-1">
            Ver analytics da loja
          </Link>
        </div>
      </Panel>
    </div>
  )
}
