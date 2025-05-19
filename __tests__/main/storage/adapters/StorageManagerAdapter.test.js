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
    // Create mock repository instances - need to match EventEmitter behavior
    mockEntityRepository = Object.create(EventEmitter.prototype);
    Object.assign(mockEntityRepository, {
      initialize: jest.fn().mockResolvedValue(true),
      createEntity: jest.fn(),
      updateEntity: jest.fn(),
      getEntity: jest.fn(),
      deleteEntity: jest.fn(),
      listEntities: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn()
    });
    
    mockSettingsRepository = Object.create(EventEmitter.prototype);
    Object.assign(mockSettingsRepository, {
      initialize: jest.fn().mockResolvedValue(true),
      getSetting: jest.fn(),
      setSetting: jest.fn(),
      deleteSetting: jest.fn(),
      getAllSettings: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn()
    });
    
    mockMetadataRepository = Object.create(EventEmitter.prototype);
    Object.assign(mockMetadataRepository, {
      initialize: jest.fn().mockResolvedValue(true),
      getMetadata: jest.fn(),
      storeMetadata: jest.fn(),
      deleteMetadata: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn()
    });
    
    // Create the adapter with repository instances directly
    adapter = new StorageManagerAdapter({
      entityRepository: mockEntityRepository,
      settingsRepository: mockSettingsRepository,
      metadataRepository: mockMetadataRepository
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
      expect(mockEntityRepository.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockEntityRepository.on).toHaveBeenCalledWith('initialized', expect.any(Function));
      expect(mockEntityRepository.on).toHaveBeenCalledWith('*', expect.any(Function));
      
      expect(mockSettingsRepository.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSettingsRepository.on).toHaveBeenCalledWith('initialized', expect.any(Function));
      expect(mockSettingsRepository.on).toHaveBeenCalledWith('*', expect.any(Function));
      
      expect(mockMetadataRepository.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockMetadataRepository.on).toHaveBeenCalledWith('initialized', expect.any(Function));
      expect(mockMetadataRepository.on).toHaveBeenCalledWith('*', expect.any(Function));
    });
    
    it('should initialize without repositories', async () => {
      adapter = new StorageManagerAdapter({});
      
      const result = await adapter.initialize();
      expect(result).toBe(true);
      expect(adapter.isInitialized).toBe(true);
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
      
      expect(mockEntityRepository.getEntity).toHaveBeenCalledWith(entityType, entityId, {});
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
      
      expect(mockEntityRepository.deleteEntity).toHaveBeenCalledWith(entityType, entityId, {});
      expect(result).toBe(true);
    });
    
    it('should delegate getAllEntities to EntityRepository', async () => {
      const entityType = 'tasks';
      const expectedEntities = [
        { id: 'task-1', name: 'Task 1' },
        { id: 'task-2', name: 'Task 2' }
      ];
      
      mockEntityRepository.getAllEntities = jest.fn().mockResolvedValueOnce(expectedEntities);
      
      const result = await adapter.getAllEntities(entityType);
      
      expect(mockEntityRepository.getAllEntities).toHaveBeenCalledWith(entityType, {});
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
      jest.spyOn(adapter, 'emit');
      
      // Get the event handler that was registered for wildcard
      const eventHandlerCall = mockEntityRepository.on.mock.calls.find(
        call => call[0] === '*'
      );
      const wildcardHandler = eventHandlerCall[1];
      
      // Simulate the repository emitting an event
      const eventData = {
        entityType: 'tasks',
        id: 'task-123',
        data: { name: 'Test task' }
      };
      
      wildcardHandler('entityCreated', eventData);
      
      // Check that the adapter forwarded the event with source
      expect(adapter.emit).toHaveBeenCalledWith('entityCreated', {
        ...eventData,
        source: 'entity'
      });
    });
    
    it('should forward settings events', () => {
      jest.spyOn(adapter, 'emit');
      
      // Get the event handler that was registered for wildcard
      const eventHandlerCall = mockSettingsRepository.on.mock.calls.find(
        call => call[0] === '*'
      );
      const wildcardHandler = eventHandlerCall[1];
      
      // Simulate the repository emitting an event
      const eventData = {
        key: 'theme',
        value: 'dark',
        oldValue: 'light'
      };
      
      wildcardHandler('settingChanged', eventData);
      
      // Check that the adapter forwarded the event with source
      expect(adapter.emit).toHaveBeenCalledWith('settingChanged', {
        ...eventData,
        source: 'settings'
      });
    });
    
    it('should forward metadata events', () => {
      jest.spyOn(adapter, 'emit');
      
      // Get the event handler that was registered for wildcard
      const eventHandlerCall = mockMetadataRepository.on.mock.calls.find(
        call => call[0] === '*'
      );
      const wildcardHandler = eventHandlerCall[1];
      
      // Simulate the repository emitting an event
      const eventData = {
        key: 'lastSync',
        metadata: { timestamp: 1641034800000 }
      };
      
      wildcardHandler('metadataStored', eventData);
      
      // Check that the adapter forwarded the event with source
      expect(adapter.emit).toHaveBeenCalledWith('metadataStored', {
        ...eventData,
        source: 'metadata'
      });
    });
    
    it('should forward error events', () => {
      jest.spyOn(adapter, 'emit');
      
      // Get the error event handler
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