const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarRol } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/almacen/pedidos - Pedidos para despacho (confirmados y en despacho)
router.get('/pedidos', verificarToken, verificarRol('almacen', 'admin'), async (req, res) => {
  try {
    const { estado } = req.query;
    const estados = estado ? [estado] : ['confirmado', 'en_despacho'];

    const pedidos = await prisma.pedido.findMany({
      where: { estado: { in: estados } },
      include: {
        items: {
          include: {
            producto: {
              include: { categoria: true },
            },
          },
        },
        vendedor: { select: { nombre: true } },
        voucher: { select: { estadoRevision: true, ocrBanco: true, ocrMonto: true } },
      },
      orderBy: { updatedAt: 'asc' }, // Los más antiguos primero (FIFO)
    });

    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedidos de almacén' });
  }
});

// PATCH /api/almacen/pedidos/:id/iniciar-despacho
router.patch('/pedidos/:id/iniciar-despacho', verificarToken, verificarRol('almacen', 'admin'), async (req, res) => {
  try {
    const pedido = await prisma.pedido.update({
      where: { id: req.params.id },
      data: { estado: 'en_despacho' },
      include: {
        items: { include: { producto: true } },
        vendedor: { select: { nombre: true } },
      },
    });

    const io = req.app.get('io');
    io.to('admin').emit('estado_actualizado', { pedidoId: pedido.id, estado: 'en_despacho' });

    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar despacho' });
  }
});

// PATCH /api/almacen/pedidos/:id/confirmar-despacho
router.patch('/pedidos/:id/confirmar-despacho', verificarToken, verificarRol('almacen', 'admin'), async (req, res) => {
  try {
    const pedido = await prisma.pedido.update({
      where: { id: req.params.id },
      data: { estado: 'despachado' },
      include: {
        items: { include: { producto: true } },
        vendedor: { select: { nombre: true } },
      },
    });

    // Descontar stock de cada producto
    for (const item of pedido.items) {
      await prisma.producto.update({
        where: { id: item.productoId },
        data: { stock: { decrement: item.cantidad } },
      });
    }

    // Notificaciones
    const io = req.app.get('io');
    await prisma.notificacion.create({
      data: {
        tipo: 'pedido_despachado',
        mensaje: `Pedido ${pedido.numeroPedido} despachado a ${pedido.clienteNombre}`,
        rolDestino: 'contabilidad',
        pedidoId: pedido.id,
      },
    });

    io.to('contabilidad').emit('pedido_despachado', { pedido });
    io.to('vendedor').emit('pedido_despachado', { pedidoId: pedido.id, numeroPedido: pedido.numeroPedido });
    io.to('admin').emit('pedido_despachado', { pedido });

    res.json({ pedido, mensaje: 'Despacho confirmado y stock actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar despacho' });
  }
});

// GET /api/almacen/estadisticas
router.get('/estadisticas', verificarToken, verificarRol('almacen', 'admin'), async (req, res) => {
  try {
    const [confirmados, enDespacho, despachados] = await Promise.all([
      prisma.pedido.count({ where: { estado: 'confirmado' } }),
      prisma.pedido.count({ where: { estado: 'en_despacho' } }),
      prisma.pedido.count({ where: { estado: 'despachado' } }),
    ]);

    res.json({ confirmados, enDespacho, despachados });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
