/**
 * Hybrid StorageManager
 * 
 * Provides a unified interface for data storage that can operate in two modes:
 * 1. Direct mode - Uses the original StorageManager implementation directly
 * 2. Repository mode - Uses the repository pattern via repositories
 * 
 * This hybrid implementation allows for a gradual transition from the
 * direct approach to the repository pattern.
 */

const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');
const crypto = require('crypto');

// Import storage utilities
const FileUtils = require('../../storage/utils/FileUtils');
const StorageEncryptionService = require('../../storage/utils/StorageEncryptionService');
const DataMigrationManager = require('../../storage/utils/DataMigrationManager');
const EncryptedStorageAdapter = require('../../storage/adapters/EncryptedStorageAdapter');

// Import repositories
const EntityRepository = require('../../storage/repositories/EntityRepository');
const SettingsRepository = require('../../storage/repositories/SettingsRepository');
const MetadataRepository = require('../../storage/repositories/MetadataRepository');

class StorageManager extends EventEmitter {
  /**
   * Creates a new hybrid StorageManager instance
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   * @param {Object} options.fileUtils - FileUtils instance
   * @param {Object} options.stateManager - AppStateManager instance
   * @param {boolean} options.useRepositories - Whether to use repository pattern (default: false)
   */
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.fileUtils = options.fileUtils || new FileUtils(this.logger);
    this.stateManager = options.stateManager;
    
    // Repository pattern flag - determines which mode to operate in
    this.useRepositories = options.useRepositories === true;
    this.logger.info(`StorageManager initializing in ${this.useRepositories ? 'repository' : 'direct'} mode`);
    
    // Storage paths setup
    this.initializeStoragePaths(options);
    
    // Initialize encryption service
    this.encryptionService = new StorageEncryptionService({
      logger: this.logger,
      fileUtils: this.fileUtils,
      appDataPath: this.appDataPath,
      enabled: false // Will be set based on settings
    });
    
    // Initialize data migration manager
    this.migrationManager = new DataMigrationManager({
      logger: this.logger,
      fileUtils: this.fileUtils,
      storageManager: this,
      encryptionService: this.encryptionService
    });
    
    // Set up migration event handlers
    this.setupMigrationEventHandlers();
    
    // Cache for loaded data (used in direct mode)
    this.cache = new Map();
    
    // Track initialization state
    this.isInitialized = false;
    
    // Encrypted storage adapter (used in direct mode)
    this.encryptedAdapter = null;
    
