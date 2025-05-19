/**
 * EntityRepository
 * 
 * Provides core CRUD operations for all application entities.
 * This repository implements the repository pattern and handles
 * the data access logic for entity objects in the application.
 */
const { EventEmitter } = require('events');
const path = require('path');

class EntityRepository extends EventEmitter {
  /**
   * Creates a new EntityRepository instance
   * 
   * @param {Object} options - Configuration options
   * @param {Object} options.fileUtils - File utilities for storage operations
   * @param {Object} options.encryptionService - Service for encrypting/decrypting data
   * @param {String} options.storagePath - Base path for entity storage
   */
  constructor(options = {}) {
    super();
    this.fileUtils = options.fileUtils;
    this.encryptionService = options.encryptionService;
    this.storagePath = options.storagePath;
    
    // Only set paths if storagePath is provided
    if (this.storagePath) {
      this.entitiesPath = path.join(this.storagePath, 'entities');
    }
    
    this.isInitialized = false;
  }

  /**
   * Initialize the repository
   * 
   * @param {Object} options - Initialization options
   * @returns {Promise<boolean>} - True if initialization was successful
   */
  async initialize(options = {}) {
    if (!this.storagePath) {
      throw new Error('Storage path is required');
    }
    
    try {
      // Ensure storage paths exist
      await this.fileUtils.ensureDir(this.entitiesPath);
      
      this.isInitialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'initialize', 
        error: error.message || 'Failed to initialize entity repository'
      });
      throw error;
    }
  }

  /**
   * Generate a unique entity ID
   * 
   * @returns {String} A unique ID for an entity
   */
  generateId() {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the storage path for a specific entity type
   * 
   * @param {String} entityType - Type of entity (e.g., 'tasks', 'categories')
   * @returns {String} Full path to the entity type storage location
   */
  getEntityPath(entityType) {
    return path.join(this.entitiesPath, entityType);
  }

  /**
   * Get the file path for a specific entity
   * 
   * @param {String} entityType - Type of entity
   * @param {String} entityId - ID of the entity
   * @returns {String} Full path to the entity file
   */
  getEntityFilePath(entityType, entityId) {
    return path.join(this.getEntityPath(entityType), `${entityId}.json`);
  }

  /**
   * Prepare an entity for storage, applying encryption if needed
   * 
   * @param {String} entityType - Type of entity
   * @param {Object} data - Entity data to prepare
   * @param {Object} options - Options for preparation
   * @returns {Promise<Object>} Prepared entity data
   */
  async prepareEntityForStorage(entityType, data, options = {}) {
    // Apply field-level encryption if specified
    if (options.encryptFields && this.encryptionService && this.encryptionService.enabled) {
      const dataCopy = { ...data };
      
      for (const field of options.encryptFields) {
        if (data[field] !== undefined) {
          const encrypted = await this.encryptionService.encryptData({ data: data[field] });
          dataCopy[field] = encrypted.data;
          dataCopy[`${field}_iv`] = encrypted.iv;
          dataCopy[`${field}_encrypted`] = true;
        }
      }
      
      return dataCopy;
    }
    
    // Apply full entity encryption if needed
    if (options.encrypt && this.encryptionService && this.encryptionService.enabled) {
      const encryptedData = await this.encryptionService.encryptData(data);
      return {
        ...encryptedData,
        _encrypted: true
      };
    }
    
    return data;
  }

  /**
   * Store an entity to the filesystem
   * 
   * @param {String} entityType - Type of entity
   * @param {Object} data - Entity data to store
   * @returns {Promise<boolean>} True if the operation was successful
   */
  async storeEntity(entityType, data) {
    const entityPath = this.getEntityPath(entityType);
    await this.fileUtils.ensureDir(entityPath);
    
    const filePath = this.getEntityFilePath(entityType, data.id);
    await this.fileUtils.writeJsonFile(filePath, data);
    
    return true;
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
      throw new Error('EntityRepository not initialized');
    }
    
    // Generate ID if not provided
    if (!data.id) {
      data.id = this.generateId();
    }
    
    // Add timestamps
    if (!data.createdAt) {
      data.createdAt = new Date().toISOString();
    }
    
    data.updatedAt = new Date().toISOString();
    
    try {
      // Apply encryption if needed
      const preparedData = await this.prepareEntityForStorage(entityType, data, options);
      
      // Store entity
      await this.storeEntity(entityType, preparedData);
      
      // Emit event
      this.emit('entityCreated', { entityType, id: data.id, data });
      
      // Return original (unencrypted) data
      return data;
    } catch (error) {
      this.emit('error', { 
        operation: 'createEntity', 
        entityType, 
        error: error.message || 'Failed to create entity'
      });
      throw error;
    }
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
      throw new Error('EntityRepository not initialized');
    }
    
    try {
      const filePath = this.getEntityFilePath(entityType, entityId);
      
      // Check if file exists
      if (!await this.fileUtils.fileExists(filePath)) {
        return null;
      }
      
      // Read entity data
      const data = await this.fileUtils.readJsonFile(filePath);
      
      // Decrypt field-level encryption if present
      const decryptedData = { ...data };
      let hasFieldEncryption = false;
      
      for (const key in data) {
        if (key.endsWith('_encrypted') && data[key] === true) {
          const fieldName = key.replace('_encrypted', '');
          if (data[fieldName] !== undefined && data[`${fieldName}_iv`] !== undefined) {
            hasFieldEncryption = true;
            if (this.encryptionService && this.encryptionService.enabled) {
              const decrypted = await this.encryptionService.decryptData({
                data: data[fieldName],
                iv: data[`${fieldName}_iv`]
              });
              decryptedData[fieldName] = decrypted.data;
              delete decryptedData[`${fieldName}_iv`];
              delete decryptedData[`${fieldName}_encrypted`];
            }
          }
        }
      }
      
      // Decrypt full entity if needed
      if (data._encrypted && this.encryptionService && this.encryptionService.enabled) {
        const decrypted = await this.encryptionService.decryptData(data);
        return decrypted;
      }
      
      return decryptedData;
    } catch (error) {
      this.emit('error', { 
        operation: 'getEntity', 
        entityType, 
        entityId, 
        error: error.message || 'Failed to get entity'
      });
      throw error;
    }
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
      throw new Error('EntityRepository not initialized');
    }
    
    try {
      const entityPath = this.getEntityPath(entityType);
      
      // Ensure directory exists
      await this.fileUtils.ensureDir(entityPath);
      
      // Get all entity files
      const files = await this.fileUtils.readDir(entityPath);
      const entityFiles = files.filter(file => file.endsWith('.json'));
      
      // Read all entities
      const entities = await Promise.all(
        entityFiles.map(async (file) => {
          const filePath = path.join(entityPath, file);
          const data = await this.fileUtils.readJsonFile(filePath);
          
          // Decrypt if needed
          if (data._encrypted && this.encryptionService && this.encryptionService.enabled) {
            return await this.encryptionService.decryptData(data);
          }
          
          return data;
        })
      );
      
      return entities;
    } catch (error) {
      this.emit('error', { 
        operation: 'getAllEntities', 
        entityType, 
        error: error.message || 'Failed to get all entities'
      });
      throw error;
    }
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
      throw new Error('EntityRepository not initialized');
    }
    
    try {
      // Get existing entity
      const existingEntity = await this.getEntity(entityType, entityId);
      
      if (!existingEntity) {
        return null;
      }
      
      // Merge data with existing entity
      const updatedData = {
        ...existingEntity,
        ...data,
        id: entityId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };
      
      // Apply encryption if needed
      const preparedData = await this.prepareEntityForStorage(entityType, updatedData, options);
      
      // Store updated entity
      await this.storeEntity(entityType, preparedData);
      
      // Emit event
      this.emit('entityUpdated', { entityType, id: entityId, data: updatedData });
      
      // Return updated (unencrypted) data
      return updatedData;
    } catch (error) {
      this.emit('error', { 
        operation: 'updateEntity', 
        entityType, 
        entityId, 
        error: error.message || 'Failed to update entity'
      });
      throw error;
    }
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
      throw new Error('EntityRepository not initialized');
    }
    
    try {
      const filePath = this.getEntityFilePath(entityType, entityId);
      
      // Check if file exists
      if (!await this.fileUtils.fileExists(filePath)) {
        return false;
      }
      
      // Delete entity file
      await this.fileUtils.deleteFile(filePath);
      
      // Emit event
      this.emit('entityDeleted', { entityType, id: entityId });
      
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: 'deleteEntity', 
        entityType, 
        entityId, 
        error: error.message || 'Failed to delete entity'
      });
      throw error;
    }
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
      throw new Error('EntityRepository not initialized');
    }
    
    try {
      const entities = await this.getAllEntities(entityType);
      return entities.filter(predicate);
    } catch (error) {
      this.emit('error', { 
        operation: 'searchEntities', 
        entityType, 
        error: error.message || 'Failed to search entities'
      });
      throw error;
    }
  }
}

module.exports = EntityRepository;