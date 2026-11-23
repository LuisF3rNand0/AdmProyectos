require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const vouchersRoutes = require('./routes/vouchers');
const almacenRoutes = require('./routes/almacen');
const notificacionesRoutes = require('./routes/notificaciones');

const app = express();
const server = http.createServer(app);

// Dominios permitidos para el frontend local y el sitio desplegado en Render
const allowedOrigins = ['http://localhost:5173', process.env.FRONTEND_URL].filter(Boolean);

// Socket.io para notificaciones en tiempo real
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Almacenamos io en app para usarlo en los controladores
app.set('io', io);

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/vouchers', vouchersRoutes);
app.use('/api/almacen', almacenRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ELG API corriendo', timestamp: new Date().toISOString() });
});

// Socket.io eventos
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // El cliente se une a su sala según su rol
  socket.on('join-room', (rol) => {
    socket.join(rol);
    console.log(`👤 Usuario unido a sala: ${rol}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor ELG corriendo en http://localhost:${PORT}`);
  console.log(`📦 Base de datos: PostgreSQL`);
});
