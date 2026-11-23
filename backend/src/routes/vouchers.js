const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarRol } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

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
  // OWASP: solo JPEG y PNG según Plan de Calidad (máx. 5MB)
  const tiposPermitidos = ['image/jpeg', 'image/png'];
  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPEG o PNG'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB — OWASP Plan de Calidad

// ─── OCR.space API ────────────────────────────────────────────────────────────
// Extrae texto de la imagen del voucher y luego parsea los campos clave.
// Prueba los 3 motores de OCR.space en orden y devuelve el mejor resultado.
async function procesarOCR(rutaImagen) {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ OCR_SPACE_API_KEY no configurada — extracción OCR pendiente');
    return ocrNoDisponible('No se configuró OCR.space; requiere revisión manual');
  }

  // Intentar con engine 2 primero (mejor para vouchers), luego 1 y 3 como fallback
  const engines = [2, 1, 3];
  let rawText = '';
  let confianza = 0;

  for (const engine of engines) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(rutaImagen));
      form.append('apikey', apiKey);
      form.append('language', 'spa');        // español
      form.append('OCREngine', String(engine));
      form.append('isOverlayRequired', 'false');
      form.append('detectOrientation', 'true');
      form.append('scale', 'true');          // mejora imágenes pequeñas

      const response = await axios.post('https://api.ocr.space/parse/image', form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      const resultado = response.data;

      // Verificar si el OCR tuvo éxito
      if (resultado.IsErroredOnProcessing) {
        console.warn(`Engine ${engine} falló:`, resultado.ErrorMessage);
        continue;
      }

      const pagina = resultado.ParsedResults?.[0];
      if (!pagina || !pagina.ParsedText) continue;

      rawText = pagina.ParsedText.trim();
      // OCR.space no devuelve un porcentaje verificable de precisión por voucher.
      // La precisión debe medirse en QA con una muestra y valores de referencia.
      confianza = null;

      console.log(`✅ OCR engine ${engine} exitoso — ${rawText.length} caracteres extraídos`);
      break; // usamos este resultado

    } catch (err) {
      console.warn(`Engine ${engine} error:`, err.message);
    }
  }

  if (!rawText) {
    console.warn('OCR no pudo extraer texto — requiere revisión manual');
    return ocrNoDisponible('OCR.space no extrajo texto; requiere revisión manual');
  }

  // Parsear los campos clave del texto extraído
  return parsearTextoVoucher(rawText, confianza);
}

