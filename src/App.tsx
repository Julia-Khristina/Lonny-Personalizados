import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './store/Store'
import Experience from './pages/client/Experience'
import AdminLayout from './pages/admin/AdminLayout'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Orders from './pages/admin/Orders'
import OrderDetail from './pages/admin/OrderDetail'
import Products from './pages/admin/Products'
import Suppliers from './pages/admin/Suppliers'
import Personalizations from './pages/admin/Personalizations'
import SettingsPage from './pages/admin/SettingsPage'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/experiencia" replace />} />
          <Route path="/experiencia" element={<Experience />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="pedidos" element={<Orders />} />
            <Route path="pedidos/:id" element={<OrderDetail />} />
            <Route path="produtos" element={<Products />} />
            <Route path="fornecedores" element={<Suppliers />} />
            <Route path="personalizacao" element={<Personalizations />} />
            <Route path="configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/experiencia" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
