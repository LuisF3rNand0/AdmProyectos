import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { FiShoppingCart, FiCheckCircle, FiPackage, FiClock, FiPlus } from 'react-icons/fi'

const estadoBadge = {
  pendiente: 'badge-pendiente',
  voucher_cargado: 'bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full',
  en_revision: 'bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full',
  confirmado: 'badge-confirmado',
  en_despacho: 'bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded-full',
  despachado: 'badge-despachado',
  cancelado: 'badge-cancelado',
}

const estadoLabel = {
  pendiente: 'Pendiente',
  voucher_cargado: 'Voucher cargado',
  en_revision: 'En revisión',
  confirmado: 'Confirmado',
  en_despacho: 'En despacho',
  despachado: 'Despachado',
  cancelado: 'Cancelado',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/pedidos')
      .then(res => setPedidos(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => ['pendiente', 'voucher_cargado', 'en_revision'].includes(p.estado)).length,
    confirmados: pedidos.filter(p => p.estado === 'confirmado').length,
    despachados: pedidos.filter(p => p.estado === 'despachado').length,
  }

  const recientes = pedidos.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.nombre.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm capitalize">{user?.rol} — Eléctricos Generales S.A.C.</p>
        </div>
        {(user?.rol === 'vendedor' || user?.rol === 'admin') && (
          <Link to="/pedidos/nuevo" className="btn-primary flex items-center gap-2">
            <FiPlus size={18} />
            <span className="hidden sm:inline">Nuevo Pedido</span>
          </Link>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FiShoppingCart className="text-blue-700" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total pedidos</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <FiClock className="text-yellow-700" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendientes}</p>
            <p className="text-xs text-gray-500">En proceso</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <FiCheckCircle className="text-green-700" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.confirmados}</p>
            <p className="text-xs text-gray-500">Confirmados</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <FiPackage className="text-purple-700" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.despachados}</p>
            <p className="text-xs text-gray-500">Despachados</p>
          </div>
        </div>
      </div>

      {/* Pedidos recientes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Pedidos recientes</h2>
          <Link to="/pedidos" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : recientes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
            <p>No hay pedidos aún</p>
            {user?.rol === 'vendedor' && (
              <Link to="/pedidos/nuevo" className="btn-primary mt-3 inline-flex items-center gap-2">
                <FiPlus size={16} /> Crear primer pedido
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">N° Pedido</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recientes.map(pedido => (
                  <tr key={pedido.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-mono text-xs text-blue-700">{pedido.numeroPedido}</td>
                    <td className="py-2.5">{pedido.clienteNombre}</td>
                    <td className="py-2.5 font-semibold">S/ {pedido.total.toFixed(2)}</td>
                    <td className="py-2.5">
                      <span className={estadoBadge[pedido.estado] || 'badge-pendiente'}>
                        {estadoLabel[pedido.estado] || pedido.estado}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <Link to={`/pedidos/${pedido.id}`} className="text-blue-600 hover:underline text-xs">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
