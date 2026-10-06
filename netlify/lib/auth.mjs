import { timingSafeEqual } from 'node:crypto';

export const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

// Every request carries the family passcode in a header. Returns a Response to send back when denied, or null when OK.
export function checkAuth(req) {
  const expected = process.env.FAMILY_PASSCODE;
  if (!expected) return json({ error: 'Setup needed: add a FAMILY_PASSCODE environment variable in Netlify, then redeploy.' }, 500);
  const given = req.headers.get('x-doctravels-key') || '';
  const a = Buffer.from(given), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: 'Wrong passcode' }, 401);
  return null;
}
