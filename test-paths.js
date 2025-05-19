const path = require('path');
const fs = require('fs');

// Test from WindowManager location
const windowManagerDir = '/home/leebohyeon/Projects/FocusTrack/src/main/managers';
const preloadFromWindowManager = path.join(windowManagerDir, '../../preload/preload.js');
console.log('WindowManager preload path:', preloadFromWindowManager);
console.log('WindowManager preload exists:', fs.existsSync(preloadFromWindowManager));
console.log('WindowManager resolved path:', path.resolve(preloadFromWindowManager));

// Test from MainApplication location
const mainAppDir = '/home/leebohyeon/Projects/FocusTrack/src/main/core';
const preloadFromMainApp = path.join(mainAppDir, '../../preload/preload.js');
console.log('\nMainApplication preload path:', preloadFromMainApp);
console.log('MainApplication preload exists:', fs.existsSync(preloadFromMainApp));
console.log('MainApplication resolved path:', path.resolve(preloadFromMainApp));

// Check the actual preload location
const actualPreloadPath = '/home/leebohyeon/Projects/FocusTrack/src/preload/preload.js';
console.log('\nActual preload path:', actualPreloadPath);
console.log('Actual preload exists:', fs.existsSync(actualPreloadPath));