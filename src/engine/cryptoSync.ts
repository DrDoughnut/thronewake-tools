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

const UPSTASH_REST_URL = 'https://capable-firefly-231120.upstash.io';
const UPSTASH_REST_TOKEN = 'gQAAAAAAA4bQAAIgcDFhZTI5MzNmNjFmNjE0MzUyYjBmNzhjYmMwMzlmOWZkMQ';

/**
 * Saves encrypted ciphertext to the cloud store and local cache.
 */
export async function saveToCloud(
  roomId: string,
  encryptedCiphertext: string
): Promise<{ success: boolean; error?: string }> {
  // Always cache locally as offline fallback
  try {
    localStorage.setItem(`thronewake.room_cache.${roomId}`, encryptedCiphertext);
  } catch {}

  try {
    const key = `tw_${roomId.slice(0, 32)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(UPSTASH_REST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', key, encryptedCiphertext]),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: false, error: `Cloud save failed (HTTP ${res.status})` };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: message };
  }
}

/**
 * Fetches encrypted ciphertext from the cloud store with local cache fallback.
 */
export async function loadFromCloud(
  roomId: string
): Promise<{ success: boolean; data?: string | null; error?: string }> {
  let localCached: string | null = null;
  try {
    localCached = localStorage.getItem(`thronewake.room_cache.${roomId}`);
  } catch {}

  try {
    const key = `tw_${roomId.slice(0, 32)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(UPSTASH_REST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: true, data: localCached };
    }

    const payload = (await res.json()) as { result?: string | null; error?: string };
    const text = payload.result ?? null;

    if (text) {
      try {
        localStorage.setItem(`thronewake.room_cache.${roomId}`, text);
      } catch {}
      return { success: true, data: text };
    }

    return { success: true, data: localCached };
  } catch {
    return { success: true, data: localCached };
  }
}


