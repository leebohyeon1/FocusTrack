const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
  const preloadPath = path.join(__dirname, 'src/preload/preload.js');
  console.log('Preload path:', preloadPath);
  console.log('Preload exists:', fs.existsSync(preloadPath));
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  win.webContents.on('console-message', (event, level, message) => {
    console.log('Renderer:', message);
  });
  
  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded, checking electronAPI...');
    win.webContents.executeJavaScript('window.electronAPI')
      .then(result => {
        console.log('electronAPI exists:', !!result);
        if (result) {
          console.log('electronAPI methods:', Object.keys(result));
        }
        app.quit();
      })
      .catch(err => {
        console.error('Error:', err);
        app.quit();
      });
  });
  
  // Create a simple test HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
      <h1>Testing preload</h1>
      <script>
        console.log('Page loaded');
        console.log('electronAPI:', window.electronAPI);
      </script>
    </body>
    </html>
  `;
  
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
});