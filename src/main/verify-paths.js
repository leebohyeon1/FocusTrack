// Quick script to verify all paths are correct
const path = require('path');
const fs = require('fs');

console.log('=== Path Verification ===');
console.log('Current file:', __filename);
console.log('Current directory:', __dirname);

const paths = {
  'Preload from main': path.join(__dirname, '../preload/preload.js'),
  'Preload from managers': path.join(__dirname, './managers/../preload/preload.js'),
  'Renderer index': path.join(__dirname, '../renderer/index.html'),
  'Build index': path.join(__dirname, '../../build/index.html'),
  'Public index': path.join(__dirname, '../../public/index.html'),
  'React App.js': path.join(__dirname, '../renderer/App.js'),
  'Root App.js': path.join(__dirname, '../App.js')
};

console.log('\nChecking paths:');
for (const [label, filePath] of Object.entries(paths)) {
  const exists = fs.existsSync(filePath);
  const resolved = path.resolve(filePath);
  console.log(`\n${label}:`);
  console.log(`  Path: ${filePath}`);
  console.log(`  Resolved: ${resolved}`);
  console.log(`  Exists: ${exists ? '✓' : '✗'}`);
}

// Check the actual preload script content
const preloadPath = path.join(__dirname, '../preload/preload.js');
if (fs.existsSync(preloadPath)) {
  console.log('\n=== Preload Script Content ===');
  const content = fs.readFileSync(preloadPath, 'utf8');
  console.log('First 10 lines:');
  console.log(content.split('\n').slice(0, 10).join('\n'));
}