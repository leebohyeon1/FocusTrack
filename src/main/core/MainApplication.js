/**
 * MainApplication
 * 
 * Main application class that orchestrates all managers and acts as the central
 * coordinator for the application's main process functionality.
 * 
 * - Initializes and coordinates all managers
 * - Handles application lifecycle events
 * - Sets up core functionality
 * - Manages integration between different components
 */

const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const EventEmitter = require('events');

// Import managers
const {
  WindowManager,
  TrayManager,
  AppStateManager,
  UpdateManager,
  IpcManager,
  BackupManager,
  StorageManager,
  PermissionManager
} = require('../managers');

const PlatformManager = require('../platform');

class MainApplication extends EventEmitter {
  /**
   * Creates a new MainApplication instance
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   */
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.isInitialized = false;
    this.isQuitting = false;
    
    // Determine environment
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Create managers with dependency injection
    this.createManagers(options);
    
    // Bind application event handlers
    this.bindApplicationEvents();
  }

  /**
   * Create manager instances
   * @param {Object} options - Configuration options
   * @private
   */
  createManagers(options) {
    // File utilities for storage operations
    this.fileUtils = options.fileUtils;
    
    // Create the error service
    const { ErrorService } = require('../../shared/services/ErrorService');
    this.errorService = new ErrorService({
      logger: this.logger,
      isDevelopment: this.isDevelopment,
      telemetryEnabled: options.telemetryEnabled || false
    });
    
    // Create the window manager
    this.windowManager = new WindowManager({
      logger: this.logger,
      isDevelopment: this.isDevelopment
    });
    
    // Create the state manager
    this.stateManager = new AppStateManager({
      logger: this.logger,
      fileUtils: this.fileUtils,
      autosave: true
    });
    
    // Create the permission manager
    this.permissionManager = new PermissionManager({
      logger: this.logger,
      stateManager: this.stateManager,
      isDevelopment: this.isDevelopment
    });
    
    // Create the storage manager
    this.storageManager = new StorageManager({
      logger: this.logger,
      fileUtils: this.fileUtils,
      stateManager: this.stateManager,
      permissionManager: this.permissionManager,
      appDataPath: app.getPath('userData')
    });
    
    // Create the tray manager
    this.trayManager = new TrayManager({
      logger: this.logger,
      windowManager: this.windowManager
    });
    
    // Create the update manager
    this.updateManager = new UpdateManager({
      logger: this.logger,
      stateManager: this.stateManager,
      windowManager: this.windowManager,
      permissionManager: this.permissionManager,
      allowPrerelease: this.isDevelopment
    });
    
    // Create the backup manager
    this.backupManager = new BackupManager({
      logger: this.logger,
      stateManager: this.stateManager,
      fileUtils: this.fileUtils,
      storageManager: this.storageManager,
      permissionManager: this.permissionManager,
      encryptionService: this.storageManager.getEncryptionService()
    });
    
    // Create the platform manager
    this.platformManager = new PlatformManager({
      logger: this.logger
    });
    
    // Create the IPC manager
    this.ipcManager = new IpcManager({
      logger: this.logger
    });
  }

  /**
   * Bind application event handlers
   * @private
   */
  bindApplicationEvents() {
    // Quit when all windows are closed (except on macOS)
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });
    
    // On macOS, recreate the window when the dock icon is clicked
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
    
    // Handle app before-quit event
    app.on('before-quit', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.performCleanShutdown();
      }
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      
      // Capture in error service if available
      if (this.errorService) {
        this.errorService.captureError(error, {
          category: 'critical',
          severity: 'fatal',
          source: 'process.uncaughtException'
        });
      }
      
      dialog.showErrorBox(
        'Application Error',
        `An unexpected error occurred: ${error.message}\n\nThe application may not function correctly. You may want to restart the application.`
      );
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled promise rejection:', reason);
      
      // Capture in error service if available
      if (this.errorService) {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.errorService.captureError(error, {
          category: 'runtime',
          severity: 'error',
          source: 'process.unhandledRejection',
          metadata: { promise }
        });
      }
    });
  }

  /**
   * Initialize the application
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      this.logger.warn('Application already initialized');
      return;
    }
    
    try {
      this.logger.info('Initializing application...');
      
      // Ensure single instance
      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        this.logger.info('Another instance is already running, exiting');
        app.quit();
        return;
      }
      
      // Handle second instance
      app.on('second-instance', () => {
        this.handleSecondInstance();
      });
      
      // Wait for app ready
      if (!app.isReady()) {
        await new Promise(resolve => app.once('ready', resolve));
      }
      
      // Initialize state manager first to load settings
      await this.stateManager.initialize();
      
      // Initialize permission manager
      await this.permissionManager.initialize();
      
      // Initialize storage manager (encryption)
      await this.storageManager.initialize();
      
      // Initialize other managers
      this.windowManager.on('window-created', ({ name, window }) => {
        this.logger.info(`Window created: ${name}`);
      });
      
      this.trayManager.on('tray-click', () => {
        this.logger.info('Tray clicked');
      });
      
      // Initialize window manager (no async operations)
      // No specific initialization needed
      
      // Initialize tray manager
      this.trayManager.initialize();
      
      // Initialize update manager
      await this.updateManager.initialize();
      
      // Initialize backup manager
      await this.backupManager.initialize();
      
      // No async operation needed for platform manager
      
      // Initialize IPC manager with application context
      this.ipcManager.initialize({
        mainApp: this,
        windowManager: this.windowManager,
        stateManager: this.stateManager,
        trayManager: this.trayManager,
        updateManager: this.updateManager,
        backupManager: this.backupManager,
        storageManager: this.storageManager,
        permissionManager: this.permissionManager,
        platformManager: this.platformManager,
        fileUtils: this.fileUtils,
        errorService: this.errorService,
        isDevelopment: this.isDevelopment
        // Additional managers would be added here when implemented
        // trackingManager: this.trackingManager,
        // focusManager: this.focusManager,
      });
      
      // Legacy handler registration is now handled by the IpcManager
      // this.registerIpcHandlers();
      
      // Create the main window
      this.createMainWindow();
      
      this.isInitialized = true;
      this.logger.info('Application initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      throw error;
    }
  }


  /**
   * Create the main application window
   * @private
   */
  createMainWindow() {
    // Get saved window state
    const windowState = this.stateManager.getWindowState('main');
    
    // Add debug logging
    this.logger.info('Creating main window with state:', windowState);
    
    // Make sure webPreferences are properly passed
    const path = require('path');
    const preloadPath = path.join(__dirname, '../../preload/preload.js');
    this.logger.info('Preload script path from MainApplication:', preloadPath);
    
    // Create the window
    const mainWindow = this.windowManager.createWindow('main', {
      width: windowState.width || 1200,
      height: windowState.height || 800,
      x: windowState.x,
      y: windowState.y,
      minWidth: 800,
      minHeight: 600,
      show: !this.stateManager.getSetting('startMinimized', false),
      backgroundColor: '#FFFFFF',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: this.isDevelopment
      }
    });
    
    // Apply saved state
    if (windowState.isMaximized) {
      mainWindow.maximize();
    }
    
    // Load content
    this.windowManager.loadWindowContent('main');
    
    // Set up main window event handlers
    mainWindow.on('close', (event) => {
      if (!this.isQuitting && this.stateManager.getSetting('minimizeToTray', true)) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
      
      // Save window state
      const win = mainWindow;
      const isMaximized = win.isMaximized();
      const bounds = win.getBounds();
      
      this.stateManager.setWindowState('main', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized
      });
    });
    
    return mainWindow;
  }

  /**
   * Handle second instance of the application
   * @private
   */
  handleSecondInstance() {
    // Focus the main window if it exists
    const mainWindow = this.windowManager.getWindow('main');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      // Create main window if it doesn't exist
      this.createMainWindow();
    }
  }

  /**
   * Perform clean shutdown
   * @private
   */
  async performCleanShutdown() {
    this.isQuitting = true;
    
    // Save state
    if (this.stateManager) {
      await this.stateManager.saveState().catch(error => {
        this.logger.error('Failed to save state during shutdown:', error);
      });
    }
    
    // Clean up tray
    if (this.trayManager) {
      this.trayManager.destroy();
    }
    
    // Clean up backup manager
    if (this.backupManager) {
      this.backupManager.dispose();
    }
    
    // Unregister all IPC handlers
    if (this.ipcManager) {
      this.ipcManager.unregisterAll();
    }
    
    // Finally quit
    this.logger.info('Application shutdown complete');
    app.exit(0);
  }

  /**
   * Quit the application
   */
  quit() {
    if (!this.isQuitting) {
      this.isQuitting = true;
      app.quit();
    }
  }
}

module.exports = MainApplication;