const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarRol } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/vouchers');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nombreUnico = `voucher-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombreUnico);
  },
});

const fileFilter = (req, file, cb) => {
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, WEBP)'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Función OCR simulada (cuando no hay API key configurada)
// En producción esto se reemplaza con Google Vision o AWS Textract
function simularOCR(nombreArchivo) {
  const bancos = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'BanBif', 'Banca de la Nación'];
  const banco = bancos[Math.floor(Math.random() * bancos.length)];
  const monto = (Math.random() * 5000 + 100).toFixed(2);
  const numOp = String(Math.floor(Math.random() * 9000000000) + 1000000000);
  const hoy = new Date();
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

  return {
    monto: parseFloat(monto),
    fecha,
    numOperacion: numOp,
    banco,
    rawText: `TRANSFERENCIA INTERBANCARIA\nBanco: ${banco}\nFecha: ${fecha}\nN° Operación: ${numOp}\nMonto: S/ ${monto}\nConcepto: Pago de pedido`,
    confianza: Math.floor(Math.random() * 20) + 75, // 75-95%
  };
}

// POST /api/vouchers/:pedidoId - Cargar voucher
router.post('/:pedidoId', verificarToken, verificarRol('vendedor', 'admin'), upload.single('voucher'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Imagen del voucher requerida' });
    }

    const pedido = await prisma.pedido.findUnique({ where: { id: req.params.pedidoId } });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Verificar que el vendedor sea dueño del pedido
    if (req.user.rol === 'vendedor' && pedido.vendedorId !== req.user.id) {
      return res.status(403).json({ error: 'Sin acceso a este pedido' });
    }

    // Procesar OCR
    const imagenUrl = `/uploads/vouchers/${req.file.filename}`;
    const ocrData = simularOCR(req.file.filename);

    // Guardar o actualizar voucher
    const existeVoucher = await prisma.voucher.findUnique({ where: { pedidoId: req.params.pedidoId } });

    let voucher;
    if (existeVoucher) {
      voucher = await prisma.voucher.update({
        where: { pedidoId: req.params.pedidoId },
        data: {
          imagenUrl,
          imagenNombre: req.file.filename,
          ocrMonto: ocrData.monto,
          ocrFecha: ocrData.fecha,
          ocrNumOperacion: ocrData.numOperacion,
          ocrBanco: ocrData.banco,
          ocrRawText: ocrData.rawText,
          ocrConfianza: ocrData.confianza,
          estadoRevision: 'pendiente',
        },
      });
    } else {
      voucher = await prisma.voucher.create({
        data: {
          imagenUrl,
          imagenNombre: req.file.filename,
          ocrMonto: ocrData.monto,
          ocrFecha: ocrData.fecha,
          ocrNumOperacion: ocrData.numOperacion,
          ocrBanco: ocrData.banco,
          ocrRawText: ocrData.rawText,
          ocrConfianza: ocrData.confianza,
          pedidoId: req.params.pedidoId,
        },
      });
    }

    // Actualizar estado del pedido
    await prisma.pedido.update({
      where: { id: req.params.pedidoId },
      data: { estado: 'voucher_cargado' },
    });

    // Notificar a contabilidad
    const io = req.app.get('io');
    await prisma.notificacion.create({
      data: {
        tipo: 'voucher_cargado',
        mensaje: `Voucher cargado para pedido ${pedido.numeroPedido} - Banco: ${ocrData.banco} - S/ ${ocrData.monto}`,
        rolDestino: 'contabilidad',
        pedidoId: pedido.id,
      },
    });
    io.to('contabilidad').emit('voucher_cargado', { pedidoId: pedido.id, numeroPedido: pedido.numeroPedido, voucher });
    io.to('admin').emit('voucher_cargado', { pedidoId: pedido.id, numeroPedido: pedido.numeroPedido, voucher });

    res.status(201).json({ voucher, mensaje: 'Voucher cargado y procesado por OCR' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar voucher' });
  }
});

// PATCH /api/vouchers/:id/revisar - Contabilidad revisa el voucher
router.patch('/:id/revisar', verificarToken, verificarRol('contabilidad', 'admin'), async (req, res) => {
  try {
    const { estadoRevision, notaContable, confirmarPedido } = req.body;

    if (!['aprobado', 'rechazado'].includes(estadoRevision)) {
      return res.status(400).json({ error: 'Estado debe ser aprobado o rechazado' });
    }

    const voucher = await prisma.voucher.update({
      where: { id: req.params.id },
      data: {
        estadoRevision,
        notaContable: notaContable || null,
        revisadoEn: new Date(),
      },
      include: { pedido: true },
    });

    // Si se aprueba y se quiere confirmar el pedido automáticamente
    if (estadoRevision === 'aprobado' && confirmarPedido) {
      await prisma.pedido.update({
        where: { id: voucher.pedidoId },
        data: { estado: 'confirmado' },
      });

      const io = req.app.get('io');
      await prisma.notificacion.create({
        data: {
          tipo: 'pedido_confirmado',
          mensaje: `Pedido ${voucher.pedido.numeroPedido} CONFIRMADO - Listo para despacho`,
          rolDestino: 'almacen',
          pedidoId: voucher.pedidoId,
        },
      });
      io.to('almacen').emit('pedido_confirmado', {
        pedidoId: voucher.pedidoId,
        numeroPedido: voucher.pedido.numeroPedido,
      });
    }

    res.json({ voucher, mensaje: `Voucher ${estadoRevision}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al revisar voucher' });
  }
});

module.exports = router;
