(() => {
  'use strict';

  const categories = [
    ['picoteo', 'Picoteo'],
    ['papas', 'Papas'],
    ['enrollados', 'Enrollados'],
    ['smash', 'Smash'],
    ['platos', 'Platos'],
    ['postres', 'Postres'],
    ['bebidas', 'Bebidas']
  ];

  const state = {
    menu: [],
    view: localStorage.getItem('laEspuma:view') || 'grande',
    activeCategory: 'picoteo',
    eventOk: false
  };

  const $ = (id) => document.getElementById(id);
  const normalize = (payload) => Array.isArray(payload) ? payload : (payload && Array.isArray(payload.data) ? payload.data : []);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const price = (item) => item.priceText || `${Number(item.price || 0).toFixed(2).replace('.', ',')} €`;
  const catLabel = (cat) => (categories.find(([id]) => id === cat)?.[1] || cat || 'Carta');
  const unavailable = (item) => item.isSoldOut === true || item.isAvailable === false;
  const sortMenu = (items) => [...items].sort((a, b) => (Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)) || String(a.name || '').localeCompare(String(b.name || '')));

  function setStatus(text) {
    const el = $('apiStatus');
    if (el) el.textContent = text;
  }

  function imageUrl(item) {
    const img = String(item.image || '').trim();
    if (!img) return '/assets/menu_classic_burger.webp';
    return img;
  }

  function dishCard(item) {
    const sold = unavailable(item);
    const allergens = (item.allergens || []).slice(0, 4).map(a => `<span class="allergen">${esc(a)}</span>`).join('');
    return `
      <article class="dish-card ${sold ? 'soldout' : ''}" data-category="${esc(item.category)}" id="dish-${esc(item.id)}">
        <img src="${esc(imageUrl(item))}" alt="${esc(item.name)}" loading="lazy" onerror="this.src='/assets/menu_classic_burger.webp'" />
        <div class="dish-copy">
          <span class="dish-cat">${esc(catLabel(item.category))}</span>
          <h2>${esc(item.name || 'Plato')}</h2>
          <p>${esc(item.description || '')}</p>
          <div class="dish-footer">
            <strong class="price">${esc(price(item))}</strong>
            <span class="sold-badge">Agotado</span>
          </div>
          ${allergens ? `<div class="allergens">${allergens}</div>` : ''}
        </div>
      </article>`;
  }

  function renderTabs() {
    const tabs = $('categoryTabs');
    if (!tabs) return;
    tabs.innerHTML = categories.map(([id, label]) => `<button type="button" class="category-btn ${id === state.activeCategory ? 'active' : ''}" data-category="${id}">${label}</button>`).join('');
  }

  function markActiveCategory(cat) {
    state.activeCategory = cat || state.activeCategory;
    document.querySelectorAll('.category-btn').forEach(btn => {
      const active = btn.dataset.category === state.activeCategory;
      btn.classList.toggle('active', active);
      if (active) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }

  function renderGrande(items) {
    const grid = $('menuGrid');
    if (!grid) return;
    grid.className = 'menu-grid view-grande';
    grid.innerHTML = items.map(dishCard).join('') || '<div class="empty-state">La carta está cargando.</div>';
  }

  function renderMosaico(items) {
    const grid = $('menuGrid');
    if (!grid) return;
    grid.className = 'menu-grid view-mosaico';
    const html = categories.map(([id, label]) => {
      const group = items.filter(item => item.category === id);
      if (!group.length) return '';
      return `<h2 class="category-heading" id="cat-${id}">${label}</h2><div class="category-group">${group.map(dishCard).join('')}</div>`;
    }).join('');
    grid.innerHTML = html || '<div class="empty-state">La carta está cargando.</div>';
  }

  function applyView(view) {
    state.view = view === 'mosaico' ? 'mosaico' : 'grande';
    localStorage.setItem('laEspuma:view', state.view);
    const label = $('viewLabel');
    if (label) label.textContent = state.view === 'mosaico' ? 'Mosaico' : 'Grande';
    document.querySelectorAll('.view-option').forEach(btn => btn.classList.toggle('active', btn.dataset.view === state.view));
    renderMenu();
  }

  function renderMenu() {
    const items = sortMenu(state.menu);
    if (state.view === 'mosaico') renderMosaico(items);
    else renderGrande(items);
    markActiveCategory(state.activeCategory);
  }

  async function loadMenu() {
    try {
      const response = await fetch('/api/menu', { cache: 'no-store' });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const items = normalize(await response.json());
      state.menu = items;
      if (!items.some(x => x.category === state.activeCategory)) {
        state.activeCategory = items[0]?.category || 'picoteo';
      }
      renderMenu();
      setStatus(`${items.length} platos conectados`);
    } catch (error) {
      console.error(error);
      setStatus('Error al cargar la carta');
    }
  }

  function scrollToMenu() {
    $('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToCategory(cat) {
    markActiveCategory(cat);
    if (state.view === 'mosaico') {
      const heading = document.getElementById(`cat-${cat}`);
      heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const first = document.querySelector(`.dish-card[data-category="${CSS.escape(cat)}"]`);
    first?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateActiveOnScroll() {
    if (state.view !== 'grande') return;
    const cards = [...document.querySelectorAll('.dish-card')];
    let best = null;
    let bestDistance = Infinity;
    const offset = $('menuSticky')?.offsetHeight || 110;
    cards.forEach(card => {
      const distance = Math.abs(card.getBoundingClientRect().top - offset);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = card;
      }
    });
    if (best) markActiveCategory(best.dataset.category);
  }

  function bindView() {
    const dropdown = $('viewDropdown');
    const toggle = $('viewToggle');
    toggle?.addEventListener('click', () => {
      const open = !dropdown.classList.contains('open');
      dropdown.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.view-option').forEach(btn => {
      btn.addEventListener('click', () => {
        applyView(btn.dataset.view);
        dropdown.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', (event) => {
      if (dropdown && !dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        dropdown?.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function openAI() {
    const panel = $('aiPanel');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
    if (!$('aiMessages')?.dataset.started) {
      addMsg('Hola, soy la IA de La Espuma Burger. Pregúntame por bacon, trufa, algo vegetariano, postres, bebidas o alérgenos y te recomiendo platos reales de la carta.', 'bot');
      $('aiMessages').dataset.started = 'true';
    }
    setTimeout(() => $('aiInput')?.focus(), 100);
  }

  function closeAI() {
    const panel = $('aiPanel');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
  }

  function addMsg(text, who = 'bot') {
    const box = $('aiMessages');
    if (!box) return;
    const msg = document.createElement('div');
    msg.className = `msg ${who}`;
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  }

  function localReply(question) {
    const q = question.toLowerCase();
    const available = state.menu.filter(x => !unavailable(x));
    const scored = available.map(item => {
      const hay = [item.name, item.description, item.category, ...(item.allergens || [])].join(' ').toLowerCase();
      let score = 0;
      q.split(/[^a-záéíóúüñ0-9]+/i).filter(Boolean).forEach(token => { if (hay.includes(token)) score += 2; });
      if (/bacon|beicon|panceta/.test(q) && /bacon|panceta/.test(hay)) score += 10;
      if (/trufa|trufad|parmesano/.test(q) && /trufa|mayotrufa|parmesano/.test(hay)) score += 10;
      if (/veget|sin carne|aguacate/.test(q) && /veget|aguacate|avocado/.test(hay)) score += 10;
      if (/papa|papas|compartir|picoteo/.test(q) && ['papas', 'picoteo'].includes(item.category)) score += 6;
      if (/postre|dulce|tarta/.test(q) && item.category === 'postres') score += 8;
      if (/bebida|refresco|agua|coca/.test(q) && item.category === 'bebidas') score += 8;
      if (/sin gluten|celiac/.test(q) && (item.allergens || []).includes('gluten')) score -= 20;
      if (/sin lactosa/.test(q) && (item.allergens || []).includes('lactosa')) score -= 20;
      if (item.isFeatured) score += 2;
      return { item, score };
    }).sort((a, b) => b.score - a.score);
    const picks = scored.filter(x => x.score > 0).slice(0, 3).map(x => x.item);
    const fallback = available.filter(x => x.isFeatured).slice(0, 3).length ? available.filter(x => x.isFeatured).slice(0, 3) : available.slice(0, 3);
    const list = (picks.length ? picks : fallback).map(item => `${item.name} (${price(item)})`).join(', ');
    return list ? `Te recomiendo: ${list}.` : 'Ahora mismo no tengo platos disponibles para recomendar.';
  }

  async function askAI(question) {
    const text = String(question || $('aiInput')?.value || '').trim();
    if (!text) return;
    addMsg(text, 'user');
    if ($('aiInput')) $('aiInput').value = '';
    try {
      const response = await fetch('/api/menu-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = await response.json();
      addMsg(data.reply || localReply(text), 'bot');
    } catch (error) {
      addMsg(localReply(text), 'bot');
    }
  }

  function initEvents() {
    try {
      const es = new EventSource('/api/events');
      es.addEventListener('connected', () => { state.eventOk = true; });
      es.addEventListener('menu-updated', loadMenu);
      es.onerror = () => { state.eventOk = false; };
    } catch (error) {
      state.eventOk = false;
    }
    setInterval(() => loadMenu(), 3000);
  }

  function bind() {
    $('goMenu')?.addEventListener('click', scrollToMenu);
    $('categoryTabs')?.addEventListener('click', event => {
      const btn = event.target.closest('.category-btn');
      if (btn) scrollToCategory(btn.dataset.category);
    });
    $('aiButton')?.addEventListener('click', openAI);
    $('aiClose')?.addEventListener('click', closeAI);
    $('aiPanel')?.addEventListener('click', event => { if (event.target.id === 'aiPanel') closeAI(); });
    $('aiForm')?.addEventListener('submit', event => { event.preventDefault(); askAI(); });
    document.querySelectorAll('.quick-prompts button').forEach(btn => btn.addEventListener('click', () => askAI(btn.dataset.question || btn.textContent)));
    window.addEventListener('scroll', () => requestAnimationFrame(updateActiveOnScroll), { passive: true });
    bindView();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderTabs();
    bind();
    applyView(state.view);
    loadMenu();
    initEvents();
  });
})();
