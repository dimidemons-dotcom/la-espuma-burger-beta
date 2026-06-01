# La Espuma Burger - Sistema de Gestión de Carta

Sistema completo de gestión de carta para La Espuma Burger con frontend React y backend Node.js/Express, listo para desplegar en Railway.

## 🚀 Características

- **Frontend React**: Diseño premium oscuro/dorado con splash screen original
- **Backend Node.js**: API REST con Express para gestión de carta
- **Panel Admin**: Interfaz para crear, editar y eliminar platos
- **Sincronización en tiempo real**: SSE + fallback polling
- **Persistencia**: JSON file storage con volúmenes Railway
- **Gestión de imágenes**: Upload de fotos para platos
- **Alérgenos y disponibilidad**: Control de alérgenos y estado agotado

## 📦 Instalación Local

```bash
cd LA_ESPUMA_BURGER_RAILWAY_READY
npm install
npm start
```

El servidor arrancará en `http://localhost:3000`

## 🔗 URLs

- **Frontend público**: `http://localhost:3000`
- **Panel Admin**: `http://localhost:3000/admin`
- **API**: `http://localhost:3000/api/menu`

## 🔐 Credenciales Admin

- **Usuario**: `admin`
- **Contraseña**: `espuma123`

## 🌐 Subir a GitHub

```bash
git init
git add .
git commit -m "La Espuma Burger - Sistema de gestión de carta"
git branch -M main
git remote add origin https://github.com/tu-usuario/la-espuma-burger.git
git push -u origin main
```

## 🚀 Desplegar en Railway

### 1. Crear cuenta en Railway
Ve a https://railway.app y crea una cuenta o inicia sesión.

### 2. Crear nuevo proyecto
- Clic en "New Project"
- "Deploy from GitHub repo"
- Selecciona tu repositorio

### 3. Configurar variables de entorno
En Railway, ve a "Variables" y añade:

```
PORT=3000
ADMIN_USER=admin
ADMIN_PASSWORD=espuma123
DATA_DIR=/data
UPLOADS_DIR=/data/uploads
```

### 4. Configurar volúmenes para persistencia
En Railway, ve a "Volumes" y crea:
- Volumen `data` montado en `/data`
- Volumen `uploads` montado en `/data/uploads`

### 5. Desplegar
Railway detectará automáticamente el package.json y ejecutará `npm start`.

### 6. URLs públicas
- **Frontend**: `https://tu-app.railway.app`
- **Admin**: `https://tu-app.railway.app/admin`
- **API**: `https://tu-app.railway.app/api/menu`

## 📋 API Endpoints

### Menú
- `GET /api/menu` - Obtener todos los platos
- `POST /api/menu` - Crear nuevo plato
- `PUT /api/menu/:id` - Actualizar plato
- `DELETE /api/menu/:id` - Eliminar plato

### Imágenes
- `POST /api/upload` - Subir imagen de plato

### Eventos
- `GET /api/events` - Server-Sent Events para actualizaciones en tiempo real

## 🧪 Prueba Final

### 1. Abrir frontend
Ve a `http://localhost:3000` y verifica:
- ✅ Splash screen original de La Espuma Burger
- ✅ Logo grande
- ✅ Fondo premium oscuro
- ✅ Menú visual con categorías
- ✅ Platos con fotos y precios

### 2. Entrar en admin
Ve a `http://localhost:3000/admin` y:
- ✅ Login con admin/espuma123
- ✅ Crear nuevo plato
- ✅ Subir foto
- ✅ Marcar agotado
- ✅ Guardar

### 3. Verificar sincronización
- ✅ Ver el plato en frontend con "Agotado"
- ✅ Cambiar precio desde admin
- ✅ Ver cambio en frontend (actualización automática)

## 📁 Estructura del Proyecto

```
LA_ESPUMA_BURGER_RAILWAY_READY/
├── package.json
├── server.js
├── .env.example
├── .gitignore
├── README.md
├── data/
│   └── menu.json
├── uploads/
├── public/
│   ├── index.html
│   └── assets/
└── admin/
    ├── admin.html
    ├── admin.css
    └── admin.js
```

## 🔧 Variables de Entorno

- `PORT` - Puerto del servidor (default: 3000)
- `ADMIN_USER` - Usuario del panel admin (default: admin)
- `ADMIN_PASSWORD` - Contraseña del panel admin (default: espuma123)
- `DATA_DIR` - Directorio para datos (default: ./data)
- `UPLOADS_DIR` - Directorio para uploads (default: ./uploads)

## 🎨 Categorías del Menú

- Picoteo
- Papas Locas
- Enrollados
- Burger
- Pollo Brother
- Postres
- Bebidas

## ⚠️ Notas

- El frontend consume `/api/menu` dinámicamente
- Los platos marcados como agotado muestran badge "AGOTADO"
- El botón "Añadir" se bloquea para platos agotados
- La sincronización usa SSE con fallback polling cada 3 segundos
- Las imágenes se sirven desde `/uploads`

## 📄 Licencia

MIT
