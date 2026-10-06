const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos iniciales...');

  // Categorías de productos eléctricos
  const categorias = await Promise.all([
    prisma.categoria.upsert({ where: { nombre: 'Borneras' }, update: {}, create: { nombre: 'Borneras', descripcion: 'Borneras y accesorios de riel' } }),
    prisma.categoria.upsert({ where: { nombre: 'Relés y Contactores' }, update: {}, create: { nombre: 'Relés y Contactores', descripcion: 'Bases de montaje, relés térmicos y contactores' } }),
    prisma.categoria.upsert({ where: { nombre: 'Instrumentos de Medición' }, update: {}, create: { nombre: 'Instrumentos de Medición', descripcion: 'Amperímetros, voltímetros y analizadores' } }),
    prisma.categoria.upsert({ where: { nombre: 'Controladores Eléctricos' }, update: {}, create: { nombre: 'Controladores Eléctricos', descripcion: 'Controladores digitales y analógicos' } }),
    prisma.categoria.upsert({ where: { nombre: 'Interruptores' }, update: {}, create: { nombre: 'Interruptores', descripcion: 'Interruptores y pulsadores industriales' } }),
    prisma.categoria.upsert({ where: { nombre: 'Sensores' }, update: {}, create: { nombre: 'Sensores', descripcion: 'Sensores inductivos, temperatura y presión' } }),
    prisma.categoria.upsert({ where: { nombre: 'Neumática' }, update: {}, create: { nombre: 'Neumática', descripcion: 'Componentes neumáticos y unidades de control' } }),
    prisma.categoria.upsert({ where: { nombre: 'Cables y Conductores' }, update: {}, create: { nombre: 'Cables y Conductores', descripcion: 'Cables THW, NYY y conductores industriales' } }),
  ]);

  const [borneras, reles, instrumentos, controladores, interruptores, sensores, neumatica, cables] = categorias;

  // Productos de ejemplo
  const productos = [
    { codigo: 'BOR-JXB-01', nombre: 'Accesorio de Topa para Borneras de Riel Modelo-JXB', precio: 12.50, stock: 150, categoriaId: borneras.id, unidad: 'UND' },
    { codigo: 'BOR-JXB-02', nombre: 'Accesorio de Tope para Borneras de Riel Modelo-JXB-P', precio: 14.00, stock: 120, categoriaId: borneras.id, unidad: 'UND' },
    { codigo: 'REL-LA7D1064', nombre: 'Acople para Relay Modelo Azul LA7D1064', precio: 45.00, stock: 80, categoriaId: reles.id, unidad: 'UND' },
    { codigo: 'REL-LA7D2064', nombre: 'Acople para Relay Modelo Azul LA7D2064', precio: 48.00, stock: 75, categoriaId: reles.id, unidad: 'UND' },
    { codigo: 'REL-LA7D3064', nombre: 'Acople para Relay Modelo Azul-Tesys LA7D3064', precio: 52.00, stock: 60, categoriaId: reles.id, unidad: 'UND' },
    { codigo: 'INS-IA7272', nombre: 'Amperímetro Analógico AC EO-IA7272', precio: 85.00, stock: 40, categoriaId: instrumentos.id, unidad: 'UND' },
    { codigo: 'INS-IA9696', nombre: 'Amperímetro Analógico AC EO-IA9696', precio: 95.00, stock: 35, categoriaId: instrumentos.id, unidad: 'UND' },
    { codigo: 'INS-ID4848', nombre: 'Amperímetro Digital EO-ID4848-LDSS', precio: 180.00, stock: 25, categoriaId: instrumentos.id, unidad: 'UND' },
    { codigo: 'INS-ID9648', nombre: 'Amperímetro Digital EO-ID9648-LDSS', precio: 210.00, stock: 20, categoriaId: instrumentos.id, unidad: 'UND' },
    { codigo: 'INS-AR9696', nombre: 'Analizador de Redes EO-AR9696-LDRR (LCD)', precio: 450.00, stock: 15, categoriaId: controladores.id, unidad: 'UND' },
    { codigo: 'INS-ANEMO816', nombre: 'Anemómetro Digital Victor 816', precio: 320.00, stock: 10, categoriaId: instrumentos.id, unidad: 'UND' },
    { codigo: 'INS-ANEMO816B', nombre: 'Anemómetro Digital Victor 816B', precio: 380.00, stock: 8, categoriaId: instrumentos.id, unidad: 'UND' },
    { codigo: 'ALERT-VC1AC', nombre: 'Alertador Manual de Fuga de Voltaje VC1AC-C II', precio: 125.00, stock: 30, categoriaId: interruptores.id, unidad: 'UND' },
    { codigo: 'CAB-THW-2.5', nombre: 'Cable THW 2.5mm² (rollo 100m)', precio: 185.00, stock: 50, categoriaId: cables.id, unidad: 'ROLLO' },
    { codigo: 'CAB-NYY-4X6', nombre: 'Cable NYY 4x6mm² (metro)', precio: 28.00, stock: 500, categoriaId: cables.id, unidad: 'MT' },
    { codigo: 'SEN-IND-M12', nombre: 'Sensor Inductivo M12 NPN NC', precio: 65.00, stock: 45, categoriaId: sensores.id, unidad: 'UND' },
    { codigo: 'NEU-FRL-3/8', nombre: 'Unidad FRL 3/8 con manómetro', precio: 145.00, stock: 20, categoriaId: neumatica.id, unidad: 'UND' },
  ];

  for (const prod of productos) {
    await prisma.producto.upsert({
      where: { codigo: prod.codigo },
      update: {},
      create: prod,
    });
  }

  // Usuarios del sistema
  const passwordHash = await bcrypt.hash('elg2026', 10);

  const usuarios = [
    { nombre: 'Admin Sistema', email: 'admin@elg.com', password: passwordHash, rol: 'admin' },
    { nombre: 'Carlos Vendedor', email: 'vendedor@elg.com', password: passwordHash, rol: 'vendedor' },
    { nombre: 'María Contabilidad', email: 'contabilidad@elg.com', password: passwordHash, rol: 'contabilidad' },
    { nombre: 'Juan Almacén', email: 'almacen@elg.com', password: passwordHash, rol: 'almacen' },
  ];

  for (const user of usuarios) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  console.log('✅ Datos iniciales cargados correctamente');
  console.log('');
  console.log('👤 Usuarios creados (contraseña: elg2026):');
  console.log('   admin@elg.com       → Admin');
  console.log('   vendedor@elg.com    → Vendedor');
  console.log('   contabilidad@elg.com → Contabilidad');
  console.log('   almacen@elg.com     → Almacén');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
