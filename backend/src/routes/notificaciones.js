const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/notificaciones - Mis notificaciones según rol
router.get('/', verificarToken, async (req, res) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { rolDestino: req.user.rol },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notificaciones);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// PATCH /api/notificaciones/:id/leer
router.patch('/:id/leer', verificarToken, async (req, res) => {
  try {
    const notif = await prisma.notificacion.update({
      where: { id: req.params.id },
      data: { leida: true },
    });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
});

// PATCH /api/notificaciones/leer-todas
router.patch('/leer-todas', verificarToken, async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { rolDestino: req.user.rol, leida: false },
      data: { leida: true },
    });
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
});

module.exports = router;
