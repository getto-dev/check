import { readFile, writeFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const template = await readFile('public/sw.js.template', 'utf8');

await writeFile('public/version.json', JSON.stringify({ version: pkg.version }, null, 2) + '\n');
await writeFile('public/sw.js', template.replaceAll('__VERSION__', pkg.version));

console.log(`Generated PWA assets for version ${pkg.version}`);