    // Initialize repositories if using repository pattern
    if (this.useRepositories) {
      this.initializeRepositories();
    }
  }
  
  /**
   * Initialize storage paths
   * @param {Object} options - Configuration options
   * @private
   */
  initializeStoragePaths(options) {
    // Try to get Electron's app if available
    let defaultAppDataPath = null;
    try {
      const { app } = require('electron');
      if (app && app.getPath) {
        defaultAppDataPath = app.getPath('userData');
      }
    } catch (error) {
      // Electron not available (e.g., in tests)
      this.logger.debug('Electron not available, using provided appDataPath');
    }
    
    this.appDataPath = options.appDataPath || defaultAppDataPath;
    if (!this.appDataPath) {
      throw new Error('appDataPath must be provided when Electron is not available');
    }
    
    this.dataPath = path.join(this.appDataPath, 'data');
    this.metadataPath = path.join(this.dataPath, 'metadata');
    
    // Entity storage paths
    this.entityPaths = {
      focusSessions: path.join(this.dataPath, 'focus-sessions'),
      activities: path.join(this.dataPath, 'activities'),
      tasks: path.join(this.dataPath, 'tasks'),
      settings: path.join(this.dataPath, 'settings.json'),
      categories: path.join(this.dataPath, 'categories.json'),
      tags: path.join(this.dataPath, 'tags.json')
    };
  }
  
  /**
   * Initialize repositories (only used in repository mode)
   * @private
   */
  initializeRepositories() {
    // Entity repository
    this.entityRepository = new EntityRepository({
      logger: this.logger,
      fileUtils: this.fileUtils,
      encryptionService: this.encryptionService,
      entityPaths: this.entityPaths
    });
    
    // Settings repository
    this.settingsRepository = new SettingsRepository({
      logger: this.logger,
      fileUtils: this.fileUtils,
      encryptionService: this.encryptionService,
      settingsPath: this.entityPaths.settings,
      stateManager: this.stateManager
    });
    
    // Metadata repository
    this.metadataRepository = new MetadataRepository({
      logger: this.logger,
      fileUtils: this.fileUtils,
      metadataPath: this.metadataPath
    });
    
    // Forward repository events
    this.forwardRepositoryEvents();
  }
  
  /**
   * Setup migration event handlers
   * @private
   */
  setupMigrationEventHandlers() {
    if (!this.migrationManager) return;
    
    this.migrationManager.on('migrationNeeded', (version) => {
      this.logger.info(`Migration needed to version: ${version}`);
      this.emit('migrationNeeded', version);
    });
    
    this.migrationManager.on('migrationStarted', (version) => {
      this.logger.info(`Migration started to version: ${version}`);
      this.emit('migrationStarted', version);
    });
    
    this.migrationManager.on('migrationCompleted', (version) => {
      this.logger.info(`Migration completed to version: ${version}`);
      this.emit('migrationCompleted', version);
    });
    
    this.migrationManager.on('migrationFailed', (version, error) => {
      this.logger.error(`Migration failed to version: ${version}`, error);
      this.emit('migrationFailed', version, error);
    });
  }
  
  /**
   * Forward events from repositories (only used in repository mode)
   * @private
   */
  forwardRepositoryEvents() {
    if (!this.useRepositories) return;
    
    // Entity repository events
    this.entityRepository.on('encryptionError', (error) => {
      this.emit('encryptionError', error);
    });
    
    this.entityRepository.on('decryptionError', (error) => {
      this.emit('decryptionError', error);
    });
    
    // Settings repository events
    this.settingsRepository.on('settingChanged', (data) => {
      this.emit('settingChanged', data);
    });
    
    this.settingsRepository.on('settingDeleted', (data) => {
      this.emit('settingDeleted', data);
    });
    
    this.settingsRepository.on('settingsCleared', () => {
      this.emit('settingsCleared');
    });
    
    this.settingsRepository.on('settingDecryptionError', (error) => {
      this.emit('settingDecryptionError', error);
    });
    
    // Metadata repository events
    this.metadataRepository.on('metadataStored', (data) => {
      this.emit('metadataStored', data);
    });
    
    this.metadataRepository.on('metadataRemoved', (data) => {
      this.emit('metadataRemoved', data);
    });
  }
  
  /**
   * Initialize the storage manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      this.logger.info(`Initializing StorageManager in ${this.useRepositories ? 'repository' : 'direct'} mode...`);
      
      // Ensure data directories exist
      await this.fileUtils.ensureDir(this.dataPath);
      await this.fileUtils.ensureDir(this.metadataPath);
      
      for (const [entity, path] of Object.entries(this.entityPaths)) {
        if (!path.endsWith('.json')) {
          await this.fileUtils.ensureDir(path);
        }
      }
      
      // Check if encryption is enabled in settings
      let encryptionEnabled = false;
      
      if (this.stateManager) {
        encryptionEnabled = this.stateManager.getSetting('encryption.enabled', false);
      } else {
        // Try to read from settings directly if no state manager
        try {
          const settings = await this.fileUtils.readJsonFile(this.entityPaths.settings, []);
          const encryptionSetting = settings.find(s => s.key === 'encryption.enabled');
          encryptionEnabled = encryptionSetting ? encryptionSetting.value : false;
        } catch (error) {
          this.logger.warn('Failed to read encryption setting from file, using default', error);
        }
      }
      
      // Initialize encryption service
      this.encryptionService.setEnabled(encryptionEnabled);
      await this.encryptionService.initialize();
      
      // Register sensitive fields for encryption
      this.registerEncryptedFields();
      
      // Initialize encrypted adapter for direct mode
      if (!this.useRepositories) {
        this.encryptedAdapter = new EncryptedStorageAdapter({
          logger: this.logger,
          encryptionService: this.encryptionService
        });
      }
      
      // Run data migrations if needed
      await this.migrationManager.checkAndRunMigrations();
      
      this.isInitialized = true;
      this.emit('initialized');
      this.logger.info(`StorageManager initialized successfully in ${this.useRepositories ? 'repository' : 'direct'} mode`);
    } catch (error) {
      this.logger.error('Failed to initialize StorageManager', error);
      throw error;
    }
  }
  
  /**
   * Register sensitive fields for encryption
   * @private
   */
  registerEncryptedFields() {
    this.encryptionService.registerEncryptedFields('focusSessions', [
      'notes', 
      'taskName'
    ]);
    
    this.encryptionService.registerEncryptedFields('activities', [
      'title',
      'url',
      'windowTitle'
    ]);
    
    this.encryptionService.registerEncryptedFields('tasks', [
      'title',
      'description'
    ]);
    
    this.encryptionService.registerEncryptedFields('settings', [
      'values.*.encrypted_value'
    ]);
    
    this.encryptionService.registerEncryptedFields('categories', [
      'name'
    ]);
    
    this.encryptionService.registerEncryptedFields('tags', [
      'name'
    ]);
  }
  
  /**
   * Create a new entity
   * @param {string} entityType - Type of entity (focusSessions, activities, etc.)
   * @param {Object} data - Entity data
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} - Created entity
   */
  async createEntity(entityType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.entityRepository.createEntity(entityType, data, options);
    }
    
    // Direct implementation below
    try {
      // Generate ID if not provided
      if (!data.id) {
        data.id = this.generateId();
      }
      
      // Set timestamp fields if not provided
      const now = new Date().toISOString();
      if (!data.createdAt) {
        data.createdAt = now;
      }
      if (!data.updatedAt) {
        data.updatedAt = now;
      }
      
      // Set type if not provided
      if (!data.type && entityType.endsWith('s')) {
        data.type = entityType.slice(0, -1); // Remove trailing 's'
      }
      
      // Apply encryption if needed
      let encryptedData = data;
      if (this.encryptionService.enabled && !options.skipEncryption) {
        try {
          encryptedData = this.encryptionService.encryptEntity(entityType, data, options.encryptFields);
        } catch (encryptError) {
          this.logger.error(`Failed to encrypt ${entityType} entity`, encryptError);
          this.emit('encryptionError', {
            entityType,
            entityId: data.id,
            operation: 'create',
            error: encryptError
          });
          
          if (this.isEncryptionRequiredForEntity(entityType)) {
            throw new Error(`Encryption failed for ${entityType} and is required`);
          }
        }
      }
      
      // Store entity in the appropriate location
      const entityPath = this.entityPaths[entityType];
      
      if (entityPath.endsWith('.json')) {
        // Collection stored in single file
        let collection;
        
        // Get existing collection
        if (this.cache.has(entityType)) {
          collection = this.cache.get(entityType);
        } else {
          collection = await this.fileUtils.readJsonFile(entityPath, []);
          this.cache.set(entityType, collection);
        }
        
        // Add new entity
        collection.push(encryptedData);
        
        // Save back to file
        await this.fileUtils.writeJsonFile(entityPath, collection);
        
        // Update cache
        this.cache.set(entityType, collection);
      } else {
        // Entity stored in individual file
        const filePath = path.join(entityPath, `${data.id}.json`);
        
        // Save to file
        await this.fileUtils.writeJsonFile(filePath, encryptedData);
      }
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to create ${entityType} entity`, error);
      throw error;
    }
  }
  
  /**
   * Get entity by ID
   * @param {string} entityType - Type of entity
   * @param {string} id - Entity ID
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} - Entity data
   */
  async getEntity(entityType, id, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.entityRepository.getEntity(entityType, id, options);
    }
    
    // Direct implementation below
    try {
      const entityPath = this.entityPaths[entityType];
      let encryptedData;
      
      if (entityPath.endsWith('.json')) {
        // Collection stored in single file
        // Check cache first
        if (this.cache.has(entityType)) {
          const collection = this.cache.get(entityType);
          encryptedData = collection.find(item => item.id === id) || null;
        } else {
          const collection = await this.fileUtils.readJsonFile(entityPath, []);
          this.cache.set(entityType, collection);
          encryptedData = collection.find(item => item.id === id) || null;
        }
      } else {
        // Individual file
        const filePath = path.join(entityPath, `${id}.json`);
        
        if (!await this.fileUtils.fileExists(filePath)) {
          return null;
        }
        
        encryptedData = await this.fileUtils.readJsonFile(filePath);
      }
      
      if (!encryptedData) {
        return null;
      }
      
      // Apply decryption if needed
      if (this.encryptionService.enabled && !options.skipDecryption) {
        try {
          return this.encryptionService.decryptEntity(entityType, encryptedData, options.decryptFields);
        } catch (decryptError) {
          this.logger.error(`Failed to decrypt ${entityType} entity ${id}`, decryptError);
          
          this.emit('decryptionError', {
            entityType,
            entityId: id,
            error: decryptError
          });
          
          if (this.isEncryptionRequiredForEntity(entityType)) {
            throw new Error(`Decryption failed for ${entityType}:${id} and is required`);
          }
          
          // Return with decryption failed marker
          encryptedData._decryptionFailed = true;
          return encryptedData;
        }
      }
      
      // Return as-is if no decryption needed
      return encryptedData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // Not found
      }
      this.logger.error(`Failed to get ${entityType} entity ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Update entity
   * @param {string} entityType - Type of entity
   * @param {string} id - Entity ID
   * @param {Object} data - Updated entity data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} - Updated entity
   */
  async updateEntity(entityType, id, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.entityRepository.updateEntity(entityType, id, data, options);
    }
    
    // Direct implementation below
    try {
      // Update timestamp
      data.updatedAt = new Date().toISOString();
      
      // Verify ID matches
      if (data.id && data.id !== id) {
        throw new Error('ID mismatch: cannot change entity ID');
      }
      
      // Ensure ID is set
      data.id = id;
      
      // Get current entity to check if it exists
      const currentEntity = await this.getEntity(entityType, id, { skipDecryption: true });
      
      if (!currentEntity) {
        throw new Error(`Entity ${entityType}:${id} not found`);
      }
      
      // Apply encryption if needed
      let encryptedData = data;
      if (this.encryptionService.enabled && !options.skipEncryption) {
        try {
          // Get original encryption state if preserving
          const preserveEncryption = options.preserveEncryption;
          let encryptionState = null;
          
          if (preserveEncryption && currentEntity) {
            encryptionState = currentEntity._encrypted !== false;
          }
          
          if (encryptionState !== false) { // Encrypt if original was encrypted or no info
            encryptedData = this.encryptionService.encryptEntity(
              entityType, 
              data, 
              options.encryptFields
            );
          }
        } catch (encryptError) {
          this.logger.error(`Failed to encrypt ${entityType} entity ${id}`, encryptError);
          
          this.emit('encryptionError', {
            entityType,
            entityId: id,
            operation: 'update',
            error: encryptError
          });
          
          if (this.isEncryptionRequiredForEntity(entityType)) {
            throw new Error(`Encryption failed for ${entityType}:${id} and is required`);
          }
        }
      }
      
      // Update entity in storage
      const entityPath = this.entityPaths[entityType];
      
      if (entityPath.endsWith('.json')) {
        // Collection stored in single file
        let collection;
        
        // Get existing collection
        if (this.cache.has(entityType)) {
          collection = this.cache.get(entityType);
        } else {
          collection = await this.fileUtils.readJsonFile(entityPath, []);
          this.cache.set(entityType, collection);
        }
        
        // Find entity index
        const index = collection.findIndex(item => item.id === id);
        
        if (index === -1) {
          throw new Error(`Entity ${entityType}:${id} not found in collection`);
        }
        
        // Update entity
        collection[index] = encryptedData;
        
        // Save back to file
        await this.fileUtils.writeJsonFile(entityPath, collection);
        
        // Update cache
        this.cache.set(entityType, collection);
      } else {
        // Entity stored in individual file
        const filePath = path.join(entityPath, `${id}.json`);
        
        // Save to file
        await this.fileUtils.writeJsonFile(filePath, encryptedData);
      }
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to update ${entityType} entity ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Delete entity
   * @param {string} entityType - Type of entity
   * @param {string} id - Entity ID
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteEntity(entityType, id) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.entityRepository.deleteEntity(entityType, id);
    }
    
    // Direct implementation below
    try {
      const entityPath = this.entityPaths[entityType];
      
      if (entityPath.endsWith('.json')) {
        // Collection stored in single file
        let collection;
        
        // Get existing collection
        if (this.cache.has(entityType)) {
          collection = this.cache.get(entityType);
        } else {
          collection = await this.fileUtils.readJsonFile(entityPath, []);
          this.cache.set(entityType, collection);
        }
        
        // Find entity index
        const index = collection.findIndex(item => item.id === id);
        
        if (index === -1) {
          return false; // Not found
        }
        
        // Remove entity
        collection.splice(index, 1);
        
        // Save back to file
        await this.fileUtils.writeJsonFile(entityPath, collection);
        
        // Update cache
        this.cache.set(entityType, collection);
      } else {
        // Entity stored in individual file
        const filePath = path.join(entityPath, `${id}.json`);
        
        // Check if entity exists
        if (!await this.fileUtils.fileExists(filePath)) {
          return false; // Not found
        }
        
        // Delete file
        await fs.unlink(filePath);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete ${entityType} entity ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Query entities
   * @param {string} entityType - Type of entity
   * @param {Object} query - Query parameters
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} - Matching entities
   */
  async queryEntities(entityType, query = {}, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.entityRepository.queryEntities(entityType, query, options);
    }
    
    // Direct implementation below
    try {
      const entityPath = this.entityPaths[entityType];
      let entities = [];
      
      // Load entities
      if (entityPath.endsWith('.json')) {
        // Collection stored in single file
        if (this.cache.has(entityType)) {
          entities = this.cache.get(entityType);
        } else {
          entities = await this.fileUtils.readJsonFile(entityPath, []);
          this.cache.set(entityType, entities);
        }
      } else {
        // Collection stored in individual files
        const files = await fs.readdir(entityPath);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(entityPath, file);
            const entity = await this.fileUtils.readJsonFile(filePath);
            entities.push(entity);
          }
        }
      }
      
      // Apply filters
      let results = entities.filter(entity => {
        for (const [key, value] of Object.entries(query)) {
          if (entity[key] !== value) {
            return false;
          }
        }
        return true;
      });
      
      // Apply sorting
      if (options.sort) {
        const { field, order = 'asc' } = options.sort;
        results.sort((a, b) => {
          const aValue = a[field];
          const bValue = b[field];
          
          if (aValue < bValue) return order === 'asc' ? -1 : 1;
          if (aValue > bValue) return order === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      // Apply limit
      if (options.limit) {
        results = results.slice(0, options.limit);
      }
      
      // Skip decryption if requested
      if (options.skipDecryption) {
        return results;
      }
      
      // Apply decryption if needed
      if (this.encryptionService.enabled) {
        const processedResults = [];
        
        for (const entity of results) {
          try {
            const processed = this.encryptionService.decryptEntity(
              entityType, 
              entity, 
              options.decryptFields
            );
            processedResults.push(processed);
          } catch (decryptError) {
            this.logger.error(`Failed to decrypt ${entityType} entity ${entity.id}`, decryptError);
            
            this.emit('decryptionError', {
              entityType,
              entityId: entity.id,
              error: decryptError
            });
            
            if (this.isEncryptionRequiredForEntity(entityType)) {
              this.logger.warn(`Skipping entity ${entityType}:${entity.id} due to decryption error`);
              continue;
            }
            
            // Mark as having decryption failure
            entity._decryptionFailed = true;
            processedResults.push(entity);
          }
        }
        
        return processedResults;
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to query ${entityType} entities`, error);
      throw error;
    }
  }
  
  /**
   * Batch create entities
   * @param {string} entityType - Type of entity
   * @param {Array<Object>} entities - Array of entities to create
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} - Results object with successful and failed arrays
   */
  async batchCreateEntities(entityType, entities, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.entityRepository.batchCreateEntities(entityType, entities, options);
    }
    
    // Direct implementation below
    const results = [];
    const errors = [];
    
    for (const entity of entities) {
      try {
        const created = await this.createEntity(entityType, entity, options);
        results.push(created);
      } catch (error) {
        errors.push({ entity, error });
      }
    }
    
    return { successful: results, failed: errors };
  }
  
  /**
   * Batch update entities
   * @param {string} entityType - Type of entity
   * @param {Array<Object>} updates - Array of updates (must include id)
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} - Results object with successful and failed arrays
   */
  async batchUpdateEntities(entityType, updates, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.entityRepository.batchUpdateEntities(entityType, updates, options);
    }
    
    // Direct implementation below
    const results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        if (!update.id) {
          throw new Error('Entity ID is required for updates');
        }
        
        const updated = await this.updateEntity(entityType, update.id, update, options);
        results.push(updated);
      } catch (error) {
        errors.push({ entity: update, error });
      }
    }
    
    return { successful: results, failed: errors };
  }
  
  /**
   * Batch delete entities
   * @param {string} entityType - Type of entity
   * @param {Array<string>} ids - Array of entity IDs to delete
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} - Results object with successful and failed arrays
   */
  async batchDeleteEntities(entityType, ids, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.entityRepository.batchDeleteEntities(entityType, ids, options);
    }
    
    // Direct implementation below
    const results = [];
    const errors = [];
    
    for (const id of ids) {
      try {
        const deleted = await this.deleteEntity(entityType, id);
        if (deleted) {
          results.push(id);
        } else {
          errors.push({ id, error: new Error('Entity not found') });
        }
      } catch (error) {
        errors.push({ id, error });
      }
    }
    
    return { successful: results, failed: errors };
  }
  
  /**
   * Save application setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @param {boolean} encrypt - Whether to encrypt the value
   * @returns {Promise<boolean>} - True if successful
   */
  async saveSetting(key, value, encrypt = false) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.settingsRepository.saveSetting(key, value, encrypt);
    }
    
    // Direct implementation below
    try {
      // Load settings
      let settings = [];
      
      if (this.cache.has('settings')) {
        settings = this.cache.get('settings');
      } else {
        settings = await this.fileUtils.readJsonFile(this.entityPaths.settings, []);
        this.cache.set('settings', settings);
      }
      
      // Process value for storage
      let settingValue = value;
      
      // Encrypt value if needed
      if (encrypt && this.encryptionService.enabled) {
        settingValue = this.encryptionService.encryptionManager.encrypt(
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      }
      
      // Find existing setting index
      const index = settings.findIndex(setting => setting.key === key);
      
      if (index !== -1) {
        // Update existing setting
        settings[index] = {
          key,
          value: settingValue,
          encrypted: encrypt
        };
      } else {
        // Add new setting
        settings.push({
          key,
          value: settingValue,
          encrypted: encrypt
        });
      }
      
      // Save settings
      await this.fileUtils.writeJsonFile(this.entityPaths.settings, settings);
      
      // Update cache
      this.cache.set('settings', settings);
      
      // Update state manager if available
      if (this.stateManager) {
        this.stateManager.setSetting(key, value);
      }
      
      // Emit event
      this.emit('settingChanged', { key, value, encrypted: encrypt });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to save setting ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Get application setting
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if setting doesn't exist
   * @returns {Promise<*>} - Setting value
   */
  async getSetting(key, defaultValue = null) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.settingsRepository.getSetting(key, defaultValue);
    }
    
    // Direct implementation below
    try {
      // Load settings
      let settings = [];
      
      if (this.cache.has('settings')) {
        settings = this.cache.get('settings');
      } else {
        settings = await this.fileUtils.readJsonFile(this.entityPaths.settings, []);
        this.cache.set('settings', settings);
      }
      
      // Find setting
      const setting = settings.find(s => s.key === key);
      
      if (!setting) {
        return defaultValue;
      }
      
      // Decrypt if needed
      if (setting.encrypted && this.encryptionService.enabled) {
        try {
          const decrypted = this.encryptionService.encryptionManager.decrypt(setting.value);
          
          // Try to parse JSON if it looks like JSON
          if (decrypted.startsWith('{') || decrypted.startsWith('[')) {
            try {
              return JSON.parse(decrypted);
            } catch {
              return decrypted;
            }
          }
          
          return decrypted;
        } catch (decryptErr) {
          this.logger.error(`Failed to decrypt setting ${key}`, decryptErr);
          
          // Emit decryption error event
          this.emit('settingDecryptionError', {
            key,
            error: decryptErr
          });
          
          return defaultValue;
        }
      }
      
      return setting.value;
    } catch (error) {
      this.logger.error(`Failed to get setting ${key}`, error);
      throw error;
    }
  }
  
  /**
   * Store metadata for the application
   * @param {string} metadataKey - Metadata key
   * @param {Object} metadata - Metadata object
   * @returns {Promise<boolean>} - True if successful
   */
  async storeMetadata(metadataKey, metadata) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.metadataRepository.storeMetadata(metadataKey, metadata);
    }
    
    // Direct implementation below
    try {
      // Ensure metadata directory exists
      await this.fileUtils.ensureDir(this.metadataPath);
      
      // Construct file path
      const filePath = path.join(this.metadataPath, `${metadataKey}.json`);
      
      // Add timestamp if not present
      if (!metadata.updatedAt) {
        metadata.updatedAt = new Date().toISOString();
      }
      
      // Save metadata to file
      await this.fileUtils.writeJsonFile(filePath, metadata);
      
      // Emit event
      this.emit('metadataStored', { key: metadataKey, metadata });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to store metadata ${metadataKey}`, error);
      throw error;
    }
  }
  
  /**
   * Get metadata for the application
   * @param {string} metadataKey - Metadata key
   * @returns {Promise<Object>} - Metadata object
   */
  async getMetadata(metadataKey) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.metadataRepository.getMetadata(metadataKey);
    }
    
    // Direct implementation below
    try {
      // Construct file path
      const filePath = path.join(this.metadataPath, `${metadataKey}.json`);
      
      // Check if file exists
      if (!await this.fileUtils.fileExists(filePath)) {
        return null;
      }
      
      // Read metadata from file
      return await this.fileUtils.readJsonFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // Metadata doesn't exist
      }
      this.logger.error(`Failed to get metadata ${metadataKey}`, error);
      throw error;
    }
  }
  
  /**
   * Remove metadata
   * @param {string} metadataKey - Metadata key
   * @returns {Promise<boolean>} - True if removed
   */
  async removeMetadata(metadataKey) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    // Use repository pattern if enabled
    if (this.useRepositories) {
      return await this.metadataRepository.removeMetadata(metadataKey);
    }
    
    // Direct implementation below
    try {
      // Construct file path
      const filePath = path.join(this.metadataPath, `${metadataKey}.json`);
      
      // Check if file exists
      if (!await this.fileUtils.fileExists(filePath)) {
        return false;
      }
      
      // Delete file
      await fs.unlink(filePath);
      
      // Emit event
      this.emit('metadataRemoved', { key: metadataKey });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove metadata ${metadataKey}`, error);
      throw error;
    }
  }
  
  /**
   * Gets the encryption service
   * @returns {StorageEncryptionService} - The encryption service
   */
  getEncryptionService() {
    return this.encryptionService;
  }
  
  /**
   * Gets the migration manager
   * @returns {DataMigrationManager} - The migration manager
   */
  getMigrationManager() {
    return this.migrationManager;
  }
  
  /**
   * Enable or disable encryption
   * @param {boolean} enabled - Whether encryption should be enabled
   * @param {Object} options - Options for enabling/disabling encryption
   * @returns {Promise<boolean>} - True if successful
   */
  async setEncryptionEnabled(enabled, options = {}) {
    if (!this.isInitialized) {
      throw new Error('StorageManager not initialized');
    }
    
    try {
      // If enabling encryption with a password, set it up
      if (enabled && options.password) {
        await this.encryptionService.changeMasterPassword(null, options.password);
      }
      
      // Update encryption state
      await this.encryptionService.setEnabled(enabled, options.migrateData !== false);
      
      // Update setting in both states
      if (this.stateManager) {
        this.stateManager.setSetting('encryption.enabled', enabled);
      }
      
      // Save the setting to storage
      await this.saveSetting('encryption.enabled', enabled);
      
      // Clear cache after encryption state change
      this.clearCache();
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to ${enabled ? 'enable' : 'disable'} encryption`, error);
      throw error;
    }
  }
  
  /**
   * Get encryption status
   * @returns {Object} - Encryption status object
   */
  getEncryptionStatus() {
    return {
      enabled: this.encryptionService.enabled,
      initialized: this.encryptionService.isInitialized,
      hasPassword: this.encryptionService.keyManager?.hasPassword?.() || false,
      keyRotationStatus: this.encryptionService.encryptionManager?.getKeyRotationStatus?.() || {},
      metrics: this.encryptionService.encryptionManager?.getMetrics?.() || {}
    };
  }
  
  /**
   * Check if encryption is required for an entity type
   * @param {string} entityType - Entity type to check
   * @returns {boolean} - True if encryption is required
   * @private
   */
  isEncryptionRequiredForEntity(entityType) {
    // This would typically be determined by application settings
    // or entity schema. For now, assume it's not required.
    return false;
  }
  
  /**
   * Generate unique ID
   * @returns {string} - Unique ID
   * @private
   */
  generateId() {
    return [
      Date.now().toString(36),
      Math.random().toString(36).substring(2, 15)
    ].join('-');
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    
    if (this.useRepositories) {
      if (this.entityRepository) {
        this.entityRepository.clearCache();
      }
      
      if (this.settingsRepository) {
        this.settingsRepository.clearCache();
      }
    }
  }
}

module.exports = StorageManager;