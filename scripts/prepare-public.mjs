import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'public');

const files = [
  'index.html',
  'about.html',
  'admin.html',
  'app.js',
  'styles.css',
  'service-worker.js',
  'manifest.json',
];

const dirs = ['icons', 'images'];

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const file of files) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dest, file));
  }
}

for (const dir of dirs) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(dest, dir), { recursive: true });
  }
}

console.log(`[Vercel] Static files copied to ${dest}`);
