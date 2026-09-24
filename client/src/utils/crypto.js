/**
 * PulseChat Client-Side Encryption Utility
 * Uses browser-native Web Crypto API (AES-GCM 256-bit).
 *
 * NOTE: Keys are derived from channel ID, protecting against database leaks,
 * but not zero-knowledge against a malicious server operator.
 */

const keyCache = new Map();

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a 256-bit AES-GCM key for a given channel/DM ID using PBKDF2
 */
export async function getChannelKey(channelId) {
  if (!channelId) return null;
  if (keyCache.has(channelId)) {
    return keyCache.get(channelId);
  }

  try {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(`PULSECHAT_SALT_${channelId}`),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(`SALT_${channelId}_E2EE`),
        iterations: 10000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    keyCache.set(channelId, key);
    return key;
  } catch (err) {
    console.error('Failed to derive channel key:', err);
    return null;
  }
}

/**
 * Encrypts plaintext message content string for a channel
 * Returns string in format: "ENC:v1:<iv_b64>:<ciphertext_b64>"
 */
export async function encryptMessage(text, channelId) {
  if (!text || typeof text !== 'string') return text;
  if (!channelId) return text;

  try {
    const key = await getChannelKey(channelId);
    if (!key) return text;

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );

    const ivB64 = arrayBufferToBase64(iv);
    const cipherB64 = arrayBufferToBase64(ciphertext);

    return `ENC:v1:${ivB64}:${cipherB64}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

/**
 * Decrypts an encrypted message string "ENC:v1:<iv_b64>:<ciphertext_b64>"
 * Falls back to original string for legacy/unencrypted messages
 */
export async function decryptMessage(encryptedContent, channelId) {
  if (!encryptedContent || typeof encryptedContent !== 'string') return encryptedContent;
  if (!encryptedContent.startsWith('ENC:v1:')) return encryptedContent;
  if (!channelId) return encryptedContent;

  try {
    const parts = encryptedContent.split(':');
    if (parts.length !== 4) return encryptedContent;

    const ivB64 = parts[2];
    const cipherB64 = parts[3];

    const key = await getChannelKey(channelId);
    if (!key) return encryptedContent;

    const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
    const ciphertext = base64ToArrayBuffer(cipherB64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed:', err);
    return '[Encrypted Message - Key Mismatch]';
  }
}
