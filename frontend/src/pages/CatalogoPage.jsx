import { useEffect, useState } from 'react'
import axios from 'axios'
import { FiSearch, FiPackage, FiTag } from 'react-icons/fi'

export default function CatalogoPage() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [buscar, setBuscar] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      axios.get('/api/productos/categorias'),
      axios.get('/api/productos'),
    ]).then(([catRes, prodRes]) => {
      setCategorias(catRes.data)
      setProductos(prodRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const productosFiltrados = productos.filter(p => {
    const matchBuscar = !buscar ||
      p.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      p.codigo.toLowerCase().includes(buscar.toLowerCase())
    const matchCategoria = !categoriaFiltro || p.categoriaId === categoriaFiltro
    return matchBuscar && matchCategoria
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Buscar por nombre o código..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500">{productosFiltrados.length} productos encontrados</p>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando catálogo...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosFiltrados.map(producto => (
            <div key={producto.id} className="card hover:shadow-md transition-shadow">
              {/* Imagen placeholder */}
              <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center mb-3">
                <FiPackage size={40} className="text-gray-400" />
              </div>

              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{producto.nombre}</h3>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <FiTag size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{producto.categoria?.nombre}</span>
                </div>

                <p className="text-xs text-gray-400 font-mono mb-3">Cód: {producto.codigo}</p>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-700">
                    S/ {producto.precio.toFixed(2)}
                    <span className="text-xs font-normal text-gray-400 ml-1">/{producto.unidad}</span>
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    producto.stock > 20 ? 'bg-green-100 text-green-700' :
                    producto.stock > 5 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Stock: {producto.stock}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && productosFiltrados.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FiPackage size={48} className="mx-auto mb-3 opacity-30" />
          <p>No se encontraron productos</p>
        </div>
      )}
    </div>
  )
}
