const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
exports.loader = function loader(globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    if (file.endsWith('.json')) return (module.exports = JSON.parse(fs.readFileSync(file, 'utf8')));
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    function localRequire(id) {
      if (!id.startsWith('.') && !id.startsWith('@/')) return require(id);
      const target = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(file), id);
      return load(path.extname(target) ? target : target + '.ts');
    }
    const context = { module, exports: module.exports, require: localRequire, process, console, setTimeout, clearTimeout, AbortController, Event, ...globals };
    vm.runInNewContext(code, context, { filename: file });
    return module.exports;
  }
  return load;
};
