const fs = require('fs');
const path = require('path');

const backendModules = path.resolve('backend/node_modules');
const appModules = path.resolve('app/node_modules');

console.log('Scanning backend/node_modules for broken packages...');

function checkPackage(pkgDir, pkgName) {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const mainFile = pkg.main || 'index.js';
    const resolvedMain = path.resolve(pkgDir, mainFile);
    
    // Check if mainFile exists (with .js, /index.js, etc.)
    let exists = fs.existsSync(resolvedMain);
    if (!exists) {
      if (fs.existsSync(resolvedMain + '.js')) exists = true;
      if (fs.existsSync(path.join(resolvedMain, 'index.js'))) exists = true;
    }

    if (!exists) {
      console.log(`[BROKEN MAIN] ${pkgName}: ${mainFile} does not exist`);
      repairFromApp(pkgName, pkgDir);
    }
  } catch (e) {
    console.error(`Error reading ${pkgJsonPath}:`, e.message);
  }
}

function repairFromApp(pkgName, destDir) {
  const srcDir = path.join(appModules, pkgName);
  if (fs.existsSync(srcDir)) {
    console.log(`  -> Repairing ${pkgName} from app/node_modules/${pkgName}`);
    fs.cpSync(srcDir, destDir, { recursive: true, force: true });
  } else {
    console.log(`  -> Not in app/node_modules: ${pkgName}`);
    // Check specific known micro-packages
    if (pkgName === 'utils-merge') {
      fs.writeFileSync(
        path.join(destDir, 'index.js'),
        'exports = module.exports = function(a, b){ if (a && b) { for (var k in b) { a[k] = b[k]; } } return a; };\n'
      );
      console.log(`  -> Restored utils-merge/index.js manually`);
    }
  }
}

// Check all packages
for (const item of fs.readdirSync(backendModules)) {
  if (item.startsWith('.')) continue;
  const itemPath = path.join(backendModules, item);
  if (!fs.statSync(itemPath).isDirectory()) continue;

  if (item.startsWith('@')) {
    for (const sub of fs.readdirSync(itemPath)) {
      checkPackage(path.join(itemPath, sub), `${item}/${sub}`);
    }
  } else {
    checkPackage(itemPath, item);
  }
}

console.log('Module scan and repair completed.');
