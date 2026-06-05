# La Espuma Burger · Carta + Admin

Proyecto listo para Railway con frontend público, panel de administración y API en un único servidor Node/Express.

## Funciones principales

- Carta pública en `/`.
- Panel admin en `/admin`.
- API pública de carta en `/api/menu`.
- Modo IA en `/api/menu-helper`, usando la información real de la carta.
- Subida de imágenes en `/api/upload`.
- Imágenes servidas desde `/uploads` y `/assets`.
- Edición de platos, fotos, alérgenos, agotados y disponibilidad.
- Categorías fijas durante todo el menú.
- Vista desplegable: Grande y Mosaico.
- Vista Grande estilo post vertical.
- Vista Mosaico separada por categorías.

## Arranque local

```bash
npm install
npm start
```

Abrir:

- Frontend: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- API: `http://localhost:3000/api/menu`

Credenciales por defecto:

- Usuario: `admin`
- Contraseña: `espuma123`

## Railway

Root Directory: vacío, siempre que `package.json` y `server.js` estén en la raíz del repositorio.

Start Command:

```bash
npm start
```

Variables recomendadas:

```env
ADMIN_USER=admin
ADMIN_PASSWORD=espuma123
NODE_ENV=production
DATA_DIR=/data
UPLOADS_DIR=/data/uploads
```

Para conservar cambios de carta y fotos en Railway, crea un volumen montado en `/data`.

## Prueba rápida

1. Abre `/api/menu` y confirma que devuelve platos.
2. Abre `/admin` y entra con las credenciales.
3. Cambia el precio o marca un plato como agotado.
4. Abre `/` y comprueba que el cambio aparece en la carta.
