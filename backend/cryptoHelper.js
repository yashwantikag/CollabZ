const crypto = require('crypto');

/**
 * Utility for Node.js backend AES-256-GCM encryption/decryption.
 */

// Helper to derive a 256-bit key from the shared secret string
function deriveKey(sharedSecret) {
  // Use SHA-256 to hash the shared secret into a 32-byte (256-bit) buffer
  return crypto.createHash('sha256').update(sharedSecret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} plaintext - The raw text to encrypt.
 * @param {string} sharedSecret - The secure shared password/key.
 * @returns {string} - Encrypted payload format: "iv_hex:ciphertext_hex" (where ciphertext includes tag)
 */
function encryptData(plaintext, sharedSecret) {
  if (!plaintext) return '';
  const key = deriveKey(sharedSecret);
  const iv = crypto.randomBytes(12); // 12-byte IV for GCM
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertextBuffer = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const tagBuffer = cipher.getAuthTag(); // 16-byte authentication tag
  
  const encryptedBuffer = Buffer.concat([ciphertextBuffer, tagBuffer]);
  
  return `${iv.toString('hex')}:${encryptedBuffer.toString('hex')}`;
}

/**
 * Decrypts an encrypted payload using AES-256-GCM.
 * @param {string} encryptedPayload - The format "iv_hex:ciphertext_hex" (where ciphertext includes tag)
 * @param {string} sharedSecret - The secure shared password/key.
 * @returns {string} - The decrypted raw text.
 */
function decryptData(encryptedPayload, sharedSecret) {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted payload format.');
  }

  const [ivHex, encryptedHex] = parts;
  const key = deriveKey(sharedSecret);
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
  
  if (encryptedBuffer.length < 16) {
    throw new Error('Encrypted payload too short.');
  }
  
  // Slicing ciphertext and GCM authentication tag
  const ciphertextBuffer = encryptedBuffer.slice(0, encryptedBuffer.length - 16);
  const tagBuffer = encryptedBuffer.slice(encryptedBuffer.length - 16);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tagBuffer);
  
  let decrypted = decipher.update(ciphertextBuffer, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  encryptData,
  decryptData
};
