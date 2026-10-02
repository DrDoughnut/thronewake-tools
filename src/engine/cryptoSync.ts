/**
 * Zero-Knowledge Client-Side Encryption & Cloud Sync for Thronewake Team Rooms
 *
 * Uses native WebCrypto API (AES-256-GCM + PBKDF2 + SHA-256)
 * No unencrypted plan data ever leaves the browser.
 */

export interface RoomCryptoSession {
  roomName: string;
  roomId: string;
  cryptoKey: CryptoKey;
}

/**
 * Normalizes a passcode/room name (trims, lowercases, collapses whitespace).
 */
export function normalizeRoomName(raw: string): string {
  return (raw || '').trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Derives a deterministic 64-character hex Room ID (SHA-256) and an AES-256-GCM CryptoKey
 * from a secret room passcode.
 */
export async function deriveRoomSession(passcode: string): Promise<RoomCryptoSession | null> {
  const clean = normalizeRoomName(passcode);
  if (!clean || clean.length < 2) return null;

  const enc = new TextEncoder();

  // 1. Derive deterministic Room Storage ID via SHA-256
  const idBuffer = await crypto.subtle.digest(
    'SHA-256',
    enc.encode('thronewake:room-id:' + clean)
  );
  const roomId = Array.from(new Uint8Array(idBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 2. Derive deterministic PBKDF2 Salt
  const saltBuffer = await crypto.subtle.digest(
    'SHA-256',
    enc.encode('thronewake:room-salt:' + clean)
  );
  const salt = new Uint8Array(saltBuffer).slice(0, 16);

  // 3. Import raw password material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(clean),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 4. Derive AES-GCM 256-bit encryption key
  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return {
    roomName: clean,
    roomId,
    cryptoKey,
  };
}

/**
 * Converts ArrayBuffer to Base64
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedPackage {
  v: 1;
  iv: string;
  ct: string;
  ts: number;
}

/**
 * Encrypts arbitrary JSON-serializable data using AES-256-GCM.
 * Returns a JSON string containing the initialization vector and ciphertext.
 */
export async function encryptPayload(data: unknown, cryptoKey: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(JSON.stringify(data));

  // 12-byte random IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    cryptoKey,
    plaintextBytes
  );

  const pkg: EncryptedPackage = {
    v: 1,
    iv: bufferToBase64(iv),
    ct: bufferToBase64(ciphertextBuffer),
    ts: Date.now(),
  };

  return JSON.stringify(pkg);
}

/**
 * Decrypts an encrypted package string using AES-256-GCM.
 * Returns the parsed JSON payload, or null if the key is incorrect or data is corrupted.
 */
export async function decryptPayload<T = unknown>(
  encryptedString: string,
  cryptoKey: CryptoKey
): Promise<T | null> {
  try {
    const pkg = JSON.parse(encryptedString) as EncryptedPackage;
    if (!pkg || pkg.v !== 1 || !pkg.iv || !pkg.ct) {
      return null;
    }

    const iv = base64ToBuffer(pkg.iv);
    const ciphertext = base64ToBuffer(pkg.ct);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      cryptoKey,
      ciphertext.buffer as ArrayBuffer
    );

    const dec = new TextDecoder();
    const jsonString = dec.decode(decryptedBuffer);
    return JSON.parse(jsonString) as T;
  } catch {
    // Decryption failed (wrong key / bad ciphertext)
    return null;
  }
}

/**
 * This token ships in the bundle, so it is public by design. It must belong
 * to the restricted Upstash ACL user `tw-rooms`, which may only GET and SET
 * keys matching `tw_*`: no listing, deleting or flushing. Reaching a room
 * then still needs its key, and its key needs the room code. Never put the
 * database's default token here; it can run every command on every key.
 *
 *   ACL SETUSER tw-rooms on >TOKEN resetkeys ~tw_* resetchannels -@all +get +set
 *
 * TODO: replace with the tw-rooms token. The value below is still the
 * default user's token.
 */
const UPSTASH_REST_URL = 'https://capable-firefly-231120.upstash.io';
const UPSTASH_REST_TOKEN = 'gwAAAAAAA4bQAAIIQHAxdHctcm9vbXO_s3QWdFg-PsXfZQqwo_izAL-Lp5ElaogstZxFhLrP6VDKuXtIYxmmgsyTLQWru6YdOhGA9kyJ9nsyMwcitBFo';

/** Generous enough for slow mobile links, since a timeout surfaces as an error. */
const REQUEST_TIMEOUT_MS = 8000;

const cacheKey = (roomId: string) => `thronewake.room_cache.${roomId}`;
const storeKey = (roomId: string) => `tw_${roomId.slice(0, 32)}`;

const REQUEST_HEADERS = {
  Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
  'Content-Type': 'application/json',
};

async function sendCommand(command: string[]): Promise<{ result?: string | null; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(UPSTASH_REST_URL, {
      method: 'POST',
      headers: REQUEST_HEADERS,
      body: JSON.stringify(command),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let payload: { result?: string | null; error?: string } = {};
    try {
      payload = (await res.json()) ?? {};
    } catch {}
    if (payload.error) throw new Error(payload.error);
    return payload;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('timed out');
    throw err instanceof Error ? err : new Error('network error');
  } finally {
    clearTimeout(timeoutId);
  }
}

function readCache(roomId: string): string | null {
  try {
    return localStorage.getItem(cacheKey(roomId));
  } catch {
    return null;
  }
}

/**
 * Saves encrypted ciphertext to the cloud store and local cache.
 */
export async function saveToCloud(
  roomId: string,
  encryptedCiphertext: string
): Promise<{ success: boolean; error?: string }> {
  // Always cache locally as offline fallback
  try {
    localStorage.setItem(cacheKey(roomId), encryptedCiphertext);
  } catch {}

  try {
    await sendCommand(['SET', storeKey(roomId), encryptedCiphertext]);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

/**
 * What a load found. "empty" and "error" have to stay distinct: the server
 * saying a room has no data is the only safe signal to create one, while not
 * reaching the server at all says nothing about the room. Treating the two
 * alike is what let a blocked request quietly start a blank room.
 */
export type CloudLoad =
  | { status: 'found'; data: string }
  | { status: 'empty'; cached: string | null }
  | { status: 'error'; error: string; cached: string | null };

/**
 * Fetches encrypted ciphertext from the cloud store. On failure the local
 * cache comes back alongside the error, for the caller to show read-only.
 */
export async function loadFromCloud(roomId: string): Promise<CloudLoad> {
  try {
    const payload = await sendCommand(['GET', storeKey(roomId)]);
    const text = typeof payload.result === 'string' ? payload.result : null;
    if (!text) return { status: 'empty', cached: readCache(roomId) };

    try {
      localStorage.setItem(cacheKey(roomId), text);
    } catch {}
    return { status: 'found', data: text };
  } catch (err: unknown) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'network error',
      cached: readCache(roomId),
    };
  }
}

/** The save time stamped inside an encrypted package, without decrypting it. */
export function packageTimestamp(encrypted: string | null): number | null {
  if (!encrypted) return null;
  try {
    const pkg = JSON.parse(encrypted) as Partial<EncryptedPackage>;
    return typeof pkg.ts === 'number' ? pkg.ts : null;
  } catch {
    return null;
  }
}


