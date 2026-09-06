const loginPanel = document.getElementById('loginPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const adminKeyInput = document.getElementById('adminKey');
const loginBtn = document.getElementById('loginBtn');
const loginMessage = document.getElementById('loginMessage');
const bookingList = document.getElementById('bookingList');
const bookingCount = document.getElementById('bookingCount');
const bookingStats = document.getElementById('bookingStats');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const typeFilter = document.getElementById('typeFilter');
const refreshBtn = document.getElementById('refreshBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const logoutBtn = document.getElementById('logoutBtn');

let adminKey = sessionStorage.getItem('remote_services_admin_key') || '';
let allBookings = [];

const STATUSES = ['New', 'Contacted', 'Scheduled', 'In Progress', 'Done', 'Cancelled'];

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not specified';

async function api(path = '', options = {}) {
  const response = await fetch(`/api/bookings${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${adminKey}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function renderStats(bookings) {
  const counts = Object.fromEntries(STATUSES.map(status => [status, 0]));
  bookings.forEach(item => {
    if (counts[item.status] !== undefined) counts[item.status]++;
  });
  bookingStats.innerHTML = STATUSES.map(status => `
    <button type="button" class="stat-card" data-stat-status="${escapeHtml(status)}">
      <span>${escapeHtml(status)}</span><strong>${counts[status]}</strong>
    </button>
  `).join('');

  bookingStats.querySelectorAll('[data-stat-status]').forEach(button => {
    button.addEventListener('click', () => {
      statusFilter.value = button.dataset.statStatus;
      applyFilters();
    });
  });
}

function mapLink(item) {
  if (item.service_type !== 'Home Service' || item.latitude == null || item.longitude == null) return '';
  const lat = encodeURIComponent(item.latitude);
  const lng = encodeURIComponent(item.longitude);
  const accuracy = item.accuracy ? ` (${escapeHtml(item.accuracy)}m accuracy)` : '';
  return `<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${lat},${lng}">Open Location${accuracy}</a>`;
}

function contactActions(item) {
  const method = item.contact_method || (item.contact ? 'Phone' : 'Messenger');
  const actions = [];

  if (method === 'Phone' && item.contact) {
    actions.push(`<a href="tel:${encodeURIComponent(item.contact)}">Call</a>`);
  }

  if (method === 'Messenger' && item.messenger_contact) {
    const value = String(item.messenger_contact).trim();
    if (/^https?:\/\//i.test(value)) {
      actions.push(`<a target="_blank" rel="noopener" href="${escapeHtml(value)}">Messenger</a>`);
    }
  }

  return actions.join('');
}

async function deleteBooking(id, triggerButton = null) {
  const item = allBookings.find(booking => Number(booking.id) === Number(id));
  if (!item) return;
  if (!confirm(`Delete booking ${item.reference} for ${item.name}? This cannot be undone.`)) return;

  if (triggerButton) triggerButton.disabled = true;
  try {
    await api('', { method: 'DELETE', body: JSON.stringify({ id: Number(id) }) });
    await loadBookings();
  } catch (error) {
    alert(error.message);
    if (triggerButton) triggerButton.disabled = false;
  }
}

function showLongPressMenu(article) {
  document.querySelectorAll('.longPressMenu').forEach(menu => menu.remove());

  const menu = document.createElement('div');
  menu.className = 'longPressMenu';
  menu.innerHTML = `
    <button type="button" class="longPressDelete">🗑️ Delete booking</button>
    <button type="button" class="longPressCancel">Cancel</button>
  `;
  menu.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding:10px;border-radius:10px;background:rgba(0,0,0,.08);';

  article.appendChild(menu);
  menu.querySelector('.longPressDelete').addEventListener('click', () => {
    deleteBooking(article.dataset.id, menu.querySelector('.longPressDelete'));
  });
  menu.querySelector('.longPressCancel').addEventListener('click', () => menu.remove());
}

function attachLongPress(article) {
  let timer = null;
  let longPressed = false;
  let startX = 0;
  let startY = 0;
  const delay = 800;
  const movementLimit = 18;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const start = (event) => {
    if (event.target.closest('button, a, select, input, textarea')) return;
    clearTimer();
    longPressed = false;
    startX = event.clientX ?? 0;
    startY = event.clientY ?? 0;

    timer = setTimeout(() => {
      timer = null;
      longPressed = true;
      showLongPressMenu(article);
      if (navigator.vibrate) navigator.vibrate([40]);
    }, delay);
  };

  const move = (event) => {
    if (!timer) return;
    const x = event.clientX ?? startX;
    const y = event.clientY ?? startY;
    if (Math.hypot(x - startX, y - startY) > movementLimit) clearTimer();
  };

  const end = () => {
    clearTimer();
  };

  article.addEventListener('pointerdown', start, { passive: true });
  article.addEventListener('pointermove', move, { passive: true });
  article.addEventListener('pointerup', end, { passive: true });
  article.addEventListener('pointercancel', end, { passive: true });
  article.addEventListener('pointerleave', end, { passive: true });
  article.addEventListener('contextmenu', event => {
    event.preventDefault();
    showLongPressMenu(article);
  });
}

function render(bookings) {
  bookingCount.textContent = `${bookings.length} matching booking${bookings.length === 1 ? '' : 's'}`;
  if (!bookings.length) {
    bookingList.innerHTML = '<div class="empty">No matching bookings.</div>';
    return;
  }

  bookingList.innerHTML = bookings.map(item => {
    const method = item.contact_method || (item.contact ? 'Phone' : 'Messenger');
    const contactDetail = method === 'Messenger'
      ? (item.messenger_contact || 'Not provided')
      : (item.contact || 'Not provided');

    return `
    <article class="booking-item" data-id="${item.id}" style="-webkit-user-select:none;user-select:none;touch-action:manipulation;">
      <div class="booking-meta"><span>${escapeHtml(item.reference)}</span><span>•</span><span>${escapeHtml(formatDate(item.created_at))}</span><span>•</span><span class="status">${escapeHtml(item.status)}</span></div>
      <h3>${escapeHtml(item.name)} — ${escapeHtml(item.service)}</h3>
      <p><strong>Preferred contact:</strong> ${escapeHtml(method)}<br>
      <strong>Contact detail:</strong> ${escapeHtml(contactDetail)}${item.email ? `<br><strong>Email:</strong> ${escapeHtml(item.email)}` : ''}<br>
      <strong>Type:</strong> ${escapeHtml(item.service_type)}<br>
      <strong>Preferred schedule:</strong> ${escapeHtml(formatDate(item.preferred_schedule))}</p>
      <p>${escapeHtml(item.details).replaceAll('\\n','<br>')}</p>
      <div class="booking-actions">
        <select class="statusSelect" data-id="${item.id}">
          ${STATUSES.map(s => `<option ${s === item.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        ${contactActions(item)}
        ${mapLink(item)}
        <span style="opacity:.75;font-size:.85em;font-weight:600;">Press and hold this booking to delete</span>
      </div>
    </article>
  `;
  }).join('');

  document.querySelectorAll('.booking-item').forEach(attachLongPress);

  document.querySelectorAll('.statusSelect').forEach(select => {
    select.addEventListener('change', async () => {
      const previous = select.dataset.current || select.value;
      select.disabled = true;
      try {
        await api('', { method: 'PATCH', body: JSON.stringify({ id: Number(select.dataset.id), status: select.value }) });
        await loadBookings();
      } catch (error) {
        alert(error.message);
        select.value = previous;
      } finally {
        select.disabled = false;
      }
    });
    select.dataset.current = select.value;
  });
}

function applyFilters() {
  const term = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const type = typeFilter.value;

  const filtered = allBookings.filter(item => {
    const haystack = [
      item.reference, item.name, item.contact, item.messenger_contact,
      item.email, item.service, item.service_type, item.details
    ].join(' ').toLowerCase();
    return (!term || haystack.includes(term))
      && (!status || item.status === status)
      && (!type || item.service_type === type);
  });

  renderStats(allBookings);
  render(filtered);
}

async function loadBookings() {
  bookingList.innerHTML = '<div class="empty">Loading bookings...</div>';
  const data = await api();
  allBookings = Array.isArray(data.bookings) ? data.bookings : [];
  applyFilters();
}

async function login() {
  adminKey = adminKeyInput.value.trim() || adminKey;
  if (!adminKey) return;
  loginBtn.disabled = true;
  loginMessage.textContent = 'Checking access...';
  try {
    await loadBookings();
    sessionStorage.setItem('remote_services_admin_key', adminKey);
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
    loginMessage.textContent = '';
  } catch (error) {
    loginMessage.textContent = error.message;
    adminKey = '';
    sessionStorage.removeItem('remote_services_admin_key');
  } finally {
    loginBtn.disabled = false;
  }
}

loginBtn.addEventListener('click', login);
adminKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
typeFilter.addEventListener('change', applyFilters);
refreshBtn.addEventListener('click', () => loadBookings().catch(e => alert(e.message)));
clearAllBtn.addEventListener('click', async () => {
  if (!allBookings.length) return;
  if (!confirm(`DELETE ALL ${allBookings.length} BOOKINGS? This cannot be undone.`)) return;
  if (!confirm('FINAL CONFIRMATION: Clear the entire booking inbox?')) return;
  clearAllBtn.disabled = true;
  try {
    await api('', { method: 'DELETE', body: JSON.stringify({ all: true }) });
    await loadBookings();
  } catch (error) {
    alert(error.message);
  } finally {
    clearAllBtn.disabled = false;
  }
});
logoutBtn.addEventListener('click', () => {
  adminKey = '';
  allBookings = [];
  sessionStorage.removeItem('remote_services_admin_key');
  dashboardPanel.hidden = true;
  loginPanel.hidden = false;
  adminKeyInput.value = '';
});

if (adminKey) {
  adminKeyInput.value = adminKey;
  login();
}
