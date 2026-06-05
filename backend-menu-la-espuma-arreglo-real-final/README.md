# La Espuma Burger - menú + admin

Aplicación Node/Express lista para Railway.

## Rutas

- `/` carta pública
- `/admin` panel de administración
- `/api/menu` API de carta
- `/api/menu-helper` recomendaciones del Modo IA

## Arranque local

```bash
npm install
npm start
```

Usuario admin: `admin`  
Contraseña: `espuma123`

## Railway

- Root Directory: vacío
- Start Command: `npm start`
- Variables recomendadas:

```env
ADMIN_USER=admin
ADMIN_PASSWORD=espuma123
NODE_ENV=production
DATA_DIR=/data
UPLOADS_DIR=/data/uploads
```

Para uso real, crea un volumen persistente montado en `/data`.
