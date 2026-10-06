import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiPlus, FiSearch, FiShoppingCart } from 'react-icons/fi'

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

export default function PedidosPage() {
  const { user } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')

  useEffect(() => {
    axios.get('/api/pedidos').then(res => setPedidos(res.data)).finally(() => setLoading(false))
  }, [])

  const pedidosFiltrados = pedidos.filter(p => {
    const matchEstado = !estadoFiltro || p.estado === estadoFiltro
    const matchBuscar = !buscar ||
      p.numeroPedido.toLowerCase().includes(buscar.toLowerCase()) ||
      p.clienteNombre.toLowerCase().includes(buscar.toLowerCase())
    return matchEstado && matchBuscar
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        {(user?.rol === 'vendedor' || user?.rol === 'admin') && (
          <Link to="/pedidos/nuevo" className="btn-primary flex items-center gap-2">
            <FiPlus size={18} />
            <span className="hidden sm:inline">Nuevo Pedido</span>
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Buscar pedido o cliente..." value={buscar}
            onChange={e => setBuscar(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(estadoLabel).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
          <p>No hay pedidos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map(pedido => (
            <Link key={pedido.id} to={`/pedidos/${pedido.id}`}
              className="card block hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-blue-700">{pedido.numeroPedido}</span>
                    <span className={estadoBadge[pedido.estado] || 'badge-pendiente'}>
                      {estadoLabel[pedido.estado] || pedido.estado}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">{pedido.clienteNombre}</p>
                  {pedido.clienteRuc && <p className="text-xs text-gray-400">RUC: {pedido.clienteRuc}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Vendedor: {pedido.vendedor?.nombre} •{' '}
                    {new Date(pedido.createdAt).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-lg">S/ {pedido.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{pedido.items?.length} producto(s)</p>
                  {pedido.voucher && (
                    <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full font-medium
                      ${pedido.voucher.estadoRevision === 'aprobado' ? 'bg-green-100 text-green-700' :
                        pedido.voucher.estadoRevision === 'rechazado' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'}`}>
                      Voucher: {pedido.voucher.estadoRevision}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
