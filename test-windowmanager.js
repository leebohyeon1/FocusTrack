// Test the WindowManager directly
const { app } = require('electron');
const WindowManager = require('./src/main/managers/WindowManager');

app.whenReady().then(() => {
  console.log('=== Testing WindowManager ===');
  
  const windowManager = new WindowManager({
    logger: console,
    isDevelopment: false
  });
  
  // Test createWindow method
  console.log('\nTesting createWindow with default options:');
  const window1 = windowManager.createWindow('test1');
  
  setTimeout(() => {
    console.log('\nTesting createWindow with custom options:');
    const window2 = windowManager.createWindow('test2', {
      width: 900,
      height: 700,
      webPreferences: {
        devTools: true
      }
    });
    
    // Load test content
    const testHtml = `
      <html>
        <body>
          <h1>WindowManager Test</h1>
          <div id="status"></div>
          <script>
            const status = document.getElementById('status');
            if (window.electronAPI) {
              status.innerHTML = '<p style="color: green;">electronAPI is available!</p>';
              console.log('electronAPI keys:', Object.keys(window.electronAPI));
            } else {
              status.innerHTML = '<p style="color: red;">electronAPI is NOT available!</p>';
              console.error('electronAPI is undefined');
            }
          </script>
        </body>
      </html>
    `;
    
    windowManager.loadWindowContent('test1', 'data:text/html,' + encodeURIComponent(testHtml));
    windowManager.loadWindowContent('test2', 'data:text/html,' + encodeURIComponent(testHtml));
  }, 1000);
});