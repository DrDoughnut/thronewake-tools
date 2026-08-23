import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeRoomName,
  deriveRoomSession,
  encryptPayload,
  decryptPayload,
  saveToCloud,
  loadFromCloud,
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
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('saves encrypted payload to cloud KVdb endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      globalThis.fetch = mockFetch;

      const res = await saveToCloud('test_room_id', '{"iv":"abc","ct":"xyz"}');
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tw_test_room_id'),
        expect.objectContaining({
          method: 'POST',
          body: '{"iv":"abc","ct":"xyz"}',
        })
      );
    });

    it('loads encrypted payload from cloud KVdb endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"iv":"abc","ct":"xyz"}',
      });
      globalThis.fetch = mockFetch;

      const res = await loadFromCloud('test_room_id');
      expect(res.success).toBe(true);
      expect(res.data).toBe('{"iv":"abc","ct":"xyz"}');
    });

    it('returns null data on 404 (new uncreated room)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      globalThis.fetch = mockFetch;

      const res = await loadFromCloud('new_room_id');
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
    });
  });
});
