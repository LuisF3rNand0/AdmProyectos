import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiCheckCircle, FiXCircle, FiImage, FiRefreshCw } from 'react-icons/fi'
import { useSocket } from '../context/SocketContext'

export default function ContabilidadPage() {
  const { socket } = useSocket()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState({})
  const [procesando, setProcesando] = useState(null)

  const cargar = () => {
    setLoading(true)
    axios.get('/api/pedidos', { params: { estado: 'voucher_cargado' } })
      .then(res => {
        // Incluir también en_revision
        return axios.get('/api/pedidos', { params: { estado: 'en_revision' } })
          .then(res2 => setPedidos([...res.data, ...res2.data]))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  // Escuchar nuevos vouchers en tiempo real
  useEffect(() => {
    if (!socket) return
    socket.on('voucher_cargado', () => cargar())
    return () => socket.off('voucher_cargado')
  }, [socket])

  const revisar = async (voucherId, estadoRevision, confirmarPedido = false) => {
    setProcesando(voucherId)
    try {
      await axios.patch(`/api/vouchers/${voucherId}/revisar`, {
        estadoRevision,
        notaContable: notas[voucherId] || undefined,
        confirmarPedido,
      })
      toast.success(estadoRevision === 'aprobado'
        ? confirmarPedido ? '✅ Voucher aprobado y pedido confirmado para almacén' : '✅ Voucher aprobado'
        : '❌ Voucher rechazado')
      cargar()
    } catch (err) {
      toast.error('Error al revisar voucher')
    } finally {
      setProcesando(null)
    }
  }

  // Agrupar pedidos que tengan voucher
  const pedidosConVoucher = pedidos.filter(p => p.voucher)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bandeja OCR — Contabilidad</h1>
        <button onClick={cargar} className="btn-secondary flex items-center gap-2">
          <FiRefreshCw size={16} /> Actualizar
        </button>
      </div>

      <p className="text-sm text-gray-500">
        {pedidosConVoucher.length} voucher(s) pendientes de revisión
      </p>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : pedidosConVoucher.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiCheckCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p>No hay vouchers pendientes de revisión</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidosConVoucher.map(pedido => (
            <div key={pedido.id} className="card">
              {/* Cabecera */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="font-mono font-bold text-blue-700">{pedido.numeroPedido}</span>
                  <p className="text-gray-900 font-medium">{pedido.clienteNombre}</p>
                  <p className="text-xs text-gray-400">
                    Vendedor: {pedido.vendedor?.nombre} •{' '}
                    {new Date(pedido.createdAt).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">S/ {pedido.total.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block ${
                    pedido.voucher.estadoRevision === 'pendiente' ? 'bg-orange-100 text-orange-700' :
                    pedido.voucher.estadoRevision === 'aprobado' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {pedido.voucher.estadoRevision}
                  </span>
                </div>
              </div>

              {/* Datos OCR vs Total pedido */}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Datos OCR del voucher</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Banco:</span>
                      <span className="font-semibold">{pedido.voucher.ocrBanco || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monto:</span>
                      <span className={`font-bold ${
                        pedido.voucher.ocrMonto && Math.abs(pedido.voucher.ocrMonto - pedido.total) < 0.5
                          ? 'text-green-700' : 'text-red-600'
                      }`}>
                        S/ {pedido.voucher.ocrMonto?.toFixed(2) || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha:</span>
                      <span className="font-semibold">{pedido.voucher.ocrFecha || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">N° Op:</span>
                      <span className="font-semibold text-xs">{pedido.voucher.ocrNumOperacion || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Confianza:</span>
                      <span className="font-semibold">{pedido.voucher.ocrConfianza}%</span>
                    </div>
                  </div>

                  {pedido.voucher.ocrMonto && Math.abs(pedido.voucher.ocrMonto - pedido.total) > 0.5 && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700 font-medium">
                      ⚠️ El monto del voucher (S/ {pedido.voucher.ocrMonto.toFixed(2)}) difiere del pedido (S/ {pedido.total.toFixed(2)})
                    </div>
                  )}
                </div>

                <div>
                  <a href={pedido.voucher.imagenUrl} target="_blank" rel="noreferrer"
                    className="block border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors group">
                    <FiImage size={32} className="mx-auto mb-1 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    <p className="text-xs text-gray-400 group-hover:text-blue-500">Ver imagen original</p>
                  </a>
                </div>
              </div>

              {/* Nota contable */}
              {pedido.voucher.estadoRevision === 'pendiente' && (
                <div className="mb-3">
                  <input
                    className="input text-sm"
                    placeholder="Nota contable (opcional)..."
                    value={notas[pedido.voucher.id] || ''}
                    onChange={e => setNotas({ ...notas, [pedido.voucher.id]: e.target.value })}
                  />
                </div>
              )}

              {/* Acciones */}
              {pedido.voucher.estadoRevision === 'pendiente' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => revisar(pedido.voucher.id, 'aprobado', true)}
                    disabled={procesando === pedido.voucher.id}
                    className="btn-success flex-1 flex items-center justify-center gap-2"
                  >
                    <FiCheckCircle size={16} />
                    Aprobar y notificar almacén
                  </button>
                  <button
                    onClick={() => revisar(pedido.voucher.id, 'aprobado', false)}
                    disabled={procesando === pedido.voucher.id}
                    className="btn-secondary flex-1 text-green-700"
                  >
                    Solo aprobar
                  </button>
                  <button
                    onClick={() => revisar(pedido.voucher.id, 'rechazado')}
                    disabled={procesando === pedido.voucher.id}
                    className="btn-danger flex items-center justify-center gap-2 sm:w-auto"
                  >
                    <FiXCircle size={16} />
                    Rechazar
                  </button>
                </div>
              )}

              {pedido.voucher.estadoRevision !== 'pendiente' && pedido.voucher.notaContable && (
                <p className="text-sm text-gray-500 mt-2">Nota: {pedido.voucher.notaContable}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
