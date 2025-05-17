/**
 * Main Process Entry Point
 * 
 * This is the entry point for the Electron main process.
 * It initializes the MainApplication, which orchestrates all
 * managers and core application functionality.
 */

const { app } = require('electron');
const MainApplication = require('./core/MainApplication');
const FileUtils = require('./storage/utils/FileUtils');

// Create logger (could be replaced with a more sophisticated logger)
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => {
    if (process.env.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }
};

// Initialize file utilities
const fileUtils = new FileUtils(logger);

// Create and initialize the application
const mainApp = new MainApplication({
  logger,
  fileUtils
});

// Initialize the application when Electron is ready
if (app.isReady()) {
  mainApp.initialize().catch(error => {
    logger.error('Failed to initialize application:', error);
    app.exit(1);
  });
} else {
  app.whenReady().then(() => {
    mainApp.initialize().catch(error => {
      logger.error('Failed to initialize application:', error);
      app.exit(1);
    });
  });
}

// Export the application instance for testing
module.exports = mainApp;