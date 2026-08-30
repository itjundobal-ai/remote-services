const loginPanel = document.getElementById('loginPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const adminKeyInput = document.getElementById('adminKey');
const loginBtn = document.getElementById('loginBtn');
const loginMessage = document.getElementById('loginMessage');
const bookingList = document.getElementById('bookingList');
const bookingCount = document.getElementById('bookingCount');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

let adminKey = sessionStorage.getItem('remote_services_admin_key') || '';

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

function mapLink(item) {
  if (item.service_type !== 'Home Service' || item.latitude == null || item.longitude == null) return '';
  const lat = encodeURIComponent(item.latitude);
  const lng = encodeURIComponent(item.longitude);
  return `<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${lat},${lng}">Open Location</a>`;
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

function render(bookings) {
  bookingCount.textContent = `${bookings.length} booking${bookings.length === 1 ? '' : 's'} loaded`;
  if (!bookings.length) {
    bookingList.innerHTML = '<div class="empty">No bookings yet.</div>';
    return;
  }

  bookingList.innerHTML = bookings.map(item => {
    const method = item.contact_method || (item.contact ? 'Phone' : 'Messenger');
    const contactDetail = method === 'Messenger'
      ? (item.messenger_contact || 'Not provided')
      : (item.contact || 'Not provided');

    return `
    <article class="booking-item" data-id="${item.id}">
      <div class="booking-meta"><span>${escapeHtml(item.reference)}</span><span>•</span><span>${escapeHtml(formatDate(item.created_at))}</span><span>•</span><span class="status">${escapeHtml(item.status)}</span></div>
      <h3>${escapeHtml(item.name)} — ${escapeHtml(item.service)}</h3>
      <p><strong>Preferred contact:</strong> ${escapeHtml(method)}<br>
      <strong>Contact detail:</strong> ${escapeHtml(contactDetail)}${item.email ? `<br><strong>Email:</strong> ${escapeHtml(item.email)}` : ''}<br>
      <strong>Type:</strong> ${escapeHtml(item.service_type)}<br>
      <strong>Preferred schedule:</strong> ${escapeHtml(formatDate(item.preferred_schedule))}</p>
      <p>${escapeHtml(item.details).replaceAll('\n','<br>')}</p>
      <div class="booking-actions">
        <select class="statusSelect" data-id="${item.id}">
          ${['New','Contacted','Scheduled','In Progress','Done','Cancelled'].map(s => `<option ${s === item.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        ${contactActions(item)}
        ${mapLink(item)}
      </div>
    </article>
  `;
  }).join('');

  document.querySelectorAll('.statusSelect').forEach(select => {
    select.addEventListener('change', async () => {
      const old = select.dataset.current || '';
      select.disabled = true;
      try {
        await api('', { method: 'PATCH', body: JSON.stringify({ id: Number(select.dataset.id), status: select.value }) });
        await loadBookings();
      } catch (error) {
        alert(error.message);
        if (old) select.value = old;
      } finally {
        select.disabled = false;
      }
    });
    select.dataset.current = select.value;
  });
}

async function loadBookings() {
  bookingList.innerHTML = '<div class="empty">Loading bookings...</div>';
  const data = await api();
  render(data.bookings || []);
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
refreshBtn.addEventListener('click', () => loadBookings().catch(e => alert(e.message)));
logoutBtn.addEventListener('click', () => {
  adminKey = '';
  sessionStorage.removeItem('remote_services_admin_key');
  dashboardPanel.hidden = true;
  loginPanel.hidden = false;
  adminKeyInput.value = '';
});

if (adminKey) {
  adminKeyInput.value = adminKey;
  login();
}
