const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * StorageEncryptionService
 * 
 * Provides encryption and decryption services for storage operations
 */
class StorageEncryptionService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.enabled = options.enabled !== false;
    this.algorithm = options.algorithm || 'aes-256-gcm';
    this.keyDerivationIterations = options.keyDerivationIterations || 100000;
    this.saltLength = options.saltLength || 32;
    this.tagLength = options.tagLength || 16;
    this.secretKey = options.secretKey;
  }

  /**
   * Initialize the encryption service
   */
  async initialize() {
    if (this.enabled && !this.secretKey) {
      throw new Error('Encryption enabled but no secret key provided');
    }
    return true;
  }

  /**
   * Set encryption enabled/disabled state
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Derive encryption key from password
   */
  async deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, this.keyDerivationIterations, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  /**
   * Encrypt data
   */
  async encryptData(data) {
    if (!this.enabled) return { data };

    try {
      const salt = crypto.randomBytes(this.saltLength);
      const key = await this.deriveKey(this.secretKey, salt);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      const stringData = JSON.stringify(data);
      let encrypted = cipher.update(stringData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        data: encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      this.emit('error', { operation: 'encrypt', error: error.message });
      throw error;
    }
  }

  /**
   * Decrypt data
   */
  async decryptData(encryptedData) {
    if (!this.enabled) return { data: encryptedData.data };

    try {
      const { data, salt, iv, authTag } = encryptedData;
      
      const key = await this.deriveKey(
        this.secretKey, 
        Buffer.from(salt, 'hex')
      );
      
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        key, 
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return { data: JSON.parse(decrypted) };
    } catch (error) {
      this.emit('error', { operation: 'decrypt', error: error.message });
      throw error;
    }
  }
}

module.exports = StorageEncryptionService;