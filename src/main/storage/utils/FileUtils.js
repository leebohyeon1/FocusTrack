/**
 * FileUtils - Utility for safe and atomic file operations
 * 
 * This module provides safe file operations to ensure data integrity, including:
 * - Atomic write operations using temporary files and rename
 * - Automatic backup creation
 * - Error handling and recovery mechanisms
 * - Checksum calculation for file integrity verification
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileUtils {
  /**
   * Creates a new FileUtils instance
   * @param {Object} logger - Logger instance
   */
  constructor(logger) {
    this.logger = logger || console;
  }

  /**
   * Calculates the SHA-256 checksum of a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - The checksum as a hex string
   */
  async calculateChecksum(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      this.logger.error(`Failed to calculate checksum for ${filePath}`, error);
      throw new Error(`Failed to calculate checksum: ${error.message}`);
    }
  }

  /**
   * Checks if a file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - True if file exists, false otherwise
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensures a directory exists, creating it if necessary
   * @param {string} dirPath - Path to ensure
   * @returns {Promise<void>}
   */
  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
      if (error.code !== 'EEXIST') {
        this.logger.error(`Failed to create directory ${dirPath}`, error);
        throw error;
      }
    }
  }

  /**
   * Reads JSON data from a file
   * @param {string} filePath - Path to the JSON file
   * @param {any} defaultValue - Default value if file doesn't exist
   * @returns {Promise<any>} - Parsed JSON data
   */
  async readJsonFile(filePath, defaultValue = null) {
    try {
      if (!await this.fileExists(filePath)) {
        return defaultValue;
      }
      
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.error(`Invalid JSON in ${filePath}`, error);
        // Try to recover from backup if JSON is invalid
        return this.recoverFromBackup(filePath, defaultValue);
      }
      
      this.logger.error(`Failed to read file ${filePath}`, error);
      return defaultValue;
    }
  }

  /**
   * Writes data to a file atomically using a temporary file
   * @param {string} filePath - Destination file path
   * @param {any} data - Data to write (will be JSON.stringified)
   * @param {Object} options - Write options
   * @returns {Promise<void>}
   */
  async writeJsonFile(filePath, data, options = {}) {
    const { createBackup = true, prettyPrint = true } = options;
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.bak`;
    const dirPath = path.dirname(filePath);
    
    try {
      // Ensure directory exists
      await this.ensureDir(dirPath);
      
      // Create backup if file exists and backup is requested
      if (createBackup && await this.fileExists(filePath)) {
        await fs.copyFile(filePath, backupPath);
      }

      // Prepare the data
      const jsonData = prettyPrint 
        ? JSON.stringify(data, null, 2) 
        : JSON.stringify(data);
      
      // Write to temporary file first
      await fs.writeFile(tempPath, jsonData, 'utf8');
      
      // Rename temp file to actual file (atomic operation)
      await fs.rename(tempPath, filePath);
      
      // Calculate and store checksum if needed
      if (options.storeChecksum) {
        const checksum = await this.calculateChecksum(filePath);
        await this.storeChecksum(filePath, checksum);
      }
    } catch (error) {
      this.logger.error(`Failed to write file ${filePath}`, error);
      
      // Clean up temporary file if it exists
      try {
        if (await this.fileExists(tempPath)) {
          await fs.unlink(tempPath);
        }
      } catch (cleanupError) {
        this.logger.error(`Failed to clean up temporary file ${tempPath}`, cleanupError);
      }
      
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Stores a checksum for a file
   * @param {string} filePath - Path to the file
   * @param {string} checksum - Checksum to store
   * @returns {Promise<void>}
   */
  async storeChecksum(filePath, checksum) {
    const checksumDir = path.join(path.dirname(filePath), '.checksums');
    const checksumFile = path.join(checksumDir, `${path.basename(filePath)}.checksum`);
    
    await this.ensureDir(checksumDir);
    await fs.writeFile(checksumFile, checksum, 'utf8');
  }

  /**
   * Verifies a file's integrity using its stored checksum
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} - True if file matches checksum
   */
  async verifyFileIntegrity(filePath) {
    try {
      const checksumFile = path.join(
        path.dirname(filePath), 
        '.checksums', 
        `${path.basename(filePath)}.checksum`
      );
      
      if (!await this.fileExists(checksumFile)) {
        this.logger.warn(`No checksum found for ${filePath}`);
        return true; // No checksum to verify against
      }
      
      const storedChecksum = await fs.readFile(checksumFile, 'utf8');
      const currentChecksum = await this.calculateChecksum(filePath);
      
      return storedChecksum.trim() === currentChecksum;
    } catch (error) {
      this.logger.error(`Failed to verify file integrity for ${filePath}`, error);
      return false;
    }
  }

  /**
   * Attempts to recover a file from its backup
   * @param {string} filePath - Path to the corrupted file
   * @param {any} defaultValue - Default value if recovery fails
   * @returns {Promise<any>} - Recovered data or default value
   */
  async recoverFromBackup(filePath, defaultValue = null) {
    const backupPath = `${filePath}.bak`;
    
    try {
      if (!await this.fileExists(backupPath)) {
        this.logger.warn(`No backup file found for ${filePath}`);
        return defaultValue;
      }
      
      // Read from backup
      const data = await fs.readFile(backupPath, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Restore the backup to the original file
      await fs.copyFile(backupPath, filePath);
      
      this.logger.info(`Successfully recovered ${filePath} from backup`);
      return parsedData;
    } catch (error) {
      this.logger.error(`Failed to recover from backup for ${filePath}`, error);
      return defaultValue;
    }
  }

  /**
   * Deletes a file with error handling
   * @param {string} filePath - Path to delete
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteFile(filePath) {
    try {
      if (await this.fileExists(filePath)) {
        await fs.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath}`, error);
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Creates a transaction log entry
   * @param {string} operation - Operation being performed
   * @param {string} filePath - File being operated on
   * @param {any} data - Data being written (optional)
   * @returns {Promise<void>}
   */
  async logTransaction(operation, filePath, data = null) {
    const logDir = path.join(path.dirname(filePath), '.transactions');
    const timestamp = new Date().toISOString();
    const logFileName = `${timestamp}-${operation}-${path.basename(filePath)}.log`;
    const logPath = path.join(logDir, logFileName);
    
    try {
      await this.ensureDir(logDir);
      
      const logEntry = {
        operation,
        filePath,
        timestamp,
        data: data ? JSON.stringify(data) : null
      };
      
      await fs.writeFile(logPath, JSON.stringify(logEntry, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(`Failed to log transaction for ${filePath}`, error);
      // Don't throw - transaction logging should not break the main operation
    }
  }

  /**
   * Lists all transaction logs for a directory
   * @param {string} dirPath - Directory to get logs for
   * @returns {Promise<Array>} - Array of transaction log entries
   */
  async getTransactionLogs(dirPath) {
    const logDir = path.join(dirPath, '.transactions');
    
    try {
      if (!await this.fileExists(logDir)) {
        return [];
      }
      
      const files = await fs.readdir(logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      const logs = await Promise.all(
        logFiles.map(async (file) => {
          const logPath = path.join(logDir, file);
          const content = await fs.readFile(logPath, 'utf8');
          return JSON.parse(content);
        })
      );
      
      return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      this.logger.error(`Failed to get transaction logs for ${dirPath}`, error);
      return [];
    }
  }

  /**
   * Performs a file system operation with transaction logging
   * @param {string} operation - Operation name
   * @param {string} filePath - File to operate on
   * @param {Function} action - Async function to perform
   * @param {any} data - Data for the operation (optional)
   * @returns {Promise<any>} - Result of the action
   */
  async withTransaction(operation, filePath, action, data = null) {
    await this.logTransaction(`${operation}_start`, filePath, data);
    
    try {
      const result = await action();
      await this.logTransaction(`${operation}_complete`, filePath);
      return result;
    } catch (error) {
      await this.logTransaction(`${operation}_failed`, filePath, { error: error.message });
      throw error;
    }
  }
}

module.exports = FileUtils;