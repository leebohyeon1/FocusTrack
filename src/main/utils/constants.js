// Application constants
module.exports = {
  APP_NAME: 'FocusTrack',
  APP_VERSION: '0.3.0',
  
  // Window states
  WINDOW_STATES: {
    NORMAL: 'normal',
    MINIMIZED: 'minimized',
    MAXIMIZED: 'maximized',
    HIDDEN: 'hidden'
  },
  
  // IPC channels
  IPC_CHANNELS: {
    APP_READY: 'app:ready',
    APP_QUIT: 'app:quit',
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE: 'window:maximize',
    WINDOW_CLOSE: 'window:close'
  }
};