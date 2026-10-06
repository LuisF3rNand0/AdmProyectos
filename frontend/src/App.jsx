import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import CatalogoPage from './pages/CatalogoPage'
import PedidosPage from './pages/PedidosPage'
import NuevoPedidoPage from './pages/NuevoPedidoPage'
import PedidoDetallePage from './pages/PedidoDetallePage'
import ContabilidadPage from './pages/ContabilidadPage'
import AlmacenPage from './pages/AlmacenPage'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.rol)) return <Navigate to="/dashboard" replace />

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <SocketProvider>
            <Layout />
          </SocketProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="catalogo" element={<CatalogoPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="pedidos/nuevo" element={
          <ProtectedRoute roles={['vendedor', 'admin']}>
            <NuevoPedidoPage />
          </ProtectedRoute>
        } />
        <Route path="pedidos/:id" element={<PedidoDetallePage />} />
        <Route path="contabilidad" element={
          <ProtectedRoute roles={['contabilidad', 'admin']}>
            <ContabilidadPage />
          </ProtectedRoute>
        } />
        <Route path="almacen" element={
          <ProtectedRoute roles={['almacen', 'admin']}>
            <AlmacenPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
