// API Base URL
const API_URL = '/api';

// State
let menu = [];
let orders = [];
let currentDish = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const dishesGrid = document.getElementById('dishes-grid');
const ordersList = document.getElementById('orders-list');
const dishModal = document.getElementById('dish-modal');
const dishForm = document.getElementById('dish-form');

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (username === 'admin' && password === 'espuma123') {
    loginScreen.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    loadMenu();
    loadOrders();
  } else {
    loginError.textContent = 'Usuario o contraseña incorrectos';
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  adminDashboard.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginForm.reset();
  loginError.textContent = '';
});

// Navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.add('hidden');
    });
    
    const tabName = tab.dataset.tab;
    document.getElementById(`${tabName}-section`).classList.remove('hidden');
  });
});

// Load Menu
async function loadMenu() {
  try {
    const response = await fetch(`${API_URL}/menu`);
    menu = await response.json();
    renderDishes();
    updateStats();
  } catch (error) {
    console.error('Error loading menu:', error);
  }
}

// Load Orders
async function loadOrders() {
  try {
    const response = await fetch(`${API_URL}/orders`);
    orders = await response.json();
    renderOrders();
    updateStats();
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

// Render Dishes
function renderDishes() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const categoryFilter = document.getElementById('category-filter').value;
  const availabilityFilter = document.getElementById('availability-filter').value;

  let filteredMenu = menu.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm) || 
                          dish.description.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryFilter || dish.category === categoryFilter;
    const matchesAvailability = !availabilityFilter || 
                               (availabilityFilter === 'available' && dish.isAvailable && !dish.isSoldOut) ||
                               (availabilityFilter === 'soldout' && dish.isSoldOut);
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  dishesGrid.innerHTML = filteredMenu.map(dish => `
    <div class="dish-card ${!dish.isAvailable || dish.isSoldOut ? 'sold-out' : ''}">
      ${dish.image ? `<img src="${dish.image}" alt="${dish.name}" class="dish-image">` : '<div class="dish-image-placeholder">Sin imagen</div>'}
      <div class="dish-info">
        <h3 class="dish-name">${dish.name}</h3>
        <p class="dish-description">${dish.description || ''}</p>
        <div class="dish-meta">
          <span class="dish-price">€${dish.price.toFixed(2)}</span>
          <span class="dish-category">${dish.category}</span>
        </div>
        ${dish.allergens && dish.allergens.length > 0 ? `
          <div class="dish-allergens">
            ${dish.allergens.map(a => `<span class="allergen-tag">${a}</span>`).join('')}
          </div>
        ` : ''}
        ${!dish.isAvailable || dish.isSoldOut ? '<span class="sold-out-badge">Agotado</span>' : ''}
        ${dish.isFeatured ? '<span class="featured-badge">Destacado</span>' : ''}
      </div>
      <div class="dish-actions">
        <button class="btn btn-sm btn-primary" onclick="editDish('${dish.id}')">Editar</button>
        <button class="btn btn-sm btn-secondary" onclick="toggleSoldOut('${dish.id}')">
          ${dish.isSoldOut ? 'Marcar disponible' : 'Marcar agotado'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteDish('${dish.id}')">Eliminar</button>
      </div>
    </div>
  `).join('');
}

