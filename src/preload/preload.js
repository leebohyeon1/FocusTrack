const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script starting...');

try {
  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld('electronAPI', {
    focusSession: {
      create: (sessionData) => ipcRenderer.invoke('focusSession:create', sessionData),
      getAll: () => ipcRenderer.invoke('focusSession:getAll'),
      update: (sessionId, updates) => ipcRenderer.invoke('focusSession:update', sessionId, updates),
      delete: (sessionId) => ipcRenderer.invoke('focusSession:delete', sessionId)
    },
    settings: {
      get: (key) => ipcRenderer.invoke('settings:get', key),
      set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
    }
  });
  
  console.log('electronAPI exposed successfully');
} catch (error) {
  console.error('Error in preload script:', error);
  console.error('Stack:', error.stack);
}