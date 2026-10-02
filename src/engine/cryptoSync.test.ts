import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeRoomName,
  deriveRoomSession,
  encryptPayload,
  decryptPayload,
  saveToCloud,
  loadFromCloud,
  packageTimestamp,
} from './cryptoSync';

describe('cryptoSync Zero-Knowledge Engine', () => {
  it('normalizes room names cleanly', () => {
    expect(normalizeRoomName('  Potatoes69  ')).toBe('potatoes69');
    expect(normalizeRoomName('Red   Falcon  Ops')).toBe('red-falcon-ops');
    expect(normalizeRoomName('')).toBe('');
  });

  it('derives deterministic Room ID and AES CryptoKey from a secret passcode', async () => {
    const session1 = await deriveRoomSession('potatoes69');
    const session2 = await deriveRoomSession('  POTATOES69  ');
    const sessionOther = await deriveRoomSession('cool kids');

    expect(session1).toBeTruthy();
    expect(session2).toBeTruthy();
    expect(sessionOther).toBeTruthy();

    expect(session1?.roomId).toBe(session2?.roomId);
    expect(session1?.roomId).not.toBe(sessionOther?.roomId);
    expect(session1?.roomId).toHaveLength(64); // 256-bit hex
  });

  it('encrypts and decrypts complex plan payloads with AES-256-GCM', async () => {
    const session = (await deriveRoomSession('potatoes69'))!;
    expect(session).toBeTruthy();

    const samplePlan = {
      landing: '2026-08-25T18:00',
      serverSpeed: 3,
      attackers: [
        { id: 'a1', name: 'Hammer 1', x: 10, y: -20, unitRef: 'embermark_dominion/emberblade' },
      ],
      targets: [
        { id: 't1', name: 'Target 1', x: 50, y: 30, fake: false },
      ],
    };

    const encryptedString = await encryptPayload(samplePlan, session.cryptoKey);
    expect(typeof encryptedString).toBe('string');
    expect(encryptedString).toContain('"iv"');
    expect(encryptedString).toContain('"ct"');
    expect(encryptedString).not.toContain('Hammer 1'); // Zero plaintext in ciphertext

    const decrypted = await decryptPayload<typeof samplePlan>(encryptedString, session.cryptoKey);
    expect(decrypted).toEqual(samplePlan);
  });

  it('fails decryption cleanly when given the wrong passcode key', async () => {
    const sessionA = (await deriveRoomSession('TeamAPasscode'))!;
    const sessionB = (await deriveRoomSession('TeamBPasscode'))!;

    const payload = { secretCoords: { x: 42, y: -99 }, secretPlan: 'Chief capital' };
    const encryptedByA = await encryptPayload(payload, sessionA.cryptoKey);

    // Team B attempts to decrypt Team A's payload
    const resultForB = await decryptPayload(encryptedByA, sessionB.cryptoKey);
    expect(resultForB).toBeNull();
  });

  it('handles corrupted ciphertexts gracefully', async () => {
    const session = (await deriveRoomSession('validCode'))!;
    const result = await decryptPayload('not valid json', session.cryptoKey);
    expect(result).toBeNull();
  });

  describe('Cloud KV functions', () => {
    let store: Map<string, string>;

    /** A fetch that never answers until its request is aborted. */
    const hangingFetch = () =>
      vi.fn((_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        }));

    const answer = (body: unknown, status = 200) =>
      vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

    beforeEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
      store = new Map();
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    it('saves encrypted payload to cloud Upstash endpoint', async () => {
      const mockFetch = answer({ result: 'OK' });
      globalThis.fetch = mockFetch;

      const res = await saveToCloud('test_room_id', '{"iv":"abc","ct":"xyz"}');
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('upstash.io'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(['SET', 'tw_test_room_id', '{"iv":"abc","ct":"xyz"}']),
        })
      );
    });

    it('reports a save the server rejected', async () => {
      globalThis.fetch = answer({}, 500);
      const res = await saveToCloud('room', 'x');
      expect(res.success).toBe(false);
      expect(res.error).toContain('500');
    });

    it('reports a save the server refused in its body', async () => {
      globalThis.fetch = answer({ error: 'WRONGPASS invalid token' });
      const res = await saveToCloud('room', 'x');
      expect(res.success).toBe(false);
      expect(res.error).toContain('WRONGPASS');
    });

    it('loads encrypted payload from cloud Upstash endpoint', async () => {
      globalThis.fetch = answer({ result: '{"iv":"abc","ct":"xyz"}' });

      const res = await loadFromCloud('test_room_id');
      expect(res).toEqual({ status: 'found', data: '{"iv":"abc","ct":"xyz"}' });
      // Kept for the next time the server cannot be reached.
      expect(store.get('thronewake.room_cache.test_room_id')).toBe('{"iv":"abc","ct":"xyz"}');
    });

    it('calls a room the server holds nothing for empty', async () => {
      globalThis.fetch = answer({ result: null });
      expect(await loadFromCloud('new_room_id')).toEqual({ status: 'empty', cached: null });
    });

    it('hands back the local copy with an empty answer, so a wiped room can be restored', async () => {
      store.set('thronewake.room_cache.room', 'cached-cipher');
      globalThis.fetch = answer({ result: null });
      expect(await loadFromCloud('room')).toEqual({ status: 'empty', cached: 'cached-cipher' });
    });

    // The bug behind blank rooms: every one of these used to come back as a
    // success with no data, indistinguishable from a brand-new room.
    describe('failures stay failures', () => {
      it('when the server answers with an error status', async () => {
        globalThis.fetch = answer({}, 503);
        const res = await loadFromCloud('room');
        expect(res.status).toBe('error');
        expect(res.status === 'error' && res.error).toContain('503');
      });

      it('when the request never gets out — blocked, offline, DNS', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        const res = await loadFromCloud('room');
        expect(res).toEqual({ status: 'error', error: 'Failed to fetch', cached: null });
      });

      it('when the server takes too long', async () => {
        vi.useFakeTimers();
        globalThis.fetch = hangingFetch() as unknown as typeof fetch;
        const pending = loadFromCloud('room');
        await vi.advanceTimersByTimeAsync(10_000);
        const res = await pending;
        expect(res.status).toBe('error');
        expect(res.status === 'error' && res.error).toBe('timed out');
      });

      it('when the server refuses in its body', async () => {
        globalThis.fetch = answer({ error: 'ERR max requests limit exceeded' });
        const res = await loadFromCloud('room');
        expect(res.status).toBe('error');
      });

      it('and still offers the local copy to fall back on', async () => {
        store.set('thronewake.room_cache.room', 'cached-cipher');
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        const res = await loadFromCloud('room');
        expect(res.status === 'error' && res.cached).toBe('cached-cipher');
      });
    });

    it('reads the save time out of a package without decrypting it', () => {
      expect(packageTimestamp('{"v":1,"iv":"a","ct":"b","ts":1700000000000}')).toBe(1700000000000);
      expect(packageTimestamp('not json')).toBeNull();
      expect(packageTimestamp(null)).toBeNull();
    });
  });
});
