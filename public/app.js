// App State
let menu = [];
let activeCategory = 'picoteo';
let eventSource = null;
let pollingInterval = null;

// DOM Elements
const splashScreen = document.getElementById('splash-screen');
const app = document.getElementById('app');
const menuGrid = document.getElementById('menuGrid');
const menuTabs = document.getElementById('menuFilter');
const aiChat = document.getElementById('aiChat');
const aiChatMessages = document.getElementById('aiChatMessages');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatSend = document.getElementById('aiChatSend');
const aiChatClose = document.getElementById('aiChatClose');
const aiFloatingBtn = document.getElementById('aiFloatingBtn');
const heroModoIABtn = document.getElementById('heroModoIABtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Hide splash screen after animation
  setTimeout(() => {
    splashScreen.style.display = 'none';
    app.style.display = 'block';
  }, 3000);

  // Load menu
  loadMenu();

  // Setup event listeners
  setupEventListeners();

  // Start real-time updates
  startRealTimeUpdates();
});

// Load Menu from API
async function loadMenu() {
  try {
    const response = await fetch('/api/menu');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle both formats: array or { data: [...] }
    menu = Array.isArray(data) ? data : (data.data || []);
    
    renderMenu();
  } catch (error) {
    console.error('Error loading menu:', error);
    menuGrid.innerHTML = `
      <div class="menu-error">
        Error al cargar la carta. Por favor, recarga la página.
      </div>
    `;
  }
}

// Render Menu
function renderMenu() {
  const filteredMenu = menu.filter(dish => dish.category === activeCategory);
  
  if (filteredMenu.length === 0) {
    menuGrid.innerHTML = `
      <div class="menu-empty">
        No hay platos en esta categoría
      </div>
    `;
    return;
  }
  
  menuGrid.innerHTML = filteredMenu.map(dish => createDishCard(dish)).join('');
}

// Create Dish Card
function createDishCard(dish) {
  const isSoldOut = dish.isSoldOut || !dish.isAvailable;
  const hasImage = dish.image && dish.image.trim() !== '';
  const imageUrl = hasImage ? dish.image : '';
  
  const allergensHtml = dish.allergens && dish.allergens.length > 0
    ? `<div class="menu-card-allergens">
        ${dish.allergens.map(allergen => `<span class="allergen-tag">${allergen}</span>`).join('')}
       </div>`
    : '';
  
  const imageHtml = hasImage
    ? `<img src="${imageUrl}" alt="${dish.name}" class="menu-card-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <div class="menu-card-placeholder" style="display:none;">🍔</div>`
    : `<div class="menu-card-placeholder">🍔</div>`;
  
  return `
    <div class="menu-card ${isSoldOut ? 'sold-out' : ''}" data-category="${dish.category}">
      ${isSoldOut ? '<div class="sold-out-badge">AGOTADO</div>' : ''}
      ${imageHtml}
      <div class="menu-card-content">
        <div class="menu-card-header">
          <h3 class="menu-card-name">${dish.name}</h3>
          <span class="menu-card-price">${dish.price.toFixed(2)}€</span>
        </div>
        <p class="menu-card-description">${dish.description}</p>
        ${allergensHtml}
        <button 
          class="menu-card-add-btn" 
          ${isSoldOut ? 'disabled' : ''}
          onclick="addToCart('${dish.id}')"
        >
          ${isSoldOut ? 'No disponible' : 'Añadir'}
        </button>
      </div>
    </div>
  `;
}

// Add to Cart (placeholder)
function addToCart(dishId) {
  const dish = menu.find(d => d.id === dishId);
  if (dish) {
    console.log('Añadir al carrito:', dish.name);
    // TODO: Implement cart functionality
    alert(`${dish.name} añadido al carrito`);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Menu tabs
  menuTabs.querySelectorAll('.menu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      menuTabs.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      renderMenu();
    });
  });
  
  // AI Chat
  heroModoIABtn.addEventListener('click', openAIChat);
  aiFloatingBtn.addEventListener('click', openAIChat);
  aiChatClose.addEventListener('click', closeAIChat);
  aiChatSend.addEventListener('click', sendAIMessage);
  aiChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendAIMessage();
    }
  });
}

