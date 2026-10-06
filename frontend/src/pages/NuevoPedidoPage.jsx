import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiSearch, FiPlus, FiMinus, FiTrash2, FiShoppingCart } from 'react-icons/fi'

export default function NuevoPedidoPage() {
  const navigate = useNavigate()
  const [productos, setProductos] = useState([])
  const [buscar, setBuscar] = useState('')
  const [carrito, setCarrito] = useState([]) // { producto, cantidad }
  const [cliente, setCliente] = useState({ nombre: '', ruc: '', telefono: '', notas: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.get('/api/productos').then(res => setProductos(res.data))
  }, [])

  const productosFiltrados = productos.filter(p =>
    !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()) || p.codigo.toLowerCase().includes(buscar.toLowerCase())
  )

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto.id === producto.id)
      if (existe) {
        return prev.map(i => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { producto, cantidad: 1 }]
    })
    toast.success(`${producto.nombre} agregado`, { duration: 1500 })
  }

  const cambiarCantidad = (productoId, delta) => {
    setCarrito(prev => prev
      .map(i => i.producto.id === productoId ? { ...i, cantidad: i.cantidad + delta } : i)
      .filter(i => i.cantidad > 0)
    )
  }

  const eliminarItem = (productoId) => {
    setCarrito(prev => prev.filter(i => i.producto.id !== productoId))
  }

  const subtotal = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
  const igv = subtotal * 0.18
  const total = subtotal + igv

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cliente.nombre.trim()) { toast.error('El nombre del cliente es requerido'); return }
    if (carrito.length === 0) { toast.error('Agrega al menos un producto'); return }

    setLoading(true)
    try {
      const res = await axios.post('/api/pedidos', {
        clienteNombre: cliente.nombre,
        clienteRuc: cliente.ruc || undefined,
        clienteTelef: cliente.telefono || undefined,
        notas: cliente.notas || undefined,
        items: carrito.map(i => ({ productoId: i.producto.id, cantidad: i.cantidad })),
      })
      toast.success(`Pedido ${res.data.numeroPedido} creado exitosamente`)
      navigate(`/pedidos/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Catálogo de selección */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">Datos del cliente</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre / Razón social *</label>
                <input className="input" placeholder="Cliente o empresa" value={cliente.nombre}
                  onChange={e => setCliente({ ...cliente, nombre: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RUC / DNI</label>
                <input className="input" placeholder="20100000000" value={cliente.ruc}
                  onChange={e => setCliente({ ...cliente, ruc: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input className="input" placeholder="999 888 777" value={cliente.telefono}
                  onChange={e => setCliente({ ...cliente, telefono: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                <input className="input" placeholder="Observaciones..." value={cliente.notas}
                  onChange={e => setCliente({ ...cliente, notas: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">Seleccionar productos</h2>
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-10" placeholder="Buscar producto..." value={buscar}
                onChange={e => setBuscar(e.target.value)} />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {productosFiltrados.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400">{p.codigo} — Stock: {p.stock}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <span className="text-sm font-bold text-blue-700 whitespace-nowrap">S/ {p.precio.toFixed(2)}</span>
                    <button
                      onClick={() => agregarAlCarrito(p)}
                      disabled={p.stock === 0}
                      className="p-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiPlus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div className="card h-fit sticky top-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FiShoppingCart /> Carrito
            {carrito.length > 0 && (
              <span className="ml-auto bg-blue-700 text-white text-xs rounded-full px-2 py-0.5">{carrito.length}</span>
            )}
          </h2>

          {carrito.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FiShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Agrega productos</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {carrito.map(({ producto, cantidad }) => (
                <div key={producto.id} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs font-medium text-gray-800 leading-tight mb-1">{producto.nombre}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => cambiarCantidad(producto.id, -1)}
                        className="p-1 rounded bg-gray-200 hover:bg-gray-300">
                        <FiMinus size={12} />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{cantidad}</span>
                      <button onClick={() => cambiarCantidad(producto.id, 1)}
                        className="p-1 rounded bg-gray-200 hover:bg-gray-300">
                        <FiPlus size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-700">
                        S/ {(producto.precio * cantidad).toFixed(2)}
                      </span>
                      <button onClick={() => eliminarItem(producto.id)}
                        className="text-red-400 hover:text-red-600">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totales */}
          <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IGV (18%)</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2">
              <span>TOTAL</span>
              <span>S/ {total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || carrito.length === 0}
            className="btn-primary w-full mt-4"
          >
            {loading ? 'Registrando...' : 'Registrar Pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}
