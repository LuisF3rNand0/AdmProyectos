import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiPackage, FiTruck, FiCheckCircle, FiRefreshCw, FiBell } from 'react-icons/fi'
import { useSocket } from '../context/SocketContext'

export default function AlmacenPage() {
  const { socket } = useSocket()
  const [pedidos, setPedidos] = useState([])
  const [estadisticas, setEstadisticas] = useState({ confirmados: 0, enDespacho: 0, despachados: 0 })
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(null)

  const cargar = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/almacen/pedidos'),
      axios.get('/api/almacen/estadisticas'),
    ]).then(([pedRes, statsRes]) => {
      setPedidos(pedRes.data)
      setEstadisticas(statsRes.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  // Tiempo real: nuevos pedidos confirmados
  useEffect(() => {
    if (!socket) return
    socket.on('pedido_confirmado', () => {
      cargar()
      toast.success('📦 Nuevo pedido listo para despacho', { duration: 8000 })
    })
    return () => socket.off('pedido_confirmado')
  }, [socket])

  const iniciarDespacho = async (pedidoId) => {
    setProcesando(pedidoId)
    try {
      await axios.patch(`/api/almacen/pedidos/${pedidoId}/iniciar-despacho`)
      toast.success('Despacho iniciado')
      cargar()
    } catch { toast.error('Error') }
    finally { setProcesando(null) }
  }

  const confirmarDespacho = async (pedidoId, numeroPedido) => {
    setProcesando(pedidoId)
    try {
      await axios.patch(`/api/almacen/pedidos/${pedidoId}/confirmar-despacho`)
      toast.success(`🚚 Pedido ${numeroPedido} despachado`)
      cargar()
    } catch { toast.error('Error al confirmar despacho') }
    finally { setProcesando(null) }
  }

  const confirmados = pedidos.filter(p => p.estado === 'confirmado')
  const enDespacho = pedidos.filter(p => p.estado === 'en_despacho')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Almacén</h1>
        <button onClick={cargar} className="btn-secondary flex items-center gap-2">
          <FiRefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-600">{estadisticas.confirmados}</p>
          <p className="text-xs text-gray-500 mt-1">Por despachar</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-teal-600">{estadisticas.enDespacho}</p>
          <p className="text-xs text-gray-500 mt-1">En despacho</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{estadisticas.despachados}</p>
          <p className="text-xs text-gray-500 mt-1">Despachados hoy</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiPackage size={48} className="mx-auto mb-3 opacity-30" />
          <p>No hay pedidos para despachar</p>
          <p className="text-xs mt-1">Los pedidos confirmados por contabilidad aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pendientes de preparar */}
          {confirmados.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <FiBell className="text-yellow-500" /> Por preparar ({confirmados.length})
              </h2>
              <div className="space-y-3">
                {confirmados.map(pedido => (
                  <PedidoAlmacenCard
                    key={pedido.id}
                    pedido={pedido}
                    accionLabel="Iniciar preparación"
                    accionClass="btn-primary"
                    onAccion={() => iniciarDespacho(pedido.id)}
                    loading={procesando === pedido.id}
                    colorBadge="bg-yellow-100 text-yellow-700"
                  />
                ))}
              </div>
            </div>
          )}

          {/* En despacho */}
          {enDespacho.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <FiTruck className="text-teal-500" /> En preparación / despacho ({enDespacho.length})
              </h2>
              <div className="space-y-3">
                {enDespacho.map(pedido => (
                  <PedidoAlmacenCard
                    key={pedido.id}
                    pedido={pedido}
                    accionLabel="Confirmar despacho"
                    accionClass="btn-success"
                    onAccion={() => confirmarDespacho(pedido.id, pedido.numeroPedido)}
                    loading={procesando === pedido.id}
                    colorBadge="bg-teal-100 text-teal-700"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PedidoAlmacenCard({ pedido, accionLabel, accionClass, onAccion, loading, colorBadge }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorBadge}`}>
            {pedido.estado === 'confirmado' ? 'Confirmado' : 'En despacho'}
          </span>
          <p className="font-mono font-bold text-blue-700 mt-1">{pedido.numeroPedido}</p>
          <p className="font-semibold text-gray-900">{pedido.clienteNombre}</p>
          <p className="text-xs text-gray-400">Vendedor: {pedido.vendedor?.nombre}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">S/ {pedido.total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{pedido.items.length} ítem(s)</p>
        </div>
      </div>

      {/* Lista de picking */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="text-sm text-blue-600 hover:underline mb-2"
      >
        {expandido ? 'Ocultar' : 'Ver'} lista de picking
      </button>

      {expandido && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Lista de picking</p>
          {pedido.items.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.producto.nombre}</p>
                <p className="text-xs text-gray-400">{item.producto.codigo} — {item.producto.categoria?.nombre}</p>
              </div>
              <span className="font-bold text-gray-800 text-sm">× {item.cantidad} {item.producto.unidad}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAccion}
        disabled={loading}
        className={`${accionClass} w-full flex items-center justify-center gap-2`}
      >
        {pedido.estado === 'confirmado' ? <FiPackage size={16} /> : <FiCheckCircle size={16} />}
        {loading ? 'Procesando...' : accionLabel}
      </button>
    </div>
  )
}
