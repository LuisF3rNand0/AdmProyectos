import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { abrirVoucher } from '../utils/abrirVoucher'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { FiUpload, FiImage, FiArrowLeft, FiCheckCircle } from 'react-icons/fi'

const estadoLabel = {
  pendiente: 'Pendiente',
  voucher_cargado: 'Voucher cargado',
  en_revision: 'En revisión',
  confirmado: 'Confirmado',
  en_despacho: 'En despacho',
  despachado: 'Despachado',
  cancelado: 'Cancelado',
}

export default function PedidoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pedido, setPedido] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  const cargarPedido = () => {
    axios.get(`/api/pedidos/${id}`)
      .then(res => setPedido(res.data))
      .catch(() => toast.error('Pedido no encontrado'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargarPedido() }, [id])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubirVoucher = async () => {
    const file = fileRef.current?.files[0]
    if (!file) { toast.error('Selecciona una imagen del voucher'); return }

    setSubiendo(true)
    const formData = new FormData()
    formData.append('voucher', file)

    try {
      const res = await axios.post(`/api/vouchers/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(res.data.mensaje || 'Voucher cargado')
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      cargarPedido()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar el voucher')
    } finally {
      setSubiendo(false)
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>
  if (!pedido) return <div className="text-center py-16 text-gray-400">Pedido no encontrado</div>

  const puedeCargarVoucher = (user?.rol === 'vendedor' || user?.rol === 'admin') &&
    ['pendiente', 'voucher_cargado'].includes(pedido.estado)

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
        <FiArrowLeft /> Volver
      </button>

      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold font-mono text-blue-700">{pedido.numeroPedido}</h1>
            <p className="text-gray-500 text-sm">{new Date(pedido.createdAt).toLocaleDateString('es-PE', { dateStyle: 'full' })}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            pedido.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
            pedido.estado === 'despachado' ? 'bg-blue-100 text-blue-700' :
            pedido.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {estadoLabel[pedido.estado] || pedido.estado}
          </span>
        </div>

        {/* Cliente */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Cliente</h3>
          <p className="font-semibold text-gray-900">{pedido.clienteNombre}</p>
          {pedido.clienteRuc && <p className="text-sm text-gray-500">RUC: {pedido.clienteRuc}</p>}
          {pedido.clienteTelef && <p className="text-sm text-gray-500">Tel: {pedido.clienteTelef}</p>}
          {pedido.notas && <p className="text-sm text-gray-500 mt-1">Nota: {pedido.notas}</p>}
        </div>

        {/* Productos */}
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Productos</h3>
        <div className="space-y-2 mb-4">
          {pedido.items.map(item => (
            <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 rounded p-2">
              <div>
                <p className="font-medium text-gray-800">{item.producto.nombre}</p>
                <p className="text-xs text-gray-400">{item.producto.codigo} × {item.cantidad}</p>
              </div>
              <span className="font-semibold">S/ {item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span><span>S/ {pedido.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>IGV (18%)</span><span>S/ {pedido.igv.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span><span>S/ {pedido.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Voucher */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">Comprobante de Pago</h3>

        {pedido.voucher ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 uppercase mb-2 flex items-center gap-1">
                <FiCheckCircle /> {pedido.voucher.ocrRawText?.startsWith('[OCR PENDIENTE]') ? 'OCR pendiente — revisión manual' : 'Datos extraídos por OCR'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-gray-400">Banco</p><p className="font-semibold">{pedido.voucher.ocrBanco || '—'}</p></div>
                <div><p className="text-xs text-gray-400">Monto</p><p className="font-semibold">S/ {pedido.voucher.ocrMonto?.toFixed(2) || '—'}</p></div>
                <div><p className="text-xs text-gray-400">Fecha</p><p className="font-semibold">{pedido.voucher.ocrFecha || '—'}</p></div>
                <div><p className="text-xs text-gray-400">N° Operación</p><p className="font-semibold text-xs">{pedido.voucher.ocrNumOperacion || '—'}</p></div>
              </div>
              {pedido.voucher.ocrConfianza && (
                <p className="text-xs text-gray-400 mt-2">Confianza OCR: {pedido.voucher.ocrConfianza}%</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Estado revisión:</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                pedido.voucher.estadoRevision === 'aprobado' ? 'bg-green-100 text-green-700' :
                pedido.voucher.estadoRevision === 'rechazado' ? 'bg-red-100 text-red-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {pedido.voucher.estadoRevision}
              </span>
            </div>

            <button type="button" onClick={() => abrirVoucher(pedido.voucher.imagenUrl).catch(err => toast.error(err.message))}
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <FiImage /> Ver imagen original
            </button>

            {puedeCargarVoucher && (
              <p className="text-xs text-gray-400">Puedes reemplazar el voucher cargando uno nuevo abajo.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">No se ha cargado comprobante aún.</p>
        )}

        {/* Carga de voucher */}
        {puedeCargarVoucher && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {pedido.voucher ? 'Actualizar voucher' : 'Cargar comprobante de pago'}
            </p>

            <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
              {preview ? (
                <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg object-contain" />
              ) : (
                <div>
                  <FiUpload size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Toca para seleccionar imagen</p>
                  <p className="text-xs text-gray-400">JPG, PNG hasta 5MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {preview && (
              <button
                onClick={handleSubirVoucher}
                disabled={subiendo}
                className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
              >
                <FiUpload size={16} />
                {subiendo ? 'Procesando OCR...' : 'Subir y procesar voucher'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
