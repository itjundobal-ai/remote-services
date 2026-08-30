const form = document.getElementById('bookingForm');
const message = document.getElementById('formMessage');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const contact = document.getElementById('contact').value.trim();
  const service = document.getElementById('service').value;
  const serviceType = document.getElementById('serviceType').value;
  const schedule = document.getElementById('schedule').value;
  const details = document.getElementById('details').value.trim();

  const request = [
    `REMOTE SERVICES REQUEST`,
    `Name: ${name}`,
    `Contact: ${contact}`,
    `Service: ${service}`,
    `Type: ${serviceType}`,
    `Preferred schedule: ${schedule || 'Not specified'}`,
    `Details: ${details}`
  ].join('\n');

  navigator.clipboard?.writeText(request).catch(() => {});

  message.textContent = 'Request prepared successfully. Your request details were copied when your browser allowed it. Online booking storage will be connected in the next setup step.';

  const blob = new Blob([request], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `remote-services-request-${Date.now()}.txt`;
  link.textContent = 'Download request copy';
  link.style.display = 'inline-block';
  link.style.marginTop = '10px';
  link.style.fontWeight = '800';
  link.style.color = '#1769e0';

  message.appendChild(document.createElement('br'));
  message.appendChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 30000);
});
