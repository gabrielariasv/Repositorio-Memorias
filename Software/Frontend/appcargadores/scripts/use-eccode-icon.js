// Copies eccode.png into the right places for favicon and Capacitor assets
// - Expects eccode.png to be present either in project root or in public/
// - Copies to public/eccode.png and resources/icon.png
// Run: npm run set:icon

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname.replace(/\\scripts$/, '');
const candidatePaths = [
  path.join(projectRoot, 'eccode.png'),
  path.join(projectRoot, 'public', 'eccode.png')
];

const destFavicon = path.join(projectRoot, 'public', 'eccode.png');
const resourcesDir = path.join(projectRoot, 'resources');
const destIcon = path.join(resourcesDir, 'icon.png');

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

function main() {
  const found = candidatePaths.find(p => fs.existsSync(p));
  if (!found) {
    console.error('eccode.png not found. Place eccode.png in the project root or public/ and re-run.');
    process.exit(1);
  }

  copy(found, destFavicon);
  copy(found, destIcon);
  console.log('Icon prepared for favicon and Capacitor assets.');
}

main();
