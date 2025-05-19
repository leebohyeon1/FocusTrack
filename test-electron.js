const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
    const preloadPath = path.join(__dirname, 'src/preload/preload.js');
    console.log('Test app - Preload path:', preloadPath);
    console.log('Test app - Preload exists:', require('fs').existsSync(preloadPath));
    
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            devTools: true
        }
    });
    
    // Add debugging
    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
        console.error('Preload error:', error);
        console.error('Preload path:', preloadPath);
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window loaded');
        mainWindow.webContents.executeJavaScript('typeof window.electronAPI !== "undefined"')
            .then(hasAPI => {
                console.log('Has electronAPI:', hasAPI);
            })
            .catch(err => {
                console.error('Error checking electronAPI:', err);
            });
    });
    
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`Renderer [${level}]:`, message);
    });
    
    mainWindow.loadFile('test-renderer.html');
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});