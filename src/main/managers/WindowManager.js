const { EventEmitter } = require('events');

class WindowManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.mainWindow = null;
  }

  async initialize() {
    this.logger.info('WindowManager initialized');
    return true;
  }

  createMainWindow() {
    const { BrowserWindow } = require('electron');
    const path = require('path');
    const fs = require('fs');
    
    // Debug: Log preload script path
    const preloadPath = path.join(__dirname, '../../preload/preload.js');
    this.logger.info('Preload script path:', preloadPath);
    this.logger.info('Preload script exists:', fs.existsSync(preloadPath));
    
    // Read preload script content to ensure it's accessible
    try {
      const preloadContent = fs.readFileSync(preloadPath, 'utf8');
      this.logger.info('Preload script length:', preloadContent.length, 'bytes');
    } catch (err) {
      this.logger.error('Error reading preload script:', err);
    }
    
    const windowOptions = {
      width: 1200,
      height: 800,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      }
    };
    
    this.logger.info('Creating main window with options:', JSON.stringify(windowOptions, null, 2));
    
    this.mainWindow = new BrowserWindow(windowOptions);
    
    // Add debug listeners
    this.mainWindow.webContents.on('console-message', (event, level, message) => {
      this.logger.info(`Renderer console [${level}]:`, message);
    });
    
    this.mainWindow.webContents.on('did-finish-load', () => {
      this.logger.info('Window finished loading');
      // Debug: Check if electronAPI is available
      this.mainWindow.webContents.executeJavaScript('window.electronAPI')
        .then(result => {
          this.logger.info('electronAPI available:', !!result);
          if (result) {
            this.logger.info('electronAPI methods:', Object.keys(result));
          }
        })
        .catch(err => {
          this.logger.error('Error checking electronAPI:', err);
        });
    });
    
    this.mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
      this.logger.error('Preload script error:', { preloadPath, error });
    });
    
    // Load the app
    if (process.env.NODE_ENV === 'development') {
      this.logger.info('Loading development URL: http://localhost:3000');
      this.mainWindow.loadURL('http://localhost:3000');
      
      // Open DevTools in development
      this.mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '../../renderer/index.html');
      this.logger.info('Loading production file:', indexPath);
      this.logger.info('Production file exists:', fs.existsSync(indexPath));
      this.mainWindow.loadFile(indexPath);
    }
    
    return this.mainWindow;
  }

  createWindow(name, options = {}) {
    const { BrowserWindow } = require('electron');
    const path = require('path');
    const fs = require('fs');
    
    this.logger.info(`Creating window: ${name}`, options);
    
    // Always use our preload script unless explicitly overridden
    if (!options.webPreferences) {
      options.webPreferences = {};
    }
    
    // Use preload script from options or default to our path
    if (!options.webPreferences.preload) {
      const preloadPath = path.join(__dirname, '../../preload/preload.js');
      this.logger.info('Using default preload script:', preloadPath);
      options.webPreferences.preload = preloadPath;
    }
    
    // Ensure context isolation is enabled
    options.webPreferences.contextIsolation = true;
    options.webPreferences.nodeIntegration = false;
    
    this.logger.info(`Final webPreferences for ${name}:`, options.webPreferences);
    
    const window = new BrowserWindow(options);
    
    // Store and return the window
    this[name + 'Window'] = window;
    
    // Add debug listeners
    window.webContents.on('console-message', (event, level, message) => {
      this.logger.info(`Window ${name} console [${level}]:`, message);
    });
    
    window.webContents.on('did-finish-load', () => {
      this.logger.info(`Window ${name} finished loading`);
      // Debug: Check if electronAPI is available
      window.webContents.executeJavaScript('window.electronAPI')
        .then(result => {
          this.logger.info(`Window ${name} electronAPI available:`, !!result);
          if (result) {
            this.logger.info(`Window ${name} electronAPI methods:`, Object.keys(result));
          }
        })
        .catch(err => {
          this.logger.error(`Window ${name} error checking electronAPI:`, err);
        });
    });
    
    return window;
  }

  getWindow(name) {
    return this[name + 'Window'];
  }

  loadWindowContent(name) {
    const window = this.getWindow(name);
    if (!window) {
      this.logger.error(`Window ${name} not found`);
      return;
    }
    
    const path = require('path');
    const fs = require('fs');
    
    if (process.env.NODE_ENV === 'development') {
      this.logger.info(`Loading development URL for ${name}: http://localhost:3000`);
      window.loadURL('http://localhost:3000');
    } else {
      // Look for React build first
      const buildPath = path.join(__dirname, '../../../build/index.html');
      if (fs.existsSync(buildPath)) {
        this.logger.info(`Loading React build for ${name}:`, buildPath);
        window.loadFile(buildPath);
      } else {
        // Fall back to static HTML
        const indexPath = path.join(__dirname, '../../renderer/index.html');
        this.logger.info(`Loading static HTML for ${name}:`, indexPath);
        window.loadFile(indexPath);
      }
    }
  }

  destroy() {
    // Cleanup
    if (this.mainWindow) {
      this.mainWindow.destroy();
      this.mainWindow = null;
    }
  }
}

module.exports = WindowManager;