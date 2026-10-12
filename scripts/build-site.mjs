// Writes the pages of the site inside Internet Explorer as real files, so /news, /games and the rest work in any browser.
// Run after changing js/web-pages.js, js/web-news.js, js/games.js or the `.web` block of css/style.css:
//   node scripts/build-site.mjs
// tools/site.test.mjs fails if the files on disk are out of date.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from '../js/web-static.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = buildAll(readFileSync(join(root, 'css/style.css'), 'utf8'));

for (const [file, text] of Object.entries(files)) {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  console.log(`wrote ${file}`);
}
