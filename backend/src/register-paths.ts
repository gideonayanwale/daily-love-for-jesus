const path = require('path');
const Module = require('module');

const origResolve = Module._resolveFilename;
const baseDir = __dirname;
const appNodeModules = path.resolve(baseDir, '../../app/node_modules');
const backendNodeModules = path.resolve(baseDir, '../node_modules');

// Add both backend/node_modules and app/node_modules to Node's global fallback paths
if (!Module.globalPaths.includes(backendNodeModules)) {
  Module.globalPaths.push(backendNodeModules);
}
if (!Module.globalPaths.includes(appNodeModules)) {
  Module.globalPaths.push(appNodeModules);
}

Module._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  if (request.startsWith('@/')) {
    request = path.join(baseDir, request.slice(2));
  } else if (request.startsWith('@db/')) {
    request = path.join(baseDir, 'database', request.slice(4));
  } else if (request.startsWith('@contracts/')) {
    request = path.join(baseDir, '../../app/contracts', request.slice(11));
  }

  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND' && !request.startsWith('.') && !path.isAbsolute(request)) {
      try {
        // Explicitly try resolving from app/node_modules
        return origResolve.call(this, request, { id: 'root', filename: path.join(appNodeModules, 'virtual.js'), paths: [appNodeModules] }, isMain, options);
      } catch (_) {
        // Fall back to original error
      }
    }
    throw err;
  }
};
