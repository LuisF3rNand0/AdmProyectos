# Eléctricos Generales S.A.C. — Sistema de Ventas con OCR

Sistema web interno para gestión de ventas, verificación de vouchers bancarios con OCR
y notificaciones en tiempo real al área de almacén.

---

## ¿Cómo correrlo desde cero?

### Requisitos previos
- [Node.js 18 o superior](https://nodejs.org/) — verificar con `node --version`
- Git

### 1. Clonar el repositorio
```bash
git clone https://github.com/analuciahm27/AdmProyectos.git
cd AdmProyectos/elg-sales-app
```

### 2. Configurar el Backend
```bash
cd backend

# Copiar el archivo de variables de entorno
copy .env.example .env

# Instalar dependencias (esto también ejecuta prisma generate)
npm install

# Crear la base de datos y cargar datos iniciales
npm run setup
```

### 3. Configurar el Frontend
```bash
cd ../frontend
npm install
```

### 4. Arrancar ambos servidores

Abrir **dos terminales**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
→ Corre en http://localhost:3001

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
→ Abrir en el navegador: **http://localhost:5173**

---

## Usuarios del sistema

Contraseña para todos: **`elg2026`**

| Email | Rol | Acceso |
|-------|-----|--------|
| admin@elg.com | Admin | Todo |
| vendedor@elg.com | Vendedor | Catálogo, crear pedidos, cargar vouchers |
| contabilidad@elg.com | Contabilidad | Revisar datos OCR de vouchers |
| almacen@elg.com | Almacén | Panel de despacho en tiempo real |

---

## ¿Dónde está la base de datos?

La base de datos es **SQLite** y vive en el archivo `backend/prisma/dev.db`.
Se crea automáticamente cuando ejecutas `npm run setup`.
No se sube al repositorio (está en `.gitignore`), cada compañero la genera en su máquina.

---

## Flujo completo del sistema

```
Vendedor → Crea pedido → Carga foto voucher
                              ↓
                         OCR extrae datos (banco, monto, N° op.)
                              ↓
              Contabilidad revisa → Aprueba voucher
                              ↓
                    Almacén recibe alerta en < 30 seg
                              ↓
              Almacén prepara picking → Confirma despacho
                              ↓
                        Stock actualizado automáticamente
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma |
| Tiempo real | Socket.io |
| Auth | JWT |
| OCR | Simulado (reemplazable por Google Vision API) |

---

## Estructura del proyecto

```
elg-sales-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Modelos de BD
│   │   └── seed.js            # Datos iniciales (productos + usuarios)
│   ├── src/
│   │   ├── index.js           # Servidor Express + Socket.io
│   │   ├── middleware/auth.js # Verificación JWT
│   │   └── routes/
│   │       ├── auth.js        # Login
│   │       ├── productos.js   # Catálogo
│   │       ├── pedidos.js     # CRUD pedidos + notificaciones
│   │       ├── vouchers.js    # Carga imagen + OCR
│   │       ├── almacen.js     # Despacho + stock
│   │       └── notificaciones.js
│   ├── .env.example           # Variables de entorno de ejemplo
│   └── uploads/               # Imágenes de vouchers (no se sube a Git)
└── frontend/
    └── src/
        ├── pages/             # LoginPage, Dashboard, Catálogo, etc.
        ├── context/           # AuthContext (JWT) + SocketContext (tiempo real)
        └── components/        # Layout con navegación por rol
```

---

## Para publicar en producción (Vercel + Railway)

Ver sección de despliegue al final del README o consultar con el equipo.
