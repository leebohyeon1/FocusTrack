/**
 * MetadataRepository
 * 
 * Handles application metadata storage and retrieval.
 * Metadata includes application state, version information, etc.
 */
const { EventEmitter } = require('events');
const path = require('path');

class MetadataRepository extends EventEmitter {
  /**
   * Create a new MetadataRepository instance
   * 
   * @param {Object} options - Configuration options
   * @param {Object} options.fileUtils - File utilities for storage operations
   * @param {String} options.storagePath - Base path for metadata storage
   */
  constructor(options = {}) {
    super();
    this.fileUtils = options.fileUtils;
    this.storagePath = options.storagePath;
    this.metadataPath = path.join(this.storagePath, 'metadata');
    this.isInitialized = false;
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
      await this.fileUtils.ensureDir(this.metadataPath);
      
      this.isInitialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'initialize', 
        error: error.message || 'Failed to initialize metadata repository'
      });
      throw error;
    }
  }

  /**
   * Get the file path for a specific metadata key
   * 
   * @param {String} metadataKey - Key for the metadata
   * @returns {String} Full path to the metadata file
   */
  getMetadataFilePath(metadataKey) {
    return path.join(this.metadataPath, `${metadataKey}.json`);
  }

  /**
   * Get metadata by key
   * 
   * @param {String} metadataKey - Key for the metadata
   * @param {*} defaultValue - Default value if metadata doesn't exist
   * @returns {Promise<Object>} Metadata object
   */
  async getMetadata(metadataKey, defaultValue = null) {
    if (!this.isInitialized) {
      throw new Error('MetadataRepository not initialized');
    }
    
    try {
      const filePath = this.getMetadataFilePath(metadataKey);
      
      // Check if file exists
      if (!await this.fileUtils.fileExists(filePath)) {
        return defaultValue;
      }
      
      // Read metadata
      const metadata = await this.fileUtils.readJsonFile(filePath);
      
      return metadata;
    } catch (error) {
      this.emit('error', { 
        operation: 'getMetadata', 
        metadataKey,
        error: error.message || 'Failed to get metadata'
      });
      throw error;
    }
  }

  /**
   * Store metadata
   * 
   * @param {String} metadataKey - Key for the metadata
   * @param {Object} metadata - Metadata to store
   * @returns {Promise<boolean>} True if storage was successful
   */
  async storeMetadata(metadataKey, metadata) {
    if (!this.isInitialized) {
      throw new Error('MetadataRepository not initialized');
    }
    
    try {
      // Ensure metadata directory exists
      await this.fileUtils.ensureDir(this.metadataPath);
      
      const filePath = this.getMetadataFilePath(metadataKey);
      
      // Add timestamp
      if (!metadata.updatedAt) {
        metadata.updatedAt = new Date().toISOString();
      }
      
      // Write metadata
      await this.fileUtils.writeJsonFile(filePath, metadata);
      
      // Emit event
      this.emit('metadataStored', { key: metadataKey, metadata });
      
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'storeMetadata', 
        metadataKey,
        error: error.message || 'Failed to store metadata'
      });
      throw error;
    }
  }

  /**
   * Delete metadata
   * 
   * @param {String} metadataKey - Key for the metadata to delete
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteMetadata(metadataKey) {
    if (!this.isInitialized) {
      throw new Error('MetadataRepository not initialized');
    }
    
    try {
      const filePath = this.getMetadataFilePath(metadataKey);
      
      // Check if file exists
      if (!await this.fileUtils.fileExists(filePath)) {
        return false;
      }
      
      // Delete metadata file
      await this.fileUtils.deleteFile(filePath);
      
      // Emit event
      this.emit('metadataDeleted', { key: metadataKey });
      
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'deleteMetadata', 
        metadataKey,
        error: error.message || 'Failed to delete metadata'
      });
      throw error;
    }
  }

  /**
   * List all metadata keys
   * 
   * @returns {Promise<Array>} Array of metadata keys
   */
  async listMetadataKeys() {
    if (!this.isInitialized) {
      throw new Error('MetadataRepository not initialized');
    }
    
    try {
      // Ensure metadata directory exists
      await this.fileUtils.ensureDir(this.metadataPath);
      
      // Read directory
      const files = await this.fileUtils.readDir(this.metadataPath);
      
      // Extract metadata keys from filenames
      const keys = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      
      return keys;
    } catch (error) {
      this.emit('error', { 
        operation: 'listMetadataKeys', 
        error: error.message || 'Failed to list metadata keys'
      });
      throw error;
    }
  }

  /**
   * Update metadata (partial update)
   * 
   * @param {String} metadataKey - Key for the metadata
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated metadata
   */
  async updateMetadata(metadataKey, updates) {
    if (!this.isInitialized) {
      throw new Error('MetadataRepository not initialized');
    }
    
    try {
      // Get existing metadata
      const existingMetadata = await this.getMetadata(metadataKey, {});
      
      // Merge updates with existing metadata
      const updatedMetadata = {
        ...existingMetadata,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Store updated metadata
      await this.storeMetadata(metadataKey, updatedMetadata);
      
      // Emit event
      this.emit('metadataUpdated', { key: metadataKey, metadata: updatedMetadata });
      
      return updatedMetadata;
    } catch (error) {
      this.emit('error', { 
        operation: 'updateMetadata', 
        metadataKey,
        error: error.message || 'Failed to update metadata'
      });
      throw error;
    }
  }
}

module.exports = MetadataRepository;