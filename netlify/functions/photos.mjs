import { getStore } from '@netlify/blobs';
import { checkAuth, json } from '../lib/auth.mjs';

export const config = { path: ['/api/photos', '/api/photos/:key'] };

// Photos live in Netlify Blobs. Upload needs the passcode; viewing uses an unguessable key so <img> tags can load them.
export default async (req, context) => {
  const store = getStore('photos');
  const key = context.params?.key;

  if (req.method === 'GET' && key) {
    const res = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!res) return new Response('Not found', { status: 404 });
    return new Response(res.data, { headers: { 'content-type': res.metadata?.type || 'image/jpeg', 'cache-control': 'private, max-age=31536000, immutable' } });
  }

  const denied = checkAuth(req);
  if (denied) return denied;

  if (req.method === 'POST') {
    const type = req.headers.get('content-type') || 'image/jpeg';
    if (!/^image\//.test(type)) return json({ error: 'Images only' }, 415);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024) return json({ error: 'Photo is too large' }, 413);
    const k = `${Date.now().toString(36)}-${crypto.randomUUID()}`;
    await store.set(k, buf, { metadata: { type } });
    return json({ key: k });
  }
  if (req.method === 'DELETE' && key) {
    await store.delete(key);
    return json({ ok: true });
  }
  return json({ error: 'Not found' }, 404);
};
