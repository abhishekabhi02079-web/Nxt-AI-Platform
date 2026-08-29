const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for AES-GCM standard
const TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Derives a deterministic 32-byte key from CREDENTIAL_ENCRYPTION_KEY
 */
function getMasterKey() {
  const secret = env.CREDENTIAL_ENCRYPTION_KEY || 'default_secret_key_agentflow_dev_32b';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive string payload using AES-256-GCM
 * 
 * @param {string} text - Plaintext to encrypt
 * @returns {Object|null} { ciphertext, iv, tag }
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypts AES-256-GCM encrypted payload
 * 
 * @param {Object} payload - { ciphertext, iv, tag }
 * @returns {string|null} Plaintext
 */
function decrypt({ ciphertext, iv, tag }) {
  if (!ciphertext || !iv || !tag) return null;

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getMasterKey(),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Crypto] Decryption failed (invalid key or corrupted tag)');
    return null;
  }
}

/**
 * Helper to encrypt an object into a single serialized encrypted package
 */
function encryptJSON(obj) {
  if (!obj) return null;
  return encrypt(JSON.stringify(obj));
}

/**
 * Helper to decrypt an object from a serialized encrypted package
 */
function decryptJSON(payload) {
  const decryptedStr = decrypt(payload);
  if (!decryptedStr) return null;
  try {
    return JSON.parse(decryptedStr);
  } catch (e) {
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,
};