// ─── Parser de texto del voucher ─────────────────────────────────────────────
// Busca patrones comunes en vouchers de transferencias bancarias peruanas
function parsearTextoVoucher(rawText, confianza) {
  const texto = rawText.toUpperCase();

  // ── Detectar banco ──
  const bancos = [
    { nombres: ['BCP', 'BANCO DE CREDITO', 'CRÉDITO DEL PERÚ'], resultado: 'BCP' },
    { nombres: ['BBVA', 'CONTINENTAL'], resultado: 'BBVA' },
    { nombres: ['INTERBANK', 'IBK'], resultado: 'Interbank' },
    { nombres: ['SCOTIABANK', 'SCOTIA'], resultado: 'Scotiabank' },
    { nombres: ['BANBIF', 'BIF'], resultado: 'BanBif' },
    { nombres: ['BANCA DE LA NACION', 'NACIÓN', 'NACION'], resultado: 'Banca de la Nación' },
    { nombres: ['PICHINCHA'], resultado: 'Banco Pichincha' },
    { nombres: ['MIBANCO'], resultado: 'Mibanco' },
    { nombres: ['YAPE'], resultado: 'Yape (BCP)' },
    { nombres: ['PLIN'], resultado: 'Plin' },
  ];

  let banco = 'No identificado';
  for (const b of bancos) {
    if (b.nombres.some(n => texto.includes(n))) {
      banco = b.resultado;
      break;
    }
  }

  // ── Detectar monto ──
  // Patrones: S/ 1,234.56 | S/1234.56 | PEN 1234.56 | MONTO: 1234.56
  let monto = null;
  const patronesMonto = [
    /S\/\s*([0-9]{1,3}(?:[,\.][0-9]{3})*(?:[,\.][0-9]{2})?)/i,
    /PEN\s*([0-9]{1,3}(?:[,\.][0-9]{3})*(?:[,\.][0-9]{2})?)/i,
    /MONTO[:\s]+([0-9]{1,3}(?:[,\.][0-9]{3})*(?:[,\.][0-9]{2})?)/i,
    /IMPORTE[:\s]+([0-9]{1,3}(?:[,\.][0-9]{3})*(?:[,\.][0-9]{2})?)/i,
    /TOTAL[:\s]+([0-9]{1,3}(?:[,\.][0-9]{3})*(?:[,\.][0-9]{2})?)/i,
  ];

  for (const patron of patronesMonto) {
    const match = rawText.match(patron);
    if (match) {
      // Normalizar: remover comas de miles, asegurar punto decimal
      const montoStr = match[1].replace(/,(\d{3})/g, '$1').replace(',', '.');
      const montoNum = parseFloat(montoStr);
      if (!isNaN(montoNum) && montoNum > 0 && montoNum < 1000000) {
        monto = montoNum;
        break;
      }
    }
  }

  // ── Detectar fecha ──
  let fecha = null;
  const patronesFecha = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,   // DD/MM/YYYY o DD-MM-YYYY
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,   // YYYY-MM-DD
    /(\d{2})\s+(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SET|SEP|OCT|NOV|DIC)\s+(\d{4})/i,
  ];

  for (const patron of patronesFecha) {
    const match = rawText.match(patron);
    if (match) {
      // Devolver en formato DD/MM/YYYY
      if (match[0].includes('-') || match[0].includes('/')) {
        const partes = match[0].split(/[\/\-]/);
        if (partes[0].length === 4) {
          // YYYY-MM-DD → DD/MM/YYYY
          fecha = `${partes[2]}/${partes[1]}/${partes[0]}`;
        } else {
          fecha = `${partes[0]}/${partes[1]}/${partes[2]}`;
        }
      } else {
        fecha = match[0];
      }
      break;
    }
  }

  // ── Detectar número de operación ──
  let numOperacion = null;
  const patronesOp = [
    /(?:N[°º]?\s*(?:DE\s+)?OPERACI[ÓO]N|N[°º]?\s*OP\.?|OPERACI[ÓO]N\s*N[°º]?|CCI|REFERENCIA)[:\s#]*([0-9A-Z]{6,20})/i,
    /(?:TRANSACCI[ÓO]N|TRANSACCION)[:\s#]*([0-9A-Z]{6,20})/i,
    /(?:CODIGO|CÓD\.?)[:\s#]*([0-9A-Z]{8,20})/i,
  ];

  for (const patron of patronesOp) {
    const match = rawText.match(patron);
    if (match) {
      numOperacion = match[1].trim();
      break;
    }
  }

  // Si no encontró número de operación, buscar secuencias largas de dígitos
  if (!numOperacion) {
    const secuencias = rawText.match(/\b\d{8,15}\b/g);
    if (secuencias) {
      // Tomar la secuencia que no sea fecha ni monto
      numOperacion = secuencias.find(s => s.length >= 8) || null;
    }
  }

  return {
    monto,
    fecha,
    numOperacion,
    banco,
    rawText,
    confianza,
  };
}

// Si no hay clave o falla OCR.space, nunca inventar datos bancarios.
function ocrNoDisponible(motivo) {
  return {
    monto: null,
    fecha: null,
    numOperacion: null,
    banco: 'No identificado',
    rawText: '[OCR PENDIENTE] ' + motivo,
    confianza: null,
  };
}

// Imagen original persistida en PostgreSQL, con acceso exclusivo para roles autorizados.
router.get('/:pedidoId/imagen', verificarToken, verificarRol('vendedor', 'contabilidad', 'admin'), async (req, res) => {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: req.params.pedidoId },
      select: { vendedorId: true },
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (req.user.rol === 'vendedor' && pedido.vendedorId !== req.user.id) {
      return res.status(403).json({ error: 'Sin acceso a este comprobante' });
    }

    const archivo = await prisma.voucherImagen.findUnique({
      where: { pedidoId: req.params.pedidoId },
    });
    if (!archivo) return res.status(404).json({
      error: 'Imagen no disponible; puede ser un archivo anterior al almacenamiento persistente',
    });
    res.set('Content-Type', archivo.mimeType);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', 'inline');
    return res.send(Buffer.from(archivo.contenido));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al recuperar el voucher' });
  }
});

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

    // OCR.space procesa el archivo temporal; PostgreSQL conserva la imagen original.
    const rutaCompleta = req.file.path;
    const ocrData = await procesarOCR(rutaCompleta);
    const imagenUrl = '/api/vouchers/' + pedido.id + '/imagen';
    const datosVoucher = {
      imagenUrl,
      imagenNombre: req.file.filename,
      ocrMonto: ocrData.monto,
      ocrFecha: ocrData.fecha,
      ocrNumOperacion: ocrData.numOperacion,
      ocrBanco: ocrData.banco,
      ocrRawText: ocrData.rawText,
      ocrConfianza: ocrData.confianza,
      estadoRevision: 'pendiente',
      notaContable: null,
      revisadoEn: null,
    };

    // Una transacción evita que voucher e imagen queden desincronizados.
    const voucher = await prisma.$transaction(async (tx) => {
      const registrado = await tx.voucher.upsert({
        where: { pedidoId: pedido.id },
        update: datosVoucher,
        create: { ...datosVoucher, pedidoId: pedido.id },
      });
      await tx.voucherImagen.upsert({
        where: { pedidoId: pedido.id },
        update: {
          mimeType: req.file.mimetype,
          contenido: fs.readFileSync(rutaCompleta),
        },
        create: {
          pedidoId: pedido.id,
          mimeType: req.file.mimetype,
          contenido: fs.readFileSync(rutaCompleta),
        },
      });
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { estado: 'voucher_cargado' },
      });
      return registrado;
    });

    // Notificar a contabilidad — registrar timestamp para métrica de latencia
    const io = req.app.get('io');
    const eventoOrigen = new Date();
    io.to('contabilidad').emit('voucher_cargado', { pedidoId: pedido.id, numeroPedido: pedido.numeroPedido, voucher });
    io.to('admin').emit('voucher_cargado', { pedidoId: pedido.id, numeroPedido: pedido.numeroPedido, voucher });
    const entregadaEn = new Date();
    const latenciaMs = entregadaEn - eventoOrigen;

    await prisma.notificacion.create({
      data: {
        tipo: 'voucher_cargado',
        mensaje: `Voucher cargado para pedido ${pedido.numeroPedido} - Banco: ${ocrData.banco} - S/ ${ocrData.monto}`,
        rolDestino: 'contabilidad',
        pedidoId: pedido.id,
        eventoOrigen,
        entregadaEn,
        latenciaMs,
      },
    });

    res.status(201).json({
      voucher,
      mensaje: ocrData.rawText.startsWith('[OCR PENDIENTE]')
        ? 'Voucher cargado; OCR pendiente de revisión manual'
        : 'Voucher cargado y procesado por OCR.space',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar voucher' });
  } finally {
    // El disco temporal no es el almacenamiento definitivo.
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
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
