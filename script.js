const form = document.getElementById('bookingForm');
const message = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const serviceType = document.getElementById('serviceType');
const locationBox = document.getElementById('locationBox');
const shareLocationBtn = document.getElementById('shareLocationBtn');
const locationStatus = document.getElementById('locationStatus');
const phoneInput = document.getElementById('contact');
const serviceSelect = document.getElementById('service');
const problemSummary = document.getElementById('problemSummary');
const problemModal = document.getElementById('problemModal');
const problemOptions = document.getElementById('problemOptions');
const problemTitle = document.getElementById('problemTitle');
const problemSubtitle = document.getElementById('problemSubtitle');
const problemCount = document.getElementById('problemCount');
const otherProblem = document.getElementById('otherProblem');
const otherProblemText = document.getElementById('otherProblemText');
const confirmProblems = document.getElementById('confirmProblems');

let sharedLocation = null;
let selectedProblems = [];
let activeProblemService = '';

const problemMenus = {
  'Desktop PC Repair': ['No power / will not turn on', 'No display / black screen', 'Slow computer', 'Freezing / hanging', 'Overheating', 'Blue screen / Windows error', 'Windows won’t start', 'Random restart / shutdown', 'Virus / malware cleanup', 'Driver problem', 'SSD / HDD problem', 'RAM upgrade / installation', 'PC cleaning / maintenance', 'New PC setup', 'Data / file transfer'],
  'Laptop Repair': ['No power / will not turn on', 'No display / black screen', 'Slow laptop', 'Freezing / hanging', 'Overheating / fan noise', 'Battery / charging problem', 'Keyboard problem', 'Touchpad problem', 'Broken / loose hinge', 'Screen problem', 'Windows won’t start', 'Blue screen / Windows error', 'Virus / malware cleanup', 'Driver problem', 'SSD / HDD upgrade', 'RAM upgrade / installation', 'Laptop cleaning / maintenance', 'New laptop setup'],
  'Cellphone / Mobile': ['Phone is slow', 'Phone freezing / hanging', 'Battery drains fast', 'Not charging', 'Screen / touch problem', 'Storage is full', 'App installation', 'App not working', 'System update', 'Backup / restore', 'New phone setup', 'Wi-Fi problem', 'Mobile data problem', 'Bluetooth problem', 'Account / email setup guidance', 'Phone cleanup / optimization'],
  'Printer Setup / Troubleshooting': ['Printer not printing', 'Printer offline', 'Paper jam', 'Faded / light printing', 'Lines / missing colors', 'Wrong paper size / print settings', 'Driver installation', 'USB connection problem', 'Wi-Fi printer setup', 'Printer sharing', 'Scanner not working', 'Printer not detected', 'New printer installation', 'Print queue / stuck documents', 'General printer troubleshooting'],
  'Wi-Fi / Network': ['No internet', 'Slow internet / Wi-Fi', 'Weak Wi-Fi signal', 'Router setup', 'Router configuration', 'New Wi-Fi installation', 'Cannot connect device', 'LAN / Ethernet problem', 'Printer network setup', 'Wi-Fi password / security setup', 'Network sharing', 'IP / network configuration', 'Multiple-device connection problem', 'Basic network troubleshooting'],
  'Windows / Software Setup': ['Windows installation', 'Windows activation guidance', 'Windows update problem', 'Driver installation', 'Software installation', 'Software update', 'Software not opening', 'Software error', 'Startup optimization', 'System cleanup', 'Virus / malware cleanup', 'Backup / restore setup', 'Microsoft Office setup', 'PDF tools setup', 'New PC software setup'],
  'Website Design / System': ['Business website', 'Company / service website', 'Landing page', 'Online booking form', 'Customer inquiry form', 'Admin dashboard', 'Simple management system', 'Database-connected system', 'Website update / redesign', 'Mobile-friendly website', 'Domain / hosting setup guidance', 'Website troubleshooting', 'Business automation idea', 'Other website or system requirement'],
  'Documents / Design': ['Resume / CV', 'Company profile', 'Business card', 'Poster', 'Menu', 'Flyer / brochure', 'PDF editing / formatting', 'Document formatting', 'PowerPoint presentation', 'Excel spreadsheet', 'Logo / simple graphics', 'Photo cleanup / basic editing', 'School project layout', 'Business document'],
  'Professional Software Installation': ['AutoCAD', 'Civil 3D', 'Revit', 'SketchUp', 'SolidWorks', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe Premiere Pro', 'Adobe After Effects', 'DaVinci Resolve', 'Microsoft Office / Microsoft 365', 'PDF / Acrobat tools', 'Engineering software', 'Architecture software', 'Teaching / school software', 'Medical / office software', 'Other professional application']
};

function openProblemMenu(service) {
  activeProblemService = service;
  const problems = problemMenus[service] || ['General troubleshooting', 'Installation / setup', 'Performance problem', 'Connection problem', 'Update problem', 'Other'];
  problemTitle.textContent = `${service} — What is the problem?`;
  problemSubtitle.textContent = 'Select one or more problems. If yours is not listed, choose Others and type it below.';
  problemOptions.innerHTML = problems.map((problem, index) => `<label class="problem-option"><input type="checkbox" value="${escapeHtml(problem)}" /><span>${escapeHtml(problem)}</span></label>`).join('');
  otherProblem.checked = false;
  otherProblemText.value = '';
  otherProblemText.disabled = true;
  selectedProblems = [];
  problemCount.textContent = '0 selected';
  problemModal.hidden = false;
  problemModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeProblemMenu() {
  problemModal.hidden = true;
  problemModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function escapeHtml(value) {
  return value.replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function updateProblemCount() {
  const checked = [...problemOptions.querySelectorAll('input[type="checkbox"]:checked')];
  const count = checked.length + (otherProblem.checked ? 1 : 0);
  problemCount.textContent = `${count} selected`;
}

// Clicking a service card opens a wide diagnostic popup instead of jumping straight to the form.
document.querySelectorAll('.service-card[data-service]').forEach((card) => {
  card.addEventListener('click', () => openProblemMenu(card.dataset.service));
});

problemOptions.addEventListener('change', updateProblemCount);
otherProblem.addEventListener('change', () => {
  otherProblemText.disabled = !otherProblem.checked;
  if (otherProblem.checked) otherProblemText.focus();
  updateProblemCount();
});

document.querySelectorAll('[data-close-problems]').forEach((button) => button.addEventListener('click', closeProblemMenu));

confirmProblems.addEventListener('click', () => {
  const checked = [...problemOptions.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  const otherText = otherProblem.checked ? otherProblemText.value.trim() : '';
  if (!checked.length && !otherText) {
    problemCount.textContent = 'Please select a problem or choose Others.';
    return;
  }
  selectedProblems = [...checked, ...(otherText ? [`Others: ${otherText}`] : [])];
  serviceSelect.value = activeProblemService;
  problemSummary.value = selectedProblems.join('\n');
  problemSummary.readOnly = true;
  closeProblemMenu();
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

serviceSelect.addEventListener('change', () => {
  if (serviceSelect.value && serviceSelect.value !== activeProblemService) {
    openProblemMenu(serviceSelect.value);
  }
});

// Neon click/ripple effect for every button and link styled as a button.
document.addEventListener('click', (event) => {
  const target = event.target.closest('.btn, .stat-card, .booking-actions button, .booking-actions a');
  if (!target || target.disabled) return;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height) * 0.55;
  ripple.className = 'ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  target.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
});

serviceType.addEventListener('change', () => {
  const isHome = serviceType.value === 'Home Service';
  locationBox.hidden = !isHome;
  if (!isHome) {
    sharedLocation = null;
    locationStatus.textContent = '';
    shareLocationBtn.textContent = 'Share My Location';
  }
});

shareLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'Location sharing is not supported by this browser.';
    return;
  }
  locationStatus.textContent = 'Requesting your permission...';
  shareLocationBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      sharedLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: Math.round(position.coords.accuracy || 0) };
      locationStatus.textContent = 'Location attached to this booking.';
      shareLocationBtn.textContent = 'Location Shared';
      shareLocationBtn.disabled = false;
    },
    (error) => {
      sharedLocation = null;
      locationStatus.textContent = error.code === 1 ? 'Location permission was not granted. You can still submit without it.' : 'Could not get location. You can still submit without it.';
      shareLocationBtn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  const payload = {
    name: document.getElementById('name').value.trim(),
    contactMethod: 'Phone',
    contact: phoneInput.value.trim(),
    messengerContact: '',
    email: document.getElementById('email').value.trim(),
    service: serviceSelect.value,
    serviceType: serviceType.value,
    schedule: document.getElementById('schedule').value,
    details: `${problemSummary.value.trim()}${problemSummary.value.trim() && document.getElementById('details').value.trim() ? '\n\nAdditional details:\n' : ''}${document.getElementById('details').value.trim()}`,
    latitude: serviceType.value === 'Home Service' ? (sharedLocation?.latitude ?? null) : null,
    longitude: serviceType.value === 'Home Service' ? (sharedLocation?.longitude ?? null) : null,
    accuracy: serviceType.value === 'Home Service' ? (sharedLocation?.accuracy ?? null) : null
  };

  try {
    const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Booking could not be sent.');
    message.textContent = `Booking sent successfully. Reference: ${result.reference}. We will contact you using the phone number you provided.`;
    form.reset();
    problemSummary.value = '';
    sharedLocation = null;
    selectedProblems = [];
    locationBox.hidden = true;
    locationStatus.textContent = '';
    shareLocationBtn.textContent = 'Share My Location';
  } catch (error) {
    message.textContent = `${error.message} Please try again.`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SEND REPAIR REQUEST';
  }
});
