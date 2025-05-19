// Simple preload test script
const { contextBridge } = require('electron');

console.log('Test preload script loaded!');

contextBridge.exposeInMainWorld('testAPI', {
  message: 'Hello from preload!',
  test: () => 'Test function works!'
});