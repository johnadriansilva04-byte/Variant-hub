import { Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, MessageCircle, Store, Users, Package, Settings, Activity } from 'lucide-react'

export default function Layout() {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/instagram', label: 'Instagram', icon: Activity },
    { to: '/facebook', label: 'Facebook', icon: Activity },
    { to: '/telegram', label: 'Telegram', icon: Activity },
    { to: '/tiktok', label: 'TikTok', icon: Activity },
    { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { to: '/store', label: 'Loja', icon: Store },
    { to: '/orders', label: 'Pedidos', icon: Package },
    { to: '/customers', label: 'Clientes', icon: Users },
    { to: '/catalog', label: 'Catálogo', icon: Package },
    { to: '/settings', label: 'Configurações', icon: Settings },
    { to: '/system', label: 'Sistema', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-dark-950">
      <aside className="fixed left-0 top-0 h-full w-64 bg-dark-900 border-r border-dark-800 flex flex-col">
        <div className="p-6 border-b border-dark-800">
          <h1 className="text-xl font-bold text-dark-50">Variant Hub</h1>
          <p className="text-xs text-dark-500 mt-1">Central de operações</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-50 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="ml-64 p-6">
        <Outlet />
      </main>
    </div>
  )
}
