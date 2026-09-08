import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const outDir = resolve('out');
const outputFile = join(outDir, 'precache-manifest.json');
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '/check').replace(/\/$/, '');

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (!entry.name.endsWith('.map')) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await collectFiles(outDir);
const urls = files
  .map((file) => {
    const relativePath = relative(outDir, file).split(sep).join('/');
    return `${basePath}/${relativePath}`;
  })
  .filter((url) => !url.endsWith('/precache-manifest.json'))
  .sort();

urls.push(`${basePath}/`);
await writeFile(outputFile, `${JSON.stringify([...new Set(urls)], null, 2)}\n`, 'utf8');
console.log(`Generated PWA precache manifest with ${urls.length} files`);
