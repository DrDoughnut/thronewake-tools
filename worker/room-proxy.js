/**
 * Team Room proxy: a Cloudflare Worker that sits between the site and Upstash.
 *
 * The site cannot hold the Upstash token — anything in the bundle is public —
 * and that token can do far more than rooms need: list every key, delete any
 * of them, flush the lot, all without a passcode. This holds the token
 * server-side and lets through exactly two commands, on exactly one shape of
 * key:
 *
 *     ["GET", "tw_<32 hex>"]
 *     ["SET", "tw_<32 hex>", "<encrypted room>"]
 *
 * With no way to list keys, a room can only be addressed by someone who can
 * derive its key from the passcode, which is the guarantee the room codes were
 * meant to give in the first place.
 *
 * The origin check keeps other websites from using the proxy through visitors'
 * browsers. It does not stop a script calling it directly — the command
 * allow-list is what does the real work.
 */

const ROOM_KEY = /^tw_[0-9a-f]{32}$/;

/** A room is a few kilobytes; this only stops someone parking junk here. */
const MAX_ROOM_BYTES = 512 * 1024;

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

function isAllowed(command) {
  if (!Array.isArray(command)) return false;
  const [op, key, value] = command;
  if (typeof key !== 'string' || !ROOM_KEY.test(key)) return false;
  if (op === 'GET') return command.length === 2;
  if (op === 'SET') {
    return command.length === 3 && typeof value === 'string' && value.length <= MAX_ROOM_BYTES;
  }
  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const originOk = allowedOrigins.includes(origin);

    const cors = originOk
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        }
      : { Vary: 'Origin' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    }
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);
    if (!originOk) return json({ error: 'origin not allowed' }, 403, cors);

    let command;
    try {
      command = await request.json();
    } catch {
      return json({ error: 'body must be JSON' }, 400, cors);
    }
    if (!isAllowed(command)) return json({ error: 'command not allowed' }, 400, cors);

    try {
      const upstream = await fetch(env.UPSTASH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.UPSTASH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch {
      return json({ error: 'room store unreachable' }, 502, cors);
    }
  },
};
