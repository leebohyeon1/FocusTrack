/**
 * StorageManagerAdapter
 * 
 * An adapter that provides the original StorageManager API
 * but uses the repository pattern implementations internally.
 * This ensures backward compatibility while leveraging the new architecture.
 */
const { EventEmitter } = require('events');

class StorageManagerAdapter extends EventEmitter {
  /**
   * Create a new StorageManagerAdapter instance
   * 
   * @param {Object} options - Configuration options
   * @param {Object} options.entityRepository - Repository for entity operations
   * @param {Object} options.settingsRepository - Repository for settings operations
   * @param {Object} options.metadataRepository - Repository for metadata operations
   */
  constructor(options = {}) {
    super();
    this.entityRepository = options.entityRepository;
    this.settingsRepository = options.settingsRepository;
    this.metadataRepository = options.metadataRepository;
    this.isInitialized = false;

    // Forward events from repositories
    this.forwardEvents();
  }

  /**
   * Forward events from repositories to this adapter
   */
  forwardEvents() {
    const repositories = [
      { repo: this.entityRepository, prefix: 'entity' },
      { repo: this.settingsRepository, prefix: 'settings' },
      { repo: this.metadataRepository, prefix: 'metadata' }
    ];

    repositories.forEach(({ repo, prefix }) => {
      if (!repo) return;

      // Forward repository events with the same name
      const commonEvents = ['error', 'initialized'];
      commonEvents.forEach(event => {
        repo.on(event, data => this.emit(event, data));
      });

      // Forward specific events without prefix change
      repo.on('error', data => this.emit('error', data));

      // Forward all other events with proper context
      repo.on('*', (event, data) => {
        if (!commonEvents.includes(event)) {
          this.emit(event, { ...data, source: prefix });
        }
      });
    });
  }

  /**
   * Initialize the adapter
   * 
   * @param {Object} options - Initialization options
   * @returns {Promise<boolean>} - True if initialization was successful
   */
  async initialize(options = {}) {
    try {
      // Initialize repositories
      if (this.entityRepository) {
        await this.entityRepository.initialize(options);
      }
      
      if (this.settingsRepository) {
        await this.settingsRepository.initialize(options);
      }
      
      if (this.metadataRepository) {
        await this.metadataRepository.initialize(options);
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'initialize', 
        error: error.message || 'Failed to initialize storage manager adapter'
      });
      throw error;
    }
  }

  /**
   * Create a new entity
   * 
   * @param {String} entityType - Type of entity to create
   * @param {Object} data - Entity data
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Created entity data
   */
  async createEntity(entityType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.entityRepository) {
      throw new Error('Entity repository not available');
    }
    
    return await this.entityRepository.createEntity(entityType, data, options);
  }

  /**
   * Get an entity by ID
   * 
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} Entity data
   */
  async getEntity(entityType, entityId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.entityRepository) {
      throw new Error('Entity repository not available');
    }
    
    return await this.entityRepository.getEntity(entityType, entityId, options);
  }

  /**
   * Get all entities of a specific type
   * 
   * @param {String} entityType - Type of entities to retrieve
   * @param {Object} options - Retrieval options
   * @returns {Promise<Array>} Array of entity objects
   */
  async getAllEntities(entityType, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.entityRepository) {
      throw new Error('Entity repository not available');
    }
    
    return await this.entityRepository.getAllEntities(entityType, options);
  }

  /**
   * Update an existing entity
   * 
   * @param {String} entityType - Type of entity to update
   * @param {String} entityId - ID of entity to update
   * @param {Object} data - Updated entity data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated entity data
   */
  async updateEntity(entityType, entityId, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.entityRepository) {
      throw new Error('Entity repository not available');
    }
    
    return await this.entityRepository.updateEntity(entityType, entityId, data, options);
  }

  /**
   * Delete an entity
   * 
   * @param {String} entityType - Type of entity to delete
   * @param {String} entityId - ID of entity to delete
   * @param {Object} options - Deletion options
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteEntity(entityType, entityId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.entityRepository) {
      throw new Error('Entity repository not available');
    }
    
    return await this.entityRepository.deleteEntity(entityType, entityId, options);
  }

  /**
   * Search for entities based on criteria
   * 
   * @param {String} entityType - Type of entities to search
   * @param {Function} predicate - Function to filter entities
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching entities
   */
  async searchEntities(entityType, predicate, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.entityRepository) {
      throw new Error('Entity repository not available');
    }
    
    return await this.entityRepository.searchEntities(entityType, predicate, options);
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
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.settingsRepository) {
      throw new Error('Settings repository not available');
    }
    
    return await this.settingsRepository.getSetting(key, defaultValue);
  }

  /**
   * Get all settings
   * 
   * @returns {Promise<Array>} Array of setting objects
   */
  async getAllSettings() {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.settingsRepository) {
      throw new Error('Settings repository not available');
    }
    
    return await this.settingsRepository.getAllSettings();
  }

  /**
   * Set a setting value
   * 
   * @param {String} key - Setting key
   * @param {*} value - Setting value
   * @param {Object} options - Options for setting
   * @returns {Promise<boolean>} True if setting was successful
   */
  async setSetting(key, value, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.settingsRepository) {
      throw new Error('Settings repository not available');
    }
    
    return await this.settingsRepository.setSetting(key, value, options);
  }

  /**
   * Delete a setting
   * 
   * @param {String} key - Key of setting to delete
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteSetting(key) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.settingsRepository) {
      throw new Error('Settings repository not available');
    }
    
    return await this.settingsRepository.deleteSetting(key);
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
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.metadataRepository) {
      throw new Error('Metadata repository not available');
    }
    
    return await this.metadataRepository.getMetadata(metadataKey, defaultValue);
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
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.metadataRepository) {
      throw new Error('Metadata repository not available');
    }
    
    return await this.metadataRepository.storeMetadata(metadataKey, metadata);
  }

  /**
   * Delete metadata
   * 
   * @param {String} metadataKey - Key for the metadata to delete
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteMetadata(metadataKey) {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.metadataRepository) {
      throw new Error('Metadata repository not available');
    }
    
    return await this.metadataRepository.deleteMetadata(metadataKey);
  }

  /**
   * List all metadata keys
   * 
   * @returns {Promise<Array>} Array of metadata keys
   */
  async listMetadataKeys() {
    if (!this.isInitialized) {
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.metadataRepository) {
      throw new Error('Metadata repository not available');
    }
    
    return await this.metadataRepository.listMetadataKeys();
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
      throw new Error('StorageManagerAdapter not initialized');
    }
    
    if (!this.metadataRepository) {
      throw new Error('Metadata repository not available');
    }
    
    return await this.metadataRepository.updateMetadata(metadataKey, updates);
  }
}

module.exports = StorageManagerAdapter;