const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import our repository implementation
const { StorageManagerAdapter } = require('./storage/adapters/StorageManagerAdapter');
const { EntityRepository } = require('./storage/repositories/EntityRepository');
const { SettingsRepository } = require('./storage/repositories/SettingsRepository');

// Global references
let mainWindow;
let storageAdapter;
let entityRepository;
let settingsRepository;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  // Load the React app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Load the index.html from the renderer directory
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeStorage() {
  const userDataPath = app.getPath('userData');
  
  // Initialize storage adapter
  storageAdapter = new StorageManagerAdapter({
    userDataPath,
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-dev-key'
  });
  
  await storageAdapter.init();
  
  // Initialize repositories
  const entityStorage = storageAdapter.getEntityStorage();
  const settingsStorage = storageAdapter.getSettingsStorage();
  
  entityRepository = new EntityRepository(entityStorage);
  settingsRepository = new SettingsRepository(settingsStorage);
  
  await entityRepository.init();
  await settingsRepository.init();
  
  console.log('Storage initialized successfully');
}

// IPC handlers for focus sessions
ipcMain.handle('focusSession:create', async (event, sessionData) => {
  try {
    const session = await entityRepository.createEntity('focusSessions', sessionData);
    return { success: true, data: session };
  } catch (error) {
    console.error('Error creating focus session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('focusSession:getAll', async (event) => {
  try {
    const sessions = await entityRepository.findEntity('focusSessions', {});
    return { success: true, data: sessions };
  } catch (error) {
    console.error('Error getting focus sessions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('focusSession:update', async (event, sessionId, updates) => {
  try {
    const updated = await entityRepository.updateEntity('focusSessions', sessionId, updates);
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error updating focus session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('focusSession:delete', async (event, sessionId) => {
  try {
    await entityRepository.deleteEntity('focusSessions', sessionId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting focus session:', error);
    return { success: false, error: error.message };
  }
});

// IPC handlers for settings
ipcMain.handle('settings:get', async (event, key) => {
  try {
    const value = await settingsRepository.getSetting(key);
    return { success: true, data: value };
  } catch (error) {
    console.error('Error getting setting:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:set', async (event, key, value) => {
  try {
    await settingsRepository.setSetting(key, value);
    return { success: true };
  } catch (error) {
    console.error('Error setting setting:', error);
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(async () => {
  await initializeStorage();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});