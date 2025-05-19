const { EventEmitter } = require('events');
const { ipcMain } = require('electron');

class IpcManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
  }

  async initialize() {
    this.logger.info('IpcManager initialized');
    return true;
  }

  registerHandler(channel, handler) {
    ipcMain.handle(channel, handler);
  }

  destroy() {
    // Cleanup IPC handlers
  }
}

module.exports = IpcManager;