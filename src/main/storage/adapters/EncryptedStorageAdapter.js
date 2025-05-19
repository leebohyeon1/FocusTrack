const { EventEmitter } = require('events');

/**
 * EncryptedStorageAdapter
 * 
 * Provides an adapter for encrypted storage operations
 */
class EncryptedStorageAdapter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.encryptionService = options.encryptionService;
    this.baseAdapter = options.baseAdapter;
  }

  /**
   * Initialize the adapter
   */
  async initialize() {
    if (this.baseAdapter) {
      await this.baseAdapter.initialize();
    }
    return true;
  }

  /**
   * Store data with encryption
   */
  async store(key, data) {
    let dataToStore = data;
    
    if (this.encryptionService && this.encryptionService.enabled) {
      const encrypted = await this.encryptionService.encryptData(data);
      dataToStore = encrypted;
    }
    
    if (this.baseAdapter) {
      return await this.baseAdapter.store(key, dataToStore);
    }
    
    return true;
  }

  /**
   * Retrieve data with decryption
   */
  async retrieve(key) {
    if (!this.baseAdapter) {
      return null;
    }
    
    const data = await this.baseAdapter.retrieve(key);
    
    if (data && this.encryptionService && this.encryptionService.enabled) {
      const decrypted = await this.encryptionService.decryptData(data);
      return decrypted.data;
    }
    
    return data;
  }

  /**
   * Delete data
   */
  async delete(key) {
    if (this.baseAdapter) {
      return await this.baseAdapter.delete(key);
    }
    return true;
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (this.baseAdapter) {
      return await this.baseAdapter.exists(key);
    }
    return false;
  }
}

module.exports = EncryptedStorageAdapter;