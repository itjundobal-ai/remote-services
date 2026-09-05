const STORAGE_KEY = 'remoteServicesAdminKey';
const POLL_MS = 10000;

const loginView = document.getElementById('loginView');
const inboxView = document.getElementById('inboxView');
const detailView = document.getElementById('detailView');
const loginForm = document.getElementById('loginForm');
const adminKeyInput = document.getElementById('adminKey');
const loginMessage = document.getElementById('loginMessage');
const bookingList = document.getElementById('bookingList');
const emptyState = document.getElementById('emptyState');
const countBadge = document.getElementById('countBadge');
const syncStatus = document.getElementById('syncStatus');
const refreshBtn = document.getElementById('refreshBtn');
const backBtn = document.getElementById('backBtn');
const detailCard = document.getElementById('detailCard');
const detailRef = document.getElementById('detailRef');
const bookingTemplate = document.getElementById('bookingTemplate');

let adminKey = localStorage.getItem(STORAGE_KEY) || '';
let bookings = [];
let currentBooking = null;
let lastSeenSignature = localStorage.getItem('remoteServicesLastSeen') || '';
let pollTimer = null;

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]);
}

function fmtDate(value) {
  if (!value) return 'Schedule not specified';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function setView(view) {
  loginView.hidden = view !== 'login';
  inboxView.hidden = view !== 'inbox';
  detailView.hidden = view !== 'detail';
}

function problemPreview(booking) {
  const source = booking.details || 'No details provided';
  return source.length > 90 ? `${source.slice(0, 87)}…` : source;
}

function renderList() {
  bookingList.replaceChildren();
  countBadge.textContent = String(bookings.length);
  emptyState.hidden = bookings.length !== 0;

  bookings.forEach((booking, index) => {
    const node = bookingTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.booking-rank').textContent = String(index + 1);
    node.querySelector('.booking-name').textContent = booking.name || 'Unnamed customer';
    node.querySelector('.booking-meta').textContent = `${booking.service || 'Service'} • ${booking.service_type || 'Service type'}`;
    node.querySelector('.booking-problem').textContent = problemPreview(booking);
    const dot = node.querySelector('.new-dot');
    if (booking.status === 'New') dot.hidden = false;
    node.classList.toggle('is-new', booking.status === 'New');
    node.addEventListener('click', () => showDetail(booking));
    bookingList.appendChild(node);
  });
}

function detailRow(label, value) {
  return `<div class="detail-row"><span class="detail-label">${esc(label)}</span><div class="detail-value">${esc(value || '—')}</div></div>`;
}

function showDetail(booking) {
  currentBooking = booking;
  detailRef.textContent = booking.reference || '';
  const location = booking.latitude != null && booking.longitude != null
    ? `${booking.latitude}, ${booking.longitude}${booking.accuracy ? ` (±${booking.accuracy}m)` : ''}`
    : 'Not shared';
  const contact = booking.contact_method === 'Messenger'
    ? booking.messenger_contact || 'Messenger'
    : booking.contact || 'Phone not provided';

  detailCard.innerHTML = `
    <h2 class="detail-title">${esc(booking.name || 'Customer')}</h2>
    <span class="detail-status">${esc((booking.status || 'New').toUpperCase())}</span>
    <div class="detail-grid">
      ${detailRow('SERVICE', booking.service)}
      ${detailRow('SERVICE TYPE', booking.service_type)}
      ${detailRow('CONCERN / DETAILS', booking.details)}
      ${detailRow('CONTACT METHOD', booking.contact_method)}
      ${detailRow('CONTACT', contact)}
      ${detailRow('EMAIL', booking.email)}
      ${detailRow('PREFERRED SCHEDULE', fmtDate(booking.preferred_schedule))}
      ${detailRow('HOME SERVICE LOCATION', location)}
      ${detailRow('RECEIVED', fmtDate(booking.created_at))}
    </div>
    <div class="detail-actions">
      ${booking.contact ? `<a class="action-btn primary" href="tel:${encodeURIComponent(booking.contact)}">CALL</a>` : '<button class="action-btn" type="button" disabled>CALL</button>'}
      ${booking.messenger_contact ? `<a class="action-btn primary" href="${safeMessengerLink(booking.messenger_contact)}" target="_blank" rel="noopener">MESSENGER</a>` : '<button class="action-btn" type="button" disabled>MESSENGER</button>'}
    </div>
  `;
  setView('detail');
}

function safeMessengerLink(value) {
  const raw = String(value || '').trim();
  if (/^https:\/\/www\.facebook\.com\//i.test(raw) || /^https:\/\/m\.me\//i.test(raw)) return raw;
  return 'https://www.facebook.com/MasterGuardOfficial';
}

function signature(list) {
  const first = list[0];
  return first ? `${first.id}:${first.created_at}:${first.status}` : '';
}

async function fetchBookings({ initial = false } = {}) {
  if (!adminKey) return;
  syncStatus.textContent = 'Syncing…';
  try {
    const response = await fetch('/api/bookings', {
      headers: { Authorization: `Bearer ${adminKey}`, Accept: 'application/json' },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    const next = Array.isArray(data.bookings) ? data.bookings : [];
    const nextSignature = signature(next);
    const hadNew = !initial && lastSeenSignature && nextSignature && nextSignature !== lastSeenSignature;
    bookings = next;
    renderList();
    if (nextSignature) {
      lastSeenSignature = nextSignature;
      localStorage.setItem('remoteServicesLastSeen', nextSignature);
    }
    syncStatus.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (hadNew && 'Notification' in window && Notification.permission === 'granted') {
      const newest = next[0];
      new Notification('REMOTE SERVICES • New Booking', {
        body: `${newest?.name || 'Customer'} — ${newest?.service || 'New repair request'}`,
        tag: newest?.reference || 'remote-services-booking'
      });
    }
  } catch (error) {
    syncStatus.textContent = `Connection error: ${error.message}`;
    if (/401|403/.test(error.message)) {
      localStorage.removeItem(STORAGE_KEY);
      adminKey = '';
      setView('login');
      loginMessage.textContent = 'Admin Key rejected. Please enter the current key.';
    }
  }
}

async function requestNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch {}
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  adminKey = adminKeyInput.value.trim();
  if (!adminKey) return;
  localStorage.setItem(STORAGE_KEY, adminKey);
  const original = loginForm.querySelector('button');
  original.disabled = true;
  await fetchBookings({ initial: true });
  original.disabled = false;
  if (bookings.length || syncStatus.textContent.startsWith('Updated')) {
    setView('inbox');
    requestNotifications();
    startPolling();
  } else {
    const keyCheck = await fetch('/api/bookings', { headers: { Authorization: `Bearer ${adminKey}` }, cache: 'no-store' });
    if (keyCheck.ok) {
      setView('inbox');
      requestNotifications();
      startPolling();
    } else {
      localStorage.removeItem(STORAGE_KEY);
      adminKey = '';
      loginMessage.textContent = 'Unable to open Inbox. Check the Admin Key and database connection.';
    }
  }
});

refreshBtn.addEventListener('click', () => fetchBookings({ initial: false }));
backBtn.addEventListener('click', () => { currentBooking = null; setView('inbox'); });

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => fetchBookings({ initial: false }), POLL_MS);
}

if (adminKey) {
  fetchBookings({ initial: true }).then(() => {
    if (adminKey) {
      setView('inbox');
      requestNotifications();
      startPolling();
    }
  });
} else {
  setView('login');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
