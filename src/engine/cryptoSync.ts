/**
 * Zero-Knowledge Client-Side Encryption & Cloud Sync for Thronewake Team Rooms
 *
 * Uses native WebCrypto API (AES-256-GCM + PBKDF2 + SHA-256)
 * No unencrypted plan data ever leaves the browser.
 */

// Public KVdb bucket dedicated to Thronewake Tools Team Rooms
// All data stored in this bucket is 100% encrypted ciphertext blobs.
const DEFAULT_KVDB_BUCKET = 'A8aY4Z1xT6w7e9pQ2m5vK';
const KVDB_BASE_URL = 'https://kvdb.io';

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
 * Saves encrypted ciphertext to the cloud KV store.
 */
export async function saveToCloud(
  roomId: string,
  encryptedCiphertext: string,
  bucket = DEFAULT_KVDB_BUCKET
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${KVDB_BASE_URL}/${bucket}/${roomId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: encryptedCiphertext,
    });

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
 * Fetches encrypted ciphertext from the cloud KV store.
 */
export async function loadFromCloud(
  roomId: string,
  bucket = DEFAULT_KVDB_BUCKET
): Promise<{ success: boolean; data?: string | null; error?: string }> {
  try {
    const url = `${KVDB_BASE_URL}/${bucket}/${roomId}`;
    const res = await fetch(url, {
      method: 'GET',
    });

    if (res.status === 404) {
      // Room does not exist yet
      return { success: true, data: null };
    }

    if (!res.ok) {
      return { success: false, error: `Cloud load failed (HTTP ${res.status})` };
    }

    const text = await res.text();
    return { success: true, data: text };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: message };
  }
}
