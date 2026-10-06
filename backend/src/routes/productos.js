const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verificarToken, verificarRol } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/productos - Listar todos (con filtros)
router.get('/', verificarToken, async (req, res) => {
  try {
    const { buscar, categoriaId, soloActivos = 'true' } = req.query;

    const where = {};
    if (soloActivos === 'true') where.activo = true;
    if (categoriaId) where.categoriaId = categoriaId;
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar } },
        { codigo: { contains: buscar } },
        { descripcion: { contains: buscar } },
      ];
    }

    const productos = await prisma.producto.findMany({
      where,
      include: { categoria: true },
      orderBy: { nombre: 'asc' },
    });

    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/productos/categorias
router.get('/categorias', verificarToken, async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// GET /api/productos/:id
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const producto = await prisma.producto.findUnique({
      where: { id: req.params.id },
      include: { categoria: true },
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/productos - Solo admin
router.post('/', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { codigo, nombre, descripcion, precio, stock, unidad, categoriaId } = req.body;

    if (!codigo || !nombre || !precio || !categoriaId) {
      return res.status(400).json({ error: 'Código, nombre, precio y categoría son requeridos' });
    }

    const producto = await prisma.producto.create({
      data: { codigo, nombre, descripcion, precio: parseFloat(precio), stock: parseInt(stock) || 0, unidad: unidad || 'UND', categoriaId },
      include: { categoria: true },
    });

    res.status(201).json(producto);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'El código ya existe' });
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/productos/:id - Solo admin
router.put('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, unidad, categoriaId, activo } = req.body;

    const producto = await prisma.producto.update({
      where: { id: req.params.id },
      data: {
        ...(nombre && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(precio && { precio: parseFloat(precio) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(unidad && { unidad }),
        ...(categoriaId && { categoriaId }),
        ...(activo !== undefined && { activo }),
      },
      include: { categoria: true },
    });

    res.json(producto);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

module.exports = router;
