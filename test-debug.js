const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('=== Test Debug Script ===');
console.log('Current directory:', __dirname);
console.log('Node version:', process.version);
console.log('Electron version:', process.versions.electron);

// Check preload script
const preloadPath = path.join(__dirname, 'src/preload/preload.js');
console.log('Preload path:', preloadPath);
console.log('Preload exists:', fs.existsSync(preloadPath));

if (fs.existsSync(preloadPath)) {
    const preloadContent = fs.readFileSync(preloadPath, 'utf8');
    console.log('Preload content preview:', preloadContent.substring(0, 200) + '...');
}

let mainWindow = null;

function createWindow() {
    console.log('\n=== Creating Window ===');
    console.log('Preload path being used:', preloadPath);
    
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
    
    // Set up all event handlers before loading content
    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
        console.error('❌ Preload script error!');
        console.error('Path:', preloadPath);
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    });
    
    mainWindow.webContents.on('did-start-loading', () => {
        console.log('⏳ Started loading...');
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('✅ Finished loading!');
        
        // Check if electronAPI is available
        mainWindow.webContents.executeJavaScript(`
            JSON.stringify({
                hasElectronAPI: typeof window.electronAPI !== 'undefined',
                electronAPIKeys: typeof window.electronAPI === 'object' ? Object.keys(window.electronAPI) : [],
                windowKeys: Object.keys(window).filter(key => key.includes('electron') || key.includes('API'))
            })
        `)
        .then(result => {
            const data = JSON.parse(result);
            console.log('🔍 Check result:');
            console.log('  Has electronAPI:', data.hasElectronAPI);
            console.log('  electronAPI keys:', data.electronAPIKeys);
            console.log('  Window keys with electron/API:', data.windowKeys);
        })
        .catch(err => {
            console.error('Error checking electronAPI:', err);
        });
    });
    
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const prefix = ['LOG', 'WARN', 'ERROR'][level] || 'INFO';
        console.log(`[Renderer ${prefix}] ${message}`);
        if (sourceId) console.log(`  Source: ${sourceId}:${line}`);
    });
    
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('❌ Failed to load!');
        console.error('  Error code:', errorCode);
        console.error('  Description:', errorDescription);
    });
    
    // Register IPC handlers
    ipcMain.handle('focusSession:create', async (event, sessionData) => {
        console.log('IPC: focusSession:create called with:', sessionData);
        return { success: true, data: { id: 'test-id', ...sessionData } };
    });
    
    ipcMain.handle('focusSession:getAll', async (event) => {
        console.log('IPC: focusSession:getAll called');
        return { success: true, data: [] };
    });
    
    // Load the test page
    const testHtmlPath = path.join(__dirname, 'test-renderer.html');
    console.log('Loading test page:', testHtmlPath);
    mainWindow.loadFile(testHtmlPath);
    
    mainWindow.webContents.openDevTools();
}

app.on('ready', () => {
    console.log('\n=== App Ready ===');
    createWindow();
});

app.on('window-all-closed', () => {
    console.log('\n=== All Windows Closed ===');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
});