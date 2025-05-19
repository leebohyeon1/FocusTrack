const { app, BrowserWindow } = require('electron');
const path = require('path');

app.on('ready', () => {
  console.log('=== Minimal Preload Debug ===');
  
  const preloadPath = path.join(__dirname, 'src/preload/preload.js');
  console.log('Preload path:', preloadPath);
  console.log('Exists:', require('fs').existsSync(preloadPath));
  
  // Test 1: Simple window with preload
  const win1 = new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true
    }
  });
  
  win1.webContents.on('console-message', (e, level, msg) => {
    console.log('[Win1]', msg);
  });
  
  win1.webContents.on('did-finish-load', () => {
    win1.webContents.executeJavaScript('typeof window.electronAPI')
      .then(type => console.log('Win1 electronAPI type:', type));
  });
  
  const html1 = `
    <html><body>
      <h1>Test 1</h1>
      <script>
        console.log('electronAPI available:', typeof window.electronAPI !== 'undefined');
      </script>
    </body></html>
  `;
  
  win1.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html1));
  
  // Test 2: Window with merged options
  setTimeout(() => {
    const options = {
      webPreferences: {
        devTools: true
      }
    };
    
    const merged = {
      ...options,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        ...options.webPreferences
      }
    };
    
    console.log('\nTest 2 merged options:', JSON.stringify(merged, null, 2));
    
    const win2 = new BrowserWindow(merged);
    
    win2.webContents.on('console-message', (e, level, msg) => {
      console.log('[Win2]', msg);
    });
    
    win2.webContents.on('did-finish-load', () => {
      win2.webContents.executeJavaScript('typeof window.electronAPI')
        .then(type => console.log('Win2 electronAPI type:', type));
    });
    
    const html2 = `
      <html><body>
        <h1>Test 2</h1>
        <script>
          console.log('electronAPI available:', typeof window.electronAPI !== 'undefined');
        </script>
      </body></html>
    `;
    
    win2.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html2));
  }, 2000);
});