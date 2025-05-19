const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'test-preload.js'),
            contextIsolation: true
        }
    });
    
    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript('JSON.stringify({testAPI: window.testAPI, keys: Object.keys(window)})')
            .then(result => {
                console.log('Window check:', result);
            });
    });
    
    win.loadFile('test-renderer.html');
});