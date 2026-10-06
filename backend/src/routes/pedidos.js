const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarRol } = require('../middleware/auth');

const prisma = new PrismaClient();

// Función para generar número de pedido
function generarNumeroPedido() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `PED-${anio}${mes}${dia}-${random}`;
}

// GET /api/pedidos - Listar pedidos
router.get('/', verificarToken, async (req, res) => {
  try {
    const { estado, vendedorId } = req.query;
    const where = {};

    // Los vendedores solo ven sus propios pedidos
    if (req.user.rol === 'vendedor') {
      where.vendedorId = req.user.id;
    } else if (vendedorId) {
      where.vendedorId = vendedorId;
    }

    if (estado) where.estado = estado;

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        vendedor: { select: { nombre: true, email: true } },
        items: { include: { producto: { select: { nombre: true, codigo: true } } } },
        voucher: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// GET /api/pedidos/:id
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: req.params.id },
      include: {
        vendedor: { select: { nombre: true, email: true } },
        items: { include: { producto: { include: { categoria: true } } } },
        voucher: true,
      },
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Vendedores solo ven sus pedidos
    if (req.user.rol === 'vendedor' && pedido.vendedorId !== req.user.id) {
      return res.status(403).json({ error: 'Sin acceso a este pedido' });
    }

    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
});

// POST /api/pedidos - Crear pedido (vendedores)
router.post('/', verificarToken, verificarRol('vendedor', 'admin'), async (req, res) => {
  try {
    const { clienteNombre, clienteRuc, clienteTelef, notas, items } = req.body;

    if (!clienteNombre || !items || items.length === 0) {
      return res.status(400).json({ error: 'Nombre del cliente e ítems son requeridos' });
    }

    // Calcular totales
    let subtotal = 0;
    const itemsConPrecio = [];

    for (const item of items) {
      const producto = await prisma.producto.findUnique({ where: { id: item.productoId } });
      if (!producto) return res.status(400).json({ error: `Producto ${item.productoId} no encontrado` });
      if (!producto.activo) return res.status(400).json({ error: `Producto ${producto.nombre} no disponible` });

      const itemSubtotal = producto.precio * item.cantidad;
      subtotal += itemSubtotal;
      itemsConPrecio.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnit: producto.precio,
        subtotal: itemSubtotal,
      });
    }

    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    const pedido = await prisma.pedido.create({
      data: {
        numeroPedido: generarNumeroPedido(),
        clienteNombre,
        clienteRuc: clienteRuc || null,
        clienteTelef: clienteTelef || null,
        notas: notas || null,
        subtotal,
        igv,
        total,
        vendedorId: req.user.id,
        items: { create: itemsConPrecio },
      },
      include: {
        items: { include: { producto: true } },
        vendedor: { select: { nombre: true } },
      },
    });

    // Notificación en tiempo real
    const io = req.app.get('io');
    await prisma.notificacion.create({
      data: {
        tipo: 'nuevo_pedido',
        mensaje: `Nuevo pedido ${pedido.numeroPedido} de ${clienteNombre} por S/ ${total.toFixed(2)}`,
        rolDestino: 'contabilidad',
        pedidoId: pedido.id,
      },
    });
    io.to('contabilidad').emit('nuevo_pedido', { pedido });
    io.to('admin').emit('nuevo_pedido', { pedido });

    res.status(201).json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

// PATCH /api/pedidos/:id/estado - Cambiar estado
router.patch('/:id/estado', verificarToken, async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['pendiente', 'voucher_cargado', 'en_revision', 'confirmado', 'en_despacho', 'despachado', 'cancelado'];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const pedido = await prisma.pedido.update({
      where: { id: req.params.id },
      data: { estado },
      include: {
        items: { include: { producto: true } },
        vendedor: { select: { nombre: true } },
        voucher: true,
      },
    });

    // Notificar según estado
    const io = req.app.get('io');

    if (estado === 'confirmado') {
      await prisma.notificacion.create({
        data: {
          tipo: 'pedido_confirmado',
          mensaje: `Pedido ${pedido.numeroPedido} CONFIRMADO - Preparar despacho`,
          rolDestino: 'almacen',
          pedidoId: pedido.id,
        },
      });
      io.to('almacen').emit('pedido_confirmado', { pedido });
      io.to('admin').emit('pedido_confirmado', { pedido });
    }

    if (estado === 'despachado') {
      await prisma.notificacion.create({
        data: {
          tipo: 'pedido_despachado',
          mensaje: `Pedido ${pedido.numeroPedido} despachado exitosamente`,
          rolDestino: 'contabilidad',
          pedidoId: pedido.id,
        },
      });
      io.to('contabilidad').emit('pedido_despachado', { pedido });
      io.to('vendedor').emit('pedido_despachado', { pedido });
    }

    res.json(pedido);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

module.exports = router;
