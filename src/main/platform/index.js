const os = require('os');

class PlatformManager {
  constructor() {
    this.platform = process.platform;
    this.arch = process.arch;
  }

  async getInfo() {
    return {
      platform: this.platform,
      arch: this.arch,
      version: os.release(),
      hostname: os.hostname()
    };
  }

  async initialize() {
    console.log('PlatformManager initialized');
    return true;
  }

  isWindows() {
    return this.platform === 'win32';
  }

  isMac() {
    return this.platform === 'darwin';
  }

  isLinux() {
    return this.platform === 'linux';
  }
}

module.exports = PlatformManager;