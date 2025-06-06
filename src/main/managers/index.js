// Export all managers
const StorageManager = require('./storage/StorageManager.hybrid');
const WindowManager = require('./WindowManager');
const TrayManager = require('./TrayManager');
const AppStateManager = require('./AppStateManager');
const UpdateManager = require('./UpdateManager');
const IpcManager = require('./IpcManager');
const BackupManager = require('./BackupManager');
const { PermissionManager } = require('./permission');

module.exports = {
  StorageManager,
  WindowManager,
  TrayManager,
  AppStateManager,
  UpdateManager,
  IpcManager,
  BackupManager,
  PermissionManager,
  // TODO: Add other managers as they are implemented
  ScreenShotManager: null,
  DockManager: null,
  NotificationManager: null,
  ActivityManager: null,
  TaskManager: null
};