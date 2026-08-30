const form = document.getElementById('bookingForm');
const message = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const serviceType = document.getElementById('serviceType');
const locationBox = document.getElementById('locationBox');
const shareLocationBtn = document.getElementById('shareLocationBtn');
const locationStatus = document.getElementById('locationStatus');

let sharedLocation = null;

serviceType.addEventListener('change', () => {
  const isHome = serviceType.value === 'Home Service';
  locationBox.hidden = !isHome;
  if (!isHome) {
    sharedLocation = null;
    locationStatus.textContent = '';
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
      sharedLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy || 0)
      };
      locationStatus.textContent = 'Location attached to this booking.';
      shareLocationBtn.textContent = 'Location Shared';
      shareLocationBtn.disabled = false;
    },
    (error) => {
      sharedLocation = null;
      locationStatus.textContent = error.code === 1
        ? 'Location permission was not granted. You can still submit without it.'
        : 'Could not get location. You can still submit without it.';
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
    contact: document.getElementById('contact').value.trim(),
    email: document.getElementById('email').value.trim(),
    service: document.getElementById('service').value,
    serviceType: serviceType.value,
    schedule: document.getElementById('schedule').value,
    details: document.getElementById('details').value.trim(),
    latitude: sharedLocation?.latitude ?? null,
    longitude: sharedLocation?.longitude ?? null,
    accuracy: sharedLocation?.accuracy ?? null
  };

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Booking could not be sent.');

    message.textContent = `Booking sent successfully. Reference: ${result.reference}`;
    form.reset();
    sharedLocation = null;
    locationBox.hidden = true;
    locationStatus.textContent = '';
    shareLocationBtn.textContent = 'Share My Location';
  } catch (error) {
    message.textContent = `${error.message} Please try again.`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Booking';
  }
});
