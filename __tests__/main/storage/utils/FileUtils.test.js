const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const FileUtils = require('../../../../src/main/storage/utils/FileUtils');

describe('FileUtils', () => {
  let fileUtils;
  let testDir;
  let testFile;
  let tempFile;
  let backupFile;
  
  // Mock logger
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  
  beforeEach(async () => {
    fileUtils = new FileUtils(mockLogger);
    
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `fileutils-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Setup test file paths
    testFile = path.join(testDir, 'test.json');
    tempFile = `${testFile}.tmp`;
    backupFile = `${testFile}.bak`;
  });
  
  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore errors during cleanup
    }
  });
  
  test('should create a directory if it does not exist', async () => {
    const newDir = path.join(testDir, 'new-dir');
    await fileUtils.ensureDir(newDir);
    
    const stats = await fs.stat(newDir);
    expect(stats.isDirectory()).toBe(true);
  });
  
  test('should not throw when creating a directory that already exists', async () => {
    await fileUtils.ensureDir(testDir);
    await expect(fileUtils.ensureDir(testDir)).resolves.not.toThrow();
  });
  
  test('should write and read JSON data', async () => {
    const testData = { test: 'data', number: 42 };
    
    await fileUtils.writeJsonFile(testFile, testData);
    const readData = await fileUtils.readJsonFile(testFile);
    
    expect(readData).toEqual(testData);
  });
  
  test('should create a backup when writing a file', async () => {
    // Write initial data
    const initialData = { initial: 'data' };
    await fileUtils.writeJsonFile(testFile, initialData);
    
    // Write new data with backup
    const newData = { new: 'data' };
    await fileUtils.writeJsonFile(testFile, newData, { createBackup: true });
    
    // Check backup contains initial data
    const backupExists = await fileUtils.fileExists(backupFile);
    expect(backupExists).toBe(true);
    
    const backupData = await fileUtils.readJsonFile(backupFile);
    expect(backupData).toEqual(initialData);
  });
  
  test('should write files atomically using temp files', async () => {
    const testData = { test: 'atomic write' };
    const writePromise = fileUtils.writeJsonFile(testFile, testData);
    
    // The temp file should exist during the write operation
    // then be renamed to the final filename
    const tempExists = await fileUtils.fileExists(tempFile);
    
    // Complete the write operation
    await writePromise;
    
    // Temp file should no longer exist
    const tempExistsAfter = await fileUtils.fileExists(tempFile);
    expect(tempExistsAfter).toBe(false);
    
    // Final file should exist
    const fileExists = await fileUtils.fileExists(testFile);
    expect(fileExists).toBe(true);
  });
  
  test('should recover from backup when reading corrupted JSON', async () => {
    // Write valid data with backup enabled
    const validData = { valid: 'data' };
    await fileUtils.writeJsonFile(testFile, validData, { createBackup: true });
    
    // Corrupt the file with invalid JSON
    await fs.writeFile(testFile, '{invalid: json", missing quotes}', 'utf8');
    
    // Read should recover from backup
    const recoveredData = await fileUtils.readJsonFile(testFile);
    expect(recoveredData).toEqual(validData);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('recovered'));
  });
  
  test('should calculate and verify file checksums', async () => {
    const testData = { checksumTest: 'data' };
    
    // Write with checksum
    await fileUtils.writeJsonFile(testFile, testData, { storeChecksum: true });
    
    // Verify integrity
    const isValid = await fileUtils.verifyFileIntegrity(testFile);
    expect(isValid).toBe(true);
    
    // Corrupt the file
    await fs.writeFile(testFile, JSON.stringify({ modified: 'data' }), 'utf8');
    
    // Integrity check should fail
    const isStillValid = await fileUtils.verifyFileIntegrity(testFile);
    expect(isStillValid).toBe(false);
  });
  
  test('should log transactions', async () => {
    const testData = { transaction: 'test' };
    const operation = 'write';
    
    await fileUtils.logTransaction(operation, testFile, testData);
    
    const logs = await fileUtils.getTransactionLogs(testDir);
    expect(logs.length).toBe(1);
    expect(logs[0].operation).toBe(operation);
    expect(logs[0].filePath).toBe(testFile);
  });
  
  test('should perform operations with transaction logging', async () => {
    const testData = { withTransaction: 'test' };
    const actionFn = jest.fn().mockResolvedValue(testData);
    
    const result = await fileUtils.withTransaction('test_operation', testFile, actionFn, testData);
    
    expect(result).toEqual(testData);
    expect(actionFn).toHaveBeenCalled();
    
    const logs = await fileUtils.getTransactionLogs(testDir);
    expect(logs.length).toBe(2); // start and complete logs
    expect(logs[0].operation).toBe('test_operation_start');
    expect(logs[1].operation).toBe('test_operation_complete');
  });
  
  test('should handle failed transactions', async () => {
    const error = new Error('Test error');
    const actionFn = jest.fn().mockRejectedValue(error);
    
    await expect(fileUtils.withTransaction('failed_operation', testFile, actionFn)).rejects.toThrow(error);
    
    const logs = await fileUtils.getTransactionLogs(testDir);
    expect(logs.length).toBe(2); // start and failed logs
    expect(logs[0].operation).toBe('failed_operation_start');
    expect(logs[1].operation).toBe('failed_operation_failed');
  });
  
  test('should return default value when file does not exist', async () => {
    const defaultValue = { default: 'value' };
    const result = await fileUtils.readJsonFile('nonexistent.json', defaultValue);
    expect(result).toEqual(defaultValue);
  });
});