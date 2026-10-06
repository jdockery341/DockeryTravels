import { getDatabase } from '@netlify/database';
import { checkAuth, json } from '../lib/auth.mjs';

export const config = { path: ['/api/trips', '/api/trips/:id'] };

// One row per trip. The trip itself is a JSONB document (cities, days, places, notes, photos) with a
// version counter: every save is a compare-and-set, so two family members editing at once never
// overwrite each other — the loser gets a 409 with the latest copy and merges before retrying.
// data.access maps each name to 'edit' | 'view'; saves from anyone who isn't an editor get a 403.
let db;
const sql = (strings, ...values) => { db ||= getDatabase(); return db.sql(strings, ...values); };
const rows = r => (Array.isArray(r) ? r : r?.rows || []);
const parse = d => (typeof d === 'string' ? JSON.parse(d) : d);
let schemaReady;
const ensureSchema = () => (schemaReady ||= sql`CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
)`.catch(e => { schemaReady = null; throw e; }));
const row = x => ({ id: x.id, data: parse(x.data), version: x.version, updatedAt: x.updated_at, updatedBy: x.updated_by });

export default async (req, context) => {
  const denied = checkAuth(req);
  if (denied) return denied;
  try {
    await ensureSchema();
    const id = context.params?.id;

    if (req.method === 'GET' && !id) {
      const r = rows(await sql`SELECT id, data, version, updated_at, updated_by FROM trips ORDER BY data->>'start' DESC`);
      return json({ trips: r.map(row) });
    }
    if (req.method === 'GET') {
      const r = rows(await sql`SELECT id, data, version, updated_at, updated_by FROM trips WHERE id = ${id}`);
      return r.length ? json(row(r[0])) : json({ error: 'Not found' }, 404);
    }
    if (req.method === 'PUT' && id) {
      const body = await req.json().catch(() => null);
      if (!body || !body.data || typeof body.data !== 'object') return json({ error: 'Bad request' }, 400);
      const data = JSON.stringify({ ...body.data, id });
      const version = Number(body.version) || 0;
      const by = String(body.by || '').slice(0, 60);
      if (version === 0) {
        const ins = rows(await sql`INSERT INTO trips (id, data, version, updated_by) VALUES (${id}, ${data}::jsonb, 1, ${by}) ON CONFLICT (id) DO NOTHING RETURNING version`);
        if (ins.length) return json({ version: 1 });
      } else {
        const upd = rows(await sql`UPDATE trips SET data = ${data}::jsonb, version = version + 1, updated_at = now(), updated_by = ${by} WHERE id = ${id} AND version = ${version} AND (data->'access' IS NULL OR data->'access'->>${by}::text = 'edit') RETURNING version`);
        if (upd.length) return json({ version: upd[0].version });
      }
      const cur = rows(await sql`SELECT data, version FROM trips WHERE id = ${id}`);
      if (!cur.length) return json({ error: 'Trip was deleted', version: 0, data: null }, 409);
      const curData = parse(cur[0].data);
      if (cur[0].version === version && curData.access && curData.access[by] !== 'edit') return json({ error: 'This trip is view only for you' }, 403);
      return json({ error: 'Someone else saved first', version: cur[0].version, data: curData }, 409);
    }
    if (req.method === 'DELETE' && id) {
      await sql`DELETE FROM trips WHERE id = ${id}`;
      return json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: 'Database error: ' + (e.message || e) }, 500);
  }
};