// AI Chat Functions
function openAIChat() {
  aiChat.classList.add('open');
  if (aiChatMessages.children.length === 0) {
    addAIMessage('Hola, soy la IA de La Espuma Burger. Estoy aquí para ayudarte con el menú, recomendarte platos y resolver tus dudas antes de pedir.', 'bot');
  }
}

function closeAIChat() {
  aiChat.classList.remove('open');
}

function sendAIMessage() {
  const message = aiChatInput.value.trim();
  if (!message) return;
  
  addAIMessage(message, 'user');
  aiChatInput.value = '';
  
  // Simulate AI response
  setTimeout(() => {
    const response = getAIResponse(message);
    addAIMessage(response, 'bot');
  }, 500);
}

function addAIMessage(message, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-chat-message ${type}`;
  messageDiv.textContent = message;
  aiChatMessages.appendChild(messageDiv);
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

function getAIResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('burger') || lowerMessage.includes('hamburguesa')) {
    const burgers = menu.filter(d => d.category === 'smash' && !d.isSoldOut);
    if (burgers.length > 0) {
      const randomBurger = burgers[Math.floor(Math.random() * burgers.length)];
      return `Te recomiendo la ${randomBurger.name} por ${randomBurger.price.toFixed(2)}€. ¡Es deliciosa!`;
    }
    return 'Lo siento, no hay hamburguesas disponibles en este momento.';
  }
  
  if (lowerMessage.includes('papa') || lowerMessage.includes('papas')) {
    const papas = menu.filter(d => d.category === 'papas' && !d.isSoldOut);
    if (papas.length > 0) {
      const randomPapas = papas[Math.floor(Math.random() * papas.length)];
      return `Las ${randomPapas.name} son increíbles por ${randomPapas.price.toFixed(2)}€.`;
    }
    return 'Lo siento, no hay papas disponibles en este momento.';
  }
  
  if (lowerMessage.includes('postre') || lowerMessage.includes('dulce')) {
    const postres = menu.filter(d => d.category === 'postres' && !d.isSoldOut);
    if (postres.length > 0) {
      const randomPostre = postres[Math.floor(Math.random() * postres.length)];
      return `Para postre te recomiendo ${randomPostre.name} por ${randomPostre.price.toFixed(2)}€.`;
    }
    return 'Lo siento, no hay postres disponibles en este momento.';
  }
  
  if (lowerMessage.includes('bebida') || lowerMessage.includes('refresco')) {
    const bebidas = menu.filter(d => d.category === 'bebidas' && !d.isSoldOut);
    if (bebidas.length > 0) {
      return `Tenemos ${bebidas.length} bebidas disponibles. ¿Te gustaría alguna en específico?`;
    }
    return 'Lo siento, no hay bebidas disponibles en este momento.';
  }
  
  if (lowerMessage.includes('picoteo') || lowerMessage.includes('entrante')) {
    const picoteo = menu.filter(d => d.category === 'picoteo' && !d.isSoldOut);
    if (picoteo.length > 0) {
      const randomPicoteo = picoteo[Math.floor(Math.random() * picoteo.length)];
      return `Para picoteo te recomiendo ${randomPicoteo.name} por ${randomPicoteo.price.toFixed(2)}€.`;
    }
    return 'Lo siento, no hay picoteo disponible en este momento.';
  }
  
  return 'Puedo ayudarte a elegir entre hamburguesas, papas, postres, bebidas o picoteo. ¿Qué te apetece?';
}

// Real-time Updates
function startRealTimeUpdates() {
  // Try SSE first
  try {
    eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'menu-updated') {
          loadMenu(); // Reload menu when updated
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };
    
    eventSource.onerror = () => {
      console.error('SSE error, falling back to polling');
      eventSource.close();
      startPolling();
    };
  } catch (error) {
    console.error('SSE not available, falling back to polling');
    startPolling();
  }
}

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    loadMenu();
  }, 3000); // Poll every 3 seconds
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (eventSource) {
    eventSource.close();
  }
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});
