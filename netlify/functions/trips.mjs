import { getDatabase } from '@netlify/database';
import { requireUser, json } from '../lib/auth.mjs';

export const config = { path: ['/api/trips', '/api/trips/:id'] };

// One row per trip: a JSONB document (cities, days, places, notes, photos) with a version counter —
// every save is a compare-and-set, so two people editing at once never overwrite each other (the loser
// gets a 409 with the latest copy and merges before retrying). data.access maps Identity user ids to
// 'edit' | 'view'; anyone missing can't see the trip, and saves/deletes from non-editors get a 403.
// members = everyone who has ever signed in; it feeds the People picker.
let db;
const sql = (strings, ...values) => { db ||= getDatabase(); return db.sql(strings, ...values); };
const rows = r => (Array.isArray(r) ? r : r?.rows || []);
const parse = d => (typeof d === 'string' ? JSON.parse(d) : d);
let schemaReady;
const ensureSchema = () => (schemaReady ||= (async () => {
  await sql`CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT)`;
  await sql`CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, email TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', first_seen TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen TIMESTAMPTZ NOT NULL DEFAULT now())`;
})().catch(e => { schemaReady = null; throw e; }));
const row = x => ({ id: x.id, data: parse(x.data), version: x.version, updatedAt: x.updated_at, updatedBy: x.updated_by });
const roleOf = (data, uid) => (data.access ? data.access[uid] || null : 'edit');

export default async (req, context) => {
  const { user, denied } = await requireUser(req, context);
  if (denied) return denied;
  try {
    await ensureSchema();
    const id = context.params?.id;

    if (req.method === 'GET' && !id) {
      await sql`INSERT INTO members (id, email, name) VALUES (${user.id}, ${user.email}, ${user.name}) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, last_seen = now()`;
      const [trips, members] = await Promise.all([
        sql`SELECT id, data, version, updated_at, updated_by FROM trips ORDER BY data->>'start' DESC`,
        sql`SELECT id, email, name FROM members ORDER BY first_seen`,
      ]);
      return json({ me: user, members: rows(members), trips: rows(trips).map(row).filter(t => roleOf(t.data, user.id)) });
    }
    if (req.method === 'GET') {
      const r = rows(await sql`SELECT id, data, version, updated_at, updated_by FROM trips WHERE id = ${id}`);
      if (!r.length || !roleOf(parse(r[0].data), user.id)) return json({ error: 'Not found' }, 404);
      return json(row(r[0]));
    }
    if (req.method === 'PUT' && id) {
      const body = await req.json().catch(() => null);
      if (!body || !body.data || typeof body.data !== 'object') return json({ error: 'Bad request' }, 400);
      const data = JSON.stringify({ ...body.data, id });
      const version = Number(body.version) || 0;
      if (version === 0) {
        const ins = rows(await sql`INSERT INTO trips (id, data, version, updated_by) VALUES (${id}, ${data}::jsonb, 1, ${user.name}) ON CONFLICT (id) DO NOTHING RETURNING version`);
        if (ins.length) return json({ version: 1 });
      } else {
        const upd = rows(await sql`UPDATE trips SET data = ${data}::jsonb, version = version + 1, updated_at = now(), updated_by = ${user.name} WHERE id = ${id} AND version = ${version} AND (data->'access' IS NULL OR data->'access'->>${user.id}::text = 'edit') RETURNING version`);
        if (upd.length) return json({ version: upd[0].version });
      }
      const cur = rows(await sql`SELECT data, version FROM trips WHERE id = ${id}`);
      if (!cur.length) return json({ error: 'Trip was deleted', version: 0, data: null }, 409);
      const curData = parse(cur[0].data);
      if (roleOf(curData, user.id) !== 'edit') return json({ error: 'This trip is view only for you' }, 403);
      return json({ error: 'Someone else saved first', version: cur[0].version, data: curData }, 409);
    }
    if (req.method === 'DELETE' && id) {
      const del = rows(await sql`DELETE FROM trips WHERE id = ${id} AND (data->'access' IS NULL OR data->'access'->>${user.id}::text = 'edit') RETURNING id`);
      if (del.length) return json({ ok: true });
      const left = rows(await sql`SELECT 1 FROM trips WHERE id = ${id}`);
      return left.length ? json({ error: 'This trip is view only for you' }, 403) : json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: 'Database error: ' + (e.message || e) }, 500);
  }
};
