const path = require('path');
const fs = require('fs');

// Test file paths
const preloadPath = path.join(__dirname, 'src/preload/preload.js');
const mainPath = path.join(__dirname, 'src/main/main.js');
const indexPath = path.join(__dirname, 'public/index.html');

console.log('Testing FocusTrack setup...\n');

console.log('Preload script:');
console.log('  Path:', preloadPath);
console.log('  Exists:', fs.existsSync(preloadPath));

console.log('\nMain process:');
console.log('  Path:', mainPath);
console.log('  Exists:', fs.existsSync(mainPath));

console.log('\nHTML file:');
console.log('  Path:', indexPath);
console.log('  Exists:', fs.existsSync(indexPath));

// Check preload content
if (fs.existsSync(preloadPath)) {
  const content = fs.readFileSync(preloadPath, 'utf8');
  console.log('\nPreload script content (first 200 chars):');
  console.log(content.substring(0, 200) + '...');
}

// Check package.json
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('\nPackage info:');
  console.log('  Name:', pkg.name);
  console.log('  Version:', pkg.version);
  console.log('  Main:', pkg.main);
}