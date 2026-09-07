import { Outlet, Link } from 'react-router-dom'
import { MessageCircle, Store, Users, Package, Settings, Activity, LayoutDashboard } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-dark-950">
      <aside className="fixed left-0 top-0 h-full w-64 bg-dark-900 border-r border-dark-800 flex flex-col">
        <div className="p-6 border-b border-dark-800">
          <h1 className="text-xl font-bold text-dark-50">Variant Hub</h1>
          <p className="text-xs text-dark-500 mt-1">Central de operações</p>
        </div>
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          
          {/* WhatsApp - Principal */}
          <div>
            <Link
              to="/whatsapp"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </Link>
          </div>

          {/* Loja */}
          <div>
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-dark-400 uppercase tracking-wider">
              <Store className="w-4 h-4" />
              Loja
            </div>
            <div className="mt-1 space-y-1">
              <Link
                to="/store"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Store className="w-4 h-4" />
                Produtos
              </Link>
              <Link
                to="/orders"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Package className="w-4 h-4" />
                Pedidos
              </Link>
              <Link
                to="/customers"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Users className="w-4 h-4" />
                Clientes
              </Link>
              <Link
                to="/catalog"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Package className="w-4 h-4" />
                Catálogo
              </Link>
            </div>
          </div>

          {/* Canais - Calçada */}
          <div>
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-dark-400 uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              Canais
            </div>
            <div className="mt-1 space-y-1">
              <Link
                to="/instagram"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Activity className="w-4 h-4" />
                Instagram
              </Link>
              <Link
                to="/facebook"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Activity className="w-4 h-4" />
                Facebook
              </Link>
              <Link
                to="/telegram"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Activity className="w-4 h-4" />
                Telegram
              </Link>
              <Link
                to="/tiktok"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Activity className="w-4 h-4" />
                TikTok
              </Link>
            </div>
          </div>

          {/* Admin */}
          <div>
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-dark-400 uppercase tracking-wider">
              <Settings className="w-4 h-4" />
              Administração
            </div>
            <div className="mt-1 space-y-1">
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurações
              </Link>
              <Link
                to="/system"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
              >
                <Activity className="w-4 h-4" />
                Sistema
              </Link>
            </div>
          </div>

        </nav>
      </aside>
      <main className="ml-64 p-6">
        <Outlet />
      </main>
    </div>
  )
}
