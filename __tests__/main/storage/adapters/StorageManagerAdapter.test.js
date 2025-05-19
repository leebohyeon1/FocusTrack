const path = require('path');
const EventEmitter = require('events');
const StorageManagerAdapter = require('../../../../src/main/storage/adapters/StorageManagerAdapter');

// Mock repositories
jest.mock('../../../../src/main/storage/repositories/EntityRepository');
jest.mock('../../../../src/main/storage/repositories/SettingsRepository');
jest.mock('../../../../src/main/storage/repositories/MetadataRepository');

// Import the mocked repository classes
const EntityRepository = require('../../../../src/main/storage/repositories/EntityRepository');
const SettingsRepository = require('../../../../src/main/storage/repositories/SettingsRepository');
const MetadataRepository = require('../../../../src/main/storage/repositories/MetadataRepository');

describe('StorageManagerAdapter', () => {
  let adapter;
  let mockEntityRepository;
  let mockSettingsRepository;
  let mockMetadataRepository;
  
  beforeEach(() => {
    // Create mock repository instances
    mockEntityRepository = {
      initialize: jest.fn().mockResolvedValue(true),
      createEntity: jest.fn(),
      updateEntity: jest.fn(),
      getEntity: jest.fn(),
      deleteEntity: jest.fn(),
      listEntities: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    };
    
    mockSettingsRepository = {
      initialize: jest.fn().mockResolvedValue(true),
      getSetting: jest.fn(),
      setSetting: jest.fn(),
      deleteSetting: jest.fn(),
      getAllSettings: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    };
    
    mockMetadataRepository = {
      initialize: jest.fn().mockResolvedValue(true),
      getMetadata: jest.fn(),
      storeMetadata: jest.fn(),
      deleteMetadata: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    };
    
    // Set up the mocked constructor implementations
    EntityRepository.mockImplementation(() => mockEntityRepository);
    SettingsRepository.mockImplementation(() => mockSettingsRepository);
    MetadataRepository.mockImplementation(() => mockMetadataRepository);
    
    // Create the adapter
    adapter = new StorageManagerAdapter({
      storagePath: '/test/path',
      encryptionService: { enabled: true }
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initialization', () => {
    it('should initialize all repositories', async () => {
      await adapter.initialize();
      
      expect(mockEntityRepository.initialize).toHaveBeenCalled();
      expect(mockSettingsRepository.initialize).toHaveBeenCalled();
      expect(mockMetadataRepository.initialize).toHaveBeenCalled();
      expect(adapter.isInitialized).toBe(true);
    });
    
    it('should set up event forwarding', async () => {
      await adapter.initialize();
      
      // Check that the adapter is subscribed to repository events
      expect(mockEntityRepository.on).toHaveBeenCalledWith('entityCreated', expect.any(Function));
      expect(mockEntityRepository.on).toHaveBeenCalledWith('entityUpdated', expect.any(Function));
      expect(mockEntityRepository.on).toHaveBeenCalledWith('entityDeleted', expect.any(Function));
      expect(mockEntityRepository.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      expect(mockSettingsRepository.on).toHaveBeenCalledWith('settingChanged', expect.any(Function));
      expect(mockSettingsRepository.on).toHaveBeenCalledWith('settingDeleted', expect.any(Function));
      expect(mockSettingsRepository.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      expect(mockMetadataRepository.on).toHaveBeenCalledWith('metadataStored', expect.any(Function));
      expect(mockMetadataRepository.on).toHaveBeenCalledWith('metadataDeleted', expect.any(Function));
      expect(mockMetadataRepository.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
    
    it('should throw error if initialized without storage path', async () => {
      adapter = new StorageManagerAdapter({});
      
      await expect(adapter.initialize()).rejects.toThrow('Storage path is required');
    });
  });
  
  describe('entity operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });
    
    it('should delegate createEntity to EntityRepository', async () => {
      const entityType = 'tasks';
      const entityData = { name: 'Test task' };
      const options = { encryptFields: ['secretData'] };
      
      mockEntityRepository.createEntity.mockResolvedValueOnce({
        id: 'task-123',
        ...entityData
      });
      
      const result = await adapter.createEntity(entityType, entityData, options);
      
      expect(mockEntityRepository.createEntity).toHaveBeenCalledWith(
        entityType, entityData, options
      );
      
      expect(result).toEqual({
        id: 'task-123',
        name: 'Test task'
      });
    });
    
    it('should delegate getEntity to EntityRepository', async () => {
      const entityType = 'tasks';
      const entityId = 'task-123';
      const expectedEntity = {
        id: entityId,
        name: 'Test task'
      };
      
      mockEntityRepository.getEntity.mockResolvedValueOnce(expectedEntity);
      
      const result = await adapter.getEntity(entityType, entityId);
      
      expect(mockEntityRepository.getEntity).toHaveBeenCalledWith(entityType, entityId);
      expect(result).toEqual(expectedEntity);
    });
    
    it('should delegate updateEntity to EntityRepository', async () => {
      const entityType = 'tasks';
      const entityId = 'task-123';
      const updateData = { name: 'Updated task' };
      const options = { encryptFields: ['secretData'] };
      
      const updatedEntity = {
        id: entityId,
        name: 'Updated task',
        updatedAt: '2023-01-02T12:00:00Z'
      };
      
      mockEntityRepository.updateEntity.mockResolvedValueOnce(updatedEntity);
      
      const result = await adapter.updateEntity(entityType, entityId, updateData, options);
      
      expect(mockEntityRepository.updateEntity).toHaveBeenCalledWith(
        entityType, entityId, updateData, options
      );
      
      expect(result).toEqual(updatedEntity);
    });
    
    it('should delegate deleteEntity to EntityRepository', async () => {
      const entityType = 'tasks';
      const entityId = 'task-123';
      
      mockEntityRepository.deleteEntity.mockResolvedValueOnce(true);
      
      const result = await adapter.deleteEntity(entityType, entityId);
      
      expect(mockEntityRepository.deleteEntity).toHaveBeenCalledWith(entityType, entityId);
      expect(result).toBe(true);
    });
    
    it('should delegate listEntities to EntityRepository', async () => {
      const entityType = 'tasks';
      const expectedEntities = [
        { id: 'task-1', name: 'Task 1' },
        { id: 'task-2', name: 'Task 2' }
      ];
      
      mockEntityRepository.listEntities.mockResolvedValueOnce(expectedEntities);
      
      const result = await adapter.listEntities(entityType);
      
      expect(mockEntityRepository.listEntities).toHaveBeenCalledWith(entityType);
      expect(result).toEqual(expectedEntities);
    });
  });
  
  describe('settings operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });
    
    it('should delegate getSetting to SettingsRepository', async () => {
      const key = 'theme';
      const defaultValue = 'light';
      const expectedValue = 'dark';
      
      mockSettingsRepository.getSetting.mockResolvedValueOnce(expectedValue);
      
      const result = await adapter.getSetting(key, defaultValue);
      
      expect(mockSettingsRepository.getSetting).toHaveBeenCalledWith(key, defaultValue);
      expect(result).toBe(expectedValue);
    });
    
    it('should delegate setSetting to SettingsRepository', async () => {
      const key = 'theme';
      const value = 'dark';
      const options = { encrypt: true };
      
      mockSettingsRepository.setSetting.mockResolvedValueOnce(true);
      
      const result = await adapter.setSetting(key, value, options);
      
      expect(mockSettingsRepository.setSetting).toHaveBeenCalledWith(key, value, options);
      expect(result).toBe(true);
    });
    
    it('should delegate deleteSetting to SettingsRepository', async () => {
      const key = 'theme';
      
      mockSettingsRepository.deleteSetting.mockResolvedValueOnce(true);
      
      const result = await adapter.deleteSetting(key);
      
      expect(mockSettingsRepository.deleteSetting).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });
    
    it('should delegate getAllSettings to SettingsRepository', async () => {
      const expectedSettings = {
        theme: 'dark',
        showTips: true
      };
      
      mockSettingsRepository.getAllSettings.mockResolvedValueOnce(expectedSettings);
      
      const result = await adapter.getAllSettings();
      
      expect(mockSettingsRepository.getAllSettings).toHaveBeenCalled();
      expect(result).toEqual(expectedSettings);
    });
  });
  
  describe('metadata operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });
    
    it('should delegate getMetadata to MetadataRepository', async () => {
      const key = 'lastSync';
      const defaultValue = { timestamp: 0 };
      const expectedMetadata = { timestamp: 1641034800000 };
      
      mockMetadataRepository.getMetadata.mockResolvedValueOnce(expectedMetadata);
      
      const result = await adapter.getMetadata(key, defaultValue);
      
      expect(mockMetadataRepository.getMetadata).toHaveBeenCalledWith(key, defaultValue);
      expect(result).toEqual(expectedMetadata);
    });
    
    it('should delegate storeMetadata to MetadataRepository', async () => {
      const key = 'lastSync';
      const metadata = { timestamp: 1641034800000 };
      
      mockMetadataRepository.storeMetadata.mockResolvedValueOnce(true);
      
      const result = await adapter.storeMetadata(key, metadata);
      
      expect(mockMetadataRepository.storeMetadata).toHaveBeenCalledWith(key, metadata);
      expect(result).toBe(true);
    });
    
    it('should delegate deleteMetadata to MetadataRepository', async () => {
      const key = 'lastSync';
      
      mockMetadataRepository.deleteMetadata.mockResolvedValueOnce(true);
      
      const result = await adapter.deleteMetadata(key);
      
      expect(mockMetadataRepository.deleteMetadata).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });
  });
  
  describe('event forwarding', () => {
    beforeEach(async () => {
      // Add spy on adapter emit method
      adapter.emit = jest.fn();
      
      await adapter.initialize();
    });
    
    it('should forward entity events', () => {
      // Get the event handler that was registered
      const eventHandlerCall = mockEntityRepository.on.mock.calls.find(
        call => call[0] === 'entityCreated'
      );
      const entityCreatedHandler = eventHandlerCall[1];
      
      // Simulate the repository emitting an event
      const eventData = {
        entityType: 'tasks',
        id: 'task-123',
        data: { name: 'Test task' }
      };
      
      entityCreatedHandler(eventData);
      
      // Check that the adapter forwarded the event
      expect(adapter.emit).toHaveBeenCalledWith('entityCreated', eventData);
    });
    
    it('should forward settings events', () => {
      // Get the event handler that was registered
      const eventHandlerCall = mockSettingsRepository.on.mock.calls.find(
        call => call[0] === 'settingChanged'
      );
      const settingChangedHandler = eventHandlerCall[1];
      
      // Simulate the repository emitting an event
      const eventData = {
        key: 'theme',
        value: 'dark',
        oldValue: 'light'
      };
      
      settingChangedHandler(eventData);
      
      // Check that the adapter forwarded the event
      expect(adapter.emit).toHaveBeenCalledWith('settingChanged', eventData);
    });
    
    it('should forward metadata events', () => {
      // Get the event handler that was registered
      const eventHandlerCall = mockMetadataRepository.on.mock.calls.find(
        call => call[0] === 'metadataStored'
      );
      const metadataStoredHandler = eventHandlerCall[1];
      
      // Simulate the repository emitting an event
      const eventData = {
        key: 'lastSync',
        metadata: { timestamp: 1641034800000 }
      };
      
      metadataStoredHandler(eventData);
      
      // Check that the adapter forwarded the event
      expect(adapter.emit).toHaveBeenCalledWith('metadataStored', eventData);
    });
    
    it('should forward error events', () => {
      // Get the error event handlers
      const entityRepoErrorCall = mockEntityRepository.on.mock.calls.find(
        call => call[0] === 'error'
      );
      const entityErrorHandler = entityRepoErrorCall[1];
      
      // Simulate an error event
      const errorData = {
        operation: 'createEntity',
        entityType: 'tasks',
        error: 'Failed to create entity'
      };
      
      entityErrorHandler(errorData);
      
      // Check that the adapter forwarded the event
      expect(adapter.emit).toHaveBeenCalledWith('error', errorData);
    });
  });
  
  describe('error handling', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });
    
    it('should throw error if not initialized', async () => {
      adapter.isInitialized = false;
      
      await expect(
        adapter.createEntity('tasks', {})
      ).rejects.toThrow('StorageManagerAdapter not initialized');
      
      await expect(
        adapter.getSetting('theme')
      ).rejects.toThrow('StorageManagerAdapter not initialized');
      
      await expect(
        adapter.getMetadata('lastSync')
      ).rejects.toThrow('StorageManagerAdapter not initialized');
    });
    
    it('should throw error if repository missing', async () => {
      adapter.entityRepository = null;
      adapter.settingsRepository = null;
      adapter.metadataRepository = null;
      
      await expect(
        adapter.createEntity('tasks', {})
      ).rejects.toThrow('Entity repository not available');
      
      await expect(
        adapter.getSetting('theme')
      ).rejects.toThrow('Settings repository not available');
      
      await expect(
        adapter.getMetadata('lastSync')
      ).rejects.toThrow('Metadata repository not available');
    });
  });
});