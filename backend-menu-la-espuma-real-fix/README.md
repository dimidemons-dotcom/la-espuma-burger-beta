# La Espuma Burger · Backend Menu

Proyecto listo para Railway con:

- Carta pública en `/`
- Panel admin en `/admin`
- API en `/api/menu`
- Modo IA local en `/api/menu-helper`
- Subida de imágenes en `/api/upload`
- Eventos SSE en `/api/events`

## Arranque local

```bash
npm install
npm start
```

Abrir:

- Web: http://localhost:3000
- Admin: http://localhost:3000/admin
- API: http://localhost:3000/api/menu

## Admin

Usuario por defecto:

```txt
admin
```

Contraseña por defecto:

```txt
espuma123
```

## Railway

Root Directory: vacío si `package.json` está en la raíz del repo.

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

Para conservar cambios de carta y fotos en producción, crear volumen persistente montado en `/data`.

## Estructura

```txt
package.json
server.js
public/
admin/
data/menu.json
uploads/
```
