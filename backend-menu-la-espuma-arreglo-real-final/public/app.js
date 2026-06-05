(() => {
  'use strict';

  const categories = [
    ['picoteo','Picoteo'],
    ['papas','Papas'],
    ['enrollados','Enrollados'],
    ['smash','Smash'],
    ['platos','Platos'],
    ['postres','Postres'],
    ['bebidas','Bebidas']
  ];
  const categoryMap = Object.fromEntries(categories);
  const state = { menu: [], view: localStorage.getItem('laEspumaView') || 'grande', eventSource: null, poller: null };
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const money = (item) => item.priceText || `${Number(item.price || 0).toFixed(2).replace('.', ',')} €`;
  const unavailable = (item) => item.isSoldOut === true || item.isAvailable === false;
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  function normalizeMenu(payload){
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    return list.map((item, index) => ({
      id: item.id || `dish-${index}`,
      name: item.name || item.title || 'Plato',
      description: item.description || item.desc || '',
      price: Number(item.price || 0),
      priceText: item.priceText || `${Number(item.price || 0).toFixed(2).replace('.', ',')} €`,
      category: item.category || 'smash',
      image: item.image || '/assets/menu_classic_burger.webp',
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      isAvailable: item.isAvailable !== false,
      isSoldOut: item.isSoldOut === true,
      isFeatured: item.isFeatured === true,
      sortOrder: Number(item.sortOrder ?? index),
      updatedAt: item.updatedAt || ''
    })).sort((a,b) => (a.sortOrder-b.sortOrder) || a.name.localeCompare(b.name));
  }

  async function loadMenu(){
    const status = $('#menuStatus');
    try{
      const res = await fetch('/api/menu', { cache: 'no-store' });
      if(!res.ok) throw new Error(`API ${res.status}`);
      state.menu = normalizeMenu(await res.json());
      renderMenu();
      if(status) status.textContent = `${state.menu.length} productos disponibles en carta`;
    }catch(error){
      console.error(error);
      if(status) status.textContent = 'No se pudo cargar la carta. Revisa /api/menu.';
    }
  }

  function renderCategories(){
    const bar = $('#categoryBar');
    if(!bar) return;
    bar.innerHTML = categories.map(([id,label], index) => `<button class="category-btn ${index===0?'active':''}" type="button" data-category="${id}" role="tab">${label}</button>`).join('');
  }

  function dishCard(item){
    const card = document.importNode($('#dishTemplate').content, true).querySelector('.dish-card');
    card.id = `dish-${item.id}`;
    card.dataset.category = item.category;
    card.classList.toggle('is-sold-out', unavailable(item));
    const img = $('.dish-image', card);
    img.src = item.image;
    img.alt = item.name;
    img.onerror = () => { img.src = '/assets/menu_classic_burger.webp'; };
    $('.dish-price', card).textContent = money(item);
    $('.dish-category', card).textContent = categoryMap[item.category] || item.category;
    $('.dish-name', card).textContent = item.name;
    $('.dish-desc', card).textContent = item.description;
    $('.dish-allergens', card).innerHTML = item.allergens.map(a => `<span class="allergen-chip">${safe(a)}</span>`).join('');
    const action = $('.dish-action', card);
    action.disabled = unavailable(item);
    action.textContent = unavailable(item) ? 'Agotado' : 'Añadir';
    return card;
  }

  function renderMenu(){
    const content = $('#menuContent');
    if(!content) return;
    content.className = `menu-content view-${state.view}`;
    content.innerHTML = '';
    for(const [cat,label] of categories){
      const items = state.menu.filter(item => item.category === cat);
      if(!items.length) continue;
      const section = document.createElement('section');
      section.className = 'category-section';
      section.id = `cat-${cat}`;
      section.dataset.category = cat;
      section.innerHTML = `<h2 class="category-heading">${safe(label)}</h2><div class="category-grid"></div>`;
      const grid = $('.category-grid', section);
      items.forEach(item => grid.appendChild(dishCard(item)));
      content.appendChild(section);
    }
    updateActiveCategory();
  }

  function setView(view){
    state.view = view === 'mosaico' ? 'mosaico' : 'grande';
    localStorage.setItem('laEspumaView', state.view);
    $('#currentViewLabel').textContent = state.view === 'grande' ? 'Grande' : 'Mosaico';
    $$('.view-option').forEach(btn => {
      const active = btn.dataset.view === state.view;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    renderMenu();
  }

  function scrollToMenu(){ $('#menu')?.scrollIntoView({ behavior:'smooth', block:'start' }); }
  function scrollToCategory(cat){
    const target = $(`#cat-${cat}`);
    if(target) target.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  function updateActiveCategory(){
    const sections = $$('.category-section');
    if(!sections.length) return;
    const top = $('.menu-toolbar')?.getBoundingClientRect().height || 110;
    let active = sections[0].dataset.category;
    let best = Infinity;
    for(const section of sections){
      const dist = Math.abs(section.getBoundingClientRect().top - top - 8);
      if(dist < best){ best = dist; active = section.dataset.category; }
    }
    $$('.category-btn').forEach(btn => {
      const is = btn.dataset.category === active;
      btn.classList.toggle('active', is);
      if(is) btn.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
    });
  }

  function openAI(){
    const panel = $('#aiPanel');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden','false');
    const messages = $('#aiMessages');
    if(messages && !messages.dataset.started){
      addAI('Soy la IA de La Espuma Burger. Dime si quieres bacon, trufa, algo para compartir, vegetariano o sin algún alérgeno.', 'bot');
      messages.dataset.started = 'true';
    }
    setTimeout(() => $('#aiInput')?.focus(), 80);
  }
  function closeAI(){ const panel = $('#aiPanel'); panel?.classList.remove('open'); panel?.setAttribute('aria-hidden','true'); }
  function addAI(text, who='bot'){
    const box = $('#aiMessages'); if(!box) return;
    const msg = document.createElement('div');
    msg.className = `ai-msg ${who}`;
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  }
  function localRecommend(query){
    const q = query.toLowerCase();
    const available = state.menu.filter(item => !unavailable(item));
    const scored = available.map(item => {
      const hay = [item.name, item.description, item.category, ...(item.allergens||[])].join(' ').toLowerCase();
      let score = 0;
      for(const token of q.split(/[^a-záéíóúüñ0-9]+/i).filter(Boolean)) if(hay.includes(token)) score += 2;
      if(/bacon|beicon/.test(q) && /bacon/.test(hay)) score += 8;
      if(/trufa|trufado/.test(q) && /trufa|mayotrufa|parmesano/.test(hay)) score += 8;
      if(/veget|sin carne|aguacate/.test(q) && /veget|avocado|aguacate/.test(hay)) score += 8;
      if(/niñ|infantil|baby/.test(q) && /infantil|baby|nugget/.test(hay)) score += 8;
      if(/papa|compartir|picoteo/.test(q) && ['papas','picoteo'].includes(item.category)) score += 6;
      if(/burger|smash|carne/.test(q) && item.category === 'smash') score += 5;
      if(item.isFeatured) score += 1;
      return { item, score };
    }).sort((a,b) => b.score - a.score).slice(0,3).map(x => x.item);
    return scored.filter(Boolean);
  }
  async function askAI(query){
    const q = query.trim(); if(!q) return;
    addAI(q, 'user');
    try{
      const res = await fetch('/api/menu-helper', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:q }) });
      if(!res.ok) throw new Error('helper failed');
      const data = await res.json();
      addAI(data.reply || 'Te recomiendo nuestras smash destacadas.', 'bot');
    }catch(_){
      const picks = localRecommend(q);
      addAI(picks.length ? `Te recomiendo: ${picks.map(item => `${item.name} (${money(item)})`).join(', ')}.` : 'Te recomiendo mirar Bacon Lover, Trufada o Cheesetorra.', 'bot');
    }
  }

  function bind(){
    renderCategories();
    $('#goMenuBtn')?.addEventListener('click', scrollToMenu);
    $('#homeAiBtn')?.addEventListener('click', openAI);
    $('#aiFloatingBtn')?.addEventListener('click', openAI);
    $('#aiCloseBtn')?.addEventListener('click', closeAI);
    $('#categoryBar')?.addEventListener('click', event => {
      const btn = event.target.closest('.category-btn');
      if(btn) scrollToCategory(btn.dataset.category);
    });
    $('#viewTrigger')?.addEventListener('click', () => {
      const drop = $('#viewDropdown'); const trigger = $('#viewTrigger');
      const open = !drop.classList.contains('open');
      drop.classList.toggle('open', open); trigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', event => {
      if(!event.target.closest('#viewDropdown')){ $('#viewDropdown')?.classList.remove('open'); $('#viewTrigger')?.setAttribute('aria-expanded','false'); }
    });
    document.addEventListener('keydown', event => { if(event.key === 'Escape'){ $('#viewDropdown')?.classList.remove('open'); closeAI(); } });
    $$('.view-option').forEach(btn => btn.addEventListener('click', () => { setView(btn.dataset.view); $('#viewDropdown')?.classList.remove('open'); }));
    $('#aiForm')?.addEventListener('submit', event => { event.preventDefault(); const input = $('#aiInput'); const q = input.value; input.value=''; askAI(q); });
    $$('.ai-quick button').forEach(btn => btn.addEventListener('click', () => askAI(btn.dataset.question || btn.textContent)));
    window.addEventListener('scroll', () => requestAnimationFrame(updateActiveCategory), { passive:true });
    window.addEventListener('resize', () => requestAnimationFrame(updateActiveCategory));
    setView(state.view);
  }

  function initRealtime(){
    try{
      const es = new EventSource('/api/events');
      es.addEventListener('menu-updated', loadMenu);
      state.eventSource = es;
    }catch(_){/* polling below */}
    state.poller = setInterval(loadMenu, 3000);
  }

  document.addEventListener('DOMContentLoaded', () => { bind(); loadMenu(); initRealtime(); });
})();
