const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

async function ensureTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact TEXT,
    contact_method TEXT,
    messenger_contact TEXT,
    email TEXT,
    service TEXT NOT NULL,
    service_type TEXT NOT NULL,
    preferred_schedule TEXT,
    details TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    accuracy INTEGER,
    status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();

  const columns = await db.prepare(`PRAGMA table_info(bookings)`).all();
  const names = new Set((columns.results || []).map(c => c.name));
  if (!names.has('contact_method')) await db.prepare(`ALTER TABLE bookings ADD COLUMN contact_method TEXT`).run();
  if (!names.has('messenger_contact')) await db.prepare(`ALTER TABLE bookings ADD COLUMN messenger_contact TEXT`).run();
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function authorized(request, env) {
  const key = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  return Boolean(env.ADMIN_KEY) && key === env.ADMIN_KEY;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Booking database is not connected yet.' }, 503);
  await ensureTable(env.DB);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const name = clean(body.name, 100);
  const contactMethod = clean(body.contactMethod, 20);
  const contact = clean(body.contact, 30);
  const messengerContact = clean(body.messengerContact, 200);
  const email = clean(body.email, 120);
  const service = clean(body.service, 100);
  const serviceType = clean(body.serviceType, 50);
  const schedule = clean(body.schedule, 60);
  const details = clean(body.details, 1500);

  if (!name || !contactMethod || !service || !serviceType || !details) {
    return json({ error: 'Please complete all required fields.' }, 400);
  }

  if (!['Messenger', 'Phone'].includes(contactMethod)) {
    return json({ error: 'Invalid contact method.' }, 400);
  }

  if (contactMethod === 'Phone' && !contact) {
    return json({ error: 'Please enter your phone number.' }, 400);
  }

  if (contactMethod === 'Messenger' && !messengerContact) {
    return json({ error: 'Please enter your Messenger/Facebook name or profile link.' }, 400);
  }

  const allowedTypes = ['Remote Service', 'Home Service', 'Digital Work Only'];
  if (!allowedTypes.includes(serviceType)) return json({ error: 'Invalid service type.' }, 400);

  let lat = null, lng = null, accuracy = null;
  if (serviceType === 'Home Service') {
    lat = Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : null;
    lng = Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : null;
    accuracy = Number.isFinite(Number(body.accuracy)) ? Math.round(Number(body.accuracy)) : null;
  }

  const now = new Date().toISOString();
  const reference = `RS-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;

  await env.DB.prepare(`INSERT INTO bookings
    (reference,name,contact,contact_method,messenger_contact,email,service,service_type,preferred_schedule,details,latitude,longitude,accuracy,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(reference, name, contact || null, contactMethod, messengerContact || null, email || null, service, serviceType, schedule || null, details, lat, lng, accuracy, 'New', now, now)
    .run();

  return json({ ok: true, reference }, 201);
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'Booking database is not connected yet.' }, 503);
  await ensureTable(env.DB);

  const result = await env.DB.prepare(`SELECT * FROM bookings ORDER BY datetime(created_at) DESC LIMIT 300`).all();
  return json({ bookings: result.results || [] });
}

export async function onRequestPatch({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ error: 'Booking database is not connected yet.' }, 503);
  await ensureTable(env.DB);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const id = Number(body.id);
  const status = clean(body.status, 30);
  const allowed = ['New', 'Contacted', 'Scheduled', 'In Progress', 'Done', 'Cancelled'];
  if (!Number.isInteger(id) || id < 1 || !allowed.includes(status)) return json({ error: 'Invalid update.' }, 400);

  await env.DB.prepare(`UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?`)
    .bind(status, new Date().toISOString(), id).run();
  return json({ ok: true });
}
