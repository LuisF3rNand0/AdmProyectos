import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import {
  FiHome, FiGrid, FiShoppingCart, FiDollarSign,
  FiPackage, FiLogOut, FiMenu, FiX, FiBell
} from 'react-icons/fi'

const menuPorRol = {
  vendedor: [
    { to: '/dashboard', icon: FiHome, label: 'Inicio' },
    { to: '/catalogo', icon: FiGrid, label: 'Catálogo' },
    { to: '/pedidos', icon: FiShoppingCart, label: 'Mis Pedidos' },
  ],
  contabilidad: [
    { to: '/dashboard', icon: FiHome, label: 'Inicio' },
    { to: '/pedidos', icon: FiShoppingCart, label: 'Pedidos' },
    { to: '/contabilidad', icon: FiDollarSign, label: 'Vouchers OCR' },
  ],
  almacen: [
    { to: '/dashboard', icon: FiHome, label: 'Inicio' },
    { to: '/almacen', icon: FiPackage, label: 'Despacho' },
  ],
  admin: [
    { to: '/dashboard', icon: FiHome, label: 'Inicio' },
    { to: '/catalogo', icon: FiGrid, label: 'Catálogo' },
    { to: '/pedidos', icon: FiShoppingCart, label: 'Pedidos' },
    { to: '/contabilidad', icon: FiDollarSign, label: 'Vouchers OCR' },
    { to: '/almacen', icon: FiPackage, label: 'Almacén' },
  ],
}

const coloresPorRol = {
  vendedor: 'bg-blue-700',
  contabilidad: 'bg-purple-700',
  almacen: 'bg-green-700',
  admin: 'bg-gray-900',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const menu = menuPorRol[user?.rol] || []
  const colorHeader = coloresPorRol[user?.rol] || 'bg-blue-700'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className={`${colorHeader} text-white shadow-lg`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1"
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              {menuAbierto ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <div>
              <h1 className="font-bold text-lg leading-tight">Eléctricos Generales</h1>
              <p className="text-xs opacity-75 capitalize">{user?.rol} — {user?.nombre}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 transition-opacity"
          >
            <FiLogOut size={18} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>

        {/* Navegación desktop */}
        <nav className="hidden md:flex gap-1 px-4 pb-2">
          {menu.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Menú móvil */}
      {menuAbierto && (
        <nav className={`${colorHeader} text-white md:hidden`}>
          {menu.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm font-medium border-t border-white/10
                 ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Contenido */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
