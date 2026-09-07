import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Panel from '../../components/ui/Panel'
// import { productsService } from '../../services/products'

export default function Catalog() {
  const [products] = useState<any[]>([])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        zone="store"
        zoneLabel="LOJA · Catálogo"
        title="Catálogo de produtos"
        description="Gerencie seus produtos, estoque e preços. Tudo que você vende está aqui."
        actions={
          <button className="btn-store text-xs">
            <Plus className="w-4 h-4" /> Novo produto
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-store-500/10 text-store-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500">Produtos ativos</p>
              <p className="text-lg font-bold text-dark-50">{products.filter(p => p.status === 'available').length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500">Estoque baixo</p>
              <p className="text-lg font-bold text-dark-50">{products.filter(p => p.status === 'low_stock').length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-500">Esgotados</p>
              <p className="text-lg font-bold text-dark-50">{products.filter(p => p.status === 'out_of_stock').length}</p>
            </div>
          </div>
        </div>
      </div>

      <Panel title="Produtos" className="rounded-2xl" flush>
        <div className="text-center py-8">
          <p className="text-sm text-dark-400">Nenhum produto ainda</p>
          <p className="text-xs text-dark-500 mt-1">Adicione seu primeiro produto para começar</p>
          <button className="btn-store text-xs mt-4">
            <Plus className="w-4 h-4" /> Adicionar produto
          </button>
        </div>
      </Panel>
    </div>
  )
}
