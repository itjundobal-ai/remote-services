const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

function clean(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && env.META_VERIFY_TOKEN && token === env.META_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  if (body?.object !== 'page') return json({ ok: true });

  // Messenger events are acknowledged immediately. Detailed processing/replies
  // can be added after the Meta webhook connection is verified.
  const entries = Array.isArray(body.entry) ? body.entry : [];
  const events = entries.flatMap(entry => Array.isArray(entry.messaging) ? entry.messaging : []);

  console.log(JSON.stringify({
    source: 'messenger',
    received_at: new Date().toISOString(),
    event_count: events.length,
    events: events.map(event => ({
      sender: clean(event?.sender?.id, 200),
      recipient: clean(event?.recipient?.id, 200),
      message: clean(event?.message?.text, 2000),
      timestamp: event?.timestamp || null
    }))
  }));

  return json({ ok: true });
}
