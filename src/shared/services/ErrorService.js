/**
 * Error Service
 * 
 * A centralized service for handling, logging, and reporting errors throughout the application.
 * Provides consistent error handling patterns for both main and renderer processes.
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Error categories
const ErrorCategory = {
  RUNTIME: 'runtime',
  NETWORK: 'network',
  STORAGE: 'storage',
  UI: 'ui',
  UNKNOWN: 'unknown',
  CRITICAL: 'critical',
  AUTH: 'auth',
  INPUT: 'input',
  RESOURCE: 'resource'
};

// Error severity levels
const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
  FATAL: 'fatal'
};

class ErrorService extends EventEmitter {
  /**
   * Creates a new ErrorService instance
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   * @param {boolean} options.isDevelopment - Whether the app is in development mode
   * @param {string} options.logPath - Path to store error logs (default: app data directory)
   * @param {boolean} options.telemetryEnabled - Whether to send anonymous error telemetry
   */
  constructor(options = {}) {
    super();
    
    this.logger = options.logger || console;
    this.isDevelopment = options.isDevelopment || process.env.NODE_ENV === 'development';
    this.telemetryEnabled = options.telemetryEnabled || false;
    
    // Set log directory
    this.logPath = options.logPath || this.getDefaultLogPath();
    this.ensureLogDirectory();
    
    // Error history (recent errors for context)
    this.errorHistory = [];
    this.maxErrorHistory = 100;

    // Truncation limits for error information
    this.maxErrorMessageLength = 10000;
    this.maxStackTraceLength = 50000;
    
    this.logger.info(`ErrorService initialized (development: ${this.isDevelopment}, telemetry: ${this.telemetryEnabled})`);
  }

  /**
   * Get default log path in user's app data directory
   * @returns {string} Path to log directory
   * @private
   */
  getDefaultLogPath() {
    const appDataPath = process.env.APPDATA || 
      (process.platform === 'darwin' 
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));
        
    return path.join(appDataPath, 'FocusTrack', 'logs');
  }
  
  /**
   * Ensure log directory exists
   * @private
   */
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logPath)) {
        fs.mkdirSync(this.logPath, { recursive: true });
      }
    } catch (error) {
      this.logger.error('Failed to create log directory:', error);
    }
  }

  /**
   * Capture and process an error
   * @param {Error} error - The error object
   * @param {Object} context - Additional context information
   * @param {string} context.category - Error category
   * @param {string} context.severity - Error severity
   * @param {string} context.source - Source of the error (component, function, etc.)
   * @param {Object} context.metadata - Additional metadata about the error
   * @returns {string} Error ID for reference
   */
  captureError(error, context = {}) {
    if (!error) {
      return null;
    }
    
    // Generate error ID for tracking and reference
    const errorId = this.generateErrorId();
    
    // Determine error category
    const category = context.category || this.categorizeError(error);
    
    // Determine error severity
    const severity = context.severity || ErrorSeverity.ERROR;
    
    // Process error and context
    const processedError = this.processError(error, {
      ...context,
      errorId,
      category,
      severity,
      timestamp: new Date().toISOString()
    });
    
    // Log the error
    this.logError(processedError);
    
    // Add to error history
    this.addToErrorHistory(processedError);
    
    // Emit error event for subscribers
    this.emit('error', processedError);
    
    // Send telemetry if enabled and appropriate
    if (this.telemetryEnabled && this.shouldSendTelemetry(processedError)) {
      this.sendErrorTelemetry(processedError);
    }
    
    return errorId;
  }

  /**
   * Process an error and prepare it for logging and reporting
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   * @returns {Object} Processed error
   * @private
   */
  processError(error, context) {
    // Extract basic error information with safe fallbacks
    const message = error.message || 'Unknown error';
    
    // Ensure stack trace is present and not too large
    const stack = error.stack 
      ? error.stack.substring(0, this.maxStackTraceLength) 
      : 'No stack trace available';
      
    // Get source information if available
    const source = context.source || 'unknown';
    
    // Basic system information
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    // Create processed error object
    return {
      id: context.errorId,
      message: message.substring(0, this.maxErrorMessageLength),
      stack,
      name: error.name || 'Error',
      code: error.code,
      category: context.category,
      severity: context.severity,
      timestamp: context.timestamp,
      source,
      metadata: context.metadata || {},
      systemInfo: this.isDevelopment ? systemInfo : null,
      handled: true
    };
  }

  /**
   * Log error to file and console
   * @param {Object} processedError - Processed error object
   * @private
   */
  logError(processedError) {
    // Determine log level based on severity
    const logLevel = this.mapSeverityToLogLevel(processedError.severity);
    
    // Create concise log message
    const logMessage = `[${processedError.severity.toUpperCase()}] [${processedError.category}] [${processedError.id}] ${processedError.message}`;
    
    // Log to console
    this.logger[logLevel](logMessage, { 
      error: processedError.name,
      source: processedError.source,
      stack: this.isDevelopment ? processedError.stack : undefined
    });
    
    // Log to file
    this.writeErrorLog(processedError);
  }

  /**
   * Write error to log file
   * @param {Object} processedError - Processed error object
   * @private
   */
  writeErrorLog(processedError) {
    try {
      // Create daily log file name
      const date = new Date();
      const filename = `error-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
      const logFilePath = path.join(this.logPath, filename);
      
      // Format error for file
      const logEntry = JSON.stringify({
        ...processedError,
        // Remove potentially large/sensitive info from file logs
        systemInfo: undefined
      }, null, this.isDevelopment ? 2 : 0);
      
      // Append to log file
      fs.appendFileSync(logFilePath, logEntry + '\n');
    } catch (error) {
      this.logger.error('Failed to write error log:', error);
    }
  }

  /**
   * Add error to history for context in future errors
   * @param {Object} processedError - Processed error object
   * @private
   */
  addToErrorHistory(processedError) {
    // Add error to history
    this.errorHistory.unshift({
      id: processedError.id,
      message: processedError.message,
      category: processedError.category,
      severity: processedError.severity,
      source: processedError.source,
      timestamp: processedError.timestamp
    });
    
    // Limit history size
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(0, this.maxErrorHistory);
    }
  }

  /**
   * Get recent error history
   * @param {number} limit - Maximum number of errors to return
   * @returns {Array<Object>} Recent errors
   */
  getErrorHistory(limit = 10) {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * Generate unique error ID
   * @returns {string} Unique error ID
   * @private
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Categorize error based on its properties
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   * @private
   */
  categorizeError(error) {
    if (!error) return ErrorCategory.UNKNOWN;
    
    // Network errors
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.name === 'FetchError' ||
      error.message.includes('network') ||
      error.message.includes('connect')
    ) {
      return ErrorCategory.NETWORK;
    }
    
    // Storage errors
    if (
      error.code === 'ENOENT' ||
      error.code === 'EPERM' ||
      error.code === 'EACCES' ||
      error.message.includes('storage') ||
      error.message.includes('file') ||
      error.message.includes('database') ||
      error.message.includes('write') ||
      error.message.includes('read')
    ) {
      return ErrorCategory.STORAGE;
    }
    
    // UI errors
    if (
      error.name === 'ReactError' ||
      error.message.includes('render') ||
      error.message.includes('component') ||
      error.message.includes('element')
    ) {
      return ErrorCategory.UI;
    }
    
    // Authentication errors
    if (
      error.message.includes('auth') ||
      error.message.includes('login') ||
      error.message.includes('permission') ||
      error.message.includes('access')
    ) {
      return ErrorCategory.AUTH;
    }
    
    // Input validation errors
    if (
      error.message.includes('validation') ||
      error.message.includes('invalid') ||
      error.message.includes('format')
    ) {
      return ErrorCategory.INPUT;
    }
    
    // Resource errors
    if (
      error.message.includes('memory') ||
      error.code === 'ENOMEM' ||
      error.code === 'EMFILE'
    ) {
      return ErrorCategory.RESOURCE;
    }
    
    // Default to runtime
    return ErrorCategory.RUNTIME;
  }

  /**
   * Map error severity to log level
   * @param {string} severity - Error severity
   * @returns {string} Log level
   * @private
   */
  mapSeverityToLogLevel(severity) {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'info';
      case ErrorSeverity.WARNING:
        return 'warn';
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.FATAL:
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * Determine if telemetry should be sent for this error
   * @param {Object} processedError - Processed error
   * @returns {boolean} Whether telemetry should be sent
   * @private
   */
  shouldSendTelemetry(processedError) {
    // Only send telemetry for certain severity levels
    if (
      processedError.severity === ErrorSeverity.INFO ||
      processedError.severity === ErrorSeverity.WARNING
    ) {
      return false;
    }
    
    // Don't send telemetry for auth errors (potentially sensitive)
    if (processedError.category === ErrorCategory.AUTH) {
      return false;
    }
    
    return true;
  }

  /**
   * Send anonymous error telemetry
   * @param {Object} processedError - Processed error
   * @private
   */
  sendErrorTelemetry(processedError) {
    // This would integrate with an error reporting service
    // For now, just log that telemetry would be sent
    
    if (this.isDevelopment) {
      this.logger.info('Would send error telemetry:', {
        errorId: processedError.id,
        category: processedError.category,
        severity: processedError.severity
      });
    }
    
    // In a real implementation, this would send data to a service:
    /*
    try {
      // Send to error reporting service
      reportingService.reportError({
        id: processedError.id,
        name: processedError.name,
        message: processedError.message,
        category: processedError.category,
        severity: processedError.severity,
        timestamp: processedError.timestamp,
        // Strip personally identifiable info
        stack: this.sanitizeStackTrace(processedError.stack)
      });
    } catch (error) {
      this.logger.error('Failed to send error telemetry:', error);
    }
    */
  }
  
  /**
   * Create a wrapped error handling function
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Error context
   * @returns {Function} Wrapped function
   */
  wrapFunction(fn, context = {}) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.captureError(error, context);
        throw error; // Re-throw to allow caller to handle
      }
    };
  }
  
  /**
   * Create an async wrapped error handling function
   * @param {Function} fn - Async function to wrap
   * @param {Object} context - Error context
   * @returns {Function} Wrapped async function
   */
  wrapAsyncFunction(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(error, context);
        throw error; // Re-throw to allow caller to handle
      }
    };
  }
  
  /**
   * Create a friendly error message from a technical error
   * @param {Error|string} error - Error object or message
   * @param {Object} options - Options for generating friendly message
   * @returns {string} User-friendly error message
   */
  createFriendlyMessage(error, options = {}) {
    if (!error) return 'An unknown error occurred.';
    
    const message = typeof error === 'string' ? error : error.message;
    const category = options.category || this.categorizeError(error);
    
    // Default fallback message
    let friendlyMessage = 'Something went wrong. Please try again.';
    
    // Create friendly messages by category
    switch (category) {
      case ErrorCategory.NETWORK:
        friendlyMessage = 'Unable to connect to the network. Please check your internet connection and try again.';
        break;
      case ErrorCategory.STORAGE:
        friendlyMessage = 'Unable to access your data. Please ensure you have enough disk space and try again.';
        break;
      case ErrorCategory.UI:
        friendlyMessage = 'The application encountered a display error. Please try refreshing the view.';
        break;
      case ErrorCategory.AUTH:
        friendlyMessage = 'Authentication failed. Please check your credentials and try again.';
        break;
      case ErrorCategory.INPUT:
        friendlyMessage = 'The information provided is not valid. Please check your input and try again.';
        break;
      case ErrorCategory.RESOURCE:
        friendlyMessage = 'The application is running low on resources. Try closing other applications and try again.';
        break;
      case ErrorCategory.CRITICAL:
        friendlyMessage = 'A critical error occurred. Please restart the application.';
        break;
      default:
        if (message && !this.isTechnicalError(message)) {
          // Use the original message if it seems user-friendly
          friendlyMessage = message;
        }
    }
    
    return friendlyMessage;
  }
  
  /**
   * Check if an error message is too technical for users
   * @param {string} message - Error message to check
   * @returns {boolean} Whether message is too technical
   * @private
   */
  isTechnicalError(message) {
    // Check for technical keywords that users wouldn't understand
    const technicalTerms = [
      'undefined', 'null', 'NaN', 'prototype', 
      'unexpected token', 'syntax error', 'reference',
      'uncaught exception', 'type error', 'cannot read property',
      'is not a function', 'stack', 'heap', 'memory'
    ];
    
    // If message is too short, it's probably a technical error
    if (message.length < 10) return true;
    
    // Check for technical terms
    return technicalTerms.some(term => 
      message.toLowerCase().includes(term.toLowerCase())
    );
  }
  
  /**
   * Filter error history by category
   * @param {string} category - Category to filter by
   * @returns {Array<Object>} Filtered error history
   */
  getErrorsByCategory(category) {
    return this.errorHistory.filter(error => error.category === category);
  }
  
  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    // Count errors by category
    const categoryCounts = {};
    
    for (const error of this.errorHistory) {
      categoryCounts[error.category] = (categoryCounts[error.category] || 0) + 1;
    }
    
    // Count errors by severity
    const severityCounts = {};
    
    for (const error of this.errorHistory) {
      severityCounts[error.severity] = (severityCounts[error.severity] || 0) + 1;
    }
    
    // Calculate time-based stats
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const errorsLastHour = this.errorHistory.filter(
      error => new Date(error.timestamp) > lastHour
    ).length;
    
    const errorsLastDay = this.errorHistory.filter(
      error => new Date(error.timestamp) > lastDay
    ).length;
    
    return {
      total: this.errorHistory.length,
      byCategory: categoryCounts,
      bySeverity: severityCounts,
      lastHour: errorsLastHour,
      lastDay: errorsLastDay
    };
  }
}

// Export the error service and constants
module.exports = {
  ErrorService,
  ErrorCategory,
  ErrorSeverity
};