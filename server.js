const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables for Railway persistence
const DATA_DIR = process.env.DATA_DIR || './data';
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
const PUBLIC_DIR = './public';
const PUBLIC_APP_DIR = './public/app';

// Create necessary directories if they don't exist
const directories = [DATA_DIR, UPLOADS_DIR, PUBLIC_DIR, PUBLIC_APP_DIR];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Create data files if they don't exist
const menuFilePath = path.join(DATA_DIR, 'menu.json');
const ordersFilePath = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(menuFilePath)) {
  fs.writeFileSync(menuFilePath, JSON.stringify([], null, 2));
  console.log(`✅ Created ${menuFilePath}`);
}

if (!fs.existsSync(ordersFilePath)) {
  fs.writeFileSync(ordersFilePath, JSON.stringify([], null, 2));
  console.log(`✅ Created ${ordersFilePath}`);
}

// Middleware
app.use(cors());
app.use(express.json());

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// SSE clients for real-time updates
const sseClients = new Set();

// Helper functions
const readMenu = () => {
  try {
    const data = fs.readFileSync(menuFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading menu.json:', err);
    return [];
  }
};

const writeMenu = (menu) => {
  try {
    fs.writeFileSync(menuFilePath, JSON.stringify(menu, null, 2));
    notifySSEClients('menu-updated');
  } catch (err) {
    console.error('Error writing menu.json:', err);
  }
};

const readOrders = () => {
  try {
    const data = fs.readFileSync(ordersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading orders.json:', err);
    return [];
  }
};

const writeOrders = (orders) => {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error('Error writing orders.json:', err);
  }
};

const notifySSEClients = (event) => {
  sseClients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ event })}\n\n`);
  });
};

// API Routes

// GET /api/menu - Get all dishes
app.get('/api/menu', (req, res) => {
  const menu = readMenu();
  res.json(menu);
});

// GET /api/menu/:id - Get a specific dish
app.get('/api/menu/:id', (req, res) => {
  const menu = readMenu();
  const dish = menu.find(d => d.id === req.params.id);
  if (!dish) {
    return res.status(404).json({ error: 'Plato no encontrado' });
  }
  res.json(dish);
});

// POST /api/menu - Create a new dish
app.post('/api/menu', (req, res) => {
  const menu = readMenu();
  const newDish = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    price: parseFloat(req.body.price),
    category: req.body.category,
    image: req.body.image || '',
    allergens: req.body.allergens || [],
    isAvailable: req.body.isAvailable !== false,
    isSoldOut: req.body.isSoldOut || false,
    isFeatured: req.body.isFeatured || false,
    sortOrder: req.body.sortOrder || menu.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  menu.push(newDish);
  writeMenu(menu);
  res.status(201).json(newDish);
});

// PUT /api/menu/:id - Update a dish
app.put('/api/menu/:id', (req, res) => {
  const menu = readMenu();
  const index = menu.findIndex(d => d.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Plato no encontrado' });
  }
  
  menu[index] = {
    ...menu[index],
    name: req.body.name || menu[index].name,
    description: req.body.description || menu[index].description,
    price: req.body.price !== undefined ? parseFloat(req.body.price) : menu[index].price,
    category: req.body.category || menu[index].category,
    image: req.body.image !== undefined ? req.body.image : menu[index].image,
    allergens: req.body.allergens !== undefined ? req.body.allergens : menu[index].allergens,
    isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : menu[index].isAvailable,
    isSoldOut: req.body.isSoldOut !== undefined ? req.body.isSoldOut : menu[index].isSoldOut,
    isFeatured: req.body.isFeatured !== undefined ? req.body.isFeatured : menu[index].isFeatured,
    sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : menu[index].sortOrder,
    updatedAt: new Date().toISOString()
  };
  
  writeMenu(menu);
  res.json(menu[index]);
});

// DELETE /api/menu/:id - Delete a dish
app.delete('/api/menu/:id', (req, res) => {
  const menu = readMenu();
  const index = menu.findIndex(d => d.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Plato no encontrado' });
  }
  
  // Delete image if exists
  if (menu[index].image) {
    const imagePath = path.join('uploads', path.basename(menu[index].image));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
  
  menu.splice(index, 1);
  writeMenu(menu);
  res.json({ message: 'Plato eliminado' });
});

// POST /api/upload - Upload an image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha subido ninguna imagen' });
  }
  
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// POST /api/orders - Create an order
app.post('/api/orders', (req, res) => {
  const orders = readOrders();
  const newOrder = {
    id: uuidv4(),
    items: req.body.items || [],
    total: req.body.total || 0,
    notes: req.body.notes || '',
    status: 'recibido',
    createdAt: new Date().toISOString()
  };
  
  orders.push(newOrder);
  writeOrders(orders);
  res.status(201).json(newOrder);
});

// GET /api/orders - Get all orders
app.get('/api/orders', (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

// GET /api/events - Server-Sent Events for real-time updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const client = {
    id: Date.now(),
    res
  };
  
  sseClients.add(client);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);
  
  req.on('close', () => {
    sseClients.delete(client);
  });
});

// Static file serving (must be after API routes)
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/admin', express.static('admin'));

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// Serve frontend app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('\n=================================');
  console.log(`🚀 La Espuma Backend Simple corriendo en http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 Panel Admin: http://localhost:${PORT}/admin`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log('=================================\n');
});
