import fs from 'fs';
import path from 'path';

const pwaPath = path.resolve('node_modules/vite-plugin-pwa/dist/index.js');
if (fs.existsSync(pwaPath)) {
  let content = fs.readFileSync(pwaPath, 'utf-8');
  let changed = false;
  if (content.includes('var _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));')) {
    content = content.replace(
      'var _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));',
      'var _dirname = typeof __dirname !== "undefined" && __dirname !== "." && !__dirname.startsWith(".") ? __dirname : dirname(fileURLToPath(import.meta.url));'
    );
    changed = true;
  }
  if (content.includes('const _dirname2 = typeof __dirname !== "undefined" ? __dirname : dirname2(fileURLToPath2(import.meta.url));')) {
    content = content.replace(
      'const _dirname2 = typeof __dirname !== "undefined" ? __dirname : dirname2(fileURLToPath2(import.meta.url));',
      'const _dirname2 = typeof __dirname !== "undefined" && __dirname !== "." && !__dirname.startsWith(".") ? __dirname : dirname2(fileURLToPath2(import.meta.url));'
    );
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(pwaPath, content, 'utf-8');
    console.log('[patch-pwa] Applied patch to vite-plugin-pwa');
  }
}