// Render Orders
function renderOrders() {
  ordersList.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <span class="order-id">#${order.id.substring(0, 8)}</span>
        <span class="order-date">${new Date(order.createdAt).toLocaleString()}</span>
        <span class="order-status status-${order.status}">${order.status}</span>
      </div>
      <div class="order-items">
        ${order.items.map(item => `<div class="order-item">${item.name} x${item.quantity || 1} - €${(item.price * (item.quantity || 1)).toFixed(2)}</div>`).join('')}
      </div>
      <div class="order-footer">
        <span class="order-total">Total: €${order.total.toFixed(2)}</span>
        ${order.notes ? `<span class="order-notes">Notas: ${order.notes}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// Update Stats
function updateStats() {
  document.getElementById('total-dishes').textContent = menu.length;
  document.getElementById('available-dishes').textContent = menu.filter(d => d.isAvailable && !d.isSoldOut).length;
  document.getElementById('soldout-dishes').textContent = menu.filter(d => d.isSoldOut).length;
  document.getElementById('total-orders').textContent = orders.length;
}

// New Dish
document.getElementById('new-dish-btn').addEventListener('click', () => {
  currentDish = null;
  dishForm.reset();
  document.getElementById('modal-title').textContent = 'Nuevo Plato';
  document.getElementById('dish-id').value = '';
  document.getElementById('dish-available').checked = true;
  document.getElementById('dish-soldout').checked = false;
  document.getElementById('dish-featured').checked = false;
  document.getElementById('image-preview').innerHTML = '';
  document.getElementById('dish-image-url').value = '';
  dishModal.classList.remove('hidden');
});

// Edit Dish
window.editDish = async (id) => {
  const dish = menu.find(d => d.id === id);
  if (!dish) return;

  currentDish = dish;
  document.getElementById('modal-title').textContent = 'Editar Plato';
  document.getElementById('dish-id').value = dish.id;
  document.getElementById('dish-name').value = dish.name;
  document.getElementById('dish-description').value = dish.description || '';
  document.getElementById('dish-price').value = dish.price;
  document.getElementById('dish-category').value = dish.category;
  document.getElementById('dish-available').checked = dish.isAvailable;
  document.getElementById('dish-soldout').checked = dish.isSoldOut;
  document.getElementById('dish-featured').checked = dish.isFeatured;
  document.getElementById('dish-image-url').value = dish.image || '';

  // Set allergens
  document.querySelectorAll('input[name="allergen"]').forEach(cb => {
    cb.checked = dish.allergens && dish.allergens.includes(cb.value);
  });

  // Show image preview
  if (dish.image) {
    document.getElementById('image-preview').innerHTML = `<img src="${dish.image}" alt="Preview">`;
  }

  dishModal.classList.remove('hidden');
};

// Toggle Sold Out
window.toggleSoldOut = async (id) => {
  const dish = menu.find(d => d.id === id);
  if (!dish) return;

  try {
    const response = await fetch(`${API_URL}/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSoldOut: !dish.isSoldOut })
    });
    
    if (response.ok) {
      await loadMenu();
    }
  } catch (error) {
    console.error('Error toggling sold out:', error);
  }
};

// Delete Dish
window.deleteDish = async (id) => {
  if (!confirm('¿Estás seguro de eliminar este plato?')) return;

  try {
    const response = await fetch(`${API_URL}/menu/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      await loadMenu();
    }
  } catch (error) {
    console.error('Error deleting dish:', error);
  }
};

// Close Modal
document.getElementById('close-modal').addEventListener('click', () => {
  dishModal.classList.add('hidden');
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  dishModal.classList.add('hidden');
});

// Image Upload
document.getElementById('dish-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    document.getElementById('dish-image-url').value = data.url;
    document.getElementById('image-preview').innerHTML = `<img src="${data.url}" alt="Preview">`;
  } catch (error) {
    console.error('Error uploading image:', error);
  }
});

// Save Dish
dishForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const allergens = [];
  document.querySelectorAll('input[name="allergen"]:checked').forEach(cb => {
    allergens.push(cb.value);
  });

  const dishData = {
    name: document.getElementById('dish-name').value,
    description: document.getElementById('dish-description').value,
    price: parseFloat(document.getElementById('dish-price').value),
    category: document.getElementById('dish-category').value,
    image: document.getElementById('dish-image-url').value,
    allergens: allergens,
    isAvailable: document.getElementById('dish-available').checked,
    isSoldOut: document.getElementById('dish-soldout').checked,
    isFeatured: document.getElementById('dish-featured').checked
  };

  try {
    let response;
    if (currentDish) {
      response = await fetch(`${API_URL}/menu/${currentDish.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dishData)
      });
    } else {
      response = await fetch(`${API_URL}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dishData)
      });
    }

    if (response.ok) {
      dishModal.classList.add('hidden');
      await loadMenu();
    }
  } catch (error) {
    console.error('Error saving dish:', error);
  }
});

// Filters
document.getElementById('search-input').addEventListener('input', renderDishes);
document.getElementById('category-filter').addEventListener('change', renderDishes);
document.getElementById('availability-filter').addEventListener('change', renderDishes);

// SSE for real-time updates
const eventSource = new EventSource(`${API_URL}/events`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.event === 'menu-updated') {
    loadMenu();
  }
};
