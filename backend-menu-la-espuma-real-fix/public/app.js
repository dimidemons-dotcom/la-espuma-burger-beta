(() => {
  const CATEGORIES = [
    ['picoteo', 'Picoteo'],
    ['papas', 'Papas'],
    ['enrollados', 'Enrollados'],
    ['smash', 'Burger'],
    ['platos', 'Platos'],
    ['postres', 'Postres'],
    ['bebidas', 'Bebidas']
  ];
  const $ = (id) => document.getElementById(id);
  const state = { menu: [], view: localStorage.getItem('laEspumaView') || 'grande', activeCategory: 'picoteo', eventsReady: false };

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }
  function money(item) {
    if (item.priceText) return item.priceText;
    const n = Number(item.price || 0);
    return `${n.toFixed(2).replace('.', ',')} €`;
  }
  function catLabel(cat) {
    return (CATEGORIES.find(([id]) => id === cat) || [cat, cat || 'Carta'])[1];
  }
  function normalize(payload) {
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    return list.map((item, index) => ({
      id: String(item.id || `dish-${index}`),
      name: item.name || item.title || 'Plato',
      description: item.description || '',
      price: Number(item.price || 0),
      priceText: item.priceText,
      category: item.category || 'smash',
      image: item.image || '/assets/menu_classic_burger.webp',
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      isAvailable: item.isAvailable !== false,
      isSoldOut: item.isSoldOut === true,
      isFeatured: item.isFeatured === true,
      sortOrder: Number(item.sortOrder ?? index)
    })).sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
  }
  function unavailable(item) { return item.isSoldOut || item.isAvailable === false; }

  function renderCategories() {
    const bar = $('categoryBar');
    if (!bar) return;
    bar.innerHTML = CATEGORIES.map(([id, label]) => `<button class="cat-btn${id === state.activeCategory ? ' active' : ''}" type="button" data-cat="${id}">${label}</button>`).join('');
    bar.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => scrollToCategory(btn.dataset.cat)));
  }

  function dishCard(item) {
    const sold = unavailable(item);
    const allergens = item.allergens?.length ? `<div class="allergens">${item.allergens.map((a) => `<span>${escapeHTML(a)}</span>`).join('')}</div>` : '';
    return `<article class="dish-card${sold ? ' sold-out' : ''}" data-dish-id="${escapeHTML(item.id)}">
      ${sold ? '<div class="sold-badge">Agotado</div>' : ''}
      <img class="dish-img" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.src='/assets/menu_classic_burger.webp'" />
      <div class="dish-overlay"></div>
      <div class="dish-content">
        <span class="tag">${escapeHTML(catLabel(item.category))}</span>
        <h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <span class="price">${escapeHTML(money(item))}</span>
        ${allergens}
      </div>
      <div class="dish-actions"><button class="add-btn" type="button" ${sold ? 'disabled' : ''}>${sold ? 'No disponible' : 'Añadir'}</button></div>
    </article>`;
  }

  function renderMenu() {
    const root = $('menuSections');
    const status = $('menuStatus');
    if (!root) return;
    if (!state.menu.length) {
      if (status) status.textContent = 'No hay platos disponibles ahora mismo.';
      root.innerHTML = '';
      return;
    }
    if (status) status.textContent = '';
    root.innerHTML = CATEGORIES.map(([id, label]) => {
      const items = state.menu.filter((item) => item.category === id);
      if (!items.length) return '';
      return `<section class="category-section" id="cat-${id}" data-category="${id}">
        <header class="category-title"><h2>${escapeHTML(label)}</h2><span>${items.length} platos</span></header>
        <div class="dish-list">${items.map(dishCard).join('')}</div>
      </section>`;
    }).join('');
    observeCategory();
  }

  async function loadMenu({ silent = false } = {}) {
    try {
      const response = await fetch('/api/menu', { cache: 'no-store' });
      if (!response.ok) throw new Error(`API ${response.status}`);
      state.menu = normalize(await response.json());
      renderMenu();
      renderCategories();
    } catch (error) {
      console.error('Error cargando carta', error);
      if (!silent && $('menuStatus')) $('menuStatus').textContent = 'Error al cargar la carta. Revisa /api/menu.';
    }
  }

  function scrollToCategory(cat) {
    state.activeCategory = cat;
    renderCategories();
    const section = document.querySelector(`#cat-${CSS.escape(cat)}`);
    if (!section) return;
    const sticky = $('menuSticky');
    const offset = sticky ? sticky.offsetHeight + 8 : 110;
    const top = window.scrollY + section.getBoundingClientRect().top - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  let observer;
  function observeCategory() {
    if (observer) observer.disconnect();
    const sticky = $('menuSticky');
    const topMargin = sticky ? sticky.offsetHeight + 20 : 120;
    observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (!visible) return;
      const cat = visible.target.dataset.category;
      if (cat && cat !== state.activeCategory) {
        state.activeCategory = cat;
        renderCategories();
        const btn = document.querySelector(`.cat-btn[data-cat="${CSS.escape(cat)}"]`);
        btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, { rootMargin: `-${topMargin}px 0px -55% 0px`, threshold: 0.12 });
    document.querySelectorAll('.category-section').forEach((section) => observer.observe(section));
  }

  function applyView(view) {
    state.view = view === 'mosaico' ? 'mosaico' : 'grande';
    localStorage.setItem('laEspumaView', state.view);
    document.body.classList.toggle('menu-view-mosaico', state.view === 'mosaico');
    document.body.classList.toggle('menu-view-grande', state.view === 'grande');
    const current = $('viewCurrent');
    if (current) current.textContent = state.view === 'mosaico' ? 'Mosaico' : 'Grande';
    document.querySelectorAll('#viewMenu button').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === state.view));
    $('viewDropdown')?.classList.remove('open');
    $('viewToggle')?.setAttribute('aria-expanded', 'false');
    setTimeout(observeCategory, 50);
  }

  function bindView() {
    const dropdown = $('viewDropdown');
    const toggle = $('viewToggle');
    toggle?.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = !dropdown.classList.contains('open');
      dropdown.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('viewMenu')?.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-view]');
      if (btn) applyView(btn.dataset.view);
    });
    document.addEventListener('click', () => dropdown?.classList.remove('open'));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') dropdown?.classList.remove('open'); });
    applyView(state.view);
  }

  function openAI() {
    const panel = $('aiPanel');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
    const messages = $('aiMessages');
    if (messages && !messages.dataset.started) {
      addMessage('Hola, soy la IA de La Espuma Burger. Dime qué te apetece y te recomiendo platos reales de la carta.', 'bot');
      messages.dataset.started = '1';
    }
    setTimeout(() => $('aiInput')?.focus(), 100);
  }
  function closeAI() {
    const panel = $('aiPanel');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
  }
  function addMessage(text, who = 'bot') {
    const messages = $('aiMessages');
    if (!messages) return;
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
  function localRecommend(text) {
    const q = text.toLowerCase();
    const tokens = q.split(/[^a-záéíóúüñ0-9]+/i).filter(Boolean);
    const scored = state.menu.filter((item) => !unavailable(item)).map((item) => {
      const hay = [item.name, item.description, item.category, ...(item.allergens || [])].join(' ').toLowerCase();
      let score = item.isFeatured ? 2 : 0;
      tokens.forEach((token) => { if (hay.includes(token)) score += 2; });
      if (/bacon|beicon|panceta/.test(q) && /bacon|panceta/.test(hay)) score += 9;
      if (/trufa|trufad|parmesano|especial/.test(q) && /trufa|mayotrufa|parmesano/.test(hay)) score += 8;
      if (/veget|aguacate|avocado|sin carne/.test(q) && /veget|aguacate|avocado/.test(hay)) score += 8;
      if (/niñ|infantil|baby|peque/.test(q) && /infantil|baby|nugget/.test(hay)) score += 8;
      if (/smash|burger|hamburguesa|carne/.test(q) && item.category === 'smash') score += 5;
      if (/papa|patata|compartir|picote/.test(q) && ['papas', 'picoteo'].includes(item.category)) score += 5;
      if (/postre|dulce|tarta/.test(q) && item.category === 'postres') score += 6;
      if (/bebida|refresco|agua|cerveza/.test(q) && item.category === 'bebidas') score += 6;
      if (/sin gluten|celiac/.test(q) && item.allergens.includes('gluten')) score -= 20;
      if (/sin lactosa/.test(q) && item.allergens.includes('lactosa')) score -= 20;
      return { item, score };
    }).sort((a, b) => b.score - a.score);
    return scored.filter((x) => x.score > 0).slice(0, 3).map((x) => x.item);
  }
  async function askAI(text) {
    const q = String(text || '').trim();
    if (!q) return;
    addMessage(q, 'user');
    try {
      const response = await fetch('/api/menu-helper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q }) });
      if (!response.ok) throw new Error(`IA ${response.status}`);
      const data = await response.json();
      addMessage(data.reply || 'Puedo recomendarte smash, papas, picoteo, postres o bebidas.', 'bot');
    } catch (error) {
      const picks = localRecommend(q);
      const reply = picks.length ? `Te recomiendo: ${picks.map((x) => `${x.name} (${money(x)})`).join(', ')}.` : 'Te recomiendo mirar Bacon Lover, Trufada o nuestras papas especiales.';
      addMessage(reply, 'bot');
    }
  }

  function bindAI() {
    $('aiFab')?.addEventListener('click', openAI);
    $('aiQuickBtn')?.addEventListener('click', openAI);
    $('aiClose')?.addEventListener('click', closeAI);
    $('aiPanel')?.addEventListener('click', (event) => { if (event.target.id === 'aiPanel') closeAI(); });
    $('aiForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('aiInput');
      const value = input.value;
      input.value = '';
      askAI(value);
    });
    document.querySelectorAll('.ai-chips button').forEach((btn) => btn.addEventListener('click', () => askAI(btn.dataset.prompt)));
  }

  function bindRealtime() {
    try {
      const events = new EventSource('/api/events');
      events.addEventListener('connected', () => { state.eventsReady = true; });
      events.addEventListener('menu-updated', () => loadMenu({ silent: true }));
      events.onerror = () => { state.eventsReady = false; };
    } catch (_) { state.eventsReady = false; }
    setInterval(() => { if (!state.eventsReady) loadMenu({ silent: true }); }, 3000);
  }

  function bindHome() {
    $('goMenuBtn')?.addEventListener('click', () => {
      const menu = $('menu');
      if (!menu) return;
      menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function init() {
    document.body.classList.add(`menu-view-${state.view === 'mosaico' ? 'mosaico' : 'grande'}`);
    bindHome();
    bindView();
    bindAI();
    bindRealtime();
    loadMenu();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
