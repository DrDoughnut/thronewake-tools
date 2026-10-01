import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import proxy from './room-proxy.js';

const SITE = 'https://drdoughnut.github.io';
const KEY = `tw_${'a'.repeat(32)}`;
const env = {
  ALLOWED_ORIGINS: `${SITE},http://localhost:5173`,
  UPSTASH_URL: 'https://example.upstash.io',
  UPSTASH_TOKEN: 'secret-token',
};

const call = (command, { origin = SITE, method = 'POST' } = {}) =>
  proxy.fetch(
    new Request('https://rooms.example.workers.dev', {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(command) : undefined,
    }),
    env,
  );

describe('room proxy', () => {
  let upstream;

  beforeEach(() => {
    upstream = vi.fn(async () => new Response('{"result":null}', { status: 200 }));
    vi.stubGlobal('fetch', upstream);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('forwards a room read with the token added', async () => {
    const res = await call(['GET', KEY]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: null });

    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe(env.UPSTASH_URL);
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(init.body).toBe(JSON.stringify(['GET', KEY]));
  });

  it('forwards a room write', async () => {
    const res = await call(['SET', KEY, '{"v":1}']);
    expect(res.status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();
  });

  // These are what the public token allows today, and why it has to go.
  it.each([
    ['listing every room', ['SCAN', '0', 'MATCH', 'tw_*']],
    ['listing every room the slow way', ['KEYS', 'tw_*']],
    ['deleting a room', ['DEL', KEY]],
    ['wiping the store', ['FLUSHDB']],
    ['a key that is not a room', ['GET', 'admin']],
    ['a room key in the wrong shape', ['GET', 'tw_NOT-HEX']],
    ['a read with extra arguments', ['GET', KEY, 'extra']],
    ['a write with a non-string value', ['SET', KEY, 42]],
    ['a write that sets an expiry', ['SET', KEY, 'x', 'EX', '1']],
  ])('refuses %s', async (_label, command) => {
    const res = await call(command);
    expect(res.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('refuses an oversized room', async () => {
    const res = await call(['SET', KEY, 'x'.repeat(512 * 1024 + 1)]);
    expect(res.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('refuses other websites', async () => {
    const res = await call(['GET', KEY], { origin: 'https://evil.example' });
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(upstream).not.toHaveBeenCalled();
  });

  it('answers the browser preflight for the site', async () => {
    const res = await call(null, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
  });

  it('reports a store it cannot reach', async () => {
    upstream.mockRejectedValueOnce(new TypeError('network down'));
    const res = await call(['GET', KEY]);
    expect(res.status).toBe(502);
  });
});
