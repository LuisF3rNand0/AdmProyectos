import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user, token } = useAuth()
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!user || !token) return

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: { token },
    })

    newSocket.on('connect', () => {
      console.log('🔌 Socket conectado')
      newSocket.emit('join-room', user.rol)
      // Admin se une a todas las salas
      if (user.rol === 'admin') {
        newSocket.emit('join-room', 'contabilidad')
        newSocket.emit('join-room', 'almacen')
        newSocket.emit('join-room', 'vendedor')
      }
    })

    // Eventos globales de notificación
    newSocket.on('nuevo_pedido', ({ pedido }) => {
      toast.success(`📦 Nuevo pedido: ${pedido.numeroPedido}`, { duration: 5000 })
    })

    newSocket.on('voucher_cargado', ({ numeroPedido, voucher }) => {
      toast(`🧾 Voucher cargado para ${numeroPedido} — ${voucher.ocrBanco} S/ ${voucher.ocrMonto}`, {
        icon: '💰', duration: 6000,
      })
    })

    newSocket.on('pedido_confirmado', ({ numeroPedido }) => {
      toast.success(`✅ Pedido ${numeroPedido} confirmado — listo para despacho`, { duration: 6000 })
    })

    newSocket.on('pedido_despachado', ({ numeroPedido }) => {
      toast.success(`🚚 Pedido ${numeroPedido} despachado`, { duration: 5000 })
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [user, token])

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
