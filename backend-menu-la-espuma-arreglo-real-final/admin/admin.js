let menu = [];
const $ = (id) => document.getElementById(id);
const api = '/api/menu';

function token() { return localStorage.getItem('admin-token') || ''; }
function adminHeaders(extra = {}) { return { ...extra, 'X-Admin-Token': token() }; }
function money(x) { return x.priceText || ((Number(x.price || 0).toFixed(2)).replace('.', ',') + ' €'); }
function okLogin() { return localStorage.getItem('admin-ok') === '1' && token(); }
function escapeHtml(v) { return String(v || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

async function login() {
  const user = $('user').value.trim();
  const password = $('pass').value;
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, password })
  });
  if (!res.ok) throw new Error('Login incorrecto');
  const data = await res.json();
  localStorage.setItem('admin-ok', '1');
  localStorage.setItem('admin-token', data.token);
}

function showPanel() {
  $('login').classList.add('hidden');
  $('panel').classList.remove('hidden');
  load();
}

$('loginBtn').onclick = async () => {
  try {
    await login();
    showPanel();
  } catch (error) {
    alert(error.message || 'Login incorrecto');
  }
};

if (okLogin()) showPanel();

async function load() {
  const res = await fetch(api, { cache: 'no-store' });
  menu = await res.json();
  if (!Array.isArray(menu)) menu = Array.isArray(menu.data) ? menu.data : [];
  render();
}

function render() {
  const q = $('search').value.toLowerCase();
  const f = $('filter').value;
  const list = menu.filter(x => (!f || x.category === f) && (`${x.name} ${x.description}`.toLowerCase().includes(q)));
  $('total').textContent = menu.length;
  $('available').textContent = menu.filter(x => x.isAvailable !== false && !x.isSoldOut).length;
  $('soldout').textContent = menu.filter(x => x.isSoldOut || x.isAvailable === false).length;
  $('grid').innerHTML = list.sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0))).map(x => `
    <article class="card">
      <img src="${escapeHtml(x.image || '/assets/menu_classic_burger.webp')}" alt="${escapeHtml(x.name)}">
      <h3>${escapeHtml(x.name)}</h3>
      <p>${escapeHtml(x.description || '')}</p>
      <div class="meta"><b>${escapeHtml(money(x))}</b><span class="badge">${x.isSoldOut || x.isAvailable === false ? 'Agotado' : escapeHtml(x.category || 'carta')}</span></div>
      <div class="actions">
        <button onclick="edit('${escapeHtml(x.id)}')">Editar</button>
        <button class="muted" onclick="toggleSold('${escapeHtml(x.id)}')">${x.isSoldOut ? 'Disponible' : 'Agotar'}</button>
        <button class="danger" onclick="delDish('${escapeHtml(x.id)}')">Eliminar</button>
      </div>
    </article>`).join('');
}

$('search').oninput = render;
$('filter').onchange = render;
$('newBtn').onclick = () => openForm();
$('cancel').onclick = () => modal.close();

$('file').onchange = async () => {
  const file = $('file').files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/upload', { method: 'POST', headers: adminHeaders(), body: fd });
  if (!res.ok) return alert('No se pudo subir la imagen.');
  const data = await res.json();
  $('image').value = data.url;
  $('preview').src = data.url;
};

$('image').oninput = () => { $('preview').src = $('image').value; };

function openForm(x = {}) {
  $('id').value = x.id || '';
  $('name').value = x.name || '';
  $('description').value = x.description || '';
  $('price').value = x.price || '';
  $('category').value = x.category || 'smash';
  $('image').value = x.image || '';
  $('preview').src = x.image || '';
  $('allergens').value = (x.allergens || []).join(', ');
  $('isAvailable').checked = x.isAvailable !== false;
  $('isSoldOut').checked = !!x.isSoldOut;
  $('isFeatured').checked = !!x.isFeatured;
  modal.showModal();
}

window.edit = (id) => openForm(menu.find(x => x.id === id));

form.onsubmit = async (e) => {
  e.preventDefault();
  const id = $('id').value;
  const body = {
    name: $('name').value,
    description: $('description').value,
    price: Number($('price').value || 0),
    category: $('category').value,
    image: $('image').value,
    allergens: $('allergens').value.split(',').map(s => s.trim()).filter(Boolean),
    isAvailable: $('isAvailable').checked,
    isSoldOut: $('isSoldOut').checked,
    isFeatured: $('isFeatured').checked
  };
  const res = await fetch(id ? `${api}/${id}` : api, {
    method: id ? 'PUT' : 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  if (!res.ok) return alert('No se pudo guardar el plato. Vuelve a iniciar sesión.');
  modal.close();
  load();
};

window.toggleSold = async (id) => {
  const x = menu.find(y => y.id === id);
  const res = await fetch(`${api}/${id}`, {
    method: 'PUT',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...x, isSoldOut: !x.isSoldOut })
  });
  if (!res.ok) return alert('No se pudo actualizar el estado.');
  load();
};

window.delDish = async (id) => {
  if (!confirm('¿Eliminar plato?')) return;
  const res = await fetch(`${api}/${id}`, { method: 'DELETE', headers: adminHeaders() });
  if (!res.ok) return alert('No se pudo eliminar el plato.');
  load();
};
