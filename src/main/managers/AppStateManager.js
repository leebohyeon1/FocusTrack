const { EventEmitter } = require('events');

class AppStateManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.settings = new Map();
    this.state = new Map();
  }

  async initialize() {
    this.logger.info('AppStateManager initialized');
    
    // Initialize default settings
    this.settings.set('encryption.enabled', false);
    this.settings.set('storage.path', null);
    
    return true;
  }

  /**
   * Get a setting value
   * @param {string} key - Setting key
   * @param {any} defaultValue - Default value if setting doesn't exist
   * @returns {any} Setting value
   */
  getSetting(key, defaultValue = null) {
    return this.settings.has(key) ? this.settings.get(key) : defaultValue;
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   */
  setSetting(key, value) {
    const oldValue = this.settings.get(key);
    this.settings.set(key, value);
    this.emit('settingChanged', { key, value, oldValue });
  }

  /**
   * Get a state value
   * @param {string} key - State key
   * @param {any} defaultValue - Default value if state doesn't exist
   * @returns {any} State value
   */
  getState(key, defaultValue = null) {
    return this.state.has(key) ? this.state.get(key) : defaultValue;
  }

  /**
   * Set a state value
   * @param {string} key - State key
   * @param {any} value - State value
   */
  setState(key, value) {
    const oldValue = this.state.get(key);
    this.state.set(key, value);
    this.emit('stateChanged', { key, value, oldValue });
  }

  /**
   * Get all settings
   * @returns {Object} All settings as an object
   */
  getAllSettings() {
    const settings = {};
    for (const [key, value] of this.settings) {
      settings[key] = value;
    }
    return settings;
  }

  /**
   * Get all state
   * @returns {Object} All state as an object
   */
  getAllState() {
    const state = {};
    for (const [key, value] of this.state) {
      state[key] = value;
    }
    return state;
  }

  destroy() {
    // Cleanup
    this.settings.clear();
    this.state.clear();
  }
}

module.exports = AppStateManager;