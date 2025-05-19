const path = require('path');
const EventEmitter = require('events');
const SettingsRepository = require('../../../../src/main/storage/repositories/SettingsRepository');
const FileUtils = require('../../../../src/main/storage/utils/FileUtils');

jest.mock('../../../../src/main/storage/utils/FileUtils');

describe('SettingsRepository', () => {
  let settingsRepository;
  let mockFileUtils;
  let mockEncryptionService;
  let testStoragePath;
  
  beforeEach(() => {
    testStoragePath = '/test/storage/path';
    
    mockFileUtils = {
      ensureDir: jest.fn().mockResolvedValue(true),
      readJsonFile: jest.fn().mockResolvedValue([]),
      writeJsonFile: jest.fn().mockResolvedValue(true),
      exists: jest.fn().mockResolvedValue(true)
    };
    
    mockEncryptionService = {
      enabled: true,
      encryptData: jest.fn().mockImplementation(({ data }) => 
        Promise.resolve({ data: `encrypted_${data}`, iv: 'test-iv' })),
      decryptData: jest.fn().mockImplementation(({ data }) => 
        Promise.resolve({ data: data.replace('encrypted_', '') }))
    };
    
    FileUtils.mockImplementation(() => mockFileUtils);
    
    settingsRepository = new SettingsRepository({
      storagePath: testStoragePath,
      encryptionService: mockEncryptionService
    });
    
    // Initialize the repository
    return settingsRepository.initialize();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initialization', () => {
    it('should initialize properly', () => {
      expect(settingsRepository.isInitialized).toBe(true);
      expect(mockFileUtils.ensureDir).toHaveBeenCalledWith(testStoragePath);
    });
    
    it('should throw error when initialized without storage path', async () => {
      const badRepository = new SettingsRepository({});
      await expect(badRepository.initialize()).rejects.toThrow('Storage path is required');
    });
    
    it('should load settings on initialization', async () => {
      const mockSettings = [
        { key: 'theme', value: 'dark' },
        { key: 'notifications', value: true }
      ];
      
      mockFileUtils.readJsonFile.mockResolvedValueOnce(mockSettings);
      
      const newRepo = new SettingsRepository({
        storagePath: testStoragePath
      });
      
      await newRepo.initialize();
      
      expect(mockFileUtils.readJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'settings.json')
      );
      
      expect(newRepo.settings).toEqual(mockSettings);
    });
    
    it('should create empty settings if file does not exist', async () => {
      mockFileUtils.exists.mockResolvedValueOnce(false);
      
      const newRepo = new SettingsRepository({
        storagePath: testStoragePath
      });
      
      await newRepo.initialize();
      
      expect(mockFileUtils.writeJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'settings.json'),
        []
      );
    });
  });
  
  describe('getSetting', () => {
    it('should return a setting value when the setting exists', async () => {
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' },
        { key: 'showTips', value: true }
      ];
      
      const theme = await settingsRepository.getSetting('theme');
      expect(theme).toBe('dark');
      
      const showTips = await settingsRepository.getSetting('showTips');
      expect(showTips).toBe(true);
    });
    
    it('should return the default value when setting does not exist', async () => {
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' }
      ];
      
      const value = await settingsRepository.getSetting('nonExistent', 'default');
      expect(value).toBe('default');
    });
    
    it('should decrypt encrypted settings', async () => {
      settingsRepository.settings = [
        { 
          key: 'apiKey', 
          value: 'encrypted_secretKey123',
          iv: 'test-iv',
          encrypted: true
        }
      ];
      
      const value = await settingsRepository.getSetting('apiKey');
      
      expect(mockEncryptionService.decryptData).toHaveBeenCalledWith({
        data: 'encrypted_secretKey123',
        iv: 'test-iv'
      });
      
      expect(value).toBe('secretKey123');
    });
    
    it('should reload settings from disk if settings are not loaded', async () => {
      const mockSettings = [
        { key: 'theme', value: 'light' }
      ];
      
      settingsRepository.settings = null;
      mockFileUtils.readJsonFile.mockResolvedValueOnce(mockSettings);
      
      const value = await settingsRepository.getSetting('theme');
      
      expect(mockFileUtils.readJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'settings.json')
      );
      
      expect(value).toBe('light');
    });
    
    it('should throw if repository is not initialized', async () => {
      const unInitializedRepo = new SettingsRepository({
        storagePath: testStoragePath
      });
      
      await expect(
        unInitializedRepo.getSetting('theme')
      ).rejects.toThrow('SettingsRepository not initialized');
    });
  });
  
  describe('setSetting', () => {
    it('should add a new setting if it does not exist', async () => {
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' }
      ];
      
      await settingsRepository.setSetting('language', 'en');
      
      expect(settingsRepository.settings).toEqual([
        { key: 'theme', value: 'dark' },
        { key: 'language', value: 'en' }
      ]);
      
      expect(mockFileUtils.writeJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'settings.json'),
        settingsRepository.settings
      );
    });
    
    it('should update an existing setting', async () => {
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' },
        { key: 'showTips', value: true }
      ];
      
      await settingsRepository.setSetting('theme', 'light');
      
      expect(settingsRepository.settings).toEqual([
        { key: 'theme', value: 'light' },
        { key: 'showTips', value: true }
      ]);
      
      expect(mockFileUtils.writeJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'settings.json'),
        settingsRepository.settings
      );
    });
    
    it('should encrypt settings marked as sensitive', async () => {
      settingsRepository.settings = [];
      
      await settingsRepository.setSetting('apiKey', 'secretKey123', { encrypt: true });
      
      expect(mockEncryptionService.encryptData).toHaveBeenCalledWith({
        data: 'secretKey123'
      });
      
      expect(settingsRepository.settings[0]).toEqual({
        key: 'apiKey',
        value: 'encrypted_secretKey123',
        iv: 'test-iv',
        encrypted: true
      });
    });
    
    it('should emit settingChanged event', async () => {
      const eventSpy = jest.fn();
      settingsRepository.on('settingChanged', eventSpy);
      
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' }
      ];
      
      await settingsRepository.setSetting('theme', 'light');
      
      expect(eventSpy).toHaveBeenCalledWith({
        key: 'theme',
        value: 'light',
        oldValue: 'dark'
      });
    });
    
    it('should reload settings from disk if settings are not loaded', async () => {
      const mockSettings = [
        { key: 'theme', value: 'dark' }
      ];
      
      settingsRepository.settings = null;
      mockFileUtils.readJsonFile.mockResolvedValueOnce(mockSettings);
      
      await settingsRepository.setSetting('theme', 'light');
      
      expect(mockFileUtils.readJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'settings.json')
      );
      
      expect(settingsRepository.settings).toEqual([
        { key: 'theme', value: 'light' }
      ]);
    });
  });
  
  describe('deleteSetting', () => {
    it('should delete an existing setting', async () => {
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' },
        { key: 'showTips', value: true }
      ];
      
      const result = await settingsRepository.deleteSetting('theme');
      
      expect(result).toBe(true);
      expect(settingsRepository.settings).toEqual([
        { key: 'showTips', value: true }
      ]);
      
      expect(mockFileUtils.writeJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'settings.json'),
        settingsRepository.settings
      );
    });
    
    it('should return false if setting does not exist', async () => {
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' }
      ];
      
      const result = await settingsRepository.deleteSetting('nonExistent');
      
      expect(result).toBe(false);
      expect(mockFileUtils.writeJsonFile).not.toHaveBeenCalled();
    });
    
    it('should emit settingDeleted event', async () => {
      const eventSpy = jest.fn();
      settingsRepository.on('settingDeleted', eventSpy);
      
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' }
      ];
      
      await settingsRepository.deleteSetting('theme');
      
      expect(eventSpy).toHaveBeenCalledWith({
        key: 'theme',
        value: 'dark'
      });
    });
  });
  
  describe('getAllSettings', () => {
    it('should return all non-encrypted settings', async () => {
      settingsRepository.settings = [
        { key: 'theme', value: 'dark' },
        { key: 'showTips', value: true },
        { 
          key: 'apiKey', 
          value: 'encrypted_secretKey123',
          iv: 'test-iv',
          encrypted: true
        }
      ];
      
      const settings = await settingsRepository.getAllSettings();
      
      expect(settings).toEqual({
        theme: 'dark',
        showTips: true,
        apiKey: 'secretKey123'
      });
      
      expect(mockEncryptionService.decryptData).toHaveBeenCalledWith({
        data: 'encrypted_secretKey123',
        iv: 'test-iv'
      });
    });
    
    it('should reload settings from disk if settings are not loaded', async () => {
      const mockSettings = [
        { key: 'theme', value: 'dark' },
        { key: 'showTips', value: true }
      ];
      
      settingsRepository.settings = null;
      mockFileUtils.readJsonFile.mockResolvedValueOnce(mockSettings);
      
      const settings = await settingsRepository.getAllSettings();
      
      expect(mockFileUtils.readJsonFile).toHaveBeenCalledWith(
        path.join(testStoragePath, 'settings.json')
      );
      
      expect(settings).toEqual({
        theme: 'dark',
        showTips: true
      });
    });
  });
  
  describe('error handling', () => {
    it('should emit error events when operations fail', async () => {
      const errorSpy = jest.fn();
      settingsRepository.on('error', errorSpy);
      
      const testError = new Error('Test error');
      mockFileUtils.writeJsonFile.mockRejectedValueOnce(testError);
      
      await expect(
        settingsRepository.setSetting('theme', 'light')
      ).rejects.toThrow('Test error');
      
      expect(errorSpy).toHaveBeenCalledWith({
        operation: 'setSetting',
        key: 'theme',
        error: 'Test error'
      });
    });
  });
});