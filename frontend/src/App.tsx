import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import WhatsApp from './pages/WhatsApp/WhatsApp'
import Instagram from './pages/Instagram/Instagram'
import Facebook from './pages/Facebook/Facebook'
import Telegram from './pages/Telegram/Telegram'
import TikTok from './pages/TikTok/TikTok'
import Store from './pages/Store/Store'
import Orders from './pages/Orders/Orders'
import Customers from './pages/Customers/Customers'
import Catalog from './pages/Catalog/Catalog'
import Settings from './pages/Settings/Settings'
import System from './pages/System/System'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/instagram" element={<Instagram />} />
          <Route path="/facebook" element={<Facebook />} />
          <Route path="/telegram" element={<Telegram />} />
          <Route path="/tiktok" element={<TikTok />} />
          <Route path="/store" element={<Store />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/system" element={<System />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
