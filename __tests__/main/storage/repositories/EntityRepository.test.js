const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');
const EntityRepository = require('../../../../src/main/storage/repositories/EntityRepository');
const FileUtils = require('../../../../src/main/storage/utils/FileUtils');

jest.mock('../../../../src/main/storage/utils/FileUtils');

describe('EntityRepository', () => {
  let entityRepository;
  let mockFileUtils;
  let mockEncryptionService;
  let testStoragePath;
  
  beforeEach(() => {
    testStoragePath = '/test/storage/path';
    
    mockFileUtils = {
      ensureDir: jest.fn().mockResolvedValue(true),
      readJsonFile: jest.fn().mockResolvedValue({}),
      writeJsonFile: jest.fn().mockResolvedValue(true),
      exists: jest.fn().mockResolvedValue(true),
      readdir: jest.fn().mockResolvedValue([]),
      unlink: jest.fn().mockResolvedValue(true)
    };
    
    mockEncryptionService = {
      enabled: true,
      encryptData: jest.fn().mockImplementation(({ data }) => 
        Promise.resolve({ data: `encrypted_${data}`, iv: 'test-iv' })),
      decryptData: jest.fn().mockImplementation(({ data }) => 
        Promise.resolve({ data: data.replace('encrypted_', '') }))
    };
    
    FileUtils.mockImplementation(() => mockFileUtils);
    
    entityRepository = new EntityRepository({
      storagePath: testStoragePath,
      encryptionService: mockEncryptionService
    });
    
    // Initialize the repository
    return entityRepository.initialize();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initialization', () => {
    it('should initialize properly', () => {
      expect(entityRepository.isInitialized).toBe(true);
      expect(mockFileUtils.ensureDir).toHaveBeenCalledWith(
        path.join(testStoragePath, 'entities')
      );
    });
    
    it('should throw error when initialized without storage path', async () => {
      const badRepository = new EntityRepository({});
      await expect(badRepository.initialize()).rejects.toThrow('Storage path is required');
    });
  });
  
  describe('createEntity', () => {
    it('should create an entity successfully', async () => {
      const entityType = 'tasks';
      const entityData = { name: 'Test Task', priority: 'high' };
      
      const createdEntity = await entityRepository.createEntity(entityType, entityData);
      
      expect(createdEntity).toEqual(expect.objectContaining({
        name: 'Test Task',
        priority: 'high',
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }));
      
      expect(mockFileUtils.ensureDir).toHaveBeenCalledWith(
        path.join(testStoragePath, 'entities', entityType)
      );
      
      expect(mockFileUtils.writeJsonFile).toHaveBeenCalled();
    });
    
    it('should encrypt sensitive data when creating an entity', async () => {
      const entityType = 'tasks';
      const entityData = { name: 'Test Task', secretData: 'confidential' };
      const options = { encryptFields: ['secretData'] };
      
      await entityRepository.createEntity(entityType, entityData, options);
      
      expect(mockEncryptionService.encryptData).toHaveBeenCalledWith({
        data: 'confidential'
      });
      
      // Check that writeJsonFile was called with encrypted data
      const writeCallArgs = mockFileUtils.writeJsonFile.mock.calls[0][1];
      expect(writeCallArgs).toHaveProperty('secretData', 'encrypted_confidential');
      expect(writeCallArgs).toHaveProperty('secretData_iv', 'test-iv');
    });
    
    it('should throw an error if repository is not initialized', async () => {
      const unInitializedRepo = new EntityRepository({
        storagePath: testStoragePath
      });
      
      await expect(
        unInitializedRepo.createEntity('tasks', {})
      ).rejects.toThrow('EntityRepository not initialized');
    });
  });
  
  describe('getEntity', () => {
    it('should retrieve an entity successfully', async () => {
      const entityType = 'tasks';
      const entityId = 'test-123';
      const mockEntity = { 
        id: entityId, 
        name: 'Test Task', 
        priority: 'high',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z'
      };
      
      mockFileUtils.readJsonFile.mockResolvedValueOnce(mockEntity);
      
      const entity = await entityRepository.getEntity(entityType, entityId);
      
      expect(entity).toEqual(mockEntity);
      expect(mockFileUtils.readJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'entities', entityType, `${entityId}.json`)
      );
    });
    
    it('should decrypt encrypted fields when retrieving an entity', async () => {
      const entityType = 'tasks';
      const entityId = 'test-123';
      const mockEntity = { 
        id: entityId, 
        name: 'Test Task',
        secretData: 'encrypted_confidential',
        secretData_iv: 'test-iv',
        _encryptedFields: ['secretData']
      };
      
      mockFileUtils.readJsonFile.mockResolvedValueOnce(mockEntity);
      
      const entity = await entityRepository.getEntity(entityType, entityId);
      
      expect(mockEncryptionService.decryptData).toHaveBeenCalledWith({
        data: 'encrypted_confidential',
        iv: 'test-iv'
      });
      
      expect(entity.secretData).toBe('confidential');
    });
    
    it('should return null if entity does not exist', async () => {
      mockFileUtils.exists.mockResolvedValueOnce(false);
      
      const entity = await entityRepository.getEntity('tasks', 'non-existent');
      
      expect(entity).toBeNull();
    });
  });
  
  describe('updateEntity', () => {
    it('should update an entity successfully', async () => {
      const entityType = 'tasks';
      const entityId = 'test-123';
      const mockEntity = { 
        id: entityId, 
        name: 'Test Task', 
        priority: 'high',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z'
      };
      
      const updateData = {
        name: 'Updated Task',
        status: 'completed'
      };
      
      mockFileUtils.readJsonFile.mockResolvedValueOnce(mockEntity);
      
      const updatedEntity = await entityRepository.updateEntity(entityType, entityId, updateData);
      
      expect(updatedEntity).toEqual(expect.objectContaining({
        id: entityId,
        name: 'Updated Task',
        priority: 'high',
        status: 'completed',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: expect.any(String)
      }));
      
      expect(mockFileUtils.writeJsonFile).toHaveBeenCalled();
      const writeCallArgs = mockFileUtils.writeJsonFile.mock.calls[0];
      expect(writeCallArgs[1].updatedAt).not.toBe('2023-01-01T12:00:00Z');
    });
    
    it('should return null if entity to update does not exist', async () => {
      mockFileUtils.exists.mockResolvedValueOnce(false);
      
      const result = await entityRepository.updateEntity('tasks', 'non-existent', {});
      
      expect(result).toBeNull();
      expect(mockFileUtils.writeJsonFile).not.toHaveBeenCalled();
    });
  });
  
  describe('deleteEntity', () => {
    it('should delete an entity successfully', async () => {
      const entityType = 'tasks';
      const entityId = 'test-123';
      mockFileUtils.exists.mockResolvedValueOnce(true);
      
      const result = await entityRepository.deleteEntity(entityType, entityId);
      
      expect(result).toBe(true);
      expect(mockFileUtils.unlink).toHaveBeenCalledWith(
        path.join(testStoragePath, 'entities', entityType, `${entityId}.json`)
      );
    });
    
    it('should return false if entity to delete does not exist', async () => {
      mockFileUtils.exists.mockResolvedValueOnce(false);
      
      const result = await entityRepository.deleteEntity('tasks', 'non-existent');
      
      expect(result).toBe(false);
      expect(mockFileUtils.unlink).not.toHaveBeenCalled();
    });
  });
  
  describe('listEntities', () => {
    it('should list all entities of a specified type', async () => {
      const entityType = 'tasks';
      
      mockFileUtils.readdir.mockResolvedValueOnce([
        'task-1.json', 'task-2.json', 'task-3.json'
      ]);
      
      const entities = [
        { id: 'task-1', name: 'Task 1' },
        { id: 'task-2', name: 'Task 2' },
        { id: 'task-3', name: 'Task 3' }
      ];
      
      // Setup mocks for each entity file read
      mockFileUtils.readJsonFile
        .mockResolvedValueOnce(entities[0])
        .mockResolvedValueOnce(entities[1])
        .mockResolvedValueOnce(entities[2]);
      
      const result = await entityRepository.listEntities(entityType);
      
      expect(result).toEqual(entities);
      expect(mockFileUtils.readdir).toHaveBeenCalledWith(
        path.join(testStoragePath, 'entities', entityType)
      );
      expect(mockFileUtils.readJsonFile).toHaveBeenCalledTimes(3);
    });
    
    it('should return an empty array if entity type directory does not exist', async () => {
      mockFileUtils.exists.mockResolvedValueOnce(false);
      
      const result = await entityRepository.listEntities('non-existent-type');
      
      expect(result).toEqual([]);
      expect(mockFileUtils.readdir).not.toHaveBeenCalled();
    });
  });
  
  describe('events', () => {
    it('should emit events when entities are created', async () => {
      const eventSpy = jest.fn();
      entityRepository.on('entityCreated', eventSpy);
      
      await entityRepository.createEntity('tasks', { name: 'Event Test' });
      
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'tasks',
        id: expect.any(String),
        data: expect.objectContaining({ name: 'Event Test' })
      }));
    });
    
    it('should emit events when entities are updated', async () => {
      const eventSpy = jest.fn();
      entityRepository.on('entityUpdated', eventSpy);
      
      const mockEntity = { id: 'test-123', name: 'Original Name' };
      mockFileUtils.exists.mockResolvedValueOnce(true);
      mockFileUtils.readJsonFile.mockResolvedValueOnce(mockEntity);
      
      await entityRepository.updateEntity('tasks', 'test-123', { name: 'Updated Name' });
      
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'tasks',
        id: 'test-123',
        data: expect.objectContaining({ name: 'Updated Name' })
      }));
    });
    
    it('should emit events when entities are deleted', async () => {
      const eventSpy = jest.fn();
      entityRepository.on('entityDeleted', eventSpy);
      
      mockFileUtils.exists.mockResolvedValueOnce(true);
      
      await entityRepository.deleteEntity('tasks', 'test-123');
      
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'tasks',
        id: 'test-123'
      }));
    });
    
    it('should emit error events when operations fail', async () => {
      const errorSpy = jest.fn();
      entityRepository.on('error', errorSpy);
      
      const testError = new Error('Test error');
      mockFileUtils.writeJsonFile.mockRejectedValueOnce(testError);
      
      await expect(
        entityRepository.createEntity('tasks', { name: 'Error Test' })
      ).rejects.toThrow('Test error');
      
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        operation: 'createEntity',
        entityType: 'tasks',
        error: 'Test error'
      }));
    });
  });
});