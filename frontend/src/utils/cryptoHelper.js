/**
 * Utility for browser-side AES-256-GCM encryption/decryption using native Web Crypto API.
 */

// Helper to derive a CryptoKey from a string password/passphrase
async function deriveKey(sharedSecret) {
  const enc = new TextEncoder();
  const rawKey = enc.encode(sharedSecret);
  
  // Hash the shared secret using SHA-256 to ensure it's exactly 256 bits (32 bytes)
  const hash = await window.crypto.subtle.digest('SHA-256', rawKey);
  
  return window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} plaintext - The raw text to encrypt.
 * @param {string} sharedSecret - The secure shared password/key.
 * @returns {Promise<string>} - The encrypted payload format: "iv_hex:ciphertext_hex"
 */
export async function encryptData(plaintext, sharedSecret) {
  if (!plaintext) return '';
  const enc = new TextEncoder();
  const key = await deriveKey(sharedSecret);
  
  // Generate a random 12-byte IV (96 bits)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data. Web Crypto appends the 16-byte authentication tag to the cipher text.
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(plaintext)
  );

  // Convert IV and Ciphertext to Hex strings for easy transit
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const ciphertextHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${ivHex}:${ciphertextHex}`;
}

/**
 * Decrypts an encrypted payload using AES-256-GCM.
 * @param {string} encryptedPayload - The format "iv_hex:ciphertext_hex"
 * @param {string} sharedSecret - The secure shared password/key.
 * @returns {Promise<string>} - The decrypted raw text.
 */
export async function decryptData(encryptedPayload, sharedSecret) {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted payload format.');
  }

  const [ivHex, ciphertextHex] = parts;
  const key = await deriveKey(sharedSecret);

  // Convert Hex back to Byte Arrays
  const ivMatch = ivHex.match(/.{1,2}/g);
  const ciphertextMatch = ciphertextHex.match(/.{1,2}/g);

  const iv = new Uint8Array(ivMatch ? ivMatch.map(byte => parseInt(byte, 16)) : []);
  const ciphertext = new Uint8Array(ciphertextMatch ? ciphertextMatch.map(byte => parseInt(byte, 16)) : []);

  // Decrypt data (this will automatically verify the authentication tag)
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
