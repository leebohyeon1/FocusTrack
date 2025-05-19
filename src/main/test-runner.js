const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('=== Electron Test Runner ===');
console.log('Process versions:', process.versions);
console.log('App path:', app.getAppPath());
console.log('User data path:', app.getPath('userData'));

// Register IPC handlers
const { ipcMain } = require('electron');

ipcMain.handle('test:echo', async (event, message) => {
  console.log('IPC test:echo received:', message);
  return { echo: message, timestamp: Date.now() };
});

app.whenReady().then(() => {
  const preloadPath = path.join(__dirname, '../preload/preload.js');
  console.log('\nChecking preload script:');
  console.log('Path:', preloadPath);
  console.log('Exists:', fs.existsSync(preloadPath));
  console.log('Absolute path:', path.resolve(preloadPath));
  
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    }
  });
  
  // Set up comprehensive logging
  win.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('\n❌ PRELOAD ERROR:');
    console.error('Path:', preloadPath);
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  });
  
  win.webContents.on('did-start-loading', () => {
    console.log('\n⏳ Page started loading...');
  });
  
  win.webContents.on('dom-ready', () => {
    console.log('📄 DOM ready');
  });
  
  win.webContents.on('did-finish-load', () => {
    console.log('✅ Page finished loading');
    
    // Check window.electronAPI
    win.webContents.executeJavaScript(`
      (function() {
        const result = {
          hasElectronAPI: typeof window.electronAPI !== 'undefined',
          electronAPIType: typeof window.electronAPI,
          electronAPIKeys: window.electronAPI ? Object.keys(window.electronAPI) : [],
          windowKeys: Object.keys(window).filter(k => k.includes('electron') || k.includes('API')),
          testAPICall: null
        };
        
        // Try to call a test function
        if (window.electronAPI && window.electronAPI.focusSession) {
          try {
            window.electronAPI.focusSession.getAll().then(response => {
              console.log('Test API call response:', response);
            }).catch(err => {
              console.error('Test API call error:', err);
            });
            result.testAPICall = 'initiated';
          } catch (e) {
            result.testAPICall = 'error: ' + e.message;
          }
        }
        
        return JSON.stringify(result, null, 2);
      })();
    `)
    .then(result => {
      console.log('\n🔍 Window inspection result:');
      console.log(result);
    })
    .catch(err => {
      console.error('Error inspecting window:', err);
    });
  });
  
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const prefix = ['LOG', 'WARN', 'ERROR'][level] || 'INFO';
    console.log(`[Renderer ${prefix}] ${message}`);
    if (sourceId && line) {
      console.log(`  at ${sourceId}:${line}`);
    }
  });
  
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('\n❌ Page failed to load:');
    console.error('Code:', errorCode);
    console.error('Description:', errorDescription);
  });
  
  // Check for IPC modules
  const { IpcManager } = require('../managers');
  console.log('\nChecking IpcManager:', typeof IpcManager);
  
  const ipcManager = new IpcManager({ logger: console });
  ipcManager.initialize();
  
  // Create test HTML content
  const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Electron Test</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #4CAF50; color: white; }
        .error { background: #f44336; color: white; }
        .info { background: #2196F3; color: white; }
        pre { background: #f5f5f5; padding: 10px; overflow: auto; }
    </style>
</head>
<body>
    <h1>Electron API Test</h1>
    <div id="status"></div>
    <div id="results"></div>
    
    <script>
        console.log('Test page script starting...');
        const statusDiv = document.getElementById('status');
        const resultsDiv = document.getElementById('results');
        
        function addStatus(message, type = 'info') {
            const div = document.createElement('div');
            div.className = 'status ' + type;
            div.textContent = message;
            statusDiv.appendChild(div);
            console.log('[Status] ' + type + ': ' + message);
        }
        
        function addResult(label, value) {
            const div = document.createElement('div');
            div.innerHTML = '<strong>' + label + ':</strong> <pre>' + JSON.stringify(value, null, 2) + '</pre>';
            resultsDiv.appendChild(div);
        }
        
        // Check electronAPI
        console.log('Checking window.electronAPI...');
        if (typeof window.electronAPI !== 'undefined') {
            addStatus('electronAPI is available!', 'success');
            addResult('electronAPI type', typeof window.electronAPI);
            addResult('electronAPI keys', Object.keys(window.electronAPI));
            
            // Test API calls
            if (window.electronAPI.focusSession) {
                addStatus('Testing focusSession.getAll()...', 'info');
                window.electronAPI.focusSession.getAll()
                    .then(result => {
                        addStatus('focusSession.getAll() succeeded', 'success');
                        addResult('getAll result', result);
                    })
                    .catch(err => {
                        addStatus('focusSession.getAll() failed: ' + err.message, 'error');
                        addResult('getAll error', err);
                    });
            }
        } else {
            addStatus('electronAPI is NOT available!', 'error');
            console.error('window.electronAPI is undefined');
            
            // Debug info
            addResult('Window keys with electron/API', 
                Object.keys(window).filter(k => k.toLowerCase().includes('electron') || k.toLowerCase().includes('api'))
            );
        }
        
        // Log all window properties for debugging
        console.log('All window properties:', Object.keys(window));
    </script>
</body>
</html>
  `;
  
  // Write test HTML to temp file
  const tempHtmlPath = path.join(__dirname, 'test-page.html');
  fs.writeFileSync(tempHtmlPath, testHTML);
  console.log('\nTest HTML written to:', tempHtmlPath);
  
  // Load the test page
  win.loadFile(tempHtmlPath);
  
  // Open DevTools
  win.webContents.openDevTools();
});

app.on('window-all-closed', () => {
  app.quit();
});