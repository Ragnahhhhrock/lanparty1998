// Cache-busts the game's ES modules. The host serves /js/* with a four hour max-age whatever _headers says, so a
// visitor's browser can keep an old main.js next to a new room.js and the room comes up blank.
// Every js/*.js file gets a content hash: the import map in index.html points each module at js/<name>.js?v=<hash>
// (so relative imports between modules are versioned too) and the entry script is loaded as js/main.js?v=<hash>.
// Run after any change under js/:  node scripts/build-importmap.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hash = (file) => createHash('sha256').update(readFileSync(join(root, file))).digest('hex').slice(0, 10);

const imports = { three: './vendor/three/three.module.min.js' };
for (const f of readdirSync(join(root, 'js')).filter((n) => n.endsWith('.js')).sort()) {
  if (f === 'main.js') continue;
  imports[`./js/${f}`] = `./js/${f}?v=${hash(`js/${f}`)}`;
}

let html = readFileSync(join(root, 'index.html'), 'utf8');
const map = `<script type="importmap">\n${JSON.stringify({ imports }, null, 1).replace(/\n\s*/g, '\n')}\n</script>`;
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, () => map);
html = html.replace(/<script type="module" src="js\/main\.js[^"]*"><\/script>/, `<script type="module" src="js/main.js?v=${hash('js/main.js')}"></script>`);
writeFileSync(join(root, 'index.html'), html);
console.log(`importmap: ${Object.keys(imports).length - 1} modules versioned`);
