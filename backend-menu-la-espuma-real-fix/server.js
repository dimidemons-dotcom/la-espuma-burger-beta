const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'espuma123';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.createHash('sha256').update(`${ADMIN_USER}:${ADMIN_PASSWORD}:la-espuma-burger`).digest('hex');
const FALLBACK_MENU = require('./data/menu.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

function safeJsonRead(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function ensureMenu() {
  let shouldSeed = false;
  if (!fs.existsSync(MENU_FILE)) shouldSeed = true;
  if (!shouldSeed) {
    const parsed = safeJsonRead(MENU_FILE, null);
    shouldSeed = !Array.isArray(parsed) || parsed.length === 0;
  }
  if (shouldSeed) {
    fs.writeFileSync(MENU_FILE, JSON.stringify(FALLBACK_MENU, null, 2));
  }
}

function readMenu() {
  ensureMenu();
  const menu = safeJsonRead(MENU_FILE, []);
  return Array.isArray(menu) ? menu : [];
}

function writeBackup(type, payload) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const file = path.join(BACKUP_DIR, `${type}-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.warn('Backup skipped:', error.message);
  }
}

function writeMenu(items) {
  const clean = Array.isArray(items) ? items : [];
  fs.writeFileSync(MENU_FILE, JSON.stringify(clean, null, 2));
  writeBackup('menu', clean);
  broadcast('menu-updated', { at: new Date().toISOString(), total: clean.length });
}

function parsePrice(value) {
  const n = Number(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseAllergens(value, fallback = []) {
  if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return Array.isArray(fallback) ? fallback : [];
}

function normalizeDish(body, existing = {}) {
  const now = new Date().toISOString();
  const price = parsePrice(body.price ?? existing.price);
  return {
    id: existing.id || body.id || `dish-${crypto.randomUUID().slice(0, 8)}`,
    legacyIndex: existing.legacyIndex ?? body.legacyIndex,
    name: String(body.name ?? existing.name ?? 'Nuevo plato').trim() || 'Nuevo plato',
    description: String(body.description ?? existing.description ?? '').trim(),
    price,
    priceText: body.priceText || `${price.toFixed(2).replace('.', ',')} €`,
    category: String(body.category ?? existing.category ?? 'smash').trim() || 'smash',
    image: String(body.image ?? existing.image ?? '/assets/menu_classic_burger.webp').trim() || '/assets/menu_classic_burger.webp',
    allergens: parseAllergens(body.allergens, existing.allergens || []),
    isAvailable: parseBoolean(body.isAvailable, existing.isAvailable ?? true),
    isSoldOut: parseBoolean(body.isSoldOut, existing.isSoldOut ?? false),
    isFeatured: parseBoolean(body.isFeatured, existing.isFeatured ?? false),
    sortOrder: Number(body.sortOrder ?? existing.sortOrder ?? 999),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

const clients = new Set();
function broadcast(event, data) {
  for (const res of clients) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) {}
  }
}

function requireAdmin(req, res, next) {
  const headerToken = req.get('x-admin-token') || '';
  const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (headerToken === ADMIN_TOKEN || bearer === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(cors());
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.webp';
    const base = path.basename(file.originalname || 'image', ext).replace(/[^a-z0-9_-]/gi, '_').slice(0, 48) || 'image';
    cb(null, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo se permiten imágenes JPG, PNG o WEBP.'), ok);
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'La Espuma Burger', menuItems: readMenu().length }));
app.post('/api/admin/login', (req, res) => {
  const user = String(req.body.user || req.body.username || '');
  const pass = String(req.body.password || req.body.pass || '');
  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return res.json({ ok: true, token: ADMIN_TOKEN });
  return res.status(401).json({ ok: false, error: 'login_failed' });
});
app.get('/api/admin/me', requireAdmin, (_req, res) => res.json({ ok: true, user: ADMIN_USER }));

app.get('/api/menu', (_req, res) => res.json(readMenu()));
app.get('/api/menu/:id', (req, res) => {
  const item = readMenu().find(x => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ error: 'not_found' });
  res.json(item);
});
app.post('/api/menu', requireAdmin, (req, res) => {
  const menu = readMenu();
  const item = normalizeDish(req.body, { sortOrder: menu.length });
  menu.push(item);
  writeMenu(menu);
  res.status(201).json(item);
});
app.put('/api/menu/:id', requireAdmin, (req, res) => {
  const menu = readMenu();
  const idx = menu.findIndex(x => String(x.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'not_found' });
  menu[idx] = normalizeDish(req.body, menu[idx]);
  writeMenu(menu);
  res.json(menu[idx]);
});
app.delete('/api/menu/:id', requireAdmin, (req, res) => {
  const menu = readMenu();
  const idx = menu.findIndex(x => String(x.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'not_found' });
  const next = menu.filter(x => String(x.id) !== String(req.params.id));
  writeMenu(next);
  res.json({ ok: true });
});
app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/menu-helper', (req, res) => {
  const raw = String(req.body.message || req.body.text || '').trim();
  const msg = raw.toLowerCase();
  const menu = readMenu().filter(x => x.isAvailable !== false && !x.isSoldOut);
  const allergyAvoid = [];
  if (/sin gluten|celiac|celíac/.test(msg)) allergyAvoid.push('gluten');
  if (/sin lactosa/.test(msg)) allergyAvoid.push('lactosa');
  if (/sin huevo/.test(msg)) allergyAvoid.push('huevo');
  if (/sin frutos secos|alergia.*frutos/.test(msg)) allergyAvoid.push('frutos secos');
  const tokens = msg.split(/[^a-záéíóúüñ0-9]+/i).filter(Boolean);
  const scored = menu.map(item => {
    const hay = [item.name, item.description, item.category, ...(item.allergens || [])].join(' ').toLowerCase();
    let score = 0;
    tokens.forEach(t => { if (hay.includes(t)) score += 2; });
    if (/bacon|beicon|panceta/.test(msg) && /bacon|panceta/.test(hay)) score += 9;
    if (/trufa|trufad|elegante|especial/.test(msg) && /trufa|mayotrufa|parmesano|rulo/.test(hay)) score += 8;
    if (/veget|sin carne|aguacate|avocado/.test(msg) && /veget|aguacate|avocado/.test(hay)) score += 8;
    if (/niñ|infantil|peque|baby/.test(msg) && /infantil|baby|nuggets/.test(hay)) score += 8;
    if (/smash|burger|hamburgues|carne/.test(msg) && item.category === 'smash') score += 5;
    if (/papa|patata|papas|compartir|pic/.test(msg) && (item.category === 'papas' || item.category === 'picoteo')) score += 5;
    if (/postre|dulce|tarta|cheese/.test(msg) && item.category === 'postres') score += 6;
    if (/bebida|refresco|agua|coca|cerveza/.test(msg) && item.category === 'bebidas') score += 6;
    if (item.isFeatured) score += 2;
    for (const a of allergyAvoid) if ((item.allergens || []).includes(a)) score -= 20;
    return { item, score };
  }).sort((a, b) => b.score - a.score);
  let picks = scored.filter(x => x.score > 0).slice(0, 3).map(x => x.item);
  if (!picks.length) picks = menu.filter(x => x.isFeatured).slice(0, 3);
  if (!picks.length) picks = menu.filter(x => x.category === 'smash').slice(0, 3);
  const detail = picks.map(x => `${x.name} (${x.priceText || (Number(x.price || 0).toFixed(2).replace('.', ',') + ' €')})`).join(', ');
  const reply = picks.length
    ? `Según lo que me dices, te recomiendo: ${detail}. ${picks[0]?.description || ''}`
    : 'Ahora mismo no encuentro una recomendación exacta, pero puedo ayudarte por categoría, alérgenos, bacon, trufa, vegetariano o platos para niños.';
  res.json({ reply, picks, source: 'menu.json' });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('event: connected\ndata: {"ok":true}\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'admin.html')));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((error, _req, res, _next) => {
  if (error) return res.status(400).json({ error: error.message || 'request_error' });
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => console.log(`La Espuma Burger backend-menu running on port ${PORT}`));
