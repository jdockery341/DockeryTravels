export const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

// Every API call carries a Netlify Identity token (Authorization: Bearer …). We ask Identity who it
// belongs to and cache the answer briefly, so who-you-are always comes from the sign-in, never from the phone.
const sessions = new Map();
const TTL = 5 * 60 * 1000;
const nameOf = u => {
  const m = u.user_metadata || {};
  const n = String(m.full_name || m.name || '').trim();
  if (n) return n.slice(0, 60);
  const local = String(u.email || '').split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  return (local || 'Someone').slice(0, 60);
};

// Resolves to { user } or { denied: Response }.
export async function requireUser(req, context) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return { denied: json({ error: 'Sign in required' }, 401) };
  const hit = sessions.get(token);
  if (hit && hit.until > Date.now()) return { user: hit.user };
  const base = (context?.site?.url || process.env.URL || new URL(req.url).origin).replace(/\/$/, '');
  let r;
  try { r = await fetch(`${base}/.netlify/identity/user`, { headers: { authorization: `Bearer ${token}` } }); }
  catch (e) { return { denied: json({ error: 'Could not reach the sign-in service' }, 502) }; }
  if (r.status === 401 || r.status === 403) return { denied: json({ error: 'Your session expired \u2014 sign in again' }, 401) };
  if (!r.ok) return { denied: json({ error: r.status === 404 ? 'Identity is not enabled for this site (Netlify \u2192 Project configuration \u2192 Identity)' : `Sign-in service error (${r.status})` }, 500) };
  const u = await r.json().catch(() => null);
  if (!u || !u.id) return { denied: json({ error: 'Your session expired \u2014 sign in again' }, 401) };
  const user = { id: u.id, email: u.email || '', name: nameOf(u) };
  if (sessions.size > 500) sessions.clear();
  sessions.set(token, { user, until: Date.now() + TTL });
  return { user };
}
