/**
 * SettingsRepository
 * 
 * Handles the storage and retrieval of application settings.
 * Supports encrypted settings when the encryption service is available.
 */
const { EventEmitter } = require('events');
const path = require('path');

class SettingsRepository extends EventEmitter {
  /**
   * Create a new SettingsRepository instance
   * 
   * @param {Object} options - Configuration options
   * @param {Object} options.fileUtils - File utilities for storage operations
   * @param {Object} options.encryptionService - Service for encrypting/decrypting data
   * @param {String} options.storagePath - Base path for settings storage
   */
  constructor(options = {}) {
    super();
    this.fileUtils = options.fileUtils;
    this.encryptionService = options.encryptionService;
    this.storagePath = options.storagePath;
    this.settingsPath = path.join(this.storagePath, 'settings');
    this.settingsFile = path.join(this.settingsPath, 'settings.json');
    this.isInitialized = false;
    this.settings = null;
  }

  /**
   * Initialize the repository
   * 
   * @param {Object} options - Initialization options
   * @returns {Promise<boolean>} - True if initialization was successful
   */
  async initialize(options = {}) {
    try {
      // Ensure storage paths exist
      await this.fileUtils.ensureDir(this.settingsPath);
      
      // Load settings
      await this.loadSettings();
      
      this.isInitialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'initialize', 
        error: error.message || 'Failed to initialize settings repository'
      });
      throw error;
    }
  }

  /**
   * Load settings from storage
   * 
   * @returns {Promise<Array>} Array of setting objects
   */
  async loadSettings() {
    try {
      // Check if settings file exists
      if (await this.fileUtils.fileExists(this.settingsFile)) {
        // Read settings
        this.settings = await this.fileUtils.readJsonFile(this.settingsFile);
      } else {
        // Create default settings
        this.settings = [];
        await this.saveSettings();
      }
      
      return this.settings;
    } catch (error) {
      this.emit('error', { 
        operation: 'loadSettings', 
        error: error.message || 'Failed to load settings'
      });
      throw error;
    }
  }

  /**
   * Save settings to storage
   * 
   * @returns {Promise<boolean>} True if save was successful
   */
  async saveSettings() {
    try {
      await this.fileUtils.ensureDir(this.settingsPath);
      await this.fileUtils.writeJsonFile(this.settingsFile, this.settings);
      
      this.emit('settingsSaved', { count: this.settings.length });
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'saveSettings', 
        error: error.message || 'Failed to save settings'
      });
      throw error;
    }
  }

  /**
   * Get all settings
   * 
   * @returns {Promise<Array>} Array of setting objects
   */
  async getAllSettings() {
    if (!this.isInitialized) {
      throw new Error('SettingsRepository not initialized');
    }
    
    try {
      if (!this.settings) {
        await this.loadSettings();
      }
      
      return this.settings;
    } catch (error) {
      this.emit('error', { 
        operation: 'getAllSettings', 
        error: error.message || 'Failed to get all settings'
      });
      throw error;
    }
  }

  /**
   * Get a specific setting by key
   * 
   * @param {String} key - Setting key
   * @param {*} defaultValue - Default value if setting doesn't exist
   * @returns {Promise<*>} Setting value
   */
  async getSetting(key, defaultValue = null) {
    if (!this.isInitialized) {
      throw new Error('SettingsRepository not initialized');
    }
    
    try {
      if (!this.settings) {
        await this.loadSettings();
      }
      
      const setting = this.settings.find(s => s.key === key);
      
      if (!setting) {
        return defaultValue;
      }
      
      // Decrypt if needed
      if (setting.encrypted && this.encryptionService && this.encryptionService.enabled) {
        const decrypted = await this.encryptionService.decryptData({
          data: setting.value,
          iv: setting.iv
        });
        
        return decrypted.data;
      }
      
      return setting.value;
    } catch (error) {
      this.emit('error', { 
        operation: 'getSetting', 
        key,
        error: error.message || 'Failed to get setting'
      });
      throw error;
    }
  }

  /**
   * Set a setting value
   * 
   * @param {String} key - Setting key
   * @param {*} value - Setting value
   * @param {Object} options - Options for setting
   * @param {Boolean} options.encrypted - Whether to encrypt the setting
   * @returns {Promise<boolean>} True if setting was successful
   */
  async setSetting(key, value, options = {}) {
    if (!this.isInitialized) {
      throw new Error('SettingsRepository not initialized');
    }
    
    try {
      if (!this.settings) {
        await this.loadSettings();
      }
      
      let settingValue = value;
      let encryptionData = {};
      
      // Encrypt if needed
      if (options.encrypted && this.encryptionService && this.encryptionService.enabled) {
        const encrypted = await this.encryptionService.encryptData({ data: value });
        settingValue = encrypted.data;
        encryptionData = { iv: encrypted.iv };
      }
      
      // Find existing setting
      const existingIndex = this.settings.findIndex(s => s.key === key);
      
      if (existingIndex >= 0) {
        // Update existing setting
        this.settings[existingIndex] = {
          ...this.settings[existingIndex],
          value: settingValue,
          encrypted: options.encrypted || false,
          ...encryptionData,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Add new setting
        this.settings.push({
          key,
          value: settingValue,
          encrypted: options.encrypted || false,
          ...encryptionData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Save settings
      await this.saveSettings();
      
      // Emit event
      this.emit('settingChanged', { key, value });
      
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'setSetting', 
        key,
        error: error.message || 'Failed to set setting'
      });
      throw error;
    }
  }

  /**
   * Delete a setting
   * 
   * @param {String} key - Key of setting to delete
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteSetting(key) {
    if (!this.isInitialized) {
      throw new Error('SettingsRepository not initialized');
    }
    
    try {
      if (!this.settings) {
        await this.loadSettings();
      }
      
      // Find existing setting
      const existingIndex = this.settings.findIndex(s => s.key === key);
      
      if (existingIndex < 0) {
        return false;
      }
      
      // Remove setting
      this.settings.splice(existingIndex, 1);
      
      // Save settings
      await this.saveSettings();
      
      // Emit event
      this.emit('settingDeleted', { key });
      
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'deleteSetting', 
        key,
        error: error.message || 'Failed to delete setting'
      });
      throw error;
    }
  }
}

module.exports = SettingsRepository;